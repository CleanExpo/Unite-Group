# Unite-Group — THE canonical monorepo

**Read `SOURCE-OF-TRUTH.md` first.** This repo (`CleanExpo/Unite-Group`) is the
single canonical repository for the Unite-Group product and ecosystem. On
12/06/2026 it absorbed Unite-Hub, hermes-workspace, Unite-Group-Spine,
pi-ceo-operator-mcp and brain-1 with full git history.

## Layout

| Path | What it is |
|---|---|
| `apps/web/` | **The product** — Unite-Group (formerly Unite-Hub CRM engine). Next.js 16, React 19, Supabase, pnpm workspace. Its own `apps/web/CLAUDE.md` rules (NorthStar, No-Invaders, founder_id scoping, Scientific Luxury) still apply inside it. |
| `apps/workspace/` | Hermes workspace — agent command centre (Vite/React 19) |
| `apps/authority-legacy/` | Old Authority-Site app — TEMPORARY harvest source for the C-then-A port. Do not build features here. |
| `packages/spine/` | Unite-Group-Spine — greenfield shared-identity schema (gated, non-prod) |
| `packages/pi-ceo-operator-mcp/` | Portfolio-health MCP server |
| `docs/brain/` | Strategic knowledge vault (formerly brain-1) |
| `docs/legacy/authority-site/` | Old Authority-Site docs |
| `docs/convergence/` | Migration map + cutover & deletion runbook |
| `.portfolio/PORTFOLIO.yaml` | Portfolio registry SSOT (moved here from Unite-Hub) |

## Convergence programme

Active programme: port `apps/authority-legacy` unique surface (Stripe billing/
webhooks, command-centre dashboard, GitHub/Telegram webhooks) into `apps/web`,
then delete the legacy app. Operate per the skill:
`.claude/skills/fable-prompt-engineer/` (orchestration rules) and its
`playbooks/convergence.md` (port list, conflict rules, gates).

## Hard rules

- **Toolchain**: each package keeps its own lockfile/package manager. The root
  is NOT a pnpm workspace (apps/web is one itself; pnpm cannot nest). Verify
  via root `package.json` scripts (`npm run verify:web` etc.).
- **DB**: all schema work sandbox-first; no production Supabase migrations
  without explicit approval. founder_id scoping only in apps/web.
- **No writes to the former repos** (Unite-Hub, brain-1, Spine, hermes-workspace,
  pi-ceo-operator-mcp) — they are frozen pending deletion per the runbook.
- **Deletion** of any repo/Supabase/Vercel resource: runbook gates + Phill's
  typed approval only. Never autonomous.
- Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT.
