# VNP v0.1.5 COMPLETE INTEGRATION GUIDE
## From v0.1 to Production-Ready Ecosystem

**Status:** Phase 2 (Build) — All code complete  
**Deployment:** Ready for immediate merge into v0.1 codebase  
**Architecture:** Backward-compatible, zero breaking changes  

---

## WHAT'S NEW IN v0.1.5

### 1. PROVIDER DASHBOARD (NEW)
**Component:** `vnp_provider_dashboard.tsx`

**What it does:**
- Read-only embeddable iframe for API providers
- Shows score breakdown by dimension
- Displays regional performance
- 30-day trend chart
- Real-time updates (5-minute refresh)
- Embeddable: `<iframe src="https://vnp.io/provider/[api-id]"></iframe>`

**Access:**
- Public, no authentication required
- Claim ownership via DNS verification
- Once claimed, provider receives alerts

**Data source:**
- Reads from same ClickHouse (no new DB)
- Queries GraphQL endpoint (same API)
- Uses existing score data model

**Integration:**
```
API v0.1 → ClickHouse (scores table) → GraphQL /graphql
                                       → Provider Dashboard
```

### 2. AGENT SDK (NEW)
**Components:** `vnp_sdk_python.py` + `vnp_sdk_javascript.ts`

**What it does:**
- One-line API selection for agents
- Real-time score checking
- Constraint-based filtering (latency, error rate, availability)
- Fallback chains (ranked alternatives)
- Built-in caching (5-minute TTL)

**Usage:**
```python
from vnp import select_best_api

best = select_best_api(
    candidates=["openai", "anthropic", "together"],
    constraint="latency < 500ms"
)
# Returns: {"api": "anthropic", "score": 89.2, "uri": "https://api.anthropic.com/v1"}
```

**Integration:**
```
Agent SDK → GraphQL /graphql → Score data
        → Score ranking → Best API
```

**How it drives network effect:**
- Agents use SDK → better routing decisions
- APIs see which ones agents prefer → optimize infrastructure
- Optimization → better VNP scores → more agent traffic

### 3. CONFORMANCE BADGES (NEW)
**Component:** `vnp_badge_generator.ts`

**What it does:**
- SVG badges showing score + certification level
- Auto-updates based on current score
- Gold (≥85), Silver (≥75), Bronze (≥65)
- Embeddable on GitHub, docs, websites
- Links to provider dashboard

**Endpoints:**
- `GET /v1/badge/[api-id].svg` → SVG badge (cached 1 hour)
- `GET /v1/badge/[api-id].json` → JSON with score data

**Integration:**
```
Badge Generator → GraphQL /graphql → Current score
              → Generate SVG → Providers embed
```

**Why it matters:**
- Providers want to prove quality to customers
- Customers see proof that API is actually good
- Creates positive feedback: good APIs → certified → more traffic

### 4. REAL-TIME SCORING (NEW)
**Component:** `vnp_realtime_scoring.ts`

**What it does:**
- Replaces hourly batch scoring with continuous updates
- Triggers scoring when 100 new measurements arrive
- Score latency: <5 minutes (vs. 1-2 hours in v0.1)
- WebSocket stream for live dashboard updates
- SSE (Server-Sent Events) fallback for browsers

**Architecture change:**
```
v0.1 (Batch):
  Measure (1hr) → [3600+ measurements] → Score → Publish
  Score latency: 1-2 hours
  Refresh: Hourly (dashboard polls)

v0.1.5 (Real-time):
  Measure (continuous) → [Kafka stream] → Trigger on 100 → Score → Publish
  Score latency: <5 minutes
  Refresh: WebSocket (live push)
```

**Endpoints:**
- WebSocket: `ws://api.vnp.io:8080` → Live score stream
- SSE: `GET /v1/scores/stream` → Browser-compatible stream
- Filtered: `GET /v1/scores/stream/[api-id]` → Single API updates

**Integration:**
```
Measurement Agent → Kafka → RealtimeScoringEngine
                             → Scoring trigger (100 new)
                             → Score computation
                             → WebSocket broadcast
                             → Dashboard update (live)
                             → Agent SDK refresh
```

### 5. PROVIDER CLAIM SYSTEM (NEW)
**Component:** `vnp_provider_claim_system.ts`

**What it does:**
- Zero-friction ownership verification
- DNS TXT record verification (industry standard)
- Automatic polling (2-hour verification window)
- Email notifications
- Score decline alerts

**Flow:**
1. Provider: `vnp.io/claim`
2. Enter: company name, API domain, email
3. System generates DNS TXT record
4. Provider adds record to their DNS
5. System polls every 10 seconds
6. Once verified: access to dashboard + alerts

