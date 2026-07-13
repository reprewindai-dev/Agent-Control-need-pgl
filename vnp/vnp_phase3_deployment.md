> Historical deployment research — superseded by Hetzner/Coolify topology.

# VNP v0.1 DEPLOYMENT GUIDE
## PHASE 3: LINUX FOUNDATION LAUNCH

**Timeline:** 14 days from code lock to live on Base L2 + 5 regions  
**Budget:** $0 (free tier infrastructure; only Base L2 gas costs ~$50/month)  
**Team:** 2 engineers (1 infra, 1 deployment/monitoring)  
**Success Criteria:** All 15 APIs measured continuously, scores anchored hourly, dashboard live, zero downtime

---

## DAY 1-3: INFRASTRUCTURE PROVISIONING

### Task 1.1: Provision 5 Regional Measurement Nodes

**Provider Selection (multi-cloud for diversity):**
- **US-EAST:** Hetzner (AX101, $20/mo, 8vCPU, 32GB RAM)
- **US-WEST:** AWS t3.large spot (elastically scaled, $50/mo)
- **EU-WEST:** Azure Standard_D2s_v3 ($50/mo)
- **AP-SOUTHEAST:** DigitalOcean s-2vcpu-4gb ($20/mo)
- **AP-NORTHEAST:** Linode nanode-1GB (1vCPU, $5/mo for test, upgrade if needed)

**Total infrastructure cost:** ~$150/month (all regional nodes)

**Deployment steps:**
```bash
# 1. Provision each node (SSH into each, copy deploy key)
for region in us-east us-west eu-west ap-southeast ap-northeast; do
  # SSH into region node
  # Clone repo
  git clone https://github.com/VeklomNP/vnp-core.git
  cd vnp-core
  
  # Install dependencies
  curl https://releases.k6.io/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xz
  npm install -g pm2
  
  # Start measurement agent
  export REGION=$region
  export NODE_ID="vnp-$region-1"
  export KAFKA_BROKERS="kafka.vnp.io:9092"
  
  k6 run measurement-agent.js &
done
```

### Task 1.2: Provision Central Infrastructure (Single Cloud)

**Host:** AWS (or Hetzner for cost savings)
- **ClickHouse cluster:** 3 nodes, replication enabled, 500GB storage
- **Kafka cluster:** 3 brokers, replication factor 3
- **Scoring engine:** Python service, auto-scaling (0–5 replicas)
- **Public API:** Node.js/GraphQL, CloudFlare CDN fronting
- **Dashboard:** Next.js, Vercel (free tier, auto-deploying from GitHub)

**Cost:**
- ClickHouse 3-node: $300/month
- Kafka 3-node: $200/month
- Python service (EC2 t3.small): $30/month
- API (t3.micro): $10/month
- **Total:** ~$540/month (can defer to sponsors)

### Task 1.3: Deploy Using Docker Compose

```bash
# 1. Clone VNP repository
git clone https://github.com/VeklomNP/vnp-core.git
cd vnp-core

# 2. Configure environment
cp .env.example .env
# Edit .env with:
#   - REGION=us-east
#   - NODE_ID=vnp-us-east-1
#   - KAFKA_BROKERS=kafka-1.vnp.io,kafka-2.vnp.io,kafka-3.vnp.io
#   - CLICKHOUSE_HOST=clickhouse-1.vnp.io
#   - BASE_RPC_URL=https://mainnet.base.org
#   - VNP_ISSUER_PRIVATE_KEY=0x... (kept in AWS Secrets Manager)

# 3. Deploy
docker-compose up -d

# 4. Verify
docker-compose ps
curl http://localhost:3000  # Dashboard should load
curl http://localhost:4000/graphql  # API should respond
```

---

## DAY 4-7: SMART CONTRACT DEPLOYMENT

### Task 2.1: Deploy VNP Anchor Contract to Base L2

**Prerequisites:**
- Hardhat project initialized
- Private key (VNP issuer multisig) in `.env` as `VNP_ISSUER_PRIVATE_KEY`
- Base L2 testnet deployed and verified (do this on testnet first)

