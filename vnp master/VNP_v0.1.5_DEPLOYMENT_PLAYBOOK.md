# VNP v0.1.5 DEPLOYMENT PLAYBOOK

**Objective:** Deploy v0.1.5 to production in <4 hours with zero downtime

**Prerequisites Checklist:**
- [ ] AWS CLI configured
- [ ] Terraform installed (`terraform --version`)
- [ ] Docker + Docker Compose installed
- [ ] GitHub CLI configured (`gh auth status`)
- [ ] Vercel CLI installed (`vercel --version`)
- [ ] `.env` file with all production secrets
- [ ] Base L2 deployer private key (ECDSA)
- [ ] Coolify SSH access to 5.78.135.11

---

## PHASE 0: PRE-DEPLOYMENT VALIDATION (30 min)

### Step 1: Environment Validation
```bash
# Check all binaries
terraform --version      # >= 1.0.0
docker --version        # >= 20.10
docker-compose --version # >= 1.29
gh --version            # >= 2.0
node --version          # >= 16
python --version        # >= 3.9

# Verify credentials
aws sts get-caller-identity     # Should show account ID
gh auth status                   # Should show authenticated
vercel whoami                    # Should show account
```

### Step 2: Secret Validation
```bash
# Verify .env file has all required vars
source .env

test -n "$CLICKHOUSE_PASSWORD" || echo "ERROR: CLICKHOUSE_PASSWORD missing"
test -n "$VNP_ISSUER_PRIVATE_KEY" || echo "ERROR: VNP_ISSUER_PRIVATE_KEY missing"
test -n "$GITHUB_TOKEN" || echo "ERROR: GITHUB_TOKEN missing"
test -n "$VERCEL_TOKEN" || echo "ERROR: VERCEL_TOKEN missing"
test -n "$SMTP_PASS" || echo "ERROR: SMTP_PASS missing"
test -n "$BASE_RPC_URL" || echo "ERROR: BASE_RPC_URL missing"

echo "✓ All secrets validated"
```

### Step 3: Code Validation
```bash
# Merge v0.1.5 code into v0.1 codebase
cd vnp-core

# Verify no conflicts
git merge --no-commit --no-ff origin/v0.1.5 || {
  echo "MERGE CONFLICT: Resolve manually before deployment"
  exit 1
}

# Verify TypeScript compilation
npm run type-check || {
  echo "ERROR: TypeScript compilation failed"
  exit 1
}

# Verify tests pass
npm test -- --passWithNoTests || {
  echo "ERROR: Test suite failed"
  exit 1
}

echo "✓ Code validation passed"
```

---

## PHASE 1: INFRASTRUCTURE DEPLOYMENT (45 min)

### Step 1: Provision Cloud Resources
```bash
cd infrastructure/terraform

# Plan deployment
terraform init
terraform plan -out=tfplan -var-file=production.tfvars

# Review plan
cat tfplan | grep -E "Create|Destroy|Modify"

# Apply infrastructure
terraform apply tfplan

# Save state
terraform state pull > terraform.state.backup

echo "✓ Infrastructure provisioned"
```

### Step 2: Verify Infrastructure Health
```bash
# Get endpoints
export KAFKA_BROKERS=$(terraform output -raw kafka_brokers)
export CLICKHOUSE_HOST=$(terraform output -raw clickhouse_host)
export GRAPHQL_API=$(terraform output -raw graphql_api_endpoint)

# Test connectivity
docker run --rm -e KAFKA_BROKERS=$KAFKA_BROKERS confluentinc/cp-kafka \
  kafka-broker-api-versions.sh --bootstrap-servers $KAFKA_BROKERS || {
  echo "ERROR: Kafka not reachable"
  exit 1
}

# Test ClickHouse
curl -s http://$CLICKHOUSE_HOST:8123/ping || {
  echo "ERROR: ClickHouse not reachable"
  exit 1
}

echo "✓ Infrastructure health verified"
```

---

## PHASE 2: DOCKER BUILD & PUSH (30 min)

### Step 1: Build Images
```bash
# Build all services
docker-compose -f docker-compose.v0.1.5.yml build

# Tag images for ECR
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker tag vnp-core:latest $ECR_REGISTRY/vnp-core:0.1.5
docker tag vnp-core:latest $ECR_REGISTRY/vnp-core:latest
docker tag measurement-agent:latest $ECR_REGISTRY/measurement-agent:0.1.5
docker tag scoring-engine:latest $ECR_REGISTRY/scoring-engine:0.1.5
docker tag graphql-api:latest $ECR_REGISTRY/graphql-api:0.1.5
docker tag realtime-scoring:latest $ECR_REGISTRY/realtime-scoring:0.1.5
docker tag public-api:latest $ECR_REGISTRY/public-api:0.1.5
docker tag dashboard:latest $ECR_REGISTRY/dashboard:0.1.5

echo "✓ Images tagged"
```

