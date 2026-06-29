# Veklom Nexus Protocol (VNP) — Governance Charter v1.0

**Status:** Open for Community Comment (60-day period)  
**Effective Date:** Upon Linux Foundation Series approval (expected Month 2, 2026)

---

## 1. MISSION

The Veklom Nexus Protocol (VNP) is a globally recognized, open-community, real-time API benchmark scoring standard designed to provide transparent, reproducible, and actionable performance scores for APIs across all regions, protocols, and deployment models.

**Core values:**
- **Transparency:** All methodology, test harnesses, and decision-making are public.
- **Neutrality:** No single organization controls VNP's technical direction.
- **Fairness:** Scoring methodology is designed to prevent gaming and level the playing field between startups and giants.
- **Interoperability:** VNP scores are designed for integration into x402/MPP payment protocols, OpenAPI specs, and API gateways.

---

## 2. GOVERNANCE STRUCTURE

### 2.1 Two-Board Model

VNP's governance separates **business concerns** from **technical merit** using a two-board structure:

```
┌─────────────────────────────────────────────────┐
│  Business Governing Board (BGB)                 │
│  • Funding, legal, corporate strategy           │
│  • Cannot override technical decisions          │
└─────────────────────────────────────────────────┘
                      ↓ (funds)
┌─────────────────────────────────────────────────┐
│  Technical Steering Committee (TSC)             │
│  • VNP specification and scoring methodology    │
│  • Measurement infrastructure                   │
│  • All technical decisions, final authority     │
└─────────────────────────────────────────────────┘
```

### 2.2 Business Governing Board (BGB)

**Composition:**
- CEO or CTO of founding corporate sponsor(s)
- 1–2 representative(s) from open-source community (non-corporate)
- CFO role (treasurer, if separate from sponsor)

**Responsibilities:**
- Secure funding and manage budget
- Handle legal, trademark, and IP matters
- Oversee foundation operations (payroll, infrastructure, compliance)
- Publish annual financial reports (public)

**Authority Limits (HARD BOUNDARIES):**
- **Cannot** dictate or veto technical decisions made by the TSC
- **Cannot** modify scoring methodology to benefit a member organization
- **Cannot** restrict public access to benchmark data or methodology
- **Cannot** unilaterally change working group charters

**Voting:**
- Simple majority (50% + 1) on operational matters
- No technical authority regardless of voting percentage

### 2.3 Technical Steering Committee (TSC)

**Composition:**
- **Maximum 9 seats** (ensures agility, prevents bloat)
- **Minimum 3 active seats** (work suspends if fewer; prevents dominance)
- **All elected** based on demonstrated technical contributions to VNP
- **Affiliation cap: 25%** — No more than 2 of 9 seats can be affiliated with the same parent company (prevents mega-corp capture)
- **Public election** every 12 months; anyone with merged PRs in the past 12 months is eligible to vote

**Responsibilities:**
- Own the VNP specification and all technical decisions
- Define scoring methodology, measurement criteria, and workloads
- Approve working group charters and deliverables
- Manage disputes and conflicts of interest
- Publish monthly status reports and decision logs (public)

**Decision Process (Rough Consensus Model):**

VNP adopts the IETF's "rough consensus, not unanimous consent" model. Voting is a last resort:

1. **Discussion Phase:** Working group proposes a technical change with rationale and evidence
2. **Consensus Assessment:** TSC chair evaluates whether the proposal has "rough consensus"
   - Strong technical arguments prevail over volume of speakers
   - A single substantive objection that is not addressed = no consensus
   - Corporate affiliation of speakers is irrelevant; argument quality is everything
3. **If consensus exists:** Decision is recorded and implemented
4. **If consensus is unclear:** Chair may call for a formal vote (simple majority, 5 of 9 required)
5. **If a vote reveals a 3–3–3 split:** The proposal is rejected (requires supermajority consensus)

**Why rough consensus, not majority voting:**
- Prevents one company from buying voting power or seats
- Ensures minority technical concerns are addressed
- Reflects how IETF, Linux kernel, and successful open standards operate

**Voting Only Allowed For:**
- TSC elections (annual)
- Supermajority proposals (changes to governance, methodology versioning)
- Dispute escalations (if consensus cannot be reached)

**Conflict of Interest:**
- Any TSC member whose employer is the subject of a dispute must recuse from voting on that dispute
- Public disclosure of all employer affiliations (updated quarterly)
- 12-month cooling-off period before an ex-TSC member can represent a company in any VNP process (e.g., an appeal)

---

