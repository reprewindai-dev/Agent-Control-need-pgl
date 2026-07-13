> Historical generated implementation package. It is not evidence of deployed production capability.

# VNP v0.1 → v1.0 BLUEPRINT LOCK
## PHASE 1: FEATURE AUDIT & ARCHITECTURE FINALIZATION

**Status:** LOCKED FOR BUILD  
**Build Start:** Immediate (Phase 2)  
**Deployment Target:** Linux Foundation Series, Base L2, IPFS  
**Live System Reference:** 15 APIs scored, 916K measurements, 5 regions, M2M attestation active

---

## BUCKET A: BLUEPRINT-LOCKED (FROM LIVE SCREENSHOTS)

These features **MUST exist identically** in v1.0. No modifications without explicit approval.

### A.1 Frontend Dashboard (Next.js)

**Sacred Elements:**
- [ ] Header: "Veklom Nexus Protocol" + status badge (LIVE, v0.1.0-MAINNET)
- [ ] KPI Row: APIS SCORED (15), AVG COMPOSITE (86.1), MEASUREMENTS (916,435), HIGH CONFIDENCE (15/15)
- [ ] Tab Navigation: Trust Node Matrix | PGL Identity Layer | Consensus Vector | Methodology | Staking Protocol
- [ ] Main Card Grid: 4+ API cards per row, each showing:
  - API name + score (large, green for 80+, yellow for 70-79, red <70)
  - 7-axis radar chart (DX, Errors, Limits, x402, Version, Security, Docs)
  - Numeric breakdown: p99 Latency, Error Rate, Availability, Throughput, etc.
  - Last measured timestamp + confidence interval
- [ ] Left Sidebar: Real-time measurement feed
  - Scrolling list of measurements (timestamp, API, region, metric snapshot)
  - Color-coded: MEASUREMENT, ANCHOR, SCORE UPDATE, ANCHOR events
  - Live log (not paginated; streaming)
