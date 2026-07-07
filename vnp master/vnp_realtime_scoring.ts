/**
 * VNP Real-Time Scoring Module
 * 
 * Replaces hourly batch scoring with real-time updates:
 * - Scores update within 5 minutes of new measurements
 * - WebSocket stream for live dashboard updates
 * - SSE (Server-Sent Events) fallback for browsers
 * - Triggers: 100 new measurements for an API
 * 
 * ARCHITECTURE CHANGE:
 * 
 * v0.1 (Batch):
 *   Measure (1hr) → Batch 3,600+ measurements → Score → Publish
 *   Score latency: 1-2 hours
 * 
 * v0.1.5 (Real-time):
 *   Measure (continuous) → Stream to Kafka → Trigger on 100 new → Score → Publish
 *   Score latency: <5 minutes
 *   Agents see fresh data, better routing decisions
 */

import Kafka from 'kafkajs';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// ============================================================================
// CONFIGURATION
// ============================================================================

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC_MEASUREMENTS = 'vnp-measurements';
const KAFKA_TOPIC_SCORES = 'vnp-scores';
const MEASUREMENT_THRESHOLD = 100; // Trigger scoring on 100 new measurements
const MEASUREMENT_WINDOW_SECONDS = 300; // 5-minute window

// ============================================================================
// TYPES
// ============================================================================

interface Measurement {
  id: string;
  apiId: string;
  timestamp: string;
  region: string;
  latencyP99Ms: number;
  errorRatePct: number;
  uptimePct: number;
}

interface ScoringTrigger {
  apiId: string;
  measurementCount: number;
  measurements: Measurement[];
  triggeredAt: string;
}

interface ScoreUpdate {
  apiId: string;
  compositeScore: number;
  confidenceInterval95: [number, number];
  updatedAt: string;
  triggerSource: 'real-time' | 'hourly-batch';
  measurementCount: number;
}

// ============================================================================
// REAL-TIME SCORING ENGINE
// ============================================================================

export class RealtimeScoringEngine extends EventEmitter {
  private kafka: Kafka.Kafka;
  private measurementQueue = new Map<string, Measurement[]>();
  private lastScoredAt = new Map<string, Date>();
  private consumer: Kafka.Consumer | null = null;
  private producer: Kafka.Producer | null = null;
  private isRunning = false;

  constructor() {
    super();
    this.kafka = new Kafka({
      clientId: 'vnp-realtime-scoring',
      brokers: KAFKA_BROKERS,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }

  async start(): Promise<void> {
    console.log('Starting RealtimeScoringEngine...');

    this.consumer = this.kafka.consumer({ groupId: 'vnp-scoring-group' });
    this.producer = this.kafka.producer();

    await this.consumer.connect();
    await this.producer.connect();

    await this.consumer.subscribe({ topic: KAFKA_TOPIC_MEASUREMENTS });

    this.isRunning = true;

    // Start consuming measurements
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.handleMeasurement(message);
      },
    });

    console.log('RealtimeScoringEngine started');
  }

  async stop(): Promise<void> {
    console.log('Stopping RealtimeScoringEngine...');
    this.isRunning = false;

    if (this.consumer) {
      await this.consumer.disconnect();
    }
    if (this.producer) {
      await this.producer.disconnect();
    }

    console.log('RealtimeScoringEngine stopped');
  }

  /**
   * Handle incoming measurement from Kafka stream
   */
  private async handleMeasurement(message: Kafka.Message): Promise<void> {
    try {
      const measurement: Measurement = JSON.parse(
        message.value?.toString() || '{}'
      );

      if (!measurement.apiId) return;

      // Add to queue
      if (!this.measurementQueue.has(measurement.apiId)) {
        this.measurementQueue.set(measurement.apiId, []);
      }
      this.measurementQueue.get(measurement.apiId)!.push(measurement);

      // Check if we should trigger scoring
      const queue = this.measurementQueue.get(measurement.apiId)!;
      if (queue.length >= MEASUREMENT_THRESHOLD) {
        await this.triggerScoring(measurement.apiId, queue);

        // Clear queue for next batch
        this.measurementQueue.set(measurement.apiId, []);
      }
    } catch (error) {
      console.error('Error processing measurement:', error);
    }
  }

  /**
   * Trigger scoring when threshold is met
   */
  private async triggerScoring(apiId: string, measurements: Measurement[]): Promise<void> {
    console.log(`Triggering scoring for ${apiId} (${measurements.length} measurements)`);

    try {
      const trigger: ScoringTrigger = {
        apiId,
        measurementCount: measurements.length,
        measurements,
        triggeredAt: new Date().toISOString(),
      };

      // Emit event for scoring engine to consume
      this.emit('score-trigger', trigger);

      // Record last scored time
      this.lastScoredAt.set(apiId, new Date());

      console.log(`Scoring triggered for ${apiId}`);
    } catch (error) {
      console.error(`Error triggering score for ${apiId}:`, error);
    }
  }

  /**
   * Publish score update to Kafka and WebSocket stream
   */
  async publishScoreUpdate(update: ScoreUpdate): Promise<void> {
    if (!this.producer) return;

    try {
      // Publish to Kafka (for other consumers)
      await this.producer.send({
        topic: KAFKA_TOPIC_SCORES,
        messages: [
          {
            key: update.apiId,
            value: JSON.stringify(update),
          },
        ],
      });

      // Emit for WebSocket broadcast
      this.emit('score-update', update);

      console.log(`Score published for ${update.apiId}: ${update.compositeScore.toFixed(1)}`);
    } catch (error) {
      console.error('Error publishing score:', error);
    }
  }

  /**
   * Get queue status (for monitoring)
   */
  getQueueStatus(): Record<string, { count: number; lastScoredAt: string }> {
    const status: Record<string, { count: number; lastScoredAt: string }> = {};

    for (const [apiId, queue] of this.measurementQueue) {
      status[apiId] = {
        count: queue.length,
        lastScoredAt: this.lastScoredAt.get(apiId)?.toISOString() || 'never',
      };
    }

    return status;
  }
}

