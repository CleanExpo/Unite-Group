# Hermes Canary Update Spec + Verification
Date: 17/05/2026
Time: 17:19 AEST
Owner: Hermes CEO Operator

## Objective
If canary validation passed, apply Hermes update in canary/backup-safe mode only, keep production workflow behaviour unchanged, rerun hermes_update_scout.py, and persist before/after evidence.

## Guardrails
- No auto-publish
- No production workflow mutation
- No config migration unless required
- Verification evidence required for every status claim

## Execution performed
1) Canary-safe update executed with backup:
   - `hermes update --backup`
   - Backup artifact: `/Users/phill-mac/.hermes/backups/pre-update-2026-05-17-171842.zip`
2) Post-update validation checks run:
   - `hermes doctor`
   - `hermes --version`
   - `hermes gateway status`
   - `hermes config check`
   - `hermes skills list`
   - `hermes curator run --dry-run`
3) Scout rerun:
   - `python3 /Users/phill-mac/Pi-CEO/scripts/hermes_update_scout.py`

## Before/after comparison
- Before:
  - Status: YELLOW
  - Delta: 44 commits behind origin/main
  - Head/origin: 9f182bd7b -> 7322816ef
  - Recommendation: canary
- After:
  - Status: GREEN
  - Delta: 0 commits behind origin/main
  - Head/origin: 56ad30de1 -> 56ad30de1
  - Recommendation: ignore

## Verification evidence
- `hermes update --backup`: exit 0
- `hermes update --check`: exit 0, already up to date
- `hermes doctor`: exit 0
- `hermes --version`: exit 0, Hermes Agent v0.14.0 (2026.5.16)
- `hermes gateway status`: exit 0, service loaded/running
- `hermes config check`: exit 0, config version 23 up to date
- `hermes skills list`: exit 0
- `hermes curator run --dry-run`: exit 0, no mutations
- `hermes_update_scout.py`: exit 0

## Behaviour safety confirmation
- No production deploy, merge, or publish action executed
- No config migration executed (not required)
- No workflow routing rules changed

## Kanban persistence
- Attempted live Linear card creation via Pi-CEO Linear MCP: failed with 401 AUTHENTICATION_ERROR
- Fallback draft card persisted at:
  `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/.harness/backlog/2026-05-17-hermes-canary-postupdate-linear-draft.md`

## Artifacts
- Report: /Users/phill-mac/2nd Brain/2nd Brain/Wiki/ops/hermes-update-scout/2026-05-17.md
- Raw scout JSON: /Users/phill-mac/2nd Brain/2nd Brain/Wiki/ops/hermes-update-scout/2026-05-17.json
- Spec: /Users/phill-mac/2nd Brain/2nd Brain/Wiki/ops/hermes-update-scout/2026-05-17-canary-postupdate-spec.md
