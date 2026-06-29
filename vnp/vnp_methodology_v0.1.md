# Veklom Nexus Protocol (VNP) — Benchmark Methodology Specification v0.1

**Version:** 0.1.0  
**Status:** LOCKED FOR MEASUREMENT (Open Comment Period closes 2026-06-30)  
**Effective Date:** 2026-07-01 (v0.1 scoring begins)  
**Last Updated:** 2026-06-22

---

## EXECUTIVE SUMMARY

The Veklom Nexus Protocol (VNP) v0.1 measures API quality across **10 core dimensions**, combining them into a single composite score (0–100) that reflects real-world performance and reliability.

**Design principle:** Tail latency (p99) and reliability matter infinitely more than averages. A single 30-second timeout destroys an AI agent workflow; it is **not** masked by 999 fast requests. The VNP score reflects this asymmetric impact.

**Measurement model:** Continuous, globally distributed, real-time. Every measurement is cryptographically signed, Merkle-rooted, and anchored on-chain (Base L2) for immutability.

**Scope (v0.1):** REST APIs (OpenAPI 3.1) and x402-compatible payment endpoints. gRPC and AsyncAPI in v0.2.

---

## PART 1: SCORING DIMENSIONS & WEIGHTS

### Dimension 1: p99 Latency (40% weight)

**Definition:** The 99th percentile round-trip time (in milliseconds) for a single API request.

**Why 40%?** Because p99 is where user-facing and agentic timeouts occur. A p99 of 500ms breaks real-time workflows; averages hide this.

**Measurement:**
- Measure 1,000+ requests per API per measurement window
- Sort by response time (including network + server processing)
- Report: p50, p95, p99, p99.9

**Normalization (critical for fairness):**
- **Geographic adjustment:** Account for baseline network latency to the API's region
  - us-east API measured from us-west: baseline ~50ms network latency
  - us-east API measured from ap-southeast: baseline ~150ms network latency
  - Subtract baseline from measurement, then re-add a global baseline (50ms)
  - **Result:** API performance, not geography, is scored
- **Hardware adjustment:** All measurement nodes run identical containerized test agents (k6) to eliminate machine-specific variance

**Formula:**
```
p99_score = 100 - (normalized_p99_latency / 1000) * 100

If normalized_p99_latency = 100ms → score = 90
If normalized_p99_latency = 200ms → score = 80
If normalized_p99_latency = 500ms → score = 50
If normalized_p99_latency = 1000ms+ → score ≤ 0
```

**Reporting:**
- Report p99 latency for each measurement region separately (not averaged)
- Composite p99 score = median of all regional p99 scores

**Anti-gaming:**
- Measurement timing is randomized ±15 minutes (no fixed cron schedule)
- Node locations are rotated monthly to prevent targeting specific regions
- TLS cipher suite and HTTP version are randomized per request

---

### Dimension 2: Error Rate & Response Correctness (25% weight)

**Definition:** Percentage of requests that fail (4xx/5xx) OR return a 200 with an incorrect/empty response body.

**Why 25%?** Reliability is the second-order effect. An API can be fast but broken.

**Measurement:**
- For each request, validate:
  - HTTP status code is 2xx (not 4xx or 5xx)
  - Response body is **not empty**
  - Response body matches the OpenAPI spec (schema validation)
- Count failures across 1,000+ requests per measurement window

**Formula:**
```
raw_error_rate = (failed_requests / total_requests) * 100

error_score = 100 - raw_error_rate

If error_rate = 0.5% → score = 99.5
If error_rate = 1% → score = 99
If error_rate = 5% → score = 95
If error_rate > 10% → score ≤ 90
```

**Reporting:**
- **4xx error breakdown:** What % are client-side errors (malformed request) vs. actual failures
- **5xx error breakdown:** Server-side failure percentage
- **Empty response breakdown:** % of 200 responses with no body (common bug)