### Step 2: Push to ECR
```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login \
  --username AWS \
  --password-stdin $ECR_REGISTRY

# Push images
for image in vnp-core measurement-agent scoring-engine graphql-api \
             realtime-scoring public-api dashboard; do
  docker push $ECR_REGISTRY/$image:0.1.5
  docker push $ECR_REGISTRY/$image:latest
done

echo "✓ Images pushed to ECR"
```

---

## PHASE 3: DEPLOY TO HETZNER/COOLIFY (30 min)

### Step 1: SSH to Production Server
```bash
# Verify Hetzner access
ssh -i ~/.ssh/id_rsa root@5.78.135.11 "echo 'Connected to Hetzner'"

# Verify Coolify is running
ssh -i ~/.ssh/id_rsa root@5.78.135.11 "docker ps | grep coolify"
```

### Step 2: Update Docker Compose on Server
```bash
# Copy new docker-compose file
scp -i ~/.ssh/id_rsa docker-compose.v0.1.5.yml \
  root@5.78.135.11:/root/vnp/docker-compose.yml

# Copy updated .env
scp -i ~/.ssh/id_rsa .env \
  root@5.78.135.11:/root/vnp/.env

# Verify files copied
ssh -i ~/.ssh/id_rsa root@5.78.135.11 \
  "head -n 5 /root/vnp/docker-compose.yml && echo '...' && head -n 5 /root/vnp/.env"
```

### Step 3: Deploy with Coolify
```bash
# SSH and deploy
ssh -i ~/.ssh/id_rsa root@5.78.135.11 << 'EOF'
cd /root/vnp

# Pull latest images
docker-compose pull

# Up services (backward compatible - existing v0.1 stays up)
docker-compose up -d

# Wait for services to stabilize
sleep 30

# Verify all services running
docker-compose ps | grep "Up"

# Check logs for errors
docker-compose logs --tail=20 | grep -i error || echo "✓ No errors in logs"

echo "✓ Deployment complete"
EOF
```

### Step 4: Verify Service Health
```bash
# Test health endpoints
curl -s https://api.vnp.io/health | jq .

# GraphQL API
curl -s -X POST https://api.vnp.io/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' | jq .

# Badge generator
curl -s https://api.vnp.io/v1/badge/openai-api.svg | head -c 100

# Claim system
curl -s https://api.vnp.io/api/v1/config | jq '.features'

# Real-time scoring SSE
curl -s https://api.vnp.io/v1/scores/stream/status | jq .

echo "✓ All endpoints responding"
```

---

## PHASE 4: SMART CONTRACT DEPLOYMENT (20 min)

### Step 1: Deploy VNP Anchor Contract
```bash
cd contract-anchor

# Compile
hardhat compile

# Deploy to Base L2
hardhat run scripts/deploy-vnp-anchor.js --network base

# Capture contract address
export VNP_ANCHOR_CONTRACT=$(grep "deployed to" deployment.log | cut -d' ' -f3)

# Verify deployment
hardhat verify --network base $VNP_ANCHOR_CONTRACT

# Update .env
echo "VNP_ANCHOR_CONTRACT_ADDRESS=$VNP_ANCHOR_CONTRACT" >> .env

echo "✓ Smart contract deployed at $VNP_ANCHOR_CONTRACT"
```

### Step 2: Test Contract
```bash
# Test anchoring
hardhat run scripts/test-anchor.js --network base

# Verify on-chain
curl -s https://api.basescan.io/api \
  ?module=account&action=txlist&address=$VNP_ANCHOR_CONTRACT | jq '.result[0]'

echo "✓ Smart contract verified on-chain"
```

---

## PHASE 5: DASHBOARD DEPLOYMENT (10 min)

### Step 1: Deploy Next.js Dashboard
```bash
cd dashboard

# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod \
  --env NEXT_PUBLIC_GRAPHQL_URL="https://api.vnp.io/graphql" \
  --env NEXT_PUBLIC_REALTIME_SCORING_URL="wss://api.vnp.io/v1/scores/stream" \
  --env NEXT_PUBLIC_API_URL="https://api.vnp.io"

# Get deployment URL
export DASHBOARD_URL=$(vercel --prod list --json | jq -r '.[0].url')

echo "✓ Dashboard deployed at $DASHBOARD_URL"
```

---

## PHASE 6: VERIFICATION & MONITORING (15 min)

### Step 1: End-to-End Test
```bash
# Test badge generation
BADGE_URL="https://api.vnp.io/v1/badge/stripe-payments.svg"
curl -s $BADGE_URL | grep -q "<svg" && echo "✓ Badge generation works"

# Test provider claim flow
CLAIM_ID=$(curl -s -X POST https://api.vnp.io/api/v1/claims \
  -H "Content-Type: application/json" \
  -d '{
    "api_domain":"api.test.com",
    "company_name":"Test Inc.",
    "company_email":"dev@test.com"
  }' | jq -r '.claim_id')

echo "✓ Provider claim created: $CLAIM_ID"

# Test SDK (Python)
pip install vnp-sdk
python -c "from vnp import select_best_api; print(select_best_api(['openai', 'anthropic']).api)"

# Test SDK (JavaScript)
npm install @vnp/sdk
node -e "const {selectBestAPI} = require('@vnp/sdk'); selectBestAPI({candidates:['openai']}).then(r => console.log(r.api))"

# Test real-time stream
timeout 5 curl -s https://api.vnp.io/v1/scores/stream || echo "✓ SSE stream working"

echo "✓ All integration tests passed"
```