**Deployment steps:**
```bash
# 1. Navigate to contract directory
cd chain-anchoring/contracts

# 2. Deploy to Base testnet (verify first)
npx hardhat run scripts/deploy-vnp-anchor.js --network baseSepolia

# Example output:
# VNP Anchor Contract deployed to: 0x1234...abcd (testnet)

# 3. Verify on block explorer
# https://sepolia.basescan.org/address/0x1234...abcd

# 4. Run integration test
npx hardhat test tests/vnp-anchor.test.js --network baseSepolia

# 5. Deploy to Base L2 mainnet
npx hardhat run scripts/deploy-vnp-anchor.js --network base

# Contract deployed to: 0x9876...5432 (mainnet)
# https://basescan.org/address/0x9876...5432
```

**Deployment parameters (locked):**
```javascript
// scripts/deploy-vnp-anchor.js
const VNP_ISSUER = "0x..."; // VNP Foundation multisig address
const contract = await VNPAnchor.deploy(VNP_ISSUER);
console.log("VNP Anchor deployed to:", contract.address);
```

### Task 2.2: Integrate Scoring Engine with Smart Contract

Update `scoring-engine/src/scorer.py`:

```python
import web3
from web3 import Web3

# Connect to Base L2
w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))

# Load contract ABI
contract_abi = json.load(open("contracts/VNPAnchor.abi.json"))
contract_address = "0x9876...5432"
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

# After computing Merkle root each hour:
def anchor_measurements(merkle_root_hex, measurement_count, ipfs_hash):
    """Publish Merkle root to Base L2"""
    
    tx = contract.functions.anchorMeasurements(
        bytes.fromhex(merkle_root_hex),
        measurement_count,
        ipfs_hash
    ).build_transaction({
        'from': os.getenv("VNP_ISSUER_ADDRESS"),
        'nonce': w3.eth.get_transaction_count(os.getenv("VNP_ISSUER_ADDRESS")),
        'gasPrice': w3.eth.gas_price,
    })
    
    # Sign and send
    signed_tx = w3.eth.account.sign_transaction(
        tx,
        private_key=os.getenv("VNP_ISSUER_PRIVATE_KEY")
    )
    
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    logger.info(f"Anchored measurements: tx {tx_hash.hex()}, block {receipt['blockNumber']}")
```

---

## DAY 8-10: DATA ARCHIVAL & VERIFICATION

### Task 3.1: Set Up IPFS Pinning

**Option A: Pinata (free tier, 1GB storage)**
```bash
# Create Pinata account
# Get API key from https://app.pinata.cloud

# In scoring engine:
import requests

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_KEY")

def publish_measurements_to_ipfs(measurement_batch_json):
    """Upload raw measurements to IPFS"""
    
    files = {'file': measurement_batch_json}
    response = requests.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        files=files,
        headers={
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_KEY,
        }
    )
    
    ipfs_hash = response.json()['IpfsHash']
    logger.info(f"Measurements pinned to IPFS: {ipfs_hash}")
    return ipfs_hash
```

**Option B: Self-hosted IPFS node**
```bash
# Install IPFS
wget https://dist.ipfs.io/go-ipfs/v0.24.0/go-ipfs_v0.24.0_linux-amd64.tar.gz
tar xzf go-ipfs_v0.24.0_linux-amd64.tar.gz
cd go-ipfs && ./install.sh

# Start daemon
ipfs daemon

# Add measurements
ipfs add measurements_batch.json
# Output: QmXxxx... (IPFS hash)
```

### Task 3.2: Test End-to-End Audit

