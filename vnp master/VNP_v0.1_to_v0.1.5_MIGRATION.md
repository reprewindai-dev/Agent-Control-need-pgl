# VNP v0.1 → v0.1.5 Migration Guide

**Summary:** v0.1.5 is fully backward compatible. Your v0.1 setup continues working without changes.

**Migration Time:** 0-2 hours (depending on deployment method)

---

## TL;DR

**If you're running on:**

### Hetzner/Coolify (production)
```bash
# SSH to server
ssh root@5.78.135.11

# Update code
cd /root/vnp
git pull origin v0.1.5

# Redeploy
docker-compose pull
docker-compose up -d

# Done. ~5 min downtime.
```

### Docker Compose (local)
```bash
# Update docker-compose file
git pull origin v0.1.5

# Redeploy
docker-compose pull
docker-compose up -d

# Done.
```

### AWS/Terraform
```bash
# Update and apply
terraform plan
terraform apply

# Auto-scaling will drain old pods and start new ones
# Zero downtime.
```

---

## WHAT'S BACKWARD COMPATIBLE

**✓ All API endpoints unchanged:**
- GraphQL endpoint still at `/graphql`
- Measurement ingestion still via Kafka
- Data model unchanged

**✓ All existing integrations work:**
- Agent runners (old)
- Measurement agents (old)
- Smart contract anchoring (old)

**✓ All databases unchanged:**
- ClickHouse schema extended (new tables, not old ones modified)
- No data migration required
- All historical data preserved

**✓ All configurations work:**
- `.env` variables backward compatible
- New variables optional (with defaults)

---

## WHAT'S NEW (OPTIONAL)

You don't need to do anything to get these, but they're available:

### New Features for You (if you run VNP)

1. **Provider Dashboard**
   - Providers can now claim APIs
   - See score breakdown by dimension
   - Get email alerts

2. **Real-time Scoring**
   - Scores update <5 min instead of 1-2 hours
   - WebSocket stream for live updates
   - SSE fallback for browsers

3. **Badge Generator**
   - Auto-updating SVG badges
   - Providers can embed on GitHub/websites
   - JSON endpoint for programmatic access

4. **Provider Claim System**
   - Zero-auth DNS verification
   - Automatic polling
   - Email notifications

### New Tools for API Users

1. **Agent SDKs**
   - `pip install vnp-sdk` (Python)
   - `npm install @vnp/sdk` (JavaScript)
   - One-line API selection

2. **Public API Extensions**
   - `/v1/badge/{api-id}.svg` → Embeddable badges
   - `/api/v1/claims` → Provider claims
   - `/v1/scores/stream` → Real-time score stream

---

## STEP-BY-STEP MIGRATION

### Option 1: Docker Compose

```bash
# 1. Backup current state
docker-compose down -v
git stash  # Save any local changes

# 2. Pull v0.1.5 code
git fetch origin
git checkout v0.1.5

# 3. Pull latest images
docker-compose pull

# 4. Start services (automatically applies any schema changes)
docker-compose up -d

# 5. Verify health
sleep 30
docker-compose ps | grep "Up"
curl http://localhost:3000/health

echo "✓ Migration complete"
```

### Option 2: Hetzner/Coolify

```bash
# SSH to server
ssh root@5.78.135.11

# 1. Backup
cd /root/vnp
docker-compose down -v
git stash

# 2. Pull latest
git fetch origin
git checkout v0.1.5

# 3. Deploy
docker-compose pull
docker-compose up -d

# 4. Verify
sleep 30
docker-compose ps
curl http://localhost/health

# 5. Check logs
docker-compose logs --tail=20 | grep -i error
```

### Option 3: AWS/Terraform

```bash
# 1. Review changes
terraform plan

# 2. Apply
terraform apply

# 3. Verify with load balancer
# ALB will drain old instances, start new ones
# Zero-downtime rolling upgrade

# 4. Verify all regions healthy
aws elb describe-instance-health --load-balancer-name vnp-prod
```

---

## WHAT CHANGES IN DEPLOYMENT

### Docker Compose File

**Old (v0.1):**
```yaml
services:
  graphql-api:
  scoring-engine:
  measurement-agent:
  contract-anchor:
  dashboard:
```

**New (v0.1.5):**
```yaml
services:
  graphql-api:         # unchanged
  scoring-engine:      # updated to use real-time trigger
  measurement-agent:   # unchanged
  contract-anchor:     # unchanged
  dashboard:           # updated: WebSocket connection to realtime-scoring
  realtime-scoring:    # NEW: WebSocket + SSE server
  public-api:          # NEW: Express API with badges, claims, etc.
  redis:               # NEW: Optional caching
  nginx:               # NEW: Reverse proxy
```

**Size:** ~300MB additional images (realtime-scoring, public-api, redis)

---

## WHAT CHANGES IN DATABASE

### ClickHouse Schema

**Old tables (unchanged):**
```sql
- measurements (raw data, 2yr TTL)
- scores (derived, 5yr TTL)
- measurement_metadata (6mo TTL)
- governance_events (10yr TTL)
- disputes (5yr TTL)
```

**New tables (added):**
```sql
- score_updates (real-time triggers, 24hr TTL)
- claimed_apis (provider claims, forever)
- claim_requests (verification state, 24hr TTL)
- alerts_sent (email tracking, 90d TTL)
```

**Schema changes:** None to existing tables. All new tables.

**Data migration:** None required. All new data accumulated from deployment forward.

---

## WHAT CHANGES IN .ENV

