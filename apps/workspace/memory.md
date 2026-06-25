# Hermes Workspace — Curated Memory

## Active context

- **Date**: 20/06/2026
- **Hermes version**: v2.1.3 (see `package.json`)
- **Monorepo**: `CleanExpo/Unite-Group` — absorbed Unite-Hub, hermes-workspace, Unite-Group-Spine, pi-ceo-operator-mcp, brain-1 (12/06/2026) and Fabel-Prompt-Engineer (15/06/2026)
- **Convergence programme**: COMPLETE as of 20/06/2026. Unite-Hub fully wound down (GitHub repo + Vercel project deleted per Phill's typed approval).
- **CRM**: `apps/web` is the canonical CRM (Mission Control / Nexus). Not `apps/empire` (reference only).

## Key decisions

<!-- Populate over time as decisions are made and confirmed. Format:
     - [DD/MM/YYYY] Decision text — rationale / PR / reference
-->

- [20/06/2026] Unite-Hub (`CleanExpo/Unite-Hub`) closed — Phill's typed approval; all env vars and features confirmed in `apps/web`. Vercel `unite-hub` project and GitHub repo deleted.
- [20/06/2026] Auth security hardening: two-layer allowlist defence shipped (PR #358). Google login remains broken pending GCP secret + Vercel env vars.
- [15/06/2026] Sandbox Supabase project (`xgqwfwqumliuguzhshwv`) deleted — not replaced. DB model is Supabase database branching before prod. Never apply DDL to prod directly.
- [12/06/2026] Canonical monorepo established at `CleanExpo/Unite-Group`. All other repos frozen pending deletion per convergence runbook.

## Known integrations

| Integration         | Detail                                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase prod       | Project `lksfwktwtmyznckodsau` — shared 1728-table mega-DB (synthex/guardian/unite/...). 96-migration history. Additive + founder_id scoped only. No standing sandbox — use Supabase database branching.    |
| Synthex             | `CleanExpo/Synthex` repo — marketing agency execution layer. Tasks pushed from Mission Control (`apps/web`); Synthex is the publisher. Managed separately; do not conflate with Unite-Group command centre. |
| HeyGen              | Video generation integration. Used via API key (stored in Vercel env).                                                                                                                                      |
| Linear              | Issue tracker. Project management via MCP (`mcp__2f101dc2-*` tools). Issues use `UNI-XXXX` identifiers.                                                                                                     |
| Apify               | Web scraping / actor tasks. Token in Vercel `unite-group` env (`APIFY_API_KEY`). FREE account; 4 saved Store-actor tasks.                                                                                   |
| Google OAuth        | Code-complete + hardened. Not live — needs GCP OAuth app credentials + Vercel env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Setup guide: `docs/GOOGLE-OAUTH-SETUP.md`.                             |
| Xero OAuth          | Code-complete + hardened. Not live — needs Xero app credentials. Setup guide: `docs/XERO-OAUTH-SETUP.md`.                                                                                                   |
| Social OAuth        | Code-complete + hardened. Not live — needs provider app credentials. Setup guide: `docs/SOCIAL-OAUTH-SETUP.md`.                                                                                             |
| Vercel              | Deployment platform. Project: `unite-group`. Env vars include `APIFY_API_KEY` and all Unite-Hub vars (confirmed migrated).                                                                                  |
| Pi-CEO operator MCP | `packages/pi-ceo-operator-mcp/` — portfolio-health MCP server.                                                                                                                                              |
| Spec-board          | `apps/spec-board/` — Fabel-Prompt-Engineer. Own Supabase project `yhteftfnoegmdkimzzjd`. Own npm lockfile.                                                                                                  |

## Provider OAuth wiring status

All three provider integrations (Google, Xero, social) are code-complete and hardened as of PRs #321/#322/#323. Going live requires only Phill's provider app credentials and Vercel env vars — no further code changes needed. Escalate to Phill to activate.

## DB & migration notes

- Prod DB is a shared mega-DB — `apps/web` migrations are NOT the prod source of truth for all tables.
- Apply additive, founder_id-scoped migrations only. Validate on a Supabase database branch first.
- Branch-promote workflow: create branch in Supabase dashboard → apply DDL → get Phill approval → promote to prod.
- All convergence migrations fully applied as of 20/06/2026 (`mobile_voice_packets`, `margot_voice_sessions`, `founder_notifications` live).
