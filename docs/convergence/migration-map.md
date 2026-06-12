# Convergence Migration Map

> Phase 2 exit gate: every `apps/authority-legacy` path classified
> **migrated / rejected / obsolete / deferred** before the directory is deleted.
> Every entry must cite the slice commit that carried it (or the reason it didn't move).

Status: **OPEN** — Phase 1 (monorepo import) complete 12/06/2026; Phase 2 (port) in progress.

## Phase 1 record (12/06/2026)

| Source | Imported to | Commit | History |
|---|---|---|---|
| CleanExpo/Unite-Hub @ 48ae79f | `apps/web/` | e732c506 | 1,807 commits preserved |
| outsourc-e/hermes-workspace @ 839ade6 | `apps/workspace/` | 2766cf86 | 1,734 commits preserved |
| CleanExpo/Unite-Group-Spine @ c0ece17 | `packages/spine/` | 3bbcd19a | full history |
| CleanExpo/pi-ceo-operator-mcp @ 414e525 | `packages/pi-ceo-operator-mcp/` | 310994e6 | full history |
| CleanExpo/brain-1 @ a6201b2 (remote main, newer than local clone) | `docs/brain/` | d63f5e20 | 53 commits preserved |
| Authority-Site app (this repo's old root) | `apps/authority-legacy/` + `docs/legacy/authority-site/` | 7043f902 | native history (git mv) |

Decisions:
- Root is NOT a pnpm workspace — `apps/web` is itself a pnpm workspace and pnpm
  cannot nest. Per-package lockfiles retained; root scripts orchestrate.
- hermes-workspace trade-off accepted: folding it in ends easy upstream syncs
  with `NousResearch/hermes-agent` tooling. Recorded per Phill's instruction
  to merge everything.
- Old root workflows archived at `apps/authority-legacy/.github-workflows-archived/`
  (root paths no longer valid); replaced by `.github/workflows/ci.yml`.

## Phase 2 port classification (apps/authority-legacy → apps/web)

### Port list (from the approved C-then-A design)

| # | Surface | Source paths | Status |
|---|---|---|---|
| P1 | Stripe billing + webhooks | `src/app/api/webhooks/stripe`, `lib/api/stripe`, `src/app/api/cron/integrations/stripe`, `src/app/api/billing/webhook` | pending |
| P2 | Command-centre dashboard | command-centre pages under `src/app` | pending |
| P3 | GitHub webhooks | GitHub webhook handlers | pending |
| P4 | Telegram webhooks | Telegram handlers | pending |
| P5 | CRM helpers + tests | `src/lib/crm/approval-lifecycle.ts`, activity-timeline helpers, unit tests | pending |
| P6 | Margot CRM docs | `docs/legacy/authority-site/margot/` | pending |
| P7 | Needed Supabase migrations | `supabase/migrations/` (selected, re-timestamped, sandbox-only) | pending |

### Bulk classification (filled by the classification sweep)

_To be appended: one row per remaining path-group with classification + evidence._
