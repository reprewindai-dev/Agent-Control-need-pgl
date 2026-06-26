# Veklom Terminal Demo

> Interactive demo terminal for the Veklom Runtime Authority Stack.

Veklom decides what AI agents are allowed to do before they do it - and verifies whether the systems they call are trustworthy enough to receive the action.

This repo is the terminal surface for demonstrating Veklom's core flow:

- Cappo authorizes the action.
- VNP grades the capability.
- BYOS runs the workload.
- Control Plane governs the system.
- PGL records proof.

The terminal can run scripted scenarios today and can later connect to live Cappo, BYOS, VNP, PGL, and Control Plane endpoints.

---

## Demo role

This repo is not the production authority kernel, runtime backend, proof ledger, or control plane.

It is the public/demo command surface used to make Veklom understandable in one flow:

```text
agent action -> authority check -> capability trust check -> governed execution -> proof
```

Use this terminal to show how Veklom controls the relationship between AI agents and the systems they touch.

---

## Canonical commands

Planned terminal commands:

```text
run authority-before-action
run bad-target-blocked
run spend-limit-escalation
run kill-switch
show proof
show vnp-score
```

Each command should animate or print a scenario that maps to the Veklom stack:

```text
Cappo -> VNP -> BYOS -> PGL -> Control Plane
```

---

## Firebase role

Firebase may be used as demo infrastructure for:

- demo session memory
- scripted scenario state
- terminal logs
- replayable proof-style records
- live UI synchronization

Firebase should not be treated as the source of truth for production authority, production PGL, real x402 settlement, sensitive agent memory, or enterprise customer runtime.

---

## Run locally

Prerequisites: Node.js

1. Install dependencies:

```bash
npm install
```

2. Set the Gemini key if the app uses AI Studio/Gemini features:

```bash
GEMINI_API_KEY=your_key_here
```

3. Run the app:

```bash
npm run dev
```

Original AI Studio app reference:

```text
https://ai.studio/apps/5507eb40-b1a0-4fc4-89e9-d1ef0b9d7ae3
```