**Anti-gaming:**
- Responses are spot-checked by a secondary validator (prevents HTTP 200 with garbage body)
- Response time is **not** validated (latency is measured separately; some APIs are slow but correct)

---

### Dimension 3: Availability & Uptime (15% weight)

**Definition:** Percentage of successful requests over a 30-day rolling window, measured from 5 geographic regions independently.

**Why 15%?** An unavailable API is useless, but perfect latency 99% of the time + 1% downtime is worse than consistent slow latency.

**Measurement:**
- **"Successful" = HTTP 2xx AND non-empty response body**
- Measure every hour from each region
- Track consecutive failures (brownouts) as separate metric

**Formula:**
```
uptime_percent = (successful_requests / total_requests) * 100

availability_score = uptime_percent

If uptime = 99.99% → score = 99.99
If uptime = 99.9% → score = 99.9
If uptime = 99% → score = 99
If uptime < 95% → score = uptime_percent (no floor)
```

**Brownout detection (bonus penalty):**
- If an API returns failures for >5 consecutive minutes, flag as "brownout"
- Brownouts count as 2x failure rate (a 5-minute outage is worse than 5 random failures scattered across a day)

**Reporting:**
- Uptime by region (not averaged; respect regional differences)
- Consecutive downtime incidents (longest, count per month)
- Brownout percentage

**Anti-gaming:**
- Measurement happens 24/7, at randomized intervals
- Providers cannot schedule maintenance windows that coincide with measurement

---

### Dimension 4: Throughput & Capacity (8% weight)

**Definition:** Requests per second (RPS) that the API can sustain without degradation.

**Why 8%?** Throughput matters for scale, but tail latency matters more for real-time. A slow API is worse than a low-capacity API (you can queue requests).

**Measurement:**
- Progressive load test: start at 10 RPS, increase by 10 RPS every 30 seconds until error rate >5%
- Record the peak sustainable RPS
- **Key:** Latency must not increase >2x during load test (otherwise API is brittle)

**Formula:**
```
throughput_score = (peak_rps / expected_rps_for_api_type) * 100

Capped at 100. E.g., if API supports 1,000 RPS and max expected is 10,000 RPS:
  score = min(1000 / 10000 * 100, 100) = 10

(This prevents mega-scale APIs from gaming small-scale APIs on absolute RPS)
```

**Expected RPS by API type (v0.1):**
- AI inference API: 100–1,000 RPS expected
- REST CRUD API: 1,000–10,000 RPS expected
- Real-time WebSocket: 10,000+ RPS expected

**Reporting:**
- Peak RPS sustained
- Latency degradation during load test (p99 latency at 50% capacity vs. 90% capacity)

**Anti-gaming:**
- Load test is run from a single region (prevents geographic advantage)
- API provider is **notified** load test is coming (prevents surprise DDoS claims)

---

### Dimension 5: Security Posture (8% weight)

**Definition:** Compliance with TLS, authentication, and OWASP API Top 10 v2023.