```bash
# 1. Measure an API
k6 run measurement-agent.js

# 2. Confirm measurements in ClickHouse
# SELECT COUNT(*) FROM measurements WHERE timestamp > NOW() - INTERVAL 1 HOUR

# 3. Check scoring engine computed score
# curl http://localhost:4000/graphql -X POST -d '
#   query { score(api_id: "did:vnp:api:stripe-payments") { compositeScore } }
# '

# 4. Verify anchor on Base
# curl https://mainnet.base.org \
#   -X POST \
#   -H "Content-Type: application/json" \
#   -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x9876...","data":"0x..."}],"id":1}'

# 5. Confirm IPFS pinning
# curl https://ipfs.io/ipfs/QmXxxx...

echo "✓ End-to-end audit complete"
```

---

## DAY 11-12: DASHBOARD & PUBLIC API

### Task 4.1: Deploy Frontend Dashboard

```bash
# 1. Clone dashboard repo (Next.js)
git clone https://github.com/VeklomNP/vnp-dashboard.git
cd vnp-dashboard

# 2. Build
npm install
npm run build

# 3. Deploy to Vercel
# Connect GitHub repo to Vercel
# Auto-deploys on push to main
vercel

# Dashboard live at: https://vnp-dashboard.vercel.app
```

**Environment variables (set in Vercel):**
```
NEXT_PUBLIC_API_URL=https://api.vnp.io
NEXT_PUBLIC_GRAPHQL_URL=https://api.vnp.io/graphql
NEXT_PUBLIC_CHAIN=base
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org
```

### Task 4.2: Public API (GraphQL + REST)

**Already deployed in Docker Compose, but verify:**

```bash
# 1. Check GraphQL endpoint
curl http://api.vnp.io/graphql -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ scores(limit: 5) { apiId compositeScore } }"}'

# 2. Check REST endpoint
curl http://api.vnp.io/v1/scores/did:vnp:api:stripe-payments

# 3. Check rate limiting
for i in {1..1001}; do curl http://api.vnp.io/v1/scores; done
# Should return 429 (Too Many Requests) after 1000

# 4. Enable CloudFlare CDN caching
# Configure:
#   - Browser cache TTL: 5 minutes
#   - Cache rules: /v1/scores* → Cache Everything
```

---

## DAY 13: GOVERNANCE & DOCUMENTATION

### Task 5.1: Publish Governance Documents

```bash
# 1. Create GitHub repositories
gh repo create VeklomNP/governance --public
gh repo create VeklomNP/methodology --public
gh repo create VeklomNP/dispute-process --public

# 2. Publish documents
git push origin main

# 3. Create W3C Community Group
# Go to https://www.w3.org/community/
# Name: Web API Benchmark Community Group
# URL: https://www.w3.org/community/vnp/
# (Approved within 48 hours)

# 4. Create Linux Foundation issue
# File an issue at https://github.com/community/community/issues
# Title: "VNP v0.1 Live: First Open API Benchmark Standard"
# Describe: governance, methodology, live system, request for Series LLC hosting
```

### Task 5.2: Create Documentation Website

```bash
# 1. Documentation site (Hugo/Docusaurus)
git clone https://github.com/VeklomNP/vnp-docs.git
cd vnp-docs

# 2. Add documentation
mkdir -p docs/{governance,methodology,api,guides}
# Copy governance charter, methodology spec, API docs

# 3. Deploy to GitHub Pages
npm run build
git push origin main
# Auto-deployed to https://docs.vnp.io

# Structure:
# docs/
#   ├── governance/
#   │   ├── charter.md
#   │   ├── tsc-elections.md
#   │   └── dispute-process.md
#   ├── methodology/
#   │   ├── v0.1-locked.md
#   │   ├── dimensions.md
#   │   └── anti-gaming.md
#   ├── api/
#   │   ├── graphql-guide.md
#   │   ├── rest-api.md
#   │   └── webhooks.md
#   └── guides/
#       ├── measure-your-api.md
#       └── integrate-vnp-score.md
```

---

## DAY 14: GO-LIVE & ANNOUNCEMENT

### Task 6.1: Pre-Launch Checklist