## 3. WORKING GROUPS (WGs)

### 3.1 Initial Working Groups

**Methodology WG**
- Owns the scoring formula, benchmarking dimensions, and anti-gaming controls
- Publishes: VNP Methodology Specification (versioned, public comment required for changes)
- Updates: Methodology changes require 2/3 TSC supermajority + 60-day public comment

**Infrastructure WG**
- Owns measurement node architecture, geographic distribution, and data pipeline
- Publishes: Infrastructure Reference Guide (open-source agent code, deployment guides)
- Updates: Infrastructure changes that could affect score comparability require TSC approval

**Governance & Community WG**
- Owns dispute resolution, conformance certification, and community onboarding
- Publishes: Dispute Process documentation, Conformance Test Suite, Contributor Guidelines
- Updates: Policy changes require BGB + TSC joint approval

### 3.2 WG Authority & Escalation

- **WGs propose:** Technical work, methodology, policy
- **TSC approves:** All deliverables and changes
- **BGB involvement:** Only for financial or legal implications

---

## 4. INTELLECTUAL PROPERTY FRAMEWORK

### 4.1 License: Community Specification License (CSL v1.0)

All VNP intellectual property is contributed under the **Community Specification License v1.0**, managed by the Linux Foundation's Joint Development Foundation (JDF).

**Key provisions:**
- **Royalty-free:** All implementations are free from patent claims by contributing organizations
- **Perpetual:** Patent grants do not expire
- **Non-exclusive:** Contributors retain rights to their own implementations
- **Reciprocal:** Organizations implementing VNP cannot sue other implementers over the spec

**Why CSL, not Apache 2.0 or CC-BY:**
- Apache 2.0 is software-focused; CSL is specification-focused
- CSL provides explicit patent grants for independent implementations
- CC-BY doesn't address patent liability

### 4.2 Contributor Agreement

All contributors (individuals and organizations) must sign a **Contributor License Agreement (CLA)** before their first commit is merged:

**What the CLA requires:**
- Grant of copyright and patent license to the VNP intellectual property
- Representation that the contributor owns or has rights to the contribution
- No warranty or guarantees

**Process:**
- Automated via CLA Assistant bot on GitHub
- Takes <2 minutes to sign (one-time)
- Public list of signatories

### 4.3 Code License: Apache 2.0

All open-source code (measurement agents, SDKs, dashboards, test harnesses) is licensed under **Apache 2.0**:
- Permits commercial use, modification, and distribution
- Requires attribution and disclosure of changes
- Not compatible with GPL (intentional; allows for proprietary extensions)

### 4.4 Data License: Creative Commons CC-BY 4.0

All published benchmark data and results are released under **CC-BY 4.0**:
- Permissive open data license
- Allows commercial and non-commercial use
- Requires attribution to VNP

---

## 5. FUNDING AND FINANCIAL GOVERNANCE

### 5.1 Funding Model (Zero-Cost for Startups)

**Founding Phase (Months 0–6):**
- Linux Foundation series freemium tier: **$0 cost**
- In-kind contributions from founding partners (cloud credits, infrastructure)
- Grant funding: Ethereum Foundation, Web3 Foundation, Filecoin/IPFS grants (target $50K–$200K)

**Operational Phase (Months 6+):**
- Corporate sponsorships: Tiered ($10K–$100K annually)
- Conformance certification fees: $5K–$50K per certified API provider (optional)
- Community member subscriptions: Opt-in, <$1K/year (token of support, not required)

### 5.2 Annual Budget Transparency

- Published annually on `vnp.io/transparency`
- Breakdown: personnel, infrastructure, grant distribution, reserves
- Community input on annual budget allocation (non-binding)

### 5.3 Conflict-of-Interest Mitigation

- No single sponsor can contribute >30% of annual budget
- If a sponsor exceeds 30%, they lose BGB voting rights (financial veto)
- Budget reserves held in trust to prevent single-sponsor shutdown power

---

## 6. DISPUTE RESOLUTION & APPEALS

### 6.1 Three-Tier Dispute Process

**Tier 1: Automated Review (0–24 hours)**
- API provider submits dispute with evidence
- Automated re-measurement from 3 new measurement nodes
- If re-measurement ≤5% variance from original score → dispute rejected automatically
- Decision recorded on-chain (Base L2 smart contract)

**Tier 2: Technical Panel (1–5 business days)**
- If re-measurement >5% variance, escalates to 5-person Technical Review Panel
- Panel: mix of TSC members + community auditors
- All evidence posted publicly (transparent review)
- Majority vote, recorded on-chain

