import express, { Request, Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// ============================================================================
// HELPER FOR GENERATING HIGH-QUALITY MOCK TIME-SERIES DATA
// ============================================================================

interface MockMeasurement {
  id: string;
  api_id: string;
  api_version: string;
  region: string;
  node_id: string;
  timestamp: string;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  error_rate_pct: number;
  uptime_pct: number;
  peak_rps_sustained: number;
  x402_ready: number;
  ratelimit_headers_present: number;
  merkle_root: string;
  tx_hash: string;
}

interface MockScore {
  api_id: string;
  window: 'realtime' | '1h' | '24h' | '7d' | '30d';
  computed_at: string;
  measurement_count: number;
  composite_score: number;
  confidence_interval_95_lower: number;
  confidence_interval_95_upper: number;
  is_provisional: number;
  
  // 10 Dimensions
  p99_latency_score: number;
  error_rate_score: number;
  availability_score: number;
  throughput_score: number;
  security_score: number;
  documentation_score: number;
  versioning_score: number;
  m2m_compliance_score: number;
  ratelimit_transparency_score: number;
  dx_ttfc_score: number;

  // Regional breakdown
  score_us_east: number;
  score_us_west: number;
  score_eu_west: number;
  score_ap_southeast: number;
  score_ap_northeast: number;
}

const APIS = [
  'did:vnp:api:stripe-payments',
  'did:vnp:api:openai-chat',
  'did:vnp:api:gemini-inference',
  'did:vnp:api:aws-dynamodb',
  'did:vnp:api:twilio-sms'
];

const REGIONS = ['us-east', 'us-west', 'eu-west', 'ap-southeast', 'ap-northeast'];

function generateMockMeasurements(apiId?: string, region?: string, limit: number = 20): MockMeasurement[] {
  const list: MockMeasurement[] = [];
  const selectedApis = apiId ? [apiId] : APIS;
  const selectedRegions = region ? [region] : REGIONS;

  for (let i = 0; i < limit; i++) {
    const curApi = selectedApis[Math.floor(Math.random() * selectedApis.length)];
    const curRegion = selectedRegions[Math.floor(Math.random() * selectedRegions.length)];
    const timeOffsetSec = i * 300; // 5 minute intervals
    const timestamp = new Date(Date.now() - timeOffsetSec * 1000).toISOString();

    const p50 = 30 + Math.random() * 50;
    const p95 = p50 + (10 + Math.random() * 30);
    const p99 = p95 + (20 + Math.random() * 80);

    list.push({
      id: crypto.randomUUID(),
      api_id: curApi,
      api_version: 'v3',
      region: curRegion,
      node_id: `node-${Math.floor(100 + Math.random() * 900)}`,
      timestamp,
      latency_p50_ms: parseFloat(p50.toFixed(2)),
      latency_p95_ms: parseFloat(p95.toFixed(2)),
      latency_p99_ms: parseFloat(p99.toFixed(2)),
      error_rate_pct: Math.random() < 0.98 ? 0 : parseFloat((Math.random() * 2).toFixed(3)),
      uptime_pct: Math.random() < 0.99 ? 100 : parseFloat((99 + Math.random()).toFixed(3)),
      peak_rps_sustained: Math.floor(150 + Math.random() * 850),
      x402_ready: Math.random() < 0.9 ? 1 : 0,
      ratelimit_headers_present: 1,
      merkle_root: '0x' + crypto.randomBytes(32).toString('hex'),
      tx_hash: '0x' + crypto.randomBytes(32).toString('hex')
    });
  }

  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateMockScore(apiId: string, window: 'realtime' | '1h' | '24h' | '7d' | '30d' = 'realtime'): MockScore {
  // Hash API ID to get a consistent seed for score generation
  const hash = crypto.createHash('md5').update(apiId).digest('hex');
  const baseSeed = parseInt(hash.substring(0, 8), 16) % 15; // 0-14
  const baseScore = 85 + baseSeed; // 85-99

  // Add small random noise
  const noise = (Math.random() * 2 - 1) * 0.8;
  const composite_score = parseFloat(Math.min(100, Math.max(0, baseScore + noise)).toFixed(1));

  return {
    api_id: apiId,
    window,
    computed_at: new Date().toISOString(),
    measurement_count: window === 'realtime' ? 120 : 3600,
    composite_score,
    confidence_interval_95_lower: parseFloat((composite_score - 1.2).toFixed(2)),
    confidence_interval_95_upper: parseFloat(Math.min(100, composite_score + 1.2).toFixed(2)),
    is_provisional: 0,
    
    // 10 Dimensions (80-100)
    p99_latency_score: parseFloat((composite_score + (Math.random() * 4 - 2)).toFixed(1)),
    error_rate_score: parseFloat((95 + Math.random() * 5).toFixed(1)),
    availability_score: parseFloat((98 + Math.random() * 2).toFixed(1)),
    throughput_score: parseFloat((composite_score - (Math.random() * 3)).toFixed(1)),
    security_score: parseFloat((90 + Math.random() * 10).toFixed(1)),
    documentation_score: 95,
    versioning_score: 100,
    m2m_compliance_score: Math.random() < 0.9 ? 100 : 80,
    ratelimit_transparency_score: 100,
    dx_ttfc_score: 85,

    // Regional breakdown
    score_us_east: parseFloat((composite_score + (Math.random() * 2 - 1)).toFixed(1)),
    score_us_west: parseFloat((composite_score + (Math.random() * 2 - 1)).toFixed(1)),
    score_eu_west: parseFloat((composite_score + (Math.random() * 2 - 1)).toFixed(1)),
    score_ap_southeast: parseFloat((composite_score - (2 + Math.random() * 3)).toFixed(1)), // usually slightly lower latency score due to distance
    score_ap_northeast: parseFloat((composite_score - (1 + Math.random() * 2)).toFixed(1))
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /measurements
 * 
 * Retrieve time-series raw measurement feeds
 * Supports optional filters: api_id, region, limit
 */
router.get('/measurements', (req: Request, res: Response) => {
  const apiId = req.query.api_id as string;
  const region = req.query.region as string;
  const limit = parseInt(req.query.limit as string || '20', 10);

  const measurements = generateMockMeasurements(apiId, region, limit);

  res.json({
    total_returned: measurements.length,
    filters_applied: {
      api_id: apiId || 'all',
      region: region || 'all',
      limit
    },
    measurements
  });
});

/**
 * GET /scores
 * 
 * Get high-level aggregated VNP scores for all registered APIs
 */
router.get('/scores', (req: Request, res: Response) => {
  const window = (req.query.window || 'realtime') as any;
  const validWindows = ['realtime', '1h', '24h', '7d', '30d'];
  
  if (!validWindows.includes(window)) {
    return res.status(400).json({ error: `Invalid window parameter. Must be one of: ${validWindows.join(', ')}` });
  }

  const scores = APIS.map(apiId => generateMockScore(apiId, window));

  res.json({
    total_apis: APIS.length,
    window,
    computed_at: new Date().toISOString(),
    scores
  });
});

/**
 * GET /api/{api-id}
 * 
 * Get complete detailed multi-dimensional scores and regional topologies for a single API
 */
router.get('/api/:apiId', (req: Request, res: Response) => {
  const apiId = req.params.apiId;

  // Simple validation to ensure it looks like a did:vnp:api:*
  if (!apiId.startsWith('did:vnp:')) {
    return res.status(400).json({ error: "Invalid API ID format. Must follow the 'did:vnp:api:...' convention." });
  }

  const realtimeScore = generateMockScore(apiId, 'realtime');
  const hourlyScore = generateMockScore(apiId, '1h');
  const dailyScore = generateMockScore(apiId, '24h');

  res.json({
    api_id: apiId,
    api_name: apiId.replace('did:vnp:api:', '').replace(/-/g, ' ').toUpperCase(),
    registered_at: '2026-01-01T00:00:00Z',
    active_measurement_regions: REGIONS,
    metrics: {
      realtime: realtimeScore,
      hourly: hourlyScore,
      daily: dailyScore
    },
    recent_raw_measurements: generateMockMeasurements(apiId, undefined, 5)
  });
});

/**
 * GET /region/{region}
 * 
 * Retrieve health and response status indexes for a specific geographic region
 */
router.get('/region/:region', (req: Request, res: Response) => {
  const region = req.params.region;

  if (!REGIONS.includes(region)) {
    return res.status(404).json({ error: `Region ${region} not found. Must be one of: ${REGIONS.join(', ')}` });
  }

  const measurements = generateMockMeasurements(undefined, region, 50);
  
  // Calculate aggregate regional metrics
  let totalLatency = 0;
  let errorCount = 0;
  let totalUptime = 0;

  measurements.forEach(m => {
    totalLatency += m.latency_p99_ms;
    if (m.error_rate_pct > 0) errorCount++;
    totalUptime += m.uptime_pct;
  });

  const avgP99Latency = parseFloat((totalLatency / measurements.length).toFixed(2));
  const avgUptime = parseFloat((totalUptime / measurements.length).toFixed(4));
  const healthScore = parseFloat((100 - (errorCount / measurements.length) * 100).toFixed(1));

  res.json({
    region,
    total_nodes_online: 5,
    regional_aggregates_24h: {
      average_p99_latency_ms: avgP99Latency,
      average_uptime_pct: avgUptime,
      health_index: healthScore,
      measurements_processed: 2880
    },
    recent_failures: measurements.filter(m => m.error_rate_pct > 0).slice(0, 5)
  });
});

export default router;