- [ ] All 5 measurement nodes running, collecting data
- [ ] ClickHouse receiving measurements (>1,000/hour)
- [ ] Scoring engine computing scores every hour
- [ ] Anchor contract receiving transactions (1 per hour)
- [ ] IPFS pinning working, data retrievable
- [ ] Dashboard loading without errors
- [ ] GraphQL API responding with real data
- [ ] REST API returning correct scores
- [ ] Rate limiting enforced (1,000 req/hour)
- [ ] CloudFlare caching enabled
- [ ] Monitoring/alerting configured (Prometheus + PagerDuty)
- [ ] Backups configured (ClickHouse snapshots to S3)
- [ ] Governance documents published
- [ ] W3C CG created
- [ ] Linux Foundation application filed

### Task 6.2: Launch Announcement

**Coordinated announcement across channels:**

```bash
# 1. Tweet from @VeklomNP
"🚀 VNP v0.1 is LIVE on Base L2.

Measuring 15 APIs across 5 global regions in real-time.
916K measurements anchored on-chain.
Governed by W3C Community Group.
No token, no hype—just data.

https://vnp.io
https://docs.vnp.io"

# 2. Post to IETF httpapi mailing list
Subject: [ANNOUNCE] VNP v0.1: Open API Benchmark Standard Live

"The Veklom Nexus Protocol (VNP) v0.1 is now live and measuring APIs.

- Open governance (W3C CG, heading to Linux Foundation)
- 10-dimensional methodology locked until 2027-06-22
- Real-time scoring (915K+ measurements, 5 regions)
- On-chain anchoring (Base L2, tamper-evident)
- Zero cost to integrate (public GraphQL + REST API)

Measuring:
- Stripe Payments (87.4)
- OpenAI API (84.2)
- Anthropic API (86.9)
- Cloudflare AI (91.2)
- Google Inference (91.3)

GitHub: https://github.com/VeklomNP
Docs: https://docs.vnp.io
API: https://api.vnp.io"

# 3. Post to OpenAPI Initiative Slack
# Submit x-vnp-score extension proposal

# 4. Post to x402 Foundation
# Propose vnp-score field in x402 payment manifest

# 5. HackerNews / Product Hunt
# Let community discover it organically
```

### Task 6.3: Day 1 Monitoring

```bash
# Continuous monitoring (first 24 hours)
watch -n 5 'echo "Measurement nodes: $(docker-compose ps | grep measurement | grep Up | wc -l)/5"
echo "Measurements/hour: $(clickhouse-client --query "SELECT COUNT(*) FROM measurements WHERE timestamp > NOW() - INTERVAL 1 HOUR")"
echo "Scores published: $(clickhouse-client --query "SELECT COUNT(DISTINCT api_id) FROM scores WHERE computed_at > NOW() - INTERVAL 1 HOUR")"
echo "Anchors on-chain: $(curl -s https://api.vnp.io/v1/anchor/count)"
echo "API requests/min: $(curl -s https://api.vnp.io/metrics | grep http_requests_total)"'

# If any service fails:
# 1. Check logs: docker-compose logs -f [service]
# 2. Restart: docker-compose restart [service]
# 3. Rebuild if needed: docker-compose up -d --build [service]
```

---

## PHASE 3 SIGN-OFF

**Deployment complete when:**
1. ✓ All 5 measurement nodes online, collecting data continuously
2. ✓ ClickHouse stores >10,000 measurements
3. ✓ Scoring engine producing hourly scores
4. ✓ Base L2 contract receiving hourly anchors
5. ✓ IPFS pinning working, hashes retrievable
6. ✓ Dashboard live, displaying real-time data
7. ✓ Public API operational (GraphQL + REST)
8. ✓ Governance documents published
9. ✓ W3C Community Group created
10. ✓ Go-live announcement published

**Post-Launch (First Week):**
- Monitor all systems 24/7
- Respond to GitHub issues within 4 hours
- Publish first weekly report (API scores, measurement count, system health)
- File Linux Foundation Series LLC application
- Start TSC election process (deadline: Day 90)

---

**NEXT:** Transition to v0.2 (add gRPC, AsyncAPI, dispute oracle, provider dashboard)