- [ ] Color Scheme: Dark background (#1a1a1a), accent yellow (#FFD700), green (#00FF00), red (#FF0000)

**Not sacred (style variations OK):**
- Font sizes
- Card padding/margins
- Chart animation speed
- Sidebar width

### A.2 Trust Node Matrix Tab

**Sacred:**
- [ ] Title: "TRUST NODE MATRIX"
- [ ] 5 region boxes (US-E, US-W, EU-W, AP-SE, AP-NE)
- [ ] Each region shows: probe count, status (PROBING/VERIFYING/ANCHORED)
- [ ] Node count per region displayed

### A.3 PGL Identity Layer Tab

**Sacred:**
- [ ] Title: "PGL IDENTITY LAYER"
- [ ] Display: 12 active genomes (auto-generated from measurement nodes)
- [ ] Attestation chain length: 809,062 SHA-256 hash-linked events
- [ ] Avg trust index: 90 /100
- [ ] Node regions: 5 distributed verification

### A.4 Consensus Vector Tab

**Sacred:**
- [ ] Shows multi-region consensus on scores
- [ ] Display: 5 regions voting on each API score
- [ ] Visual: green checkmarks where regions agree, yellow flags where outliers detected
- [ ] Outlier detection threshold: 3σ (locked, not configurable)

### A.5 Methodology Tab

**Sacred:**
- [ ] Links to:
  - Methodology Specification v0.1 (LOCKED, public link)
  - Governance Charter v1.0 (OPEN COMMENT, public link)
  - W3C CG Charter (PUBLISHED, public link)
- [ ] Normative Document Stack display
- [ ] "10-Dimension Scoring Model" collapsible section showing all weights + formulas

### A.6 M2M Trust Attestation Cycle

**Sacred:**
- [ ] Phase indicator: PHASE 1 (ACTIVE) | PHASE 2 (status) | PHASE 3 (status)
- [ ] Phase 1: "Measurement Collection" (16 nodes execute randomized probes across 5 regions)
- [ ] Phase 2: "Multi-Node Validation" (Independent operators validate; outliers flagged)
- [ ] Phase 3: "Chain Anchoring" (Hourly Merkle root to Base L2 contract; append-only proof registry)
- [ ] Base L2 contract status: "Not started" | "Deploying" | "Live"

### A.7 Node Topology Map

**Sacred:**
- [ ] 5 region boxes arranged horizontally
- [ ] Each box: region name, probe count (auto-updating), health status (green/yellow/red)
- [ ] Example values from screenshots:
  - US-E: 5,203 probes
  - US-W: 5,678 probes
  - EU-W: 5,197 probes
  - AP-SE: 5,393 probes
  - AP-NE: 5,210 probes

---

## BUCKET B: MISSING BUT VALUABLE (Include if zero friction)

### B.1 Geographic Heatmap (ADD TO DASHBOARD)

**Benefit:** Shows which regions perform well/poorly for each API  
**Implementation:** Auto-generated from ClickHouse query (no manual config)  
**Status:** ✓ ADD — very low friction, high value

**Details:**
- New subtab under Methodology: "REGIONAL PERFORMANCE"
- Grid: APIs (rows) × Regions (columns)
- Cell color: green (>85), yellow (70-85), red (<70)
- No interaction needed; purely informational

### B.2 Score Change Alerts (ADD TO FRONTEND)

**Benefit:** Notify if an API's score drops >5 points (degradation warning)  
**Implementation:** Webhook-triggered (no polling)  
**Status:** ✓ ADD — webhook is already in Phase 2 API

**Details:**
- In sidebar, add alert section: "SCORE DEGRADATIONS (last 7d)"
- Show: API name, old score, new score, date
- Example: "Stripe Payments 87.4 → 82.1 (Jun 22)"

### B.3 API Provider Dashboard (Claim Your API)

**Benefit:** Allows API providers to see their score + breakdown without code  
**Implementation:** Public, read-only; no auth required, claim via email verification  
**Status:** ✓ ADD — deferred to v0.2 (legal review needed for "claim" process)

**For v0.1:** Placeholder page linking to "vnp.io/providers" (form TBD in v0.2)

### B.4 Conformance Badge Generator

**Benefit:** Embeddable SVG badge for GitHub, docs, websites  
**Implementation:** Shields.io-compatible endpoint  
**Status:** ✓ ADD — zero dependencies, high adoption leverage

**Details:**
- Endpoint: `https://vnp.io/v1/badge/{api-id}.svg`
- Example URL: `https://vnp.io/v1/badge/stripe-payments.svg`
- Returns: SVG showing score + color (green/yellow/red)
- Include in Methodology tab under "Embeddable Resources"

---

## BUCKET C: TRASH (DELETE IMMEDIATELY)

### C.1 Staking Protocol Tab
**Status:** ✗ DELETE  
**Reason:** Token staking is v0.2+ feature; showing non-functional UI confuses users; remove the tab entirely

### C.2 Custom "Agent Genome Registry" (User-Editable)
**Status:** ✗ DELETE  
**Reason:** Genomes are auto-generated from measurement nodes; users cannot (and should not) create custom genomes; if display exists, make read-only only

### C.3 Configuration UI / Tuning Controls
**Status:** ✗ DELETE  
**Reason:** All parameters are locked by methodology v0.1; no tuning, no configuration, no "advanced settings"

### C.4 "Coming Soon" / Placeholder Features
**Status:** ✗ DELETE  
**Reason:** Every UI element must be functional or not exist; no teaser placeholders

---

## UNIVERSAL DATA MODEL (LOCKED)

Every measurement, every API, every region MUST conform to this schema. No variations.

### Measurement Record (Core)

```json
{
  "measurement": {
    "id": "uuid-v4",
    "timestamp": "ISO-8601-UTC",
    "api_id": "did:vnp:api:{api-slug}",
    "api_version": "semantic-version",
    "region": "us-east|us-west|eu-west|ap-southeast|ap-northeast",
    "node_operator_id": "operator-{random-suffix}",
    
    "metrics": {
      "latency_p50_ms": 42.5,
      "latency_p95_ms": 154.3,
      "latency_p99_ms": 247.8,
      "latency_p99_9_ms": 312.1,
      "error_rate_pct": 0.25,
      "response_validation_failed_pct": 0.02,
      "uptime_pct": 99.98,
      "peak_rps_sustained": 850,
      "tls_version": "1.3",
      "http_version": "2.0|3.0",
      "ratelimit_headers_present": true,
      "x402_ready": true,
      "broken_object_level_auth_detected": false
    },
    
    "provenance": {
      "test_harness_version": "vnp-agent-v0.1.0",
      "harness_executable_hash": "sha256:abc123...",
      "k6_script_hash": "sha256:def456...",
      "measurement_duration_seconds": 300,
      "total_requests_executed": 1200,
      "request_concurrency": 10
    },
    
    "cryptography": {
      "node_signing_key": "did:key:z6...",
      "measurement_signature": "0x...",
      "merkle_root": "0x5a1b...e7d2",
      "merkle_root_index": 12043,
      
      "chain_anchor": {
        "chain": "base",
        "tx_hash": "0x...",
        "block_number": 23847291,
        "block_timestamp": "2026-06-22T14:30:00Z",
        "contract_address": "0x..."
      }
    }
  }
}
```

### Score Record (Derived from Measurements)

```json
{
  "score": {
    "api_id": "did:vnp:api:{api-slug}",
    "computed_at": "ISO-8601-UTC",
    "window": "30d|7d|24h|1h|realtime",
    
    "composite": {
      "score": 87.4,
      "confidence_interval_95_lower": 85.1,
      "confidence_interval_95_upper": 89.7,
      "measurement_count": 18400,
      "is_provisional": false
    },
    
    "dimensions": {
      "p99_latency": {
        "score": 92.0,
        "p99_ms": 85,
        "weight": 0.40
      },
      "error_rate": {
        "score": 96.0,
        "error_pct": 0.25,
        "weight": 0.25
      },
      "availability": {
        "score": 99.8,
        "uptime_pct": 99.98,
        "weight": 0.15
      },
      "throughput": {
        "score": 85.0,
        "peak_rps": 850,
        "weight": 0.08
      },
      "security": {
        "score": 98.0,
        "tls_version": "1.3",
        "owasp_top10_issues": [],
        "weight": 0.08
      },
      "documentation": {
        "score": 82.0,
        "openapi_spec_complete": true,
        "changelog_present": true,
        "weight": 0.07
      },
      "versioning_stability": {
        "score": 90.0,
        "breaking_changes_90d": 0,
        "deprecation_notice_lead_days": 45,
        "weight": 0.07
      },
      "m2m_compliance": {
        "score": 100.0,
        "x402_ready": true,
        "settlement_latency_ms": 95,
        "weight": 0.06
      },
      "ratelimit_transparency": {
        "score": 100.0,
        "headers_present": true,
        "weight": 0.06
      },
      "dx_ttfc": {
        "score": 75.0,
        "time_to_first_call_minutes": 8,
        "weight": 0.05
      }
    },
    
    "regional": {
      "us_east": 87.1,
      "us_west": 87.6,
      "eu_west": 86.9,
      "ap_southeast": 87.2,
      "ap_northeast": 87.5
    },
    
    "provenance": {
      "scoring_engine_version": "vnp-scorer-v0.1.0",
      "scoring_formula_hash": "sha256:methodology-v0.1-locked",
      "input_measurement_ids": ["uuid1", "uuid2", "..."],
      "methodology_version": "0.1.0",
      "methodology_locked_until": "2027-06-22"
    },
    
    "cryptography": {
      "issuer_did": "did:vnp:issuer:veklom-foundation",
      "issuer_signature": "0x...",
      "merkle_root": "0x...",
      "chain_anchor": {
        "chain": "base",
        "tx_hash": "0x...",
        "block_number": 23847300
      }
    }
  }
}
```

### Rule
**If data doesn't fit this model exactly, it is rejected at ingestion. No exceptions.**

---

## VERSO CONSTRAINTS (LOCKED — NON-NEGOTIABLE)

VNP v0.1 runs **completely in-app** with **zero external dependencies**.

- [x] One upload: All code in `/vnp` directory, single `docker-compose up`
- [x] No external APIs: k6, ClickHouse, Python, Go — all open-source, self-hosted
- [x] No auth: Dashboard is 100% public read-only
- [x] No paid services: All infrastructure cost-free or self-hosted
- [x] No background jobs: Event-driven measurement (cron triggers k6, measurements trigger scoring)
- [x] No "later we'll add": Chain anchoring to Base L2 IS implemented; dispute oracle deferred to v0.2
- [x] Reproducible: Any agent can clone the repo and deploy identically

---

## ANTI-GAMING CONTROLS (LOCKED IN CODE)

These controls are **hardcoded**. They cannot be disabled, even by operators.

### Control 1: Randomized Measurement Timing
- Base interval: 3,600 seconds (1 hour)
- Jitter: ±900 seconds (±15 minutes)
- Implementation: `Math.random() * 1800000 - 900000` added to each scheduled probe
- Result: No predictable schedule; providers cannot pre-warm infrastructure

### Control 2: Rotating Node Identities
- IP rotation: 5 residential proxies, changed every 10 requests
- User-Agent: Randomized per request (from pool of 50+ real browser UAs)
- TLS cipher suite: Randomized per request (ECDHE-ECDSA-AES256-GCM-SHA384, etc.)
- Result: Requests are indistinguishable from real traffic

### Control 3: Traffic Replay (eBPF-based)
- Payload shapes generated from anonymized real-world API traces
- Request concurrency: Randomized 5–20 concurrent requests
- Think time between requests: Exponential distribution (realistic bursty traffic)
- Result: Synthetic tests mimic human + agentic traffic patterns

### Control 4: Statistical Outlier Detection
- Threshold: 3 standard deviations (3σ) from peer group median
- Action: Measurements outside 3σ are flagged, reviewed, and potentially re-run
- Automation: Python service runs hourly, no human intervention
- Result: Compromised or misconfigured nodes detected automatically

### Control 5: Spot Checks (Audit Trail)
- Frequency: 5% of all measurements
- Process: Independent node operator re-runs same test
- Tolerance: Results must match within 10% or original measurement is flagged
- Result: Incentivizes honest reporting; detects corruption

---

## DEPLOYMENT READINESS CHECKLIST

### Pre-Build Verification
- [x] Feature audit complete (Buckets A/B/C locked)
- [x] Universal data model defined (all fields specified)
- [x] Verso constraints confirmed (zero external dependencies)
- [x] Anti-gaming controls listed (hardcoded in Phase 2)
- [x] Governance documents referenced (W3C CG, LF Charter, Methodology)

### Sign-Off
**Blueprint locked. Ready for Phase 2 (Build).**

**Next Step:** Generate all Phase 2 code (measurement agent, scoring engine, API, dashboard, smart contract, tests).

---

**BUILD AUTHORIZATION:** Proceed to Phase 2 immediately upon receipt of this lockfile.
