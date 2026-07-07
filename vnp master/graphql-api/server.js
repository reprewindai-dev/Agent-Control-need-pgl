const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { createClient } = require("@clickhouse/client");

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST || "localhost";
const CLICKHOUSE_PORT = process.env.CLICKHOUSE_PORT || "8123";
const CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || "vnp";
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || "default";
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || "changeme";
const PORT = parseInt(process.env.PORT || "4000", 10);

// ClickHouse client
let clickhouseClient = null;
try {
  clickhouseClient = createClient({
    host: `http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}`,
    username: CLICKHOUSE_USER,
    password: CLICKHOUSE_PASSWORD,
    database: CLICKHOUSE_DB,
  });
  console.log(`Connecting to ClickHouse at http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}`);
} catch (err) {
  console.error("Failed to initialize ClickHouse client:", err.message);
}

// Mock database fallback if clickhouse fails
const MOCK_MEASUREMENTS = [
  {
    id: "3bc8de52-87ff-40cf-8a21-9fc5427d1421",
    api_id: "did:vnp:api:stripe-payments",
    api_version: "2023-10-16",
    region: "us-east",
    node_id: "vnp-us-east-1",
    timestamp: new Date().toISOString(),
    latency_p50_ms: 45.2,
    latency_p95_ms: 78.5,
    latency_p99_ms: 112.4,
    latency_p99_9_ms: 201.3,
    error_rate_pct: 0.05,
    uptime_pct: 99.99,
    peak_rps_sustained: 1500,
    tls_version: "1.3",
    http_version: "HTTP/2",
    ratelimit_headers_present: true,
    x402_ready: true,
    measurement_status: "success",
  },
  {
    id: "ef2a420b-9dfd-4b82-aa2e-f78e4726bfab",
    api_id: "did:vnp:api:openai-api",
    api_version: "v1",
    region: "us-west",
    node_id: "vnp-us-west-1",
    timestamp: new Date().toISOString(),
    latency_p50_ms: 220.4,
    latency_p95_ms: 480.2,
    latency_p99_ms: 850.1,
    latency_p99_9_ms: 1200.5,
    error_rate_pct: 0.12,
    uptime_pct: 99.95,
    peak_rps_sustained: 450,
    tls_version: "1.3",
    http_version: "HTTP/2",
    ratelimit_headers_present: true,
    x402_ready: false,
    measurement_status: "success",
  }
];

const MOCK_SCORES = [
  {
    id: "fc75f8ab-10df-4ea8-aa92-f04b127ab1f3",
    api_id: "did:vnp:api:stripe-payments",
    window: "30d",
    computed_at: new Date().toISOString(),
    measurement_count: 43200,
    composite_score: 98.4,
    confidence_interval_95_lower: 98.1,
    confidence_interval_95_upper: 98.7,
    is_provisional: false,
    p99_latency_score: 96.5,
    error_rate_score: 99.8,
    availability_score: 100.0,
    throughput_score: 95.0,
    security_score: 100.0,
    documentation_score: 100.0,
    versioning_score: 98.0,
    m2m_compliance_score: 100.0,
    ratelimit_transparency_score: 100.0,
    dx_ttfc_score: 96.0,
    score_us_east: 98.9,
    score_us_west: 98.2,
    score_eu_west: 97.4,
    score_ap_southeast: 96.1,
    score_ap_northeast: 95.8,
  },
  {
    id: "dc83fa9b-e8df-42fa-ba41-f09b2512f4ba",
    api_id: "did:vnp:api:openai-api",
    window: "30d",
    computed_at: new Date().toISOString(),
    measurement_count: 42100,
    composite_score: 87.2,
    confidence_interval_95_lower: 86.8,
    confidence_interval_95_upper: 87.6,
    is_provisional: false,
    p99_latency_score: 82.1,
    error_rate_score: 98.4,
    availability_score: 99.9,
    throughput_score: 92.0,
    security_score: 100.0,
    documentation_score: 85.0,
    versioning_score: 90.0,
    m2m_compliance_score: 50.0,
    ratelimit_transparency_score: 100.0,
    dx_ttfc_score: 85.0,
    score_us_east: 89.4,
    score_us_west: 88.7,
    score_eu_west: 86.2,
    score_ap_southeast: 84.1,
    score_ap_northeast: 83.4,
  }
];

