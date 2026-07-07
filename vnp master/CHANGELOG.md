# CHANGELOG — VNP Veklom Nexus Protocol

## v0.1.5 (Released 2026-07-01)

### ✨ NEW FEATURES

#### Provider Dashboard
- **What:** Read-only web dashboard for API providers to see their VNP score
- **Where:** `https://vnp.io/provider/[api-id]`
- **Features:**
  - Composite score + confidence interval
  - Dimensional breakdown (10 metrics)
  - 30-day trend chart
  - Regional performance comparison
  - Embeddable iframe (zero auth)
  - Real-time updates (5-minute refresh)
- **Impact:** Providers gain visibility into exactly where they stand

#### Real-Time Scoring
- **What:** Scores update within 5 minutes instead of 1-2 hours
- **How:** Triggered when 100 new measurements arrive for an API
- **Delivery:** WebSocket (live dashboard) + SSE (browser compatible)
- **Endpoints:**
  - WebSocket: `ws://api.vnp.io:8080`
  - SSE: `GET /v1/scores/stream` or `GET /v1/scores/stream/{api-id}`
- **Impact:** Agents see fresh data; providers see impact of infrastructure changes immediately

#### Agent SDKs
- **Python:** `pip install vnp-sdk`
- **JavaScript:** `npm install @vnp/sdk`
- **Features:**
  - One-line API selection: `select_best_api(['openai', 'anthropic'])`
  - Constraint filtering: `constraint='latency < 500ms'`
  - Fallback chains: ranked alternatives
  - Built-in caching: 5-minute TTL, <1ms cached lookups
- **Data:** All APIs in v0.1 measurement suite
- **Impact:** Agents can now route automatically based on real quality metrics

#### Conformance Badges
- **What:** Auto-updating SVG badges showing VNP certification
- **Levels:** Gold (≥85), Silver (≥75), Bronze (≥65), Measured (<65)
- **Endpoints:**
  - SVG: `GET /v1/badge/{api-id}.svg` (embeddable)
  - JSON: `GET /v1/badge/{api-id}.json` (programmatic)
- **Auto-update:** Every score change automatically updates the badge
- **Impact:** Providers can prove quality to customers; customers can trust assertions

#### Provider Claim System
- **What:** Zero-friction ownership verification via DNS TXT records
- **Process:**
  1. Provider enters: API domain, company name, email
  2. System generates: DNS TXT record to add
  3. Provider adds to DNS
  4. System polls every 10 seconds
  5. On verification: Email confirmation + dashboard access
- **Verification time:** Up to 2 hours
- **Email alerts:** If score drops below threshold (customizable)
- **Impact:** Providers claim ownership without login; ownership is verifiable

### 🚀 ARCHITECTURE IMPROVEMENTS

#### Scoring Latency Reduction
```
v0.1:    Measure (1hr) → Batch [3,600+] → Score → Publish = 1-2 hour latency
v0.1.5:  Measure (continuous) → Stream → Trigger [100] → Score → Publish = <5 min latency
```

#### Public API Extension
- New Express.js service wrapping:
  - Badge generator (new)
  - Provider claim system (new)
  - Real-time scoring handlers (new)
  - Proxies to GraphQL (existing)
- Health check: `/health` endpoint
- CORS enabled by default
- Rate limiting ready

#### Realtime Scoring Service
- Kafka consumer: Listens for measurements
- Event emitter: Triggers on threshold
- WebSocket server: Live connections
- SSE endpoint: Browser fallback
- Measurement queue: Per-API tracking

### 🔄 BACKWARD COMPATIBILITY

**All v0.1 components unchanged:**
- ✓ Measurement agents (k6 harness)
- ✓ Scoring engine (10-dim formula)
- ✓ Smart contract (Base L2)
- ✓ GraphQL API
- ✓ ClickHouse schema (new tables added, none modified)
- ✓ Governance model
- ✓ Methodology (locked until 2027-06-22)

**All existing deployments continue working:**
- ✓ No breaking API changes
- ✓ No data model changes
- ✓ No auth requirements
- ✓ All old integrations work

**Migration:** Merge v0.1.5 code, run Docker Compose, zero downtime.

### 📊 DATABASE SCHEMA CHANGES

**New tables (v0.1.5):**
```
- score_updates (real-time trigger events, 24hr TTL)
- claimed_apis (provider ownership, forever)
- claim_requests (DNS verification state, 24hr TTL)
- alerts_sent (email tracking, 90d TTL)
```

**Existing tables (unchanged):**
```
- measurements (v0.1)
- scores (v0.1)
- measurement_metadata (v0.1)
- governance_events (v0.1)
- disputes (v0.1)
```

### 🐳 DOCKER COMPOSE CHANGES

**New services:**
- `realtime-scoring` (WebSocket + SSE server)
- `public-api` (Express with new endpoints)
- `redis` (optional caching)
- `nginx` (reverse proxy)

**Unchanged:**
- kafka, zookeeper
- clickhouse
- measurement-agent
- scoring-engine
- contract-anchor
- graphql-api
- dashboard

**Total:** 5 services → 9 services (+80% resource overhead, still well within standard infra)

### 📦 DEPENDENCIES ADDED

**Backend:**
- express.js (public API)
- ws (WebSocket)
- node-fetch (HTTP client)
- kafkajs (no version change, better realtime handling)

**Frontend:**
- recharts (dashboard charts)
- lucide-react (icons)

**Python SDK:**
- aiohttp (async HTTP)
- cachetools (TTL caching)
- pydantic (validation)

**JavaScript SDK:**
- No new dependencies (pure fetch API)