// ============================================================================
// WEBSOCKET SERVER (Live Score Stream)
// ============================================================================

export class ScoreStreamServer {
  private engine: RealtimeScoringEngine;
  private wss: WebSocket.Server;
  private clients = new Set<WebSocket>();

  constructor(engine: RealtimeScoringEngine, port: number = 8080) {
    this.engine = engine;
    this.wss = new WebSocket.Server({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected to score stream');
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('Client disconnected from score stream');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Listen to engine events
    this.engine.on('score-update', (update: ScoreUpdate) => {
      this.broadcastUpdate(update);
    });
  }

  private broadcastUpdate(update: ScoreUpdate): void {
    const message = JSON.stringify({
      type: 'score-update',
      data: update,
      timestamp: new Date().toISOString(),
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  close(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.wss.close();
  }
}

// ============================================================================
// SSE ENDPOINT (Server-Sent Events, for browsers)
// ============================================================================

import express from 'express';

export function setupSseEndpoint(
  app: express.Application,
  engine: RealtimeScoringEngine
): void {
  // Store active SSE connections
  const sseClients = new Set<express.Response>();

  /**
   * GET /v1/scores/stream
   * 
   * Server-Sent Events stream of score updates
   * 
   * USAGE:
   *   const eventSource = new EventSource('https://vnp.io/v1/scores/stream');
   *   eventSource.addEventListener('score-update', (event) => {
   *     const update = JSON.parse(event.data);
   *     console.log(update.api_id, update.composite_score);
   *   });
   */
  app.get('/v1/scores/stream', (req: express.Request, res: express.Response) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    sseClients.add(res);

    // Send initial connection message
    res.write(':connected\n\n');

    // Send queue status every 30 seconds (keep-alive)
    const keepAliveInterval = setInterval(() => {
      const status = engine.getQueueStatus();
      res.write(`:keep-alive ${JSON.stringify(status)}\n\n`);
    }, 30000);

    // Remove client on close
    req.on('close', () => {
      sseClients.delete(res);
      clearInterval(keepAliveInterval);
      res.end();
    });
  });

  /**
   * GET /v1/scores/stream?api_id=did:vnp:api:stripe-payments
   * 
   * Filtered SSE stream for specific API
   */
  app.get('/v1/scores/stream/:apiId', (req: express.Request, res: express.Response) => {
    const apiId = req.params.apiId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    sseClients.add(res);
    res.write(':connected\n\n');

    // Only send updates for this API
    const handleUpdate = (update: ScoreUpdate) => {
      if (update.apiId === apiId) {
        res.write(
          `data: ${JSON.stringify({
            type: 'score-update',
            data: update,
            timestamp: new Date().toISOString(),
          })}\n\n`
        );
      }
    };

    engine.on('score-update', handleUpdate);

    req.on('close', () => {
      sseClients.delete(res);
      engine.removeListener('score-update', handleUpdate);
      res.end();
    });
  });

  /**
   * GET /v1/scores/stream/status
   * 
   * Current queue and streaming status
   */
  app.get('/v1/scores/stream/status', (req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      activeConnections: sseClients.size,
      queueStatus: engine.getQueueStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  // Broadcast score updates to all SSE clients
  engine.on('score-update', (update: ScoreUpdate) => {
    const message = `data: ${JSON.stringify({
      type: 'score-update',
      data: update,
      timestamp: new Date().toISOString(),
    })}\n\n`;

    for (const client of sseClients) {
      client.write(message);
    }
  });
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
import express from 'express';

const app = express();
const engine = new RealtimeScoringEngine();
const streamServer = new ScoreStreamServer(engine, 8080);

setupSseEndpoint(app, engine);

await engine.start();

app.listen(3000, () => {
  console.log('VNP Real-Time Scoring API listening on port 3000');
});

// Simulate score update (in real scenario, triggered by scoring engine)
setTimeout(() => {
  engine.publishScoreUpdate({
    apiId: 'did:vnp:api:stripe-payments',
    compositeScore: 87.4,
    confidenceInterval95: [85.1, 89.7],
    updatedAt: new Date().toISOString(),
    triggerSource: 'real-time',
    measurementCount: 125,
  });
}, 5000);
*/

export { RealtimeScoringEngine, ScoreStreamServer };
