# Unite-Group — THE canonical monorepo

**Read `SOURCE-OF-TRUTH.md` first.** This repo (`CleanExpo/Unite-Group`) is the
single canonical repository for the Unite-Group product and ecosystem. On
12/06/2026 it absorbed Unite-Hub, hermes-workspace, Unite-Group-Spine,
pi-ceo-operator-mcp and brain-1 with full git history. On 15/06/2026 it
absorbed Fabel-Prompt-Engineer (→ `apps/spec-board/`), the fix-queue gate
having been met.

## Layout

| Path | What it is |
|---|---|
| `apps/web/` | **The product** — Unite-Group (formerly Unite-Hub CRM engine). Next.js 16, React 19, Supabase, pnpm workspace. Its own `apps/web/CLAUDE.md` rules (NorthStar, No-Invaders, founder_id scoping, Scientific Luxury) still apply inside it. |
| `apps/workspace/` | Hermes workspace — agent command centre (Vite/React 19) |
| `apps/empire/` | Pi-CEO / Margot voice / CEO activity app — source of voice + activity routes now ported to `apps/web`. Retained for reference only; do not build new features here. |
| `apps/spec-board/` | Fabel-Prompt-Engineer — plain-English vision → verified, build-ready spec (Next.js 15, npm, own Supabase project `yhteftfnoegmdkimzzjd`). Keeps its own lockfile/toolchain. Live founder data (visions/specs/board) untouched by the fold-in. |
| `apps/autopilot-runner/` | `@unite/autopilot-runner` — Stage-3 Autopilot Runner, the hosted executor that lets the deployed Unite-Group app run the Linear autonomous loop unattended, off the Mac; lineage UNI-2143. |
| `packages/spine/` | Unite-Group-Spine — greenfield shared-identity schema (gated, non-prod) |
| `packages/pi-ceo-operator-mcp/` | Portfolio-health MCP server |
| `docs/brain/` | Residual brain files (Drafts, NEXUS.md) — the strategic knowledge vault lives canonically at `~/2nd Brain/2nd Brain` (CleanExpo/brain-1); the stale `2nd Brain/` snapshot was removed 06/07/2026 after its 4 unique files were rescued to the canonical vault |
| `docs/legacy/authority-site/` | Old Authority-Site docs |
| `docs/convergence/` | Migration map + cutover & deletion runbook |
| `.portfolio/PORTFOLIO.yaml` | Portfolio registry SSOT (moved here from Unite-Hub) |

## Convergence programme

**COMPLETE as of 20/06/2026.** All `apps/authority-legacy` unique surface has been
ported to `apps/web` (Margot Voice, Notifications inbox, Wiki/knowledge base,
Pi-CEO activity — PRs #355/#356). `apps/authority-legacy` never existed locally
in this checkout; `apps/empire` was the actual source and is retained for reference.
Unite-Hub (`CleanExpo/Unite-Hub`) fully wound down (env vars confirmed in `apps/web`,
GitHub repo + Vercel project deleted 20/06/2026 — per Phill's typed approval).

## Hard rules

- **Toolchain**: each package keeps its own lockfile/package manager. The root
  is NOT a pnpm workspace (apps/web is one itself; pnpm cannot nest). Verify
  via root `package.json` scripts (`npm run verify:web` etc.).
- **DB**: validate every schema change/migration on a **Supabase database
  branch** before prod. There is no standing sandbox — the old mirror project
  (`xgqwfwqumliuguzhshwv`) was deleted 15/06/2026 and won't be replaced. Prod
  (`lksfwktwtmyznckodsau`) moves only via a merged, approved branch — never apply
  to prod directly, never autonomously. founder_id scoping only in apps/web.
  See `apps/empire/CLAUDE.md` for the workflow.
- **No writes to other repos.** `brain-1`, `hermes-workspace`, and
  `pi-ceo-operator-mcp` are frozen pending deletion per the runbook.
  **`CleanExpo/Unite-Group-Spine` was ARCHIVED on GitHub 05/07/2026** (Phill's
  typed instruction) — read-only; the canonical Spine is `packages/spine/` here.
  Full deletion, if ever, still needs runbook gates + Phill's typed approval. **Unite-Hub
  (`CleanExpo/Unite-Hub`) is being wound down and closed** (per Phill 2026-06-20;
  supersedes the 2026-06-18 "keep separate" instruction). All env vars have been
  confirmed present in `apps/web`. The Vercel `unite-hub` project and
  `CleanExpo/Unite-Hub` repo are pending decommission — deletion requires Phill's
  typed approval per the runbook. Do not start new work in Unite-Hub.
- **Deletion** of any repo/Supabase/Vercel resource: runbook gates + Phill's
  typed approval only. Never autonomous.
- **PR base = `main`, always.** Every pull request must target `main` — never
  stack a PR on another feature branch. Stacked PRs merge into their base
  branch and strand the work there (it never reaches `main`); see the
  mobile-voice incident (PRs #281/#282/#283 stranded on
  `codex/mobile-voice-intake`, recovered via #285). One issue → one branch off
  the latest `main` → one PR into `main`.
- Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT.

## Claude skills — Nexus operating doctrine

The skills in `.claude/skills/` are the operating doctrine for this repo.
Consult and follow them:

- **nexus-conventions** — before writing, reviewing, or committing any code.
- **supabase-schema-gate** — before any code that reads or writes a Supabase
  table ships; verify prod schema read-only first.
- **credential-triage** — for any integration failure, cron error, or the
  weekly health check.
- **live-verify** — before pinning or reporting any time-sensitive fact
  (model IDs, package versions, API limits, pricing, provider status). End
  such outputs with: Verified live <date>: <fact> — <source URL>.
