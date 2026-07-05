# SOURCE OF TRUTH

**This repository — `CleanExpo/Unite-Group` — is the canonical repository for
the Unite-Group product and ecosystem.**

> **SUPERSEDED 2026-06-20 — see root `CLAUDE.md` (authoritative).** Unite-Hub
> has been fully wound down: `CleanExpo/Unite-Hub` GitHub repo and its Vercel
> project were **deleted 20/06/2026** per Phill's typed approval, after all env
> vars were confirmed present in `apps/web`. This supersedes the 2026-06-18
> "separate, live, parallel" correction preserved below — that correction no
> longer reflects reality; it is kept here for history only.

> **CORRECTION 2026-06-18 (Phill, authoritative) — SUPERSEDED 2026-06-20, see
> banner above.** `CleanExpo/Unite-Hub` is a
> **separate, live, independently-developed product** that runs **in parallel**
> with Unite-Group — it is **NOT** being deleted and there is **NO ongoing
> migration** between the two. The 12/06/2026 "absorption" of Unite-Hub was a
> **one-time git-history snapshot** into `apps/web`; the two have since diverged
> and are developed independently. Work only in Unite-Group; never write to
> Unite-Hub from here; never port between them. (The other former repos —
> hermes-workspace, Spine, pi-ceo-operator-mcp, brain-1 — remain frozen/absorbed
> as below.)

As of 12/06/2026 it absorbed (with full git history, via subtree merge):

| Former repo | Now lives at | Former role |
|---|---|---|
| `CleanExpo/Unite-Hub` | `apps/web/` (one-time snapshot) | CRM / product engine — **`apps/web` is now an independent product; Unite-Hub was wound down 20/06/2026 (GitHub repo + Vercel project deleted, per Phill's typed approval) — see CLAUDE.md** |
| `outsourc-e/hermes-workspace` | `apps/workspace/` | Agent command centre |
| `CleanExpo/Unite-Group-Spine` | `packages/spine/` | Shared-identity schema (greenfield, gated) |
| `CleanExpo/pi-ceo-operator-mcp` | `packages/pi-ceo-operator-mcp/` | Portfolio-health MCP server |
| `CleanExpo/brain-1` | `docs/brain/` | Strategic knowledge vault |
| (this repo's old contents) | `docs/legacy/authority-site/` (docs) | Authority-Site app — fully harvested; app removed 12/06/2026, recoverable at commit `d63a37f3`. `apps/empire/` was the actual source and is retained for reference (see CLAUDE.md) |

## Rules

1. **No agent, cron, or automation may write to the former repos.**
   hermes-workspace, Spine, pi-ceo-operator-mcp, and brain-1 are pending hard
   deletion per `docs/convergence/cutover-and-deletion-runbook.md`. **Unite-Hub
   is no longer the exception**: per the 2026-06-20 supersession banner above,
   it has been wound down (GitHub repo + Vercel project deleted); the
   2026-06-18 "live parallel product, NOT pending deletion" claim is
   superseded. Never write to it from this repo.
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