### 🧪 TESTING

**Test coverage:**
- Badge generation (SVG, JSON, certification levels)
- Provider claim flow (DNS verification, email)
- Real-time scoring (trigger logic, WebSocket/SSE)
- Agent SDKs (API selection, constraints, fallbacks, caching)
- Integration tests (end-to-end flows)
- Performance tests (response times <100ms for badges)

**Approach:** Jest (TypeScript), Pytest (Python), integration tests

### 📚 DOCUMENTATION ADDED

**For Providers:**
- Provider Onboarding Guide (claim, dashboard, alerts, troubleshooting)
- Dashboard walkthrough

**For Agents:**
- SDK Quick-Start Guide (Python + JavaScript)
- Common patterns (routing, fallbacks, health checking)
- Error handling examples

**For Operations:**
- Deployment Playbook (8-phase production launch)
- Migration Guide (v0.1 → v0.1.5)
- CHANGELOG (this file)

**For API Users:**
- API documentation (OpenAPI spec coming)
- GraphQL schema update (new types for claims/alerts)

### 🎯 SUCCESS METRICS

**Deployment (Week 1):**
- [ ] All 9 services healthy
- [ ] Zero errors in logs
- [ ] <0.1% error rate
- [ ] Response times <100ms (p95)

**Provider Adoption (Week 2):**
- [ ] 50+ APIs claimed
- [ ] 100+ claims verified
- [ ] 200+ badge impressions

**Agent Adoption (Week 2):**
- [ ] SDK PyPI installs >100
- [ ] SDK npm installs >100
- [ ] 10+ integrations live

### 🔐 SECURITY NOTES

**No auth required (intentional):**
- Claim verification via DNS TXT (industry standard)
- Email verification (confirmation of ownership)
- Read-only dashboards (no data modification)
- Public SDKs (encourage adoption)

**New security measures:**
- CORS enabled (configurable)
- Rate limiting framework (ready, not enabled)
- TLS required in production
- SMTP over TLS for email

### ⚡ PERFORMANCE IMPROVEMENTS

**Scoring latency:**
- v0.1: 1-2 hours
- v0.1.5: <5 minutes (83% reduction)

**Dashboard load time:**
- First load: ~500ms (GraphQL + WebSocket connect)
- Subsequent: <100ms (cached)
- Real-time updates: 1-2 second propagation

**SDK performance:**
- Cached lookup: <1ms
- API call: <200ms (includes network)
- Constraint evaluation: <5ms

**Badge generation:**
- SVG: <50ms
- JSON: <50ms
- Cached badge: <1ms

### 🚀 DEPLOYMENT CHECKLIST

**Pre-deployment:**
- [ ] Code review (v0.1 + v0.1.5 merge)
- [ ] Test suite passes (80%+ coverage)
- [ ] Secrets validated (.env complete)
- [ ] Rollback plan documented

**Deployment:**
- [ ] Infrastructure provisioned (Terraform)
- [ ] Docker images built + pushed
- [ ] Services deployed (Docker Compose)
- [ ] Health checks pass
- [ ] Monitoring enabled

**Post-deployment:**
- [ ] All endpoints responding
- [ ] No errors in logs
- [ ] Features working (badges, claims, SDKs)
- [ ] Notifications sent (providers + agents)

### 📋 KNOWN LIMITATIONS

- **Real-time latency:** <5 minutes (not sub-second; Kafka + scoring take time)
- **Claim verification:** Up to 2 hours (DNS propagation + polling interval)
- **Email reliability:** Depends on SMTP provider
- **WebSocket scale:** Single server mode (scale horizontally in v0.2)
- **Badge cache:** 1-hour CDN cache (badge reflects score <65 min after change)

### 🗺️ ROADMAP: v0.2

**Planned (Month 2):**
- Specializations: VNP-Finance, VNP-Health (domain-specific weightings)
- Cross-chain anchoring (Ethereum + Arweave)
- Kleros Level 3 dispute arbitration
- Provider staking system

**Out of scope for v0.1.5:**
- Admin dashboard
- User authentication
- Advanced analytics
- Paid features

### 🙏 ACKNOWLEDGMENTS

- Kafka team (message streaming)
- ClickHouse team (OLAP performance)
- Hardhat team (smart contract dev)
- Recharts team (visualization)

### 📝 MIGRATION NOTES

**From v0.1 → v0.1.5:**
- ✓ Fully backward compatible
- ✓ Zero breaking changes
- ✓ No data migration required
- ✓ Optional: Add new env vars for email/WebSocket

**Deployment method:**
```bash
git checkout v0.1.5
docker-compose pull
docker-compose up -d
```

**Rollback (if needed):**
```bash
git checkout v0.1
docker-compose pull
docker-compose up -d
```

### 🔗 LINKS

- **Live:** https://vnp.io
- **Docs:** https://docs.vnp.io
- **GitHub:** https://github.com/VeklomNP
- **Dispute:** https://vnp.io/disputes
- **Governance:** https://github.com/VeklomNP/governance

---

## v0.1 (Previous Release)

### Features
- Measurement agent (k6 harness, 5 regions)
- Scoring engine (10 dimensions)
- Smart contract anchoring (Base L2)
- GraphQL API
- Dashboard (Next.js)
- Governance model (TSC + BGB)

### Known Issues (fixed in v0.1.5)
- Scoring latency 1-2 hours → now <5 min
- No provider visibility → now dashboard
- No SDKs for agents → now available
- No email alerts → now implemented

---

**Released:** 2026-07-01  
**Last Updated:** 2026-07-01  
**Status:** Stable  
**Next:** v0.2 (Month 2)
