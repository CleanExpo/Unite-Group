---
type: ops-status
updated: 2026-05-17
system: Pi-Dev-Ops
repo: CleanExpo/Pi-Dev-Ops
---

# Pi-Dev Assistance Status - 2026-05-17

## Completed

- PR #237 closed as superseded by current `main` board compatibility work.
- PR #216 merged after branch refresh and green checks.
- PR #215 repaired, refreshed, green, and merged.
- PR #247 created from current `main`, green, and merged for RA-3034/RA-3012 security work.
- PR #214 closed as superseded by #247 and #248.
- PR #248 created from current `main`, green, and merged for RA-3006 harness runtime-state cleanup.
- PR #219 refreshed against current `main`, conflict resolved, green, and merged for AIP 1/3 migrations/types.
- Replacement PR #249 created for closed #221, green, and merged for AIP 2/3 seed data.
- Replacement PR #250 created for closed #222, green, and merged for AIP 3/3 read-only MCP server.
- PR #238 repaired and refreshed against current `main`; all GitHub checks are green. Left as draft because the PR carries a cutover gate.

## Evidence

- Current `origin/main`: `1904276`
- #215 checks passed before merge: Python, frontend, Pi CEO API smoke, secrets scan, DESIGN lint, Railway, Vercel, CodeRabbit.
- #247 checks passed before merge: Python, frontend, Pi CEO API smoke, secrets scan, DESIGN lint, Railway, Vercel, CodeRabbit.
- #248 checks passed before merge: Python, frontend, Pi CEO API smoke, secrets scan, DESIGN lint, Railway, Vercel, CodeRabbit.
- #219 checks passed before merge: Python, frontend, Pi CEO API smoke, secrets scan, DESIGN lint, Railway, Vercel, CodeRabbit.
- #249 checks passed before merge: Python, frontend, Pi CEO API smoke, secrets scan, DESIGN lint, Railway, Vercel, CodeRabbit.
- #250 checks passed before merge: Python, frontend, Pi CEO API smoke, secrets scan, DESIGN lint, Railway, Vercel, CodeRabbit.
- #238 checks passed after repair: Python, frontend, Pi CEO API smoke, secrets scan, DESIGN lint, RLS assertions, Railway, Vercel, CodeRabbit. Head: `c0e570b`.
- Local #215 targeted verification:
  - `/tmp/pi-dev-pr215-ci-venv/bin/pytest tests/test_sprinkle_cron_fire_agents.py tests/test_sprinkle_feedback_loop.py tests/test_sprinkle_triage.py -q` -> 12 passed.
  - `/tmp/pi-dev-pr215-ci-venv/bin/ruff check app/ --output-format=github` -> pass.
- Local AIP verification:
  - #219: `npm --prefix aip ci`, `npm --prefix aip run typecheck`, seed SQL generation checks.
  - #249: `npm --prefix aip ci`, `npm --prefix aip run typecheck`, both seed scripts generated SQL with `begin`, `commit`, and idempotent `on conflict (uri) do nothing`.
  - #250: `npm --prefix aip run typecheck`, `git diff --check`, `bash -n aip/src/mcp/run.sh`, MCP invalid-filter negative-path check, unresolved `op://` startup guard check.
  - #250 live Supabase MCP smoke was blocked locally because the 1Password CLI session was not signed in; no secret was printed.
- Local #238 verification:
  - `/tmp/pi-dev-pr238-py311-venv/bin/pytest tests/ -v --tb=short` -> 1359 passed, 6 skipped, 2 xfailed.
  - `/tmp/pi-dev-pr238-py311-venv/bin/ruff check app/ --output-format=github` -> pass.
  - `/tmp/pi-dev-pr238-py311-venv/bin/ruff check swarm/portfolio_pulse_synthesis.py --output-format=github` -> pass.
  - `git diff --check` -> pass.

## Remaining Open PR Queue

- #238 draft: Pilot V1, green checks, merge blocked only by draft/cutover gate.
- #220 draft: sprinkle embeddings, marked for Phill review; do not auto-merge.

## Next Slice

The AIP chain is complete and merged. #238 is green but intentionally unmerged because it is draft-gated.

Run the Command Center UI/UX review next, then treat #220 as review-only unless the explicit "do not auto-merge" instruction is lifted.