**Why 8%?** Security is critical but not primary for benchmark scores (it's a pass/fail for many use cases). VNP measures security, not compliance grades.

**Measurement:**

**TLS (5 points):**
- TLS 1.3: 5 points
- TLS 1.2 with AEAD ciphers (ChaCha20-Poly1305, AES-GCM): 3 points
- TLS 1.2 with weak ciphers (AES-CBC): 0 points
- No TLS / plain HTTP: -100 points (immediate disqualification)

**Authentication (2 points):**
- x402 payment token auth: 2 points
- OAuth 2.0 / OpenID Connect: 1.5 points
- API key in header: 1 point
- No auth / public: 0 points (may be correct for public APIs)

**OWASP API Top 10 Compliance (1 point):**
- Automated probe for: Broken Object Level Authorization (API1), Broken Authentication (API2), Broken Object Property Level Authorization (API3)
- Each vulnerability found: -0.5 points

**Formula:**
```
security_score = (tls_points + auth_points + owasp_points) / 8.5 * 100

If score < 0 → score = 0
```

**Reporting:**
- TLS version and cipher suite
- Authentication method
- OWASP Top 10 vulnerabilities found (if any)
- Recommendation for remediation (if issues found)

**Anti-gaming:**
- TLS checks happen once per day (not per request; TLS negotiation is expensive)
- OWASP probes use different payloads each time (prevents pattern matching)

---

### Dimension 6: Documentation Quality (7% weight)

**Definition:** Completeness and accuracy of OpenAPI specification.

**Why 7%?** Good documentation doesn't affect runtime performance, but it prevents integration errors.

**Measurement:**
- API endpoint is listed in OpenAPI spec: ✓
- All request/response fields documented: ✓
- Error codes documented (4xx/5xx): ✓
- Authentication method documented: ✓
- Rate limiting documented: ✓
- Changelog published (versions, deprecation notices): ✓

**Scoring:**
```
doc_score = (documented_fields / required_fields) * 100

Minimum required fields for 100% score:
- 1 operation per endpoint (if multi-operation, all must be documented)
- All response types (2xx, 4xx, 5xx)
- All request parameters
- Authentication scheme
- Rate limit headers
```

**Reporting:**
- OpenAPI spec URL
- Documentation completeness percentage
- Missing fields (if any)

---

### Dimension 7: Versioning Stability (7% weight)

**Definition:** How often the API introduces breaking changes and how much advance notice providers give.

**Why 7%?** Autonomous agents cannot handle surprise breaking changes.

**Measurement:**
- Track breaking changes over 90 days:
  - Endpoint removal: 1 breaking change
  - Request parameter removal: 1 breaking change
  - Response field removal: 0.5 breaking changes (usually non-breaking)
  - Schema change (e.g., string → number): 1 breaking change
- Track deprecation notices:
  - 60+ days notice: 0 penalty
  - 30–60 days notice: 0.5 penalty
  - <30 days notice: 1 penalty per change

**Formula:**
```
stability_score = 100 - (breaking_changes_count + deprecation_penalties) * 10

If score < 0 → score = 0
```

**Reporting:**
- Number of breaking changes in past 90 days
- Deprecation notice lead time (average)
- Changelog URL (must exist)

---

### Dimension 8: x402/MPP Protocol Compliance (6% weight)

**Definition:** API supports x402 payment protocol, returns proper HTTP 402 headers, and integrates with Machine Payments Protocol (MPP).

**Why 6%?** This is the v0.1 focus (M2M commerce). In v0.2, this weight may shift.

**Measurement:**
- API responds to HTTP 402 payment requests: ✓ (100 points)
- Payment manifest includes x-vnp-score field: ✓ (50 points)
- Rate limit headers follow RFC 7234 (RateLimit-*): ✓ (50 points)
- Payment settlement completes within 5 seconds: ✓ (100 points)

**Formula:**
```
m2m_score = (points_earned / 300) * 100

API without x402 support: score = 0
API with x402 but missing fields: score = 50–75
API with full x402 compliance: score = 100
```

**Reporting:**
- x402 support: YES/NO
- Payment manifest structure (valid/invalid)
- Settlement latency (average)

**Note:** APIs without x402 support in v0.1 are still measured and scored (all other dimensions). They will show "x402 Ready: NO" in the results.

---

### Dimension 9: Rate Limit Transparency (6% weight)

**Definition:** API exposes rate limits via standard HTTP headers so clients can self-throttle.

**Why 6%?** Autonomous agents need to know when they're about to hit rate limits and back off intelligently.

**Measurement:**
- API returns standard rate limit headers:
  - `RateLimit-Limit`: total requests allowed in window
  - `RateLimit-Remaining`: requests left in current window
  - `RateLimit-Reset`: timestamp when limit resets
- Headers are accurate (we validate by actually hitting the limit)

**Scoring:**
```
ratelimit_score = 100 * (headers_present_and_accurate)

If all three headers present and accurate: 100
If two headers present: 50
If one header present: 25
If no headers: 0
```

**Reporting:**
- Header presence (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
- Header accuracy (tested by overloading and verifying reset behavior)

---

### Dimension 10: Developer Experience (DX) — Time to First Successful Call (TTFC)

**Definition:** How long it takes a developer to make the first successful API call (excluding auth setup).

**Why 5%?** DX is important for adoption, but it's lagging indicator of actual API maturity.

**Measurement:**
- Start with clean environment
- Follow API's getting started guide
- Make first API call
- Record time (seconds)
- Measure from three regional examples (us-east, eu-west, ap-southeast)

**Scoring:**
```
ttfc_score = 100 - (time_minutes * 5)

If TTFC = 0 min (instant): score = 100
If TTFC = 5 min (typical REST API): score = 75
If TTFC = 10 min (requires setup): score = 50
If TTFC = 20+ min (complex setup): score = 0
```

**Reporting:**
- Time to first successful call (in minutes)
- Bottleneck (authentication, documentation, SDK, etc.)
- Recommendation (e.g., "publish example curl command")

---

## PART 2: COMPOSITE SCORE CALCULATION

### Composite Score Formula (0–100)

```
VNP_Score = (
  0.40 * p99_latency_score +
  0.25 * error_rate_score +
  0.15 * availability_score +
  0.08 * throughput_score +
  0.08 * security_score +
  0.07 * documentation_score +
  0.07 * versioning_stability_score +
  0.06 * m2m_compliance_score +
  0.06 * ratelimit_transparency_score +
  0.05 * ttfc_score
)

Rounded to 1 decimal place.
```

### Score Interpretation

**90–100:** World-class API. Optimized for production use and autonomous agents.  
**80–89:** Solid, production-ready API. May have minor issues in niche scenarios.  
**70–79:** Functional API. Some latency or reliability concerns; suitable for non-critical workloads.  
**60–69:** Developing API. Multiple areas for improvement; avoid for mission-critical use.  
**<60:** Not recommended for production use without significant risk assessment.

### Confidence Intervals

All scores include a 95% confidence interval based on measurement count:

```
confidence_width = 5.0 / sqrt(measurement_count)

E.g., if measurement_count = 100:
  confidence_width = 5.0 / 10 = ±0.5

If VNP_Score = 85.0 with 100 measurements:
  95% CI = [84.5, 85.5]

If measurement_count < 100:
  Score is flagged as "PROVISIONAL" until 100+ measurements are collected
```

---

## PART 3: MEASUREMENT INFRASTRUCTURE

### Geographic Regions (v0.1 minimum)

All scores are measured from **at least 5 independent regions**:

1. **us-east** (US East Coast, Virginia)
2. **us-west** (US West Coast, Oregon/California)
3. **eu-west** (Europe West, Amsterdam/Frankfurt)
4. **ap-southeast** (Asia-Pacific Southeast, Singapore)
5. **ap-northeast** (Asia-Pacific Northeast, Tokyo)

Each region runs an independent measurement node from a different provider (AWS, Azure, GCP, Hetzner, Linode, etc.).

### Measurement Frequency

- **Real-time score:** Updated hourly (rolling 100-measurement window)
- **Daily score:** Aggregated from 24 hourly measurements
- **30-day score (canonical):** The published "VNP Score" for an API

### Measurement Node Architecture

- **Stateless:** Each measurement is independent; nodes don't maintain state
- **Containerized:** k6-based agents run in Docker; easily replicated
- **Rotating identities:** Node IP addresses, User-Agent strings, and TLS cipher suites are randomized per request to prevent fingerprinting
- **Distributed:** No single entity controls >40% of measurement capacity

### Measurement Harness (k6 + OpenAPI)

- **Open source:** Apache 2.0 licensed, publicly hosted on GitHub
- **Protocol support:** REST (OpenAPI 3.1), x402 payment extensions
- **Test scenarios:**
  - Basic CRUD operations (GET, POST, PUT, DELETE)
  - Common error scenarios (invalid input, authentication failure)
  - Load test (progressive RPS increase)
  - Long-running stability test (1,000+ consecutive requests)

---

## PART 4: DATA COLLECTION & PROVENANCE

### Measurement Record Schema (JSON)

```json
{
  "api_id": "did:vnp:api:stripe-payments",
  "measurement_id": "uuid",
  "timestamp": "2026-06-22T14:30:00Z",
  "measurement_region": "us-east",
  "node_operator": "acme-labs",
  
  "metrics": {
    "latency_p50_ms": 42,
    "latency_p99_ms": 154,
    "latency_p99_9_ms": 247,
    "error_rate_pct": 0.15,
    "response_validation_failed_pct": 0.02,
    "uptime_pct": 99.98,
    "peak_rps": 850,
    "tls_version": "1.3",
    "ratelimit_headers_present": true
  },
  
  "provenance": {
    "test_harness_version": "vnp-agent-v0.1.0",
    "harness_hash": "sha256:abc123...",
    "k6_script_hash": "sha256:def456...",
    "measurement_duration_seconds": 300,
    "total_requests": 1200
  },
  
  "cryptography": {
    "node_signature": "0x...",
    "merkle_root": "0x5a1b...e7d2",
    "chain_anchor": {
      "chain": "base",
      "tx_hash": "0x...",
      "block_number": 23847291
    }
  }
}
```

### Merkle Root & On-Chain Anchoring (Base L2)

- Each hour, all measurements are aggregated into a Merkle tree
- Merkle root (32 bytes) is published to Base (L2 Ethereum)
- Smart contract: simple append-only registry, costs <$0.001 per anchor
- **Result:** Immutable proof that measurements were collected at time T

### Raw Data Storage & Archival

- **Immediate:** Measurements stored in a private ClickHouse database (fast, queryable)
- **Public archive:** Raw measurements published to IPFS weekly, pinned to Arweave permanently
- **Retention policy:** Raw data retained for 2 years; historical aggregates retained indefinitely

---

## PART 5: ANTI-GAMING CONTROLS

### Control 1: Randomized Measurement Timing

- Measurement time is randomized ±15 minutes from expected interval
- No predictable cron schedule
- Result: Providers cannot pre-warm caches or trigger auto-scaling at exact times

### Control 2: Rotating Node Identities

- Node IP addresses change daily (via residential proxy rotation)
- User-Agent strings are randomized per request
- TLS cipher suites are randomized per request
- Result: Providers cannot fingerprint measurement agents

### Control 3: Traffic Replay (eBPF-based)

- Synthetic test payloads are generated from anonymized real-world API traces
- Keploy eBPF capture ensures realistic HTTP headers, body shapes, and timing
- Result: Tests are indistinguishable from real user traffic

### Control 4: Statistical Outlier Detection

- If a measurement is >3 standard deviations from the node peer group median, it's flagged and reviewed
- Consistently divergent nodes are audited or removed
- Result: Compromised or misconfigured measurement nodes are detected automatically

### Control 5: Spot Checks (Random Audits)

- 5% of all measurements are independently re-run by a different node operator
- Results must match within 10% or the original measurement is flagged for dispute
- Result: Incentivizes honest reporting

---

## PART 6: METHODOLOGY VERSIONING & CHANGE CONTROL

### Versioning Scheme

- **Major version (v0 → v1):** Structural changes to scoring methodology (e.g., adding a new dimension)
- **Minor version (v0.1 → v0.2):** Changes to dimension weights or scoring formulas within existing dimensions
- **Patch version (v0.1.0 → v0.1.1):** Bug fixes or clarifications to measurement procedures

### Change Process

**Any methodology change requires:**
1. Proposal + justification (public GitHub issue)
2. 30-day community comment period
3. Working group evaluation
4. **2/3 TSC supermajority vote** (for minor/major versions)
5. 60-day transition period (run parallel scoring under old + new methodology)
6. Public announcement + detailed changelog

**Why this friction?** Because changing the methodology retroactively destroys score comparability. We lock the methodology first, measure honestly, publish results.

### Current Lock (v0.1)

This methodology is **LOCKED for v0.1** until 2027-06-22. Changes require:
- 2/3 TSC supermajority
- 60-day notice
- Parallel scoring during transition

---

## APPENDIX A: Example VNP Score Report

```
================================================================================
API: Stripe Payment Inference (x402 endpoint)
Report Generated: 2026-06-22 14:30 UTC
Score Valid Until: 2026-06-29
================================================================================

COMPOSITE SCORE: 87.4 [±1.2, 95% CI]
  Interpretation: World-class production API. Optimized for agentic workflows.

DIMENSIONAL SCORES:
  p99 Latency:              92.0  (normalized: 85ms)
  Error Rate:               96.0  (0.25% failures)
  Availability:             99.8  (30-day uptime)
  Throughput:               85.0  (850 peak RPS sustained)
  Security:                 98.0  (TLS 1.3, OAuth 2.0, no OWASP vulnerabilities)
  Documentation:            82.0  (OpenAPI 3.1 complete, changelog present)
  Versioning Stability:     90.0  (1 deprecation in 90 days, 45-day notice)
  x402/MPP Compliance:     100.0  (Full support, <100ms settlement)
  Rate Limit Transparency: 100.0  (All three headers present & accurate)
  DX (TTFC):                75.0  (8 minutes: requires OAuth setup)

MEASUREMENT DETAILS:
  Total Measurements: 18,400
  Measurement Regions: us-east, us-west, eu-west, ap-southeast, ap-northeast
  Node Operators: 5 independent operators
  Measurement Window: 2026-06-15 to 2026-06-22 (30 days)
  Test Harness: vnp-agent-v0.1.0
  Merkle Root: 0x5a1b...e7d2
  On-Chain Anchor: Base block 23847291 (tx: 0x...)

REGIONAL BREAKDOWN (p99 Latency):
  us-east:        84ms  (excellent)
  us-west:        91ms  (excellent)
  eu-west:        110ms (good)
  ap-southeast:   164ms (acceptable, ~150ms baseline)
  ap-northeast:   198ms (acceptable, ~170ms baseline)

ERROR BREAKDOWN:
  4xx errors:     0.10% (mostly invalid API calls in test)
  5xx errors:     0.05% (transient, <2min downtime)
  Empty responses: 0.10% (rare, recovered within 1 minute)

RECOMMENDATIONS:
  ✓ Safe for mission-critical autonomous workflows
  ⚠ Minor: Consider moving OAuth flow to pre-auth + token reuse (improve TTFC)
  ✓ Excellent x402 integration; ready for M2M marketplace

DISPUTE PROCESS:
  If you believe this score is incorrect, file a dispute:
  https://vnp.io/disputes/submit
  Tier 1 review completes within 24 hours.

Next Measurement: 2026-06-23 14:30 UTC
================================================================================
```

---

## FINAL NOTE: LOCKED METHODOLOGY

This v0.1 methodology is the foundation of VNP's credibility. It is not changed lightly. By publishing it **before** measuring any APIs, we ensure:

1. ✓ No accusation of reverse-engineering results
2. ✓ Fair, transparent rules from day one
3. ✓ Community can audit whether APIs are measured fairly
4. ✓ Government regulators can understand what the score means
5. ✓ Scores are comparable across all measurement time periods

---

**Questions?** File an issue on GitHub: `VeklomNP/methodology#1`  
**Feedback?** Comment on the public mailing list: `public-wabcg@w3.org`
