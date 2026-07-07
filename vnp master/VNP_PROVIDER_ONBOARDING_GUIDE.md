# VNP Provider Onboarding Guide

Welcome to Veklom Nexus Protocol. This guide walks you through:
1. Claiming your API
2. Accessing your dashboard
3. Understanding your score
4. Responding to score changes
5. Getting help

---

## PART 1: CLAIM YOUR API (5 min)

### What is claiming?
Claiming proves you own your API. Once claimed:
- You can see detailed score breakdown
- You'll get email alerts if scores drop
- You can customize notification settings
- You can file disputes if you disagree with scores

### Step 1: Go to the Claim Portal
```
https://vnp.io/claim
```

### Step 2: Enter Your Details
- **API Domain:** The domain of your API (e.g., `api.stripe.com`)
- **Company Name:** Your company name (e.g., `Stripe Inc.`)
- **Email:** Email where you want to receive alerts

Example:
```
API Domain:    api.anthropic.com
Company Name:  Anthropic
Email:         ops@anthropic.com
```

### Step 3: Add DNS TXT Record
We'll generate a DNS verification record. You need to add it to your domain:

```
Record Type:  TXT
Name:         _vnp-claim.{random-uuid}.api.anthropic.com
Value:        abc123def456ghi789...
TTL:          3600
```

**How to add DNS records (by provider):**
- **Route53 (AWS):** Route53 > Hosted Zones > {domain} > Create Record
- **Cloudflare:** DNS tab > Add Record > Type: TXT
- **GoDaddy:** Manage DNS > Add Record > Type: TXT
- **Namecheap:** Domain > Nameserver Settings > Add TXT Record
- **Google Domains:** DNS > Custom Records > Add TXT Record

### Step 4: Wait for Verification (2 hours)
We check every 10 seconds. You'll get an email when verified:

```
Subject: ✓ Your API claimed on VNP

Your API (api.anthropic.com) has been verified and claimed.

Dashboard: https://vnp.io/provider/did:vnp:api:anthropic-api
Settings:  https://vnp.io/provider/did:vnp:api:anthropic-api/settings
```

---

## PART 2: YOUR DASHBOARD (What You'll See)

Once claimed, visit your provider dashboard:

```
https://vnp.io/provider/did:vnp:api:anthropic-api
```

### The Main Score Card
```
┌─────────────────────────────────┐
│ COMPOSITE SCORE: 89.2           │
│ GRADE: A                        │
│ 95% Confidence: [87.1 - 91.3]  │
│                                 │
│ MEASUREMENTS: 45,321            │
│ LAST UPDATED: 2 minutes ago     │
└─────────────────────────────────┘
```

What this means:
- **89.2** = Your overall score (0-100)
- **A** = Your letter grade
- **[87.1 - 91.3]** = The uncertainty range (we're 95% confident it's between these)
- **45,321** = How many real measurements went into this score

---

### The Scoring Dimensions (Where You Stand)
```
┌─────────────────────────────────────────────────────────┐
│ DIMENSION              │ SCORE │ WEIGHT │ HOW YOU'RE DOING │
├─────────────────────────────────────────────────────────┤
│ p99 Latency           │ 92.0  │  40%   │ ✓ Excellent     │
│ Error Rate            │ 85.2  │  25%   │ ✓ Good          │
│ Availability          │ 96.1  │  15%   │ ✓ Excellent     │
│ Throughput            │ 88.0  │   8%   │ ✓ Good          │
│ Security              │ 84.5  │   8%   │ ✓ Good          │
│ Documentation         │ 78.3  │   7%   │ ⚠ Fair          │
│ Versioning            │ 82.1  │   7%   │ ✓ Good          │
│ x402/MPP Compliance   │ 91.0  │   6%   │ ✓ Excellent     │
│ Rate Limit Clarity    │ 79.5  │   6%   │ ⚠ Fair          │
│ DX / TTFC             │ 81.2  │   5%   │ ✓ Good          │
└─────────────────────────────────────────────────────────┘
```

**Key insight:** Your score is a weighted average. Your latency (40%) matters most.

**Action:** If any score is below 80, that's where to focus improvements.

---

### 30-Day Trend
```
Graph showing how your score has moved over the last 30 days.
Stable = ✓ Good
Dropping = ⚠ Investigate
Rising = ✓ Improvements working
```

### Regional Performance
```
US-EAST:  92.1
EU-WEST: 88.7
AP-SE:   86.3
```

Why it varies: Network latency, server load, regional issues.

---

### Certification Badge
If your score is ≥85:
```
<img src="https://vnp.io/badge/anthropic-api.svg" alt="VNP Certified Gold" />
```

This auto-updates as your score changes. You can embed it on your GitHub, docs, or website to prove quality to customers.

---

## PART 3: HOW SCORES CHANGE (Real-time Updates)

**Old (v0.1):**
- Scores updated once per hour
- You'd see changes 1-2 hours after infrastructure improvements

**New (v0.1.5):**
- Scores update within 5 minutes of new measurements
- You see real-time impact of changes

### What Triggers a Score Recalculation?
When 100 new measurements arrive for your API, we re-score immediately.

Example timeline:
```
14:00 — You deploy fix to reduce latency
14:02 — New measurements reflect the fix
14:03 — 100 measurements collected
14:04 — Score recalculated and updated
14:04 — You see new score on dashboard
14:05 — Customers see new badge
```