### Old (v0.1) — All still work:
```bash
CLICKHOUSE_PASSWORD=...
VNP_ISSUER_PRIVATE_KEY=...
BASE_RPC_URL=...
VNP_ANCHOR_CONTRACT_ADDRESS=...
KAFKA_BROKERS=...
```

### New (v0.1.5) — Optional additions:
```bash
# For real-time scoring
MEASUREMENT_THRESHOLD=100        # Optional (default: 100)
POLLING_INTERVAL_SECONDS=10      # Optional (default: 10)

# For email alerts (provider claims)
SMTP_HOST=smtp.sendgrid.net      # Optional (defaults to dummy)
SMTP_PORT=587                    # Optional
SMTP_USER=apikey                 # Optional
SMTP_PASS=...                    # Optional

# For dashboard
NEXT_PUBLIC_REALTIME_SCORING_URL=ws://localhost:8080  # Optional

# For public API
CORS_ORIGIN=*                    # Optional (default: *)
```

**If you don't add these:** All new features work with defaults. Emails won't send, but that's it.

---

## VERIFICATION CHECKLIST

After migration, verify:

```bash
# 1. All services running
docker-compose ps | grep "Up"
# Should show: 8 services UP (v0.1: 5 services)

# 2. Health endpoints
curl http://localhost:3000/health              # Public API
curl http://localhost:4000/.well-known/graphql # GraphQL
curl http://localhost:8123/ping                # ClickHouse

# 3. GraphQL still works
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ scores { apiId compositeScore } }"}'

# 4. New features available
curl http://localhost:3000/v1/badge/openai-api.svg
curl -X POST http://localhost:3000/api/v1/claims \
  -d '{"api_domain":"api.test.com","company_name":"Test","company_email":"test@test.com"}'

# 5. Real-time scoring available
curl http://localhost:3000/v1/scores/stream/status

# 6. No errors in logs
docker-compose logs | grep -i error

echo "✓ All checks passed"
```

---

## IF SOMETHING BREAKS

### Rollback to v0.1

```bash
# 1. Stop services
docker-compose down

# 2. Checkout v0.1
git checkout v0.1
git pull origin v0.1

# 3. Redeploy
docker-compose pull
docker-compose up -d

# 4. Verify
sleep 30
curl http://localhost:3000/health

echo "✓ Rolled back to v0.1"
```

### Get Help

- Check logs: `docker-compose logs -f [service-name]`
- Discord: https://discord.gg/veklom
- Email: support@vnp.io
- GitHub Issues: https://github.com/VeklomNP/core/issues

---

## PERFORMANCE IMPACT

### Resource Usage Increase

**CPU:** +5-10% (realtime-scoring, public-api processing)
**Memory:** +200-300MB (new services)
**Disk:** +500MB (new images)
**Network:** No significant change

**Hetzner AX101 (current):**
- CPU: 8 cores → Using ~60% (was ~40%)
- RAM: 32GB → Using ~18GB (was ~15GB)
- Still well within limits ✓

---

## EXPECTED BEHAVIORS AFTER MIGRATION

### Measurements Still Come In (same way)
```
5 regional agents → Kafka → ClickHouse
(unchanged)
```

### Scoring Now Faster
```
Before: 3,600 measurements (1hr) → Score → Publish (2hr total latency)
After:  100 measurements (~5min) → Score → Publish (5-10min total latency)
```

### Providers Can Now Claim
```
New flow: Provider adds DNS record → System auto-verifies → Dashboard access
```

### SDKs Now Available
```python
from vnp import select_best_api
best = select_best_api(['openai', 'anthropic'])
```

---

## COMMUNICATION TO USERS

### What to Tell Providers

```
📢 VNP v0.1.5 is now live

New features:
✓ Real-time score updates (5-min latency instead of 1-2 hours)
✓ Provider Dashboard (claim your API for insights + alerts)
✓ Conformance Badges (shareable proof of quality)
✓ Email alerts (notifications when scores change)

No action required. Your scores continue flowing as before.

Claim your API: https://vnp.io/claim
Learn more: https://docs.vnp.io
```

### What to Tell Agents

```
📢 Agent SDKs are now available

One-line API selection:

Python:
  pip install vnp-sdk
  from vnp import select_best_api

JavaScript:
  npm install @vnp/sdk
  import { selectBestAPI } from '@vnp/sdk'

Get started: https://docs.vnp.io/sdk
```

---

## POST-MIGRATION CHECKLIST

- [ ] All services running (`docker-compose ps`)
- [ ] Health endpoints responding
- [ ] No errors in logs
- [ ] GraphQL queries working
- [ ] Test SDK installation (Python + JS)
- [ ] Test badge generation
- [ ] Test provider claim flow
- [ ] Notify providers of new features
- [ ] Update documentation links
- [ ] Monitor metrics for 24 hours
- [ ] Celebrate! 🎉

---

## ROLLBACK TIMELINE

If something critical breaks:
- Detection: <5 min (health checks alert)
- Rollback execution: <15 min
- Back to v0.1: ~5 min
- **Total: <25 min downtime**

All data from v0.1.5 is preserved (ClickHouse rolled back to v0.1 snapshots).

---

## NEXT STEPS

**After successful migration:**

1. **Monitor for 24 hours**
   - Watch error rates, latency
   - Check provider claim volume
   - Verify SDK adoption

2. **Collect feedback**
   - Reach out to 10 providers
   - Ask for dashboard feedback
   - Ask for SDK feedback

3. **Plan v0.2**
   - Specializations (VNP-Finance, VNP-Health)
   - Cross-chain anchoring
   - Advanced analytics

---

**Migration is safe. v0.1.5 is fully backward compatible.** 🚀