**Tier 3: Community Arbitration (7–14 days)**
- If provider disputes Tier 2 decision, escalates to community vote
- Model: UMA Optimistic Oracle (challenge bond required)
- Incentivized voting: community members stake on outcomes
- If provider wins appeal, Tier 2 judges pay slashing fee
- If provider loses, their bond is slashed

### 6.2 Dispute Scope (What Can Be Appealed)

**Allowed:** "Our API's score is mathematically wrong because the measurement was from a Tier 1 provider in maintenance and we have evidence of..." (factual, measurement-based)

**Not allowed:** "Your methodology is wrong; p99 latency should be weighted less" (methodology challenges use RFC process, not disputes)

---

## 7. DECISION-MAKING RULES

### 7.1 Supermajority Requirements (2/3 TSC + 60-day comment period)

Changes requiring supermajority:
- Scoring methodology version bumps (v0.1 → v0.2)
- Removal of scoring dimensions or addition of new ones
- Changes to governance charter itself
- Removal of a TSC member for cause

### 7.2 Simple TSC Majority (5 of 9)

Changes requiring simple majority:
- Publication of annual governance report
- Approval of new working group charters
- Approval of funding proposals (BGB proposes, TSC approves)

### 7.3 No Vote Needed (Chair Authority)

- Scheduling meetings and managing agendas
- Enforcing code of conduct
- Appointing working group chairs (with diversity requirement: max 2 from same company)

---

## 8. TRANSITION & SCALING

### 8.1 Phase 1: W3C Community Group (Month 0–1)

- Serves as interim governance body
- Public mailing list, GitHub, Discord
- Chair: Anthony (Veklom co-founder, interim)
- Open to all individuals, no membership fees

### 8.2 Phase 2: Linux Foundation Series (Month 1–3)

- Formal legal entity established
- BGB and TSC structure activated
- First public TSC election (Month 3)
- Trademark and domain transferred to LF

### 8.3 Phase 3: Formal Standards Body (Month 6–12)

- Optional: Propose VNP as ISO TC 215 (Information and Documentation) work item
- Optional: Pursue W3C Working Group status for formal standardization
- Community-elected TSC fully operational

---

## 9. AMENDMENTS TO THIS CHARTER

This charter may be amended only by:
1. **Proposal:** Any TSC member or 5+ contributors propose a change
2. **Comment:** 60-day public comment period on `public-wabcg@w3.org`
3. **Vote:** 2/3 supermajority of TSC (6 of 9)
4. **Ratification:** BGB approves (operational, not technical)

---

## 10. DISSOLUTION CLAUSE

If VNP is dissolved or moves to a different governance model:
- All intellectual property (specifications, code, trademarks) transfers to the Linux Foundation in perpetuity
- All benchmark data remains open-access under CC-BY
- Contributors retain rights to their own implementations

---

## 11. CODE OF CONDUCT

All participants in VNP (TSC, contributors, community members) agree to:
- Be respectful and inclusive
- Address technical disagreements, not personal attacks
- Disclose conflicts of interest
- Follow the Linux Foundation's Code of Conduct (adopted in full)

---

## 12. EFFECTIVE DATE & RATIFICATION

This charter is effective upon:
1. Approval by the Linux Foundation Board (expected Month 2)
2. Ratification by the initial TSC (public vote, recorded)
3. Publication at `vnp.io/governance`

**Status:** PROPOSED (awaiting W3C CG and LF approval)  
**Next Review:** Month 6, 2026 (post v0.1 launch)

---

## Appendix A: Rough Consensus Decision Tree

```
┌─ Proposal Made
│
├─ Working Group Drafts (2–4 weeks)
│
├─ TSC Chair Assesses: Is there rough consensus?
│  │
│  ├─ YES (no strong objections, quality arguments support):
│  │  └─ → APPROVED (no vote needed)
│  │
│  ├─ UNCLEAR (legitimate concerns not addressed):
│  │  └─ → BACK TO WORKING GROUP (iterate)
│  │
│  └─ NO (strong technical objections or corporate capture suspected):
│     │
│     ├─ Attempt to address objections (1–2 weeks)
│     │
│     └─ If still unresolved:
│        └─ → FORMAL VOTE (5 of 9 TSC required)
│           │
│           ├─ APPROVED (5+)
│           ├─ REJECTED (≤4)
│           └─ BLOCKED if result is 3–3–3 (supermajority required)
```

---

**Questions or feedback?** Comment on the GitHub issue: `VeklomNP/governance#1`