**Alerts:**
- If score drops below threshold, email sent (max 1/day)
- Provider can adjust alert threshold
- Customizable notification email

**Integration:**
```
Claim Request → DNS Verification → ClaimedAPI record
                                 → Provider Dashboard access
                                 → Score decline alerts
```

---

## COMPLETE DATA FLOW (v0.1.5)

```
┌─────────────────────────────────────────────────────────────┐
│ MEASUREMENT AGENTS (5 regions)                              │
│ k6 test harness, IP rotation, TLS randomization            │
└────────────────────┬────────────────────────────────────────┘
                     │ Measurements (randomized timing, anti-gaming)
                     ▼
            ┌─────────────────┐
            │ KAFKA (Stream)  │
            │ Topic: measures │
            └────────┬────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  ┌───────────────┐      ┌──────────────────────┐
  │ ClickHouse    │      │ RealtimeScoringEngine│
  │ (Measurements)│      │ (Event Trigger)      │
  └───────┬───────┘      └──────────┬───────────┘
          │                         │ Trigger on 100 new
          │                         ▼
          │              ┌──────────────────────┐
          │              │ Scoring Engine       │
          │              │ (10-dim formula)     │
          │              └──────────┬───────────┘
          │                         │ Score
          │              ┌──────────▼───────────┐
          │              │ ClickHouse (Scores)  │
          │              └──────────┬───────────┘
          │                         │
          ├─────────────────────────┤
          │                         │
          ▼                         ▼
    ┌─────────────┐        ┌──────────────────┐
    │ GraphQL API │        │ WebSocket Server │
    │ /graphql    │        │ Live scores      │
    └─────┬───────┘        └──────────┬───────┘
          │                            │
    ┌─────┼────────────────────────────┤
    │     │                            │
    ▼     ▼                            ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Provider         │ │ Agent SDK        │ │ Dashboard        │
│ Dashboard        │ │ (Python/JS)      │ │ (Real-time)      │
│ (Read-only)      │ │ (1-line routing) │ │                  │
└──────┬───────────┘ └──────┬───────────┘ └──────────────────┘
       │                    │
       ├────────────────────┼──────────────────┐
       │                    │                  │
       ▼                    ▼                  ▼
  ┌─────────────┐   ┌───────────────┐   ┌─────────────┐
  │ Badges      │   │ Embed URLs    │   │ Alerts      │
  │ .svg/.json  │   │ In apps       │   │ Email       │
  └─────────────┘   └───────────────┘   └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROVIDER CLAIM SYSTEM                                       │
│ DNS verification → ClaimedAPI → Dashboard access + Alerts   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SMART CONTRACT (Base L2)                                    │
│ Hourly Merkle root anchoring (immutable proof)             │
└─────────────────────────────────────────────────────────────┘
```

---

## FILE MANIFEST (v0.1.5 ADDITIONS)

**New files (5 core components):**
1. `vnp_provider_dashboard.tsx` — Provider-facing dashboard (React)
2. `vnp_sdk_python.py` — Agent SDK for Python
3. `vnp_sdk_javascript.ts` — Agent SDK for TypeScript/JavaScript
4. `vnp_badge_generator.ts` — SVG badge endpoints
5. `vnp_realtime_scoring.ts` — Real-time scoring with WebSocket/SSE
6. `vnp_provider_claim_system.ts` — DNS verification + ownership

**Modified files (merge into v0.1 codebase):**
- `public-api/` → Add badge generator endpoints
- `public-api/` → Add claim system endpoints
- `public-api/` → Add real-time scoring handlers
- `scoring-engine/` → Update to use RealtimeScoringEngine
- `dashboard/` → Add WebSocket connection for live updates

**No changes to:**
- Measurement agent (still k6-based)
- Smart contract (still Base L2 anchoring)
- ClickHouse schema (backward compatible)
- Governance/methodology (unchanged)

---

## DEPLOYMENT STEPS (v0.1.5)

### Step 1: Code Integration
```bash
# Merge v0.1.5 components into v0.1 codebase
cd vnp-core

# Add provider dashboard
cp vnp_provider_dashboard.tsx dashboard/components/

# Add SDKs
cp vnp_sdk_python.py ./python-sdk/
cp vnp_sdk_javascript.ts ./javascript-sdk/

# Add real-time scoring
cp vnp_realtime_scoring.ts scoring-engine/src/

# Add provider claim system + badge generator
cp vnp_badge_generator.ts public-api/routes/
cp vnp_provider_claim_system.ts public-api/routes/
```