// GraphQL Type Definitions
const typeDefs = `#graphql
  type Query {
    measurements(api_id: String, region: String, limit: Int): [Measurement!]!
    scores(api_id: String, window: String, limit: Int): [Score!]!
    score(api_id: String!, window: String!): Score
    disputes(api_id: String): [Dispute!]!
    governanceEvents: [GovernanceEvent!]!
  }

  type Measurement {
    id: ID!
    api_id: String!
    api_version: String
    region: String!
    node_id: String!
    timestamp: String!
    latency_p50_ms: Float
    latency_p95_ms: Float
    latency_p99_ms: Float
    latency_p99_9_ms: Float
    error_rate_pct: Float
    uptime_pct: Float
    peak_rps_sustained: Int
    tls_version: String
    http_version: String
    ratelimit_headers_present: Boolean
    x402_ready: Boolean
    measurement_status: String
  }

  type Score {
    id: ID!
    api_id: String!
    window: String!
    computed_at: String!
    measurement_count: Int
    composite_score: Float
    confidence_interval_95_lower: Float
    confidence_interval_95_upper: Float
    is_provisional: Boolean
    p99_latency_score: Float
    error_rate_score: Float
    availability_score: Float
    throughput_score: Float
    security_score: Float
    documentation_score: Float
    versioning_score: Float
    m2m_compliance_score: Float
    ratelimit_transparency_score: Float
    dx_ttfc_score: Float
    score_us_east: Float
    score_us_west: Float
    score_eu_west: Float
    score_ap_southeast: Float
    score_ap_northeast: Float
  }

  type Dispute {
    id: ID!
    api_id: String!
    dispute_id: String!
    status: String!
  }

  type GovernanceEvent {
    id: ID!
    event_type: String!
    title: String!
    timestamp: String!
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    measurements: async (_, { api_id, region, limit = 100 }) => {
      if (!clickhouseClient) return MOCK_MEASUREMENTS;
      try {
        let query = "SELECT * FROM vnp.measurements WHERE 1=1";
        if (api_id) query += ` AND api_id = '${api_id}'`;
        if (region) query += ` AND region = '${region}'`;
        query += ` ORDER BY timestamp DESC LIMIT ${limit}`;

        const resultSet = await clickhouseClient.query({
          query,
          format: "JSONEachRow",
        });
        const rows = await resultSet.json();
        return rows.map(r => ({
          ...r,
          ratelimit_headers_present: !!r.ratelimit_headers_present,
          x402_ready: !!r.x402_ready,
        }));
      } catch (err) {
        console.warn("ClickHouse measurements query failed, using mocks:", err.message);
        return MOCK_MEASUREMENTS;
      }
    },
    scores: async (_, { api_id, window, limit = 100 }) => {
      if (!clickhouseClient) return MOCK_SCORES;
      try {
        let query = "SELECT * FROM vnp.scores WHERE 1=1";
        if (api_id) query += ` AND api_id = '${api_id}'`;
        if (window) query += ` AND window = '${window}'`;
        query += ` ORDER BY computed_at DESC LIMIT ${limit}`;

        const resultSet = await clickhouseClient.query({
          query,
          format: "JSONEachRow",
        });
        const rows = await resultSet.json();
        return rows.map(r => ({
          ...r,
          is_provisional: !!r.is_provisional,
        }));
      } catch (err) {
        console.warn("ClickHouse scores query failed, using mocks:", err.message);
        return MOCK_SCORES;
      }
    },
    score: async (_, { api_id, window }) => {
      if (!clickhouseClient) return MOCK_SCORES.find(s => s.api_id === api_id && s.window === window) || MOCK_SCORES[0];
      try {
        const query = `SELECT * FROM vnp.scores WHERE api_id = '${api_id}' AND window = '${window}' ORDER BY computed_at DESC LIMIT 1`;
        const resultSet = await clickhouseClient.query({
          query,
          format: "JSONEachRow",
        });
        const rows = await resultSet.json();
        if (rows.length === 0) return null;
        return {
          ...rows[0],
          is_provisional: !!rows[0].is_provisional,
        };
      } catch (err) {
        console.warn("ClickHouse score query failed, using mocks:", err.message);
        return MOCK_SCORES.find(s => s.api_id === api_id && s.window === window) || MOCK_SCORES[0];
      }
    },
    disputes: async (_, { api_id }) => {
      const mockDisputes = [
        { id: "1", api_id: "did:vnp:api:stripe-payments", dispute_id: "disp-001", status: "rejected" },
        { id: "2", api_id: "did:vnp:api:openai-api", dispute_id: "disp-002", status: "pending" }
      ];
      if (!clickhouseClient) return mockDisputes;
      try {
        let query = "SELECT * FROM vnp.disputes WHERE 1=1";
        if (api_id) query += ` AND api_id = '${api_id}'`;
        const resultSet = await clickhouseClient.query({
          query,
          format: "JSONEachRow",
        });
        const rows = await resultSet.json();
        return rows;
      } catch (err) {
        return mockDisputes;
      }
    },
    governanceEvents: async () => {
      const mockEvents = [
        { id: "1", event_type: "proposal", title: "TSC member ballot #4", timestamp: new Date().toISOString() },
        { id: "2", event_type: "system", title: "Methodology v0.1 lock enforced", timestamp: new Date().toISOString() }
      ];
      if (!clickhouseClient) return mockEvents;
      try {
        const query = "SELECT * FROM vnp.governance_events ORDER BY timestamp DESC LIMIT 50";
        const resultSet = await clickhouseClient.query({
          query,
          format: "JSONEachRow",
        });
        const rows = await resultSet.json();
        return rows;
      } catch (err) {
        return mockEvents;
      }
    }
  }
};

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
  });

  console.log(`\n✓ GraphQL API Server ready at ${url}`);
  console.log(`  ClickHouse backend: http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}\n`);
}

startServer().catch(err => {
  console.error("Failed to start GraphQL Server:", err);
  process.exit(1);
});
