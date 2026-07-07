import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import proxy from 'express-http-proxy';

// v0.1.5 new components
import { setupBadgeRoutes } from './routes/badge-generator';
import { setupClaimRoutes, startClaimVerificationWorker } from './routes/provider-claim-system';
import { setupSseEndpoint } from './routes/realtime-scoring';

// v0.1 existing components
import governanceRoutes from './routes/governance';
import disputeRoutes from './routes/disputes';
import metricsRoutes from './routes/metrics';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || '3000', 10);
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';
const REALTIME_SCORING_URL = process.env.REALTIME_SCORING_URL || 'http://localhost:8080';
const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST || 'localhost';
const CLICKHOUSE_PORT = parseInt(process.env.CLICKHOUSE_PORT || '9000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    const graphqlHealthy = await checkGraphQLHealth();
    const clickhouseHealthy = await checkClickHouseHealth();
    const realtimeScoringHealthy = await checkRealtimeScoringHealth();

    if (!graphqlHealthy || !clickhouseHealthy) {
      return res.status(503).json({
        status: 'degraded',
        graphql: graphqlHealthy ? 'ok' : 'down',
        clickhouse: clickhouseHealthy ? 'ok' : 'down',
        realtime_scoring: realtimeScoringHealthy ? 'ok' : 'down',
      });
    }

    res.json({
      status: 'ok',
      service: 'VNP Public API',
      version: '0.1.5',
      graphql: 'ok',
      clickhouse: 'ok',
      realtime_scoring: realtimeScoringHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

setupBadgeRoutes(app);
setupClaimRoutes(app);
setupSseEndpoint(app);

// Proxy to GraphQL API
app.use(
  '/graphql',
  proxy(GRAPHQL_ENDPOINT, {
    proxyReqPathResolver: () => '/graphql',
    userResHeaderDecorator: (headers) => {
      headers['access-control-allow-origin'] = CORS_ORIGIN;
      return headers;
    }
  })
);

app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/metrics', metricsRoutes);

// ============================================================================
// DOCUMENTATION ENDPOINTS
// ============================================================================

app.get('/docs', (req: Request, res: Response) => {
  res.json({
    service: 'VNP Public API',
    version: '0.1.5',
    docs: {
      openapi: 'https://docs.vnp.io/api/openapi.json',
      graphql_schema: 'https://docs.vnp.io/api/graphql-schema.json',
      rest_endpoints: [
        {
          method: 'GET',
          path: '/v1/badge/{api-id}.svg',
          description: 'VNP conformance badge (embeddable SVG)',
        },
        {
          method: 'GET',
          path: '/v1/badge/{api-id}.json',
          description: 'Badge data as JSON',
        },
        {
          method: 'POST',
          path: '/api/v1/claims',
          description: 'Create provider claim request (DNS verification)',
        },
        {
          method: 'GET',
          path: '/api/v1/claims/{claim-id}/status',
          description: 'Check claim verification status',
        },
        {
          method: 'GET',
          path: '/v1/scores/stream',
          description: 'Server-Sent Events stream of score updates',
        },
        {
          method: 'GET',
          path: '/v1/scores/stream/{api-id}',
          description: 'Filtered SSE stream for single API',
        },
        {
          method: 'POST',
          path: '/graphql',
          description: 'GraphQL API endpoint',
        },
        {
          method: 'GET',
          path: '/api/v1/governance/charter',
          description: 'VNP governance charter',
        },
        {
          method: 'POST',
          path: '/api/v1/disputes',
          description: 'File a score dispute',
        },
      ],
      sdks: {
        python: 'https://pypi.org/project/vnp-sdk',
        javascript: 'https://www.npmjs.com/package/@vnp/sdk',
        typescript: 'https://www.npmjs.com/package/@vnp/sdk',
      },
    },
  });
});

app.get('/api/v1/config', (req: Request, res: Response) => {
  res.json({
    service: 'VNP Public API',
    version: '0.1.5',
    environment: process.env.NODE_ENV || 'development',
    features: {
      badges: true,
      provider_claims: true,
      realtime_scoring: true,
      graphql_api: true,
      governance: true,
      disputes: true,
    },
    endpoints: {
      graphql: '/graphql',
      badges: '/v1/badge',
      claims: '/api/v1/claims',
      scores_stream_sse: '/v1/scores/stream',
      scores_stream_ws: 'ws://' + req.get('host') + '/v1/scores/stream/ws',
      governance: '/api/v1/governance',
      disputes: '/api/v1/disputes',
    },
    rate_limits: {
      default: '1000 requests per hour',
      authenticated: '10000 requests per hour',
    },
    cors_allowed_origins: CORS_ORIGIN,
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    available_docs: '/docs',
  });
});

app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// BACKGROUND WORKERS
// ============================================================================

startClaimVerificationWorker();

// ============================================================================
// STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`\n✓ VNP Public API v0.1.5 started on port ${PORT}`);
  console.log(`  GraphQL:        ${GRAPHQL_ENDPOINT}`);
  console.log(`  Realtime:       ${REALTIME_SCORING_URL}`);
  console.log(`  ClickHouse:     ${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}`);
  console.log(`  CORS Origin:    ${CORS_ORIGIN}`);
  console.log(`\n  Health:         http://localhost:${PORT}/health`);
  console.log(`  Docs:           http://localhost:${PORT}/docs`);
  console.log(`  Config:         http://localhost:${PORT}/api/v1/config`);
  console.log(`\n`);
});

const shutdown = () => {
  console.log('Shutdown signal received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkGraphQLHealth(): Promise<boolean> {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkClickHouseHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://${CLICKHOUSE_HOST}:8123/ping`);
    return response.ok;
  } catch {
    return false;
  }
}

async function checkRealtimeScoringHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${REALTIME_SCORING_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export default app;