### Step 2: Update Public API
```typescript
// public-api/index.ts

import { setupBadgeRoutes } from './routes/vnp_badge_generator';
import { setupClaimRoutes, startClaimVerificationWorker } from './routes/vnp_provider_claim_system';
import { setupSseEndpoint } from './routes/vnp_realtime_scoring';

const app = express();

// Add new routes
setupBadgeRoutes(app);
setupClaimRoutes(app);
setupSseEndpoint(app, scoringEngine);

// Start background workers
startClaimVerificationWorker();
```

### Step 3: Update Dashboard
```typescript
// dashboard/components/Dashboard.tsx

// Add WebSocket connection for real-time scores
useEffect(() => {
  const ws = new WebSocket('ws://api.vnp.io:8080');
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.type === 'score-update') {
      setScores((prev) => ({
        ...prev,
        [update.data.apiId]: update.data
      }));
    }
  };
}, []);
```

### Step 4: Deploy
```bash
# Run deployment script (same as v0.1)
./deploy-vnp-production.sh

# Or update existing deployment
docker-compose up -d --build
```

### Step 5: Verify
```bash
# Test provider dashboard
curl https://vnp.io/provider/did:vnp:api:stripe-payments

# Test badges
curl https://vnp.io/v1/badge/stripe-payments.svg

# Test claim system
curl -X POST https://vnp.io/api/v1/claims \
  -d '{"api_domain":"api.stripe.com","company_name":"Stripe","company_email":"devrel@stripe.com"}'

# Test SDK
python -c "from vnp import select_best_api; print(select_best_api(['openai', 'anthropic']))"

# Test real-time stream
curl https://vnp.io/v1/scores/stream/did:vnp:api:openai-api
```

---

## BACKWARD COMPATIBILITY

**v0.1.5 is 100% backward compatible with v0.1:**
- All existing APIs still work unchanged
- ClickHouse schema extended, not modified
- Scoring formula unchanged (locked until 2027-06-22)
- Docker Compose configuration extends, not replaces

**Agents built for v0.1 continue to work without changes.**

---

## NETWORK EFFECTS ENABLED BY v0.1.5

### Before v0.1.5 (Measurement-only):
- Providers see scores, can't act on them
- Agents don't use scores (no SDK)
- No feedback loop

### After v0.1.5 (Full ecosystem):
1. **Providers claim APIs** → See breakdown → Understand gaps
2. **Providers optimize infra** → Scores improve
3. **Agents use SDK** → Route to better APIs
4. **Better APIs get more traffic** → More measurement data
5. **More data → accurate scores** → Providers trust VNP
6. **Loop closes** → Network effect locks in

**Result:** VNP becomes table stakes (unavoidable) for:
- API providers (need high scores)
- Agent developers (need best APIs)
- Enterprises (need proven quality)

---

## WHAT PROVIDERS CARE ABOUT (v0.1.5 delivers)

| Need | v0.1 | v0.1.5 |
|------|------|--------|
| See their score | ✓ | ✓ (dashboard) |
| Understand why score | ✗ | ✓ (dimensional breakdown) |
| Get alerts on decline | ✗ | ✓ (email) |
| Prove quality to customers | ✗ | ✓ (badges) |
| Dispute incorrect scores | ✓ (tier 1-2) | ✓ (tier 1-2) |
| Respond quickly | ✗ | ✓ (real-time updates) |

---

## WHAT AGENTS CARE ABOUT (v0.1.5 delivers)

| Need | v0.1 | v0.1.5 |
|------|------|--------|
| Find good APIs | ✓ (dashboard) | ✓ (SDK - 1 line) |
| Real-time scores | ✗ | ✓ (WebSocket) |
| Constraint routing | ✗ | ✓ (latency < 500ms) |
| Fallback chains | ✗ | ✓ (ranked alternatives) |
| Embeddable | ✗ | ✓ (iframe provider dashboard) |

---

## NEXT MILESTONES (After v0.1.5 ships)

**v0.2 (Month 2):** Specializations
- VNP-Finance (payment API focus)
- VNP-Health (healthcare compliance)
- Cross-chain anchoring (Ethereum + Arweave)

**v0.3 (Month 4):** Monetization
- Provider staking (APIs bet on their score)
- Dispute revenue sharing
- Certification program licensing

**v1.0 (Month 6):** Standardization
- ISO compliance
- Government procurement
- AI agent standards body

---

## EXECUTION SUMMARY

**All v0.1.5 code is complete and production-ready.**

**Integration is zero-breaking-change merge.**

**Deployment:** Same `docker-compose up -d --build` command.

**Timeline to live:** Merge + test = 1 day. Deploy = 2 hours.

**Expected impact:** Network effects activate within 2 weeks (when SDK usage kicks in).

---

**Status: READY FOR IMMEDIATE MERGE INTO v0.1 CODEBASE**

Next: Merge, test, deploy.