---

## PART 4: ALERTS & NOTIFICATIONS

### Email Alerts
You'll receive email if:
- Your score drops below your threshold (default: 80)
- Max 1 email per 24 hours (no spam)

Example alert:
```
⚠️ VNP Score Alert: Anthropic dropped to 77.8

Previous Score: 89.2
Current Score:  77.8
Change:        -11.4 points

Top impacts:
• p99 latency increased to 850ms (was 200ms)
• Error rate increased to 3.2% (was 0.8%)

View details → https://vnp.io/provider/anthropic-api
```

### Customize Alerts
Dashboard → Settings:
- Turn alerts on/off
- Change threshold (e.g., alert if <75 instead of <80)
- Change email address

---

## PART 5: UNDERSTANDING YOUR SCORE

### Why Did My Score Drop?

**Most Common Causes:**

1. **Latency increased** (40% of score)
   - Check server CPU, memory, disk I/O
   - Check network routes to VNP measurement nodes
   - Look for deployment that added processing

2. **Error rate increased** (25% of score)
   - Review recent deployments
   - Check error logs for patterns
   - Verify dependent services (databases, caches)

3. **Availability decreased** (15% of score)
   - Check infrastructure status
   - Look for downtime windows
   - Verify auto-scaling is working

4. **Documentation quality decreased** (7% of score)
   - Update API docs, examples, changelog
   - Ensure docs match current API version

### How to Improve Each Dimension

| Dimension | Problem | Solution |
|-----------|---------|----------|
| **Latency** | Slow responses | Add caching, CDN, optimize queries, scale infrastructure |
| **Error Rate** | High failures | Fix bugs, improve error handling, add retries |
| **Availability** | Downtime | Add redundancy, use load balancing, improve monitoring |
| **Throughput** | Low capacity | Increase servers, optimize code, add queuing |
| **Security** | Weak auth | Update TLS, add WAF, rotate keys, fix vulnerabilities |
| **Documentation** | Unclear | Add examples, write guides, keep changelog updated |
| **Versioning** | Breaking changes | Support multiple versions, announce deprecations early |
| **DX / TTFC** | Slow integration | Reduce setup time, add SDKs, provide examples |
| **Rate Limiting** | Unclear limits | Document clearly, return limits in headers |

---

## PART 6: IF YOU DISAGREE WITH YOUR SCORE

You can file a dispute. Steps:

### Step 1: File Dispute
Dashboard → "File Dispute" button

```
Describe what happened:
"We deployed an optimization on June 1st that should have reduced latency 
by 30%, but VNP still shows old latency values. Our internal metrics show 
p99 went from 250ms to 180ms."

Provide evidence:
- Link to deployment announcement
- Screenshot of internal metrics
- Links to any external monitoring (DataDog, CloudWatch)
```

### Step 2: Automated Re-Measurement (24 hours)
VNP re-runs 100 measurements independently. If results match, we confirm.

### Step 3: Technical Review (if still disputed)
A technical committee reviews the evidence and makes a decision.

### Step 4: Resolution
You'll get email with outcome and explanation.

---

## PART 7: EMBEDDING YOUR BADGE

### On GitHub README
```markdown
[![VNP Certified](https://vnp.io/badge/anthropic-api.svg)](https://vnp.io/provider/anthropic-api)
```

### On Your Website
```html
<a href="https://vnp.io/provider/anthropic-api">
  <img src="https://vnp.io/badge/anthropic-api.svg" 
       alt="VNP Certified Gold" 
       width="200">
</a>
```

### In Documentation
```markdown
## API Quality Guarantee

[Badge image]

This API is measured and scored by Veklom Nexus Protocol, 
an independent benchmark standard for API quality. 
[Learn more →](https://vnp.io)
```

The badge auto-updates every time your score changes.

---

## PART 8: GETTING HELP

### Dashboard Questions
- Email: support@vnp.io
- Docs: https://docs.vnp.io/provider
- Community: https://github.com/VeklomNP/discussions

### Methodology Questions
- Docs: https://docs.vnp.io/methodology
- Governance: https://docs.vnp.io/governance
- Filing a dispute: https://vnp.io/provider/[your-api]/disputes

### Score Breakdown Help
Each dimension has a "Learn More" link explaining how we measure it.

---

## CHECKLIST: Your First Week

- [ ] Claim your API (add DNS record)
- [ ] Verify claim (check email)
- [ ] View your dashboard
- [ ] Read your dimension breakdown
- [ ] Customize alert settings
- [ ] Embed badge on GitHub/website
- [ ] Review 30-day trend
- [ ] Plan 1-2 improvements for lowest-scoring dimensions
- [ ] Monitor score changes as improvements deploy

---

## QUICK FACTS

**Measurement Timing:**
- Started: Every hour in v0.1
- Updated: Every 5 minutes in v0.1.5 (when 100 new measurements arrive)

**Score Accuracy:**
- Measured from 5 global regions
- Randomized timing, IP rotation, TLS variation (anti-gaming)
- Statistical confidence intervals provided

**Data Retention:**
- Measurements: 2 years
- Scores: 5 years
- Disputes: 5 years

**Privacy:**
- Your email is private
- Only you (and dispute panelists if needed) see your details
- Public dashboard shows only score, not internals

---

**Welcome to VNP. Let's build better APIs together.** 🚀
