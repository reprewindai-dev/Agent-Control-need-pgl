# Veklom Terminal Demo Script

## Demo: Authority Before Action

### Setup

An AI agent is attempting three actions in sequence:

1. Read a customer record from the database
2. Call an external payments API
3. Trigger a webhook to a third-party system

The terminal shows how Veklom controls the action before side effects happen.

---

## Step 1 - Identity check

**Layer:** Cappo Authority Kernel

The agent presents its agent/action identity.

The terminal should show:

```text
[CAPPO] execution identity received
[CAPPO] tenant resolved
[CAPPO] delegated scope loaded
[CAPPO] identity status: verified
```

---

## Step 2 - Policy check

**Layer:** Cappo Authority Kernel

Cappo checks whether the agent is allowed to attempt each action.

The terminal should show:

```text
[CAPPO] action: read_customer_record -> allowed
[CAPPO] action: call_payments_api -> requires capability trust check
[CAPPO] action: trigger_third_party_webhook -> policy review required
```

---

## Step 3 - Capability trust check

**Layer:** Veklom Nexus Protocol

VNP checks whether the target API is trustworthy enough to receive the action.

The terminal should show:

```text
[VNP] target: payments_api
[VNP] p99 latency: pass
[VNP] error/correctness: pass
[VNP] uptime: pass
[VNP] security posture: pass
[VNP] x402/payment compliance: pass
[VNP] confidence: medium
[VNP] capability score: B+
[VNP] decision: target approved
```

---

## Step 4 - Spend check

**Layer:** Cappo + BYOS

The system checks whether the action is inside the agent's allowed spend and payment rules.

The terminal should show:

```text
[SPEND] estimated cost loaded
[SPEND] x402 payment authorization checked
[SPEND] budget status: within limit
[SPEND] decision: proceed
```

---

## Step 5 - Governed execution

**Layer:** BYOS Runtime Backend

The approved workload runs through governed, tenant-scoped infrastructure.

The terminal should show:

```text
[BYOS] tenant runtime selected
[BYOS] provider route selected
[BYOS] governed workload started
[BYOS] audit event emitted
[BYOS] execution status: completed
```

---

## Step 6 - Proof

**Layer:** PGL + Control Plane

The operator sees who acted, what was called, what VNP scored, what was allowed or denied, what it cost, and the proof record.

The terminal should show:

```text
[PGL] proof record created
[PGL] decision hash sealed
[CONTROL] operator timeline updated
[CONTROL] proof view available
```

---

## Kill switch branch

At any point, the operator can stop the agent from the Control Plane.

The terminal should show:

```text
[CONTROL] kill switch triggered
[CAPPO] active execution revoked
[BYOS] workload stopped
[PGL] kill event sealed
RESULT: agent stopped before further side effects
```

---

## Result

The agent either completes with full proof, or is stopped before any unsafe side effect occurs.

This is the core Veklom story:

```text
Cappo authorizes the action.
VNP grades the capability.
BYOS runs the workload.
Control Plane governs the system.
PGL records proof.
```