### Step 2: Enable Monitoring
```bash
# CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name vnp-api-errors \
  --alarm-description "Alert on VNP API errors" \
  --metric-name APIErrors \
  --namespace VNP \
  --statistic Sum \
  --period 60 \
  --threshold 10

# Datadog/Prometheus scraping
# (Update monitoring config in infrastructure/)

echo "✓ Monitoring enabled"
```

### Step 3: Check Logs
```bash
# API logs
docker-compose logs public-api | tail -20

# Scoring engine logs
docker-compose logs scoring-engine | tail -20

# GraphQL logs
docker-compose logs graphql-api | tail -20

# No errors = good
```

---

## PHASE 7: NOTIFICATION & DOCUMENTATION (10 min)

### Step 1: Notify Stakeholders
```bash
# Email to providers
cat > provider_notification.txt << EOF
Subject: VNP v0.1.5 Live - New Features Available

VNP has been upgraded to v0.1.5 with:
✓ Real-time score updates (<5 min latency vs 1-2 hrs)
✓ Provider Dashboard at vnp.io/provider/[api-id]
✓ Conformance Badges (embeddable SVG)
✓ DNA TXT claim verification
✓ Score decline alerts

No action required. All existing integrations continue working.

Claim your API: vnp.io/claim
Dashboard: vnp.io/provider
Docs: docs.vnp.io/v0.1.5
EOF

# Post announcement
gh issue create --title "VNP v0.1.5 Live" --body "$(cat provider_notification.txt)"
```

### Step 2: Update Status Page
```bash
# Update status.vnp.io
curl -X POST https://status.vnp.io/api/v1/incidents \
  -H "Authorization: Bearer $STATUS_PAGE_API_TOKEN" \
  -d '{
    "name":"VNP v0.1.5 Released",
    "status":"resolved",
    "impact":"none",
    "description":"Deployed real-time scoring, provider dashboard, SDKs, badges, claim system"
  }'
```

### Step 3: Update Docs
```bash
# Mark v0.1.5 as live in docs
git tag v0.1.5-live
git push origin v0.1.5-live

# Update CHANGELOG
cat >> CHANGELOG.md << 'EOF'

## v0.1.5 (Released $(date +%Y-%m-%d))

### New Features
- Real-time scoring (WebSocket + SSE)
- Provider Dashboard (claim via DNS, see breakdown, alerts)
- Conformance Badges (auto-updating SVG)
- Agent SDKs (Python + JavaScript)
- Provider claim system (zero-auth DNS verification)

### Architecture
- Scoring latency: 1-2 hours → <5 minutes
- Backward compatible with v0.1
- No breaking changes to API or data model

### Deployments
- Hetzner/Coolify: 5.78.135.11
- Dashboard: Vercel
- Smart contract: Base L2

EOF

git add CHANGELOG.md
git commit -m "Release v0.1.5"
git push
```

---

## PHASE 8: ROLLBACK PLAN (if needed)

```bash
# If deployment fails, rollback to v0.1
ssh -i ~/.ssh/id_rsa root@5.78.135.11 << 'EOF'
cd /root/vnp

# Restore previous docker-compose
git checkout HEAD~1 docker-compose.yml

# Restore previous .env
git checkout HEAD~1 .env

# Redeploy v0.1
docker-compose pull
docker-compose up -d

# Verify
sleep 30
docker-compose ps | grep "Up"

echo "✓ Rolled back to v0.1"
EOF
```

---

## SUCCESS CRITERIA

After deployment, verify:

- [ ] `https://api.vnp.io/health` returns `{ status: "ok" }`
- [ ] Badge endpoints responding (<100ms)
- [ ] Provider claims accepting new requests
- [ ] Real-time scoring stream active (WebSocket + SSE)
- [ ] SDKs (Python + JS) installable and working
- [ ] GraphQL API responding
- [ ] Dashboard deployed on Vercel
- [ ] Smart contract deployed on Base L2
- [ ] All logs clean (no errors)
- [ ] Provider notifications sent
- [ ] Monitoring enabled

---

## POST-DEPLOYMENT CHECKLIST

**Within 1 hour:**
- [ ] Test each new feature manually
- [ ] Monitor error rates (should be <0.1%)
- [ ] Verify database queries are fast (<100ms)

**Within 24 hours:**
- [ ] Get 10+ providers to claim APIs
- [ ] Get 5+ agents to use SDK
- [ ] Verify real-time scores flowing
- [ ] Check for any alert/error patterns

**Within 1 week:**
- [ ] Publish blog post: "VNP v0.1.5 Launch"
- [ ] Present to governance board
- [ ] Collect provider feedback
- [ ] Plan v0.2 (specializations)

---

**Estimated Total Time: 3.5 - 4 hours**

**Risk Level: LOW** (backward compatible, no breaking changes)

**Rollback Time: <15 min** (if needed)
