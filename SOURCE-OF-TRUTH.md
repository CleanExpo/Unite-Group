# SOURCE OF TRUTH

**This repository — `CleanExpo/Unite-Group` — is the canonical repository for the Unite-Group product and ecosystem.**

## Current identity

- **Canonical product/project name:** Unite-Group.
- **Canonical repository:** `CleanExpo/Unite-Group`.
- **Canonical product surface:** `apps/web/`.
- Retired product names and superseded identity narratives must not be loaded as current truth or reused in active prompts, tasks, statuses, dashboards, memory or newly-authored documentation.
- Historical lineage belongs in Git history or explicit legacy/history material, not in the active identity contract.

A former standalone CRM repository was absorbed as a one-time history snapshot during convergence and later fully wound down. Its GitHub repository and Vercel project were deleted on 20/06/2026 after the required environment configuration was confirmed in `apps/web`. It is not active infrastructure and must not be targeted, recreated, queried as current, or treated as a parallel product.

## Convergence lineage

As of 12/06/2026 the canonical monorepo absorbed, with full git history where applicable:

| Former source | Now lives at | Current treatment |
|---|---|---|
| Former standalone CRM repository | `apps/web/` | Historical source only; `apps/web` is the current Unite-Group product surface |
| `outsourc-e/hermes-workspace` | `apps/workspace/` | Agent command centre |
| `CleanExpo/Unite-Group-Spine` | `packages/spine/` | Shared-identity schema; external repo archived/read-only |
| `CleanExpo/pi-ceo-operator-mcp` | `packages/pi-ceo-operator-mcp/` | Portfolio-health MCP server |
| `CleanExpo/brain-1` | `docs/brain/` | Residual repo history; canonical strategic knowledge lives in the current Second Brain location |
| Old authority-site contents | `docs/legacy/authority-site/` | Explicit legacy/reference material only |

## Rules

1. **One current identity:** Unite-Group. Active control-plane material must use this name only.
2. **One product surface:** `apps/web` (package `@unite-group/web`).
3. **No agent, cron, or automation may write to retired/frozen external repositories.** Current work stays in this canonical monorepo unless a separately governed project explicitly says otherwise.
4. **No nested clones, no new repos.** The portfolio registry is `.portfolio/PORTFOLIO.yaml` in this repo.
5. **Toolchain:** each package keeps its own lockfile and package manager (`apps/web` is itself a pnpm workspace; the monorepo root is deliberately not a pnpm workspace). Root `package.json` scripts orchestrate per-package verification.
6. **External deletion is governed:** deletion of repositories, Supabase projects, Vercel projects or other external resources requires the documented runbook gates and explicit approval.
7. **Supersession discipline:** when a current instruction replaces an older one, the active source of truth contains only the current rule. Historical contradictions are moved behind an explicit legacy/history boundary so retrieval cannot mistake them for live policy.

Convergence programme reference: `.claude/skills/fable-prompt-engineer/playbooks/convergence.md`
