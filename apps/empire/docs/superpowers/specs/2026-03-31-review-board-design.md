# Review Board Design Spec

**SYN-591** | 2026-03-31 | Status: Implemented

## Overview

4-layer automated code review system for all PRs to `main`.

## Architecture

```
PR opened/updated
       │
       ▼
Layer 1: PR Manager (GitHub Actions)
  - Risk tier classification (trivial / standard / critical)
  - Specialist dispatch list determined by changed files
       │
       ▼
Layer 2: Specialist Panel (parallel, fan-out)
  - 16 specialists run in parallel via matrix strategy
  - Each produces structured findings JSON
  - Trivial PRs: 3 specialists (~$0.05)
  - Standard PRs: 10 specialists (~$0.50)
  - Critical PRs: 16 specialists (~$1.60)
       │
       ▼
Layer 3: Chief Reviewer (synthesis)
  - Loads all findings, deduplicates
  - Applies 80% confidence threshold
  - Determines verdict: APPROVE or REQUEST_CHANGES
  - Posts structured PR review via GitHub API
  - Exits non-zero on REQUEST_CHANGES → blocks merge
       │
       ▼
Layer 4: Learning Loop (metrics)
  - Appends entry to .review-metrics.jsonl
  - /review-metrics skill produces trend reports
  - Recurring issues surfaced for process improvement
```

## 16 Specialist Reviewers

| # | Specialist | Focus |
|---|---|---|
| 1 | security | Secrets, RLS bypass, injection, auth |
| 2 | typescript | Type safety, strict mode, any usage |
| 3 | database | Migrations, N+1, indexes, RLS policies |
| 4 | performance | N+1, bundle size, pagination |
| 5 | architecture | Layer violations, abstractions, boundaries |
| 6 | accessibility | ARIA, colour contrast, keyboard nav |
| 7 | react | Hooks, keys, re-renders, effects |
| 8 | api-design | HTTP semantics, contracts, validation |
| 9 | error-handling | Try/catch, silent swallowing, fallbacks |
| 10 | logging | Structured logs, sensitive data, levels |
| 11 | testing | Coverage gaps, brittle tests, assertions |
| 12 | documentation | JSDoc, inline comments, README |
| 13 | dependencies | Duplicates, vulnerabilities, bundle impact |
| 14 | migrations | safe-migrate.sh compliance, IF NOT EXISTS |
| 15 | auth | middleware.ts/auth routes (locked files) |
| 16 | bundle-size | Tree shaking, dynamic imports, images |

## Risk Tier Classification

| Tier | Files Matched | Specialists | Approx Cost |
|---|---|---|---|
| critical | middleware, auth, migration, stripe, .env | 16 | ~$1.60 |
| standard | app/api, src/lib, schema, supabase | 10 | ~$0.50 |
| trivial | .tsx, .css, .md, docs | 3 | ~$0.05 |

## Verdict Logic

```
REQUEST_CHANGES → any CRITICAL or HIGH finding
APPROVE         → no CRITICAL or HIGH (MEDIUM/LOW/INFO are advisory)
```

## Hard Gate

GitHub branch protection requires the `chief-reviewer` status check to pass. The `chief-reviewer.js` script exits non-zero on `REQUEST_CHANGES`, failing the check and blocking merge.

## Human Override

1. Post `OVERRIDE: [reason]` comment on the PR
2. Dismiss the Review Board's review via GitHub UI
3. Requires team lead permissions

## Circuit Breaker

If Anthropic API is unavailable or any specialist times out (>5 min):
- Default to APPROVE (never permanently block due to infrastructure failure)
- Post: "Review Board temporarily unavailable — please review manually"
- Log infrastructure failure to metrics

## Files

| File | Purpose |
|---|---|
| `.github/workflows/review-board.yml` | GitHub Actions workflow |
| `scripts/review/run-specialist.js` | Individual specialist runner |
| `scripts/review/chief-reviewer.js` | Synthesis + verdict |
| `scripts/review/review-metrics.js` | Trend report generator |
| `.claude/agents/chief-reviewer.md` | Chief Reviewer agent spec |
| `.claude/skills/review-board/review-metrics.md` | /review-metrics skill |
| `.review-metrics.jsonl` | Append-only metrics log (gitignored) |
