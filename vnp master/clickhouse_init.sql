-- ============================================================================
-- VNP ClickHouse Schema Initialization
-- ============================================================================
-- 
-- Creates all tables for VNP v0.1 measurement and scoring data
-- Optimized for time-series data, fast aggregation, immutable append-only
--
-- USAGE: 
--   docker exec -i vnp-clickhouse clickhouse-client < init.sql
--   OR mounted as /docker-entrypoint-initdb.d/init.sql in docker-compose
--

CREATE DATABASE IF NOT EXISTS vnp;

USE vnp;

-- ============================================================================
-- TABLE 1: RAW MEASUREMENTS (Immutable, append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS measurements (
    -- Identifiers
    id UUID DEFAULT generateUUIDv4(),
    api_id String NOT NULL,
    api_version String,
    region Enum8(
        'us-east' = 1,
        'us-west' = 2,
        'eu-west' = 3,
        'ap-southeast' = 4,
        'ap-northeast' = 5
    ) NOT NULL,
    node_id String NOT NULL,
    node_operator_id String,
    
    -- Timestamps (for time-series aggregation)
    timestamp DateTime NOT NULL,
    measurement_date Date DEFAULT toDate(timestamp),
    
    -- Latency metrics (milliseconds)
    latency_p50_ms Float32,
    latency_p95_ms Float32,
    latency_p99_ms Float32,
    latency_p99_9_ms Float32,
    
    -- Error & Correctness metrics (percentages)
    error_rate_pct Float32,
    http_4xx_rate_pct Float32,
    http_5xx_rate_pct Float32,
    empty_response_rate_pct Float32,
    response_validation_failed_pct Float32,
    
    -- Availability metrics
    uptime_pct Float32,
    
    -- Throughput metrics
    peak_rps_sustained UInt32,
    
    -- Security metrics
    tls_version String,
    http_version String,
    
    -- Compliance metrics
    ratelimit_headers_present UInt8,
    x402_ready UInt8,
    owasp_vulnerabilities_count UInt8,
    
    -- Provenance (for auditability)
    test_harness_version String,
    harness_hash String,
    measurement_duration_seconds UInt16,
    total_requests_executed UInt32,
    request_concurrency UInt8,
    
    -- Cryptography (for immutability proof)
    node_signing_key String,
    measurement_signature String,
    merkle_root String,
    merkle_root_index UInt32,
    
    -- Chain anchoring
    chain_name String DEFAULT 'base',
    tx_hash String,
    block_number UInt64,
    block_timestamp DateTime,
    
    -- Metadata
    measurement_status Enum8('success' = 1, 'partial' = 2, 'failed' = 3),
    notes String
)
ENGINE = ReplacingMergeTree(block_timestamp)
ORDER BY (api_id, region, timestamp)
PARTITION BY toYYYYMM(timestamp)
TTL measurement_date + INTERVAL 2 YEAR;

-- Add indices for common queries
CREATE INDEX idx_api_timestamp ON measurements (api_id, timestamp) TYPE minmax GRANULARITY 1;
CREATE INDEX idx_region_timestamp ON measurements (region, timestamp) TYPE minmax GRANULARITY 1;

-- ============================================================================
-- TABLE 2: COMPUTED SCORES (Derived from measurements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scores (
    id UUID DEFAULT generateUUIDv4(),
    api_id String NOT NULL,
    
    -- Score windows (rolling windows)
    window Enum8('realtime' = 1, '1h' = 2, '24h' = 3, '7d' = 4, '30d' = 5),
    computed_at DateTime NOT NULL,
    measurement_count UInt32,
    
    -- Composite score
    composite_score Float32,
    confidence_interval_95_lower Float32,
    confidence_interval_95_upper Float32,
    is_provisional UInt8,
    
    -- Dimensional scores (10 dimensions)
    p99_latency_score Float32,
    error_rate_score Float32,
    availability_score Float32,
    throughput_score Float32,
    security_score Float32,
    documentation_score Float32,
    versioning_score Float32,
    m2m_compliance_score Float32,
    ratelimit_transparency_score Float32,
    dx_ttfc_score Float32,
    
    -- Regional breakdown
    score_us_east Float32,
    score_us_west Float32,
    score_eu_west Float32,
    score_ap_southeast Float32,
    score_ap_northeast Float32,
    
    -- Provenance
    scoring_engine_version String,
    scoring_formula_hash String,
    methodology_version String DEFAULT '0.1.0',
    methodology_locked_until Date DEFAULT '2027-06-22',
    
    -- Cryptography
    issuer_did String,
    issuer_signature String,
    merkle_root String,
    chain_name String DEFAULT 'base',
    anchor_tx_hash String,
    anchor_block_number UInt64,
    
    -- Status
    score_status Enum8('published' = 1, 'provisional' = 2, 'disputed' = 3, 'verified' = 4),
    
    -- Metadata
    last_updated DateTime DEFAULT now(),
    notes String
)
ENGINE = ReplacingMergeTree(last_updated)
ORDER BY (api_id, window, computed_at)
PARTITION BY toYYYYMM(computed_at)
TTL last_updated + INTERVAL 5 YEAR;

-- Indices for common queries
CREATE INDEX idx_api_window_time ON scores (api_id, window, computed_at) TYPE minmax GRANULARITY 1;
CREATE INDEX idx_composite_score ON scores (composite_score) TYPE minmax GRANULARITY 1;

-- ============================================================================
-- TABLE 3: MEASUREMENT METADATA (For monitoring and debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS measurement_metadata (
    id UUID DEFAULT generateUUIDv4(),
    measurement_id UUID,
    api_id String,
    region String,
    node_id String,
    
    timestamp DateTime,
    
    -- Node health indicators
    node_uptime_seconds UInt32,
    node_memory_mb UInt32,
    node_cpu_percent Float32,
    network_latency_ms Float32,
    
    -- Measurement process metrics
    probe_start_time DateTime,
    probe_end_time DateTime,
    probe_duration_ms UInt32,
    requests_sent UInt32,
    requests_successful UInt32,
    requests_failed UInt32,
    
    -- Anti-gaming controls verification
    timing_jitter_applied UInt8,
    ip_rotation_count UInt8,
    useragent_rotation_count UInt8,
    tls_cipher_rotation_count UInt8,
    
    -- Errors and anomalies
    errors_detected Array(String),
    warnings_detected Array(String),
    
    -- Chain anchoring result
    anchor_result Enum8('success' = 1, 'pending' = 2, 'failed' = 3),
    anchor_retry_count UInt8
)
ENGINE = ReplacingMergeTree(timestamp)
ORDER BY (api_id, region, timestamp)
PARTITION BY toYYYYMM(timestamp)
TTL timestamp + INTERVAL 6 MONTH;

-- ============================================================================
-- TABLE 4: DISPUTES AND APPEALS (For governance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
    id UUID DEFAULT generateUUIDv4(),
    score_id UUID,
    api_id String,
    dispute_filed_at DateTime,
    
    -- Dispute details
    tier Enum8('tier1' = 1, 'tier2' = 2, 'tier3' = 3),
    status Enum8('open' = 1, 'under_review' = 2, 'resolved' = 3, 'dismissed' = 4),
    provider_name String,
    provider_contact String,
    
    -- Dispute reason and evidence
    reason_category Enum8(
        'measurement_error' = 1,
        'methodology_unclear' = 2,
        'regional_anomaly' = 3,
        'node_failure' = 4,
        'other' = 5
    ),
    description String,
    evidence_urls Array(String),
    
    -- Tier 1 automated re-measurement
    tier1_remeasurement_executed UInt8,
    tier1_old_score Float32,
    tier1_new_score Float32,
    tier1_variance_pct Float32,
    tier1_decision Enum8('accepted' = 1, 'rejected' = 2),
    
    -- Tier 2 technical panel
    tier2_panel_members Array(String),
    tier2_meeting_date DateTime,
    tier2_decision Enum8('upheld_original' = 1, 'adjusted' = 2, 'overturned' = 3),
    tier2_notes String,
    
    -- Tier 3 community arbitration
    tier3_challenge_bond_amount Decimal64(18),
    tier3_votes_for UInt32,
    tier3_votes_against UInt32,
    tier3_decision String,
    
    -- Resolution
    resolved_at DateTime,
    resolution_notes String,
    final_score_after_resolution Float32
)
ENGINE = ReplacingMergeTree(resolved_at)
ORDER BY (api_id, dispute_filed_at)
PARTITION BY toYYYYMM(dispute_filed_at)
TTL resolved_at + INTERVAL 5 YEAR;

-- ============================================================================
-- TABLE 5: GOVERNANCE EVENTS (Audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_events (
    id UUID DEFAULT generateUUIDv4(),
    event_type Enum8(
        'tsc_election' = 1,
        'methodology_change' = 2,
        'charter_update' = 3,
        'dispute_resolution' = 4,
        'governance_vote' = 5,
        'access_policy_change' = 6,
        'other' = 7
    ),
    event_date DateTime,
    
    -- Governance context
    tsc_member_involved String,
    voting_result Enum8('passed' = 1, 'failed' = 2, 'abstained' = 3),
    vote_count_for UInt32,
    vote_count_against UInt32,
    
    -- Event details
    description String,
    documentation_url String,
    implementation_date DateTime,
    
    -- Signatures and verification
    issuer_signature String,
    block_hash String
)
ENGINE = ReplacingMergeTree(event_date)
ORDER BY event_date DESC
PARTITION BY toYYYYMM(event_date)
TTL event_date + INTERVAL 10 YEAR;

-- ============================================================================
-- MATERIALIZED VIEWS (For fast aggregation)
-- ============================================================================

-- Hourly score aggregation (for real-time dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS measurements_hourly AS
SELECT
    api_id,
    region,
    toStartOfHour(timestamp) AS hour,
    count() AS measurement_count,
    quantile(0.50)(latency_p99_ms) AS median_p99_latency,
    quantile(0.95)(latency_p99_ms) AS p95_p99_latency,
    avg(error_rate_pct) AS avg_error_rate,
    avg(uptime_pct) AS avg_uptime,
    max(peak_rps_sustained) AS max_rps
FROM measurements
GROUP BY api_id, region, hour
ENGINE = SummingMergeTree()
ORDER BY (api_id, region, hour);

-- Daily API health snapshot
CREATE MATERIALIZED VIEW IF NOT EXISTS api_daily_health AS
SELECT
    api_id,
    toDate(timestamp) AS day,
    count() AS total_measurements,
    uniqExact(region) AS regions_measured,
    uniqExact(node_id) AS unique_nodes,
    quantile(0.50)(composite_score) AS median_daily_score,
    min(composite_score) AS min_daily_score,
    max(composite_score) AS max_daily_score,
    avg(measurement_count) AS avg_measurements_per_hour
FROM scores
WHERE window = '1h'
GROUP BY api_id, day
ENGINE = SummingMergeTree()
ORDER BY (api_id, day DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate VNP composite score from dimensional scores
CREATE OR REPLACE FUNCTION calculate_composite_score(
    p99 Float32,
    error Float32,
    avail Float32,
    throughput Float32,
    security Float32,
    docs Float32,
    version Float32,
    m2m Float32,
    ratelimit Float32,
    dx Float32
) RETURNS Float32 AS $$
    SELECT round(
        p99 * 0.40 +
        error * 0.25 +
        avail * 0.15 +
        throughput * 0.08 +
        security * 0.08 +
        docs * 0.07 +
        version * 0.07 +
        m2m * 0.06 +
        ratelimit * 0.06 +
        dx * 0.05,
        1
    )
$$ LANGUAGE SQL IMMUTABLE;

-- Normalize latency by region
CREATE OR REPLACE FUNCTION normalize_latency_by_region(
    latency_ms Float32,
    region String
) RETURNS Float32 AS $$
    SELECT latency_ms - (
        CASE region
            WHEN 'us-east' THEN 0
            WHEN 'us-west' THEN 50
            WHEN 'eu-west' THEN 120
            WHEN 'ap-southeast' THEN 150
            WHEN 'ap-northeast' THEN 180
            ELSE 0
        END
    ) + 0
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================================================
-- DATA RETENTION & BACKUPS
-- ============================================================================

-- ALTER TABLE measurements MODIFY TTL measurement_date + INTERVAL 2 YEAR;
-- (Already set in table creation)

-- Enable mutations (allow UPDATE/DELETE for corrections only)
-- Note: Immutable by design; mutations require explicit governance vote

-- Create backup directory (requires ClickHouse server config)
-- Not configured here; set up via external backup tool (restic, Duplicati, etc.)

-- ============================================================================
-- INITIAL SEED DATA (Example - removed in production)
-- ============================================================================

-- Insert sample measurement for testing
-- INSERT INTO measurements (
--     api_id, region, node_id, timestamp,
--     latency_p50_ms, latency_p95_ms, latency_p99_ms,
--     error_rate_pct, uptime_pct, peak_rps_sustained,
--     measurement_status
-- ) VALUES (
--     'did:vnp:api:stripe-payments', 'us-east', 'vnp-us-east-1', now(),
--     42.5, 154.3, 247.8,
--     0.25, 99.98, 850,
--     'success'
-- );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
    'Measurements table' AS table_name,
    count() AS row_count,
    min(timestamp) AS oldest_timestamp,
    max(timestamp) AS newest_timestamp
FROM measurements
UNION ALL
SELECT
    'Scores table',
    count(),
    min(computed_at),
    max(computed_at)
FROM scores;

-- End of schema initialization
