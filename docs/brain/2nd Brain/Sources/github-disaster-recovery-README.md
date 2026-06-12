---
title: "disaster-recovery: Safe experimentation space - isolated from disasterrecovery.com.au production. S"
source: "https://github.com/CleanExpo/DR-Sandbox/blob/main/README.md"
repo: "CleanExpo/DR-Sandbox"
file_type: "README"
captured: "2026-05-21"
tags:
  - clippings
  - github
  - dr-sandbox
---

# DR-Sandbox

**Status:** Active sandbox · not production
**Owner:** Phill McGurk (CleanExpo)
**Parent project:** [disasterrecovery.com.au](https://disasterrecovery.com.au) (served from `CleanExpo/DR-NRPG`)
**Created:** 2026-04-20 (alongside the DR-184 consolidation)

---

## What this repo is for

A safe place to experiment with Disaster Recovery code — new features, refactors, proofs of concept, Pi Dev Ops auto-generated work — **without any risk to the live site at disasterrecovery.com.au**.

It exists because the DR-184 consolidation closed off `CleanExpo/Disaster-Recovery` and `CleanExpo/NRPG-Onboarding-Framework`. `CleanExpo/DR-NRPG` is now production-only. This repo is the new scratch space.

## What this repo is NOT

- **Not** connected to Vercel. No preview deploys. No production deploys. Nothing built here reaches a public URL automatically.
- **Not** a fork of DR-NRPG. A fork implies intent to sync upstream. This repo is a sibling, not a downstream.
- **Not** a place to store anything confidential. Keep secrets, customer data, and credentials out of this repo just as you would any other.
- **Not** the source of truth for anything customer-facing. Any code that ends up in front of users lives in `DR-NRPG`, reached via a manually reviewed PR.

## Boundary rules

1. **Experiments stay here.** Work on a feature or fix in this repo first. When it is good enough to ship, open a PR against `CleanExpo/DR-NRPG` with the final version. Do not develop directly against `DR-NRPG/main`.
2. **No Vercel link.** If a future Vercel project is connected, it must be a separate, clearly-named project (never `disasterrecovery.com.au` or any redirect thereof).
3. **No shared state with production.** No production database credentials. No production API keys. No production Stripe webhooks. Use `.env.local` with test/dev values only.
4. **Pi Dev Ops auto-PRs land here.** Update Pi Dev Ops `projects.json` so `pidev/auto-*` branches target this repo, not `DR-NRPG` or the archived `Disaster-Recovery`.
5. **Promotion is manual.** There is no automated path from `DR-Sandbox` to `DR-NRPG`. A human reads the diff and opens the PR.

## Related repositories

| Repo | Role | Status |
|------|------|--------|
| [CleanExpo/DR-NRPG](https://github.com/CleanExpo/DR-NRPG) | Production — serves disasterrecovery.com.au | Active, protect |
| CleanExpo/DR-Sandbox | **This repo** — experimental work | Active |
| [CleanExpo/Disaster-Recovery](https://github.com/CleanExpo/Disaster-Recovery) | Legacy single-app repo | Archived (DR-184) |
| [CleanExpo/NRPG-Onboarding-Framework](https://github.com/CleanExpo/NRPG-Onboarding-Framework) | Legacy training content | Archived (DR-184) |

## Getting started

```powershell
# Clone
git clone https://github.com/CleanExpo/DR-Sandbox.git
cd DR-Sandbox

# Install dependencies (none yet — add what you need)
# npm install

# Work on a feature in a branch
git checkout -b experiment/my-idea

# Commit freely — this is your sandbox
git add .
git commit -m "experiment: try the thing"
git push -u origin experiment/my-idea
```

## When work is ready for production

1. Open a PR from your experiment branch to this repo's `main` (optional self-review checkpoint).
2. Cherry-pick or port the changes into a branch on `CleanExpo/DR-NRPG`.
3. Open a PR against `DR-NRPG/main` with CI green.
4. Merge only after review.

No step is skippable. Production is earned, not defaulted-to.

## Content-ops foundation

This sandbox is the staging ground for a continuously-learning content operation that ships updates into DR-NRPG as Google's algorithms shift and as NRPG contractors come on board.

- [`docs/content-ops-architecture.md`](./docs/content-ops-architecture.md) — the three loops (algorithm drift, coverage expansion, lead feedback), six subsystems, phased build plan, strategic decisions pending
- [`rubric/v1.ts`](./rubric/v1.ts) — machine-readable definition of "good DR content", versioned, consumed by every agent
- [`rubric/README.md`](./rubric/README.md) — usage, evolution policy, design decisions

All content agents (council, autoresearch, generator) read from the same rubric. All scored pages carry the rubric version. Decay detection compares like with like.

## Links

- DR-184 consolidation blueprint — see `/archive/dr-184/` in DR-NRPG (after consolidation completes)
- Live production site: https://disasterrecovery.com.au
