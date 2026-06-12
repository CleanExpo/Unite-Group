# SOURCE OF TRUTH

**This repository — `CleanExpo/Unite-Group` — is the ONE canonical repository
for the entire Unite-Group product and ecosystem.**

As of 12/06/2026 it absorbed (with full git history, via subtree merge):

| Former repo | Now lives at | Former role |
|---|---|---|
| `CleanExpo/Unite-Hub` | `apps/web/` | CRM / product engine — **the surviving product** |
| `outsourc-e/hermes-workspace` | `apps/workspace/` | Agent command centre |
| `CleanExpo/Unite-Group-Spine` | `packages/spine/` | Shared-identity schema (greenfield, gated) |
| `CleanExpo/pi-ceo-operator-mcp` | `packages/pi-ceo-operator-mcp/` | Portfolio-health MCP server |
| `CleanExpo/brain-1` | `docs/brain/` | Strategic knowledge vault |
| (this repo's old contents) | `docs/legacy/authority-site/` (docs) | Authority-Site app — fully harvested; app removed 12/06/2026, recoverable at commit `d63a37f3` |

## Rules

1. **No agent, cron, or automation may write to the former repos.** They are
   pending hard deletion per `docs/convergence/cutover-and-deletion-runbook.md`.
2. **One product**: `apps/web` (identity "Unite-Group", package `@unite-group/web`).
   The Authority-Site's Stripe/command-centre/webhook surface has been ported
   into it — see `docs/convergence/migration-map.md` (CLOSED; deferred register
   is the follow-up work-queue).
3. **No nested clones, no new repos.** The portfolio registry is
   `.portfolio/PORTFOLIO.yaml` in this repo.
4. **Toolchain**: each package keeps its own lockfile and package manager
   (`apps/web` is itself a pnpm workspace; pnpm does not support nesting, so
   the monorepo root is deliberately NOT a pnpm workspace). Root
   `package.json` scripts orchestrate per-package verification.
5. **Deletion of anything external** (repos, Supabase projects, Vercel
   projects) only via the runbook gates + Phill's typed approval.

Convergence programme: `.claude/skills/fable-prompt-engineer/playbooks/convergence.md`
