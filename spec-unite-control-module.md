# Spec — Unite-Group Control Module + Claude Code Club skills

Status: **REV-3 — delivery model resolved (git tag-pin, founder 2026-07-01); Phase 4 build UNBLOCKED.** (REV-2: Phase-3 challenge gate BLOCK cleared.) Evidence-tagged per Synthex `fabel-evidence-standard`: **[V]** explicit in source · **[INF]** derived · **[UNC]** unverified/locked.

> **Phase-3 gate history.** REV-1 drew a **BLOCK** from the opus-adversary challenge gate (2026-07-01, agent `a5830f06`, 13 tool calls) on three code-verified defects, all re-verified by grep this session: (1) the "one-line `export *` barrel → no import string changes" shim is false — 4 deep-subpath import sites break it; (2) the DI seam contradicted "tests pass unchanged" — `command-packet.service.ts:14` prisma coupling + `jest.mock('@/lib/prisma')` at the test's line 9; (3) the DO-NOT-BREAK register omitted the 10-file `tests/unit/unite-command-center/` contract-test dir. This REV-2 resolves all three with an explicit stub-directory shim + factory DI + a completed register, and downgrades Part A from 9 skills to 4.

## Context

Founder joined the **Claude Code Club** Skool community and wants its material mined as base markers for a **Unite-Group Control Module** — a spec-driven, reusable module carrying specialised skills the AI brain can pull into Synthex + other projects, tested green and non-disruptive. Corpus harvested to `2nd Brain/Sources/Claude-Code-Club/` (15 full-text notes + 14 locked). Hard constraint: substitute sponsored tools (Higgsfield etc.) with our installed stack, install nothing new (memory `feedback-skool-substitute-our-stack`).

Two deliverables: **Part A** — specialised skills to author from the corpus; **Part B** — extract Synthex's `unite-command-center` into a shared, spec-driven package.

---

## Part A — Specialised skills (from corpus)

The corpus's reusable IP is **operator discipline for Claude Code itself** (context, memory, agents, MCP), not the sponsored media tools. All map to installed tools only.

Scope corrected in REV-2 (was 9): the adversary flagged 5 CREATE claims as inflated — `mcp-doctor` overlapped both `connector-routing` and `context-cockpit`; `claude-memory-hygiene`'s "NO-MATCH" was overstated (`improve-system` + `wiki-ingest` + OKF already cover most); `slash-command-authoring` is a section, not a skill; `agent-recipe` ignored memory `pi-dev-ops-skills-agentic-substrate` ("enhance, don't rebuild"). Net: **1 CREATE + 3 ENHANCE**, all ENHANCE targets verified on disk.

### Build-first (Tier A)

1. **`context-cockpit`** — CREATE (thin orchestrator; the only new skill). One-command context/token audit + reclaim: `/context` → trim MCP tools <50 → `/clear` vs `/compact` → CLI-over-MCP → model ladder. **Absorbs the former `mcp-doctor`** (red-MCP 4-check key→installed→restart→typo; `<50`-tool budgeting) as an internal step — no separate skill, since `connector-routing` already picks substrate and this triages. Sources: `13-pro-lvl-1-context-engineering.md`, `12-costs-savings-token-tips.md`, `11-micro-lessons.md`, `05-stage-5-skills-mcps.md`. Wraps engine-internal primitives (`context-compressor`, `token-budgeter`, `tao-context-mode`); no operator-facing inspect-then-reclaim skill exists. Tools: Claude Code native + `connector-routing` + Anthropic Max ladder. **[V]**
2. **ENHANCE `Pi-Dev-Ops/skills/agent-workflow`** (reconciled against `agent-expert`/`agentic-loop`/`tao-loop` per memory `pi-dev-ops-skills-agentic-substrate` — enhance, don't rebuild). Add the 5-part agent contract (name·soul·job·keys·stop), scoping formula, promotion ladder (hand-run → `/loop` → scheduled, gated on 5 clean runs), 4-way break diagnostic. Source: `07-stage-7-agents.md`. The named recipe + 5-clean-runs gate are the genuine gaps. **[V]**
3. **ENHANCE `Pi-Dev-Ops/skills/hooks-system`** — add starter guardrail hookset: pre-bash danger-word block (`rm -rf`, `drop database`, `git push --force`, `sudo`), draft-only mode for content agents, scope-lock to project folder. Source: `07`. The "agent deleted my project" insurance for unattended routines. **[V]**
4. **ENHANCE `improve-system` + `wiki-ingest`** (was the CREATE `claude-memory-hygiene` — downgraded; adversary confirmed most of it already exists). Add only the genuine deltas: CLAUDE.md-as-lean-router lint, self-evolving applied-learning block, hierarchical per-folder CLAUDE.md consolidation. Enforces `feedback-no-status-bloat`/`feedback-no-false-reporting`. Sources: `02-stage-2-memory.md`, `24`, `11`/`12`. Tools: OKF generator (`apps/workspace/scripts/okf-index.py`). **[V]**/[INF]

### Tier B (enhancements)

5. **ENHANCE `Pi-Dev-Ops/skills/design-intelligence`** — reverse-engineer-live-site→skill one-shot + DESIGN.md-from-screenshot + 3D/scroll laws (OKLCH, one-accent, anti-slop). Sources: `05`, `02`, `14`. **[V]**/[INF]
6. **ENHANCE `Synthex/.../senior-copywriter` + `brand-voice-enforce`** — hook-as-contract, 8 hook archetypes, 30→10→3 cut, 6 hook-killers. Source: `09-stage-9-social-media.md`. **[V]**
7. **ENHANCE `spm`/`build-spec`** — 4-section spec pattern (container·behaviour·UI·kicker), one-rule-per-bullet, self-contained container line. Sources: `06`, `03`, `04`. **[V]**

*Folded, not authored:* the former `slash-command-authoring` (~60 lines) becomes a section inside `skill-authoring-standard` — bottling a 3×-repeated invocation into `.claude/commands/*.md` (scope, `$ARGUMENTS`, watch-succeed-twice gate). Source: `07`. **[V]**

### Rejected (sponsored / new-infra / already-covered)
Higgsfield + all sponsored AI-video/image tools (own via `brand-video`/`video-director`/Remotion/HyperFrames/`video-use`/margot/ElevenLabs); n8n + ClawdBot VPS (own via Composio+Hermes+routines); third-party MCP shopping list — Context7/Exa/Firecrawl/Tavily/Apollo/Qdrant/21st.dev (substitute margot `deep_research`/DataForSEO/WebFetch/Supabase); Codex/Gemini triad review (use `opus-adversary`, per `feedback-anthropic-first`); local-model routing (Anthropic-Max mandate); gamification/affiliate mechanics (no eng value). **[V]**

**Author's caveat:** corpus install/marketplace steps assume the desktop app + `/plugin` marketplace. Rewrite them to point at our SSOT (`~/.claude/skills` symlink farm + Pi-Dev-Ops + `bootstrap.sh`), per `skill-authoring-standard`. **[INF]**

---

## Part B — Control Module extraction

**Source:** `Synthex/lib/unite-command-center/` — 18 files / 9 subdirs / 1206 lines, single `export *` barrel `index.ts`. Subdirs: `ontology/` (CommandPacket schema — the type spine), `intake/` (board-input, command-packet persistence + lifecycle, margot pass), `routing/` (team-dispatch), `gates/` (approval-policy, provider-readiness, production-gate), `qa/` (presentation-qa), `generation/` (media-brief, presentation-packet), `hermes/` (handoff readiness, 168L pure), `research/` (council). **[V]**

### Coupling (extraction risk: LOW–MEDIUM; surface confirmed small, shim mechanics corrected)
- **Only external couplings:** `zod` (3 files, add as dep) and **`@/lib/prisma` in exactly one file** — `intake/command-packet.service.ts:14` (calls `prisma.commandPacket.{create,findMany,findFirst,update}`). No `process.env`/`next/`/`fetch`/LLM/HTTP anywhere; the scary-named `margot-conversation-pass.service.ts` is pure regex. Re-verified by grep this session. **[V]**
- **`CommandPacket` model / `command_packets` table** (`Synthex/prisma/schema.prisma:1974`, org-scoped scalar, no FK) is Synthex-owned — the table does NOT move, only the TS logic. Any other host must provision an equivalent `command_packets` table **and** a prisma client exposing a `commandPacket` model — this is a schema+client dependency, not a package install, so the persistence slice is NOT drop-in for "additional projects" (only the ~14 pure files are). **[V]**
- 17 of 18 files (ontology, gates, routing, qa, generation, hermes, research, schemas — ~1000 lines) are pure TS+zod, move verbatim. The 2 non-verbatim files are the `index.ts` barrel and `command-packet.service.ts` (the prisma seam). **[V]**

### Package shape — DI decision + stub-directory shim (REV-2, clears BLOCK findings 1–2)
- Name: **`@unite-group/control-module`**; tooling copies the proven `@shared/types` recipe (`tsup src/index.ts --format cjs,esm --dts`, `tsc --noEmit`, zod runtime dep). **[V]**
- **DI shape = factory, DECIDED (not "injected repository", not mutable singleton).** The package exports a **pure factory** `createCommandPacketService(prisma)` returning `{ persist, list, get, transition }` — no `@/lib/prisma` import, no module-level singleton, no hidden global state (rejects the serverless-re-init fragility of a `setPrisma()` mutable singleton). **[V]**/[INF]
- **The shim is a stub DIRECTORY, not a one-line barrel** — because 4 deep-subpath import sites (verified this session) would otherwise resolve to nothing once the physical files move:
  - `components/command-centre/DraftCommandIntakePanel.tsx:12` → `.../hermes/hermes-handoff.service`
  - `lib/connection-spine/health.ts:17` → `.../hermes/hermes-handoff.service`
  - `tests/unit/lib/command-packet.service.test.ts:26–28` → `.../intake/command-packet.service`, `.../intake/board-input.schema`, `.../ontology/command-ontology.schema`
- So `Synthex/lib/unite-command-center/` stays as a thin re-export tree mirroring every currently-imported path:
  - `index.ts` → `export * from '@unite-group/control-module'` (satisfies the 24 bare-barrel importers) **plus** `export { persistCommandPacket, listCommandPackets, getCommandPacket, transitionCommandPacket } from './intake/command-packet.service'`
  - `hermes/hermes-handoff.service.ts` → `export * from '@unite-group/control-module/hermes/hermes-handoff.service'` (type re-export; unblocks `DraftCommandIntakePanel` + `health.ts`)
  - `intake/board-input.schema.ts`, `ontology/command-ontology.schema.ts` → one-line re-exports from the package
  - **`intake/command-packet.service.ts`** → the ONE binding stub: `import { prisma } from '@/lib/prisma'; import { createCommandPacketService } from '@unite-group/control-module'; const svc = createCommandPacketService(prisma); export const persistCommandPacket = svc.persist; export const listCommandPackets = svc.list; export const getCommandPacket = svc.get; export const transitionCommandPacket = svc.transition;`
- **Why this rescues the `jest.mock` test (clears finding 2):** the binding stub still lives at `intake/command-packet.service.ts` and still `import { prisma } from '@/lib/prisma'`, so `tests/unit/lib/command-packet.service.test.ts:9`'s `jest.mock('@/lib/prisma')` stays live and the free-function call-shape (`persistCommandPacket(...)` zero-arg) is unchanged. Prisma is bound once, in one file, at the stub — not two places. **[V]**/[INF]
- Consumer call sites (`packets/route.ts:17,35`; `intake/route.ts:21,80`; `packets/[id]/route.ts:22,23,56,86`) keep the identical zero-arg API, and **every import string is unchanged**. **[V]**

### ✅ RESOLVED (REV-3) — cross-repo delivery model = git tag-pin (founder call 2026-07-01)
Founder chose the **lower-ceremony git tag-pin** path over GitHub Packages: *"No other consumers soon — go with the git tag-pin path."* Confirmed live this session that `apps/web` does **not** consume the module today (`grep` → 0 hits), so **Synthex is the ONLY live cross-repo consumer** — GitHub Packages' 4-place registry auth is premature infra. **[V]**

**Mechanism (works with npm + pnpm, no new repo, no registry):** neither npm nor pnpm can consume a monorepo *subdirectory* via a `github:` specifier — the ref's **root** must be the package. So publish an **orphan tag `control-module-v0.1.0` in the existing `CleanExpo/Unite-Group` repo** whose tree root IS the package (`packages/unite-control-module/` contents promoted to root). Synthex pins `"@unite-group/control-module": "github:CleanExpo/Unite-Group#control-module-v0.1.0"`; on `npm install` npm clones that ref, sees the package `package.json` at root, and a **`prepare` script (`tsup`)** builds `dist` at install time (devDeps tsup+typescript are installed for prepare, then pruned). Immutable tag = no drift. Version bump = re-promote the package dir to a fresh orphan tag. No new GitHub repo (respects `CLAUDE.md` "no writes to frozen repos" + lowest ceremony). **[V]**/[INF]

`unite-group/` root is **not** a workspace; `apps/web` is the only pnpm workspace; **Synthex is a separate repo**. So a package in `unite-group` **cannot** be a `workspace:*` dep of Synthex. The founder ask ("available throughout Synthex and additional projects") requires a cross-repo delivery mechanism. **[V]**

**Recommended default (adopt unless founder overrides):** source of truth at `unite-group/packages/unite-control-module`, **published to GitHub Packages (CleanExpo private registry)**, consumed by both `apps/web` and Synthex as a **single** versioned private dep. Synthex keeps working via the stub tree until it bumps to the published dep.

**⚠ Unlisted config gate (adversary finding 5 — must be wired BEFORE first Synthex build):** a *private* GitHub Packages dep requires `.npmrc` + `NODE_AUTH_TOKEN`/`NPM_TOKEN` in **all four** places — both repos' CI **and** both Vercel projects (Synthex is npm on its own Vercel project). Miss any one and the Vercel build 401s at `npm install`. Given memory `feedback-env-anthropic-key` + stale-cache history, treat this as a real trap, not theoretical.

**Rejected — the REV-1 §56 dual-track** ("`apps/web` on `workspace:*` while Synthex on published"): the adversary correctly flagged it creates two divergent live copies — the exact drift the monorepo convergence was built to kill. **Single source of truth only:** both consumers take the published dep; local pre-publish iteration happens on one branch via `workspace:*` and is published before Synthex bumps — never two standing copies.

**Lower-ceremony alternative (present the trade, don't hide it):** for an internal tool with **one** live cross-repo consumer, a git-subtree/tag-pin or simply leaving the code in Synthex and having `apps/web` consume it may serve the near-term need without standing up registry auth in four places. GitHub Packages wins only if "additional projects" materialise as real consumers soon; if they don't, it's premature infra. Founder call at the gate. **[INF]**

### DO-NOT-BREAK register (must behave identically; the stub tree guarantees every import string)
- **6 API routes:** `Synthex/app/api/command-centre/{provider-readiness,connection-spine,intake,packets,packets/[id],hermes-handoff}/route.ts`
- **5 components:** `components/command-centre/{SandboxCampaignStudio,DraftCommandIntakePanel,ProviderReadinessStrip,CommandRoutingQueuePanel}.tsx` + `types.ts`
- **lib:** `lib/connection-spine/health.ts`. (`hooks/useCommandCentre.ts` hits routes over HTTP — safe if routes unchanged.)
- **Contract tests (COMPLETED in REV-2 — was undercounted by the whole `unite-command-center/` dir, adversary finding 3):**
  - `tests/unit/lib/command-packet.service.test.ts` (the `jest.mock('@/lib/prisma')` one — stays green via the binding stub)
  - `tests/unit/api/command-centre-*.test.ts`
  - `tests/unit/components/{DraftCommandIntakePanel,ConnectionSpinePanel,ProviderReadinessStrip,CommandRoutingQueuePanel,SandboxCampaignStudio}.test.tsx`
  - **`tests/unit/unite-command-center/` — 10 files (verified `ls`):** `board-input-service`, `contracts`, `gates`, `hermes-handoff`, `margot-routing`, `presentation-packet`, `presentation-qa`, `production-gate`, `provider-readiness-registry`, `research-council`. These are the real contract tests for the extracted code — they must pass unchanged (they import package internals, which the stub tree re-exports at their existing paths). **[V]**

### Verification (green before AND after)
- Synthex (live consumer): `npm run type-check && npm run lint && npm test`; prod: `npm run build:vercel`. **All command-centre + `unite-command-center/` contract tests (the full set enumerated in the register above) pass unchanged** — the stub tree preserves every import path and the binding stub keeps `jest.mock('@/lib/prisma')` live. (REV-1's "the 4 test files pass unchanged" was false — corrected here.) **[V]**
- Package: `tsup` build + `tsc --noEmit`; then `unite-group` root `pnpm verify:web`. **[V]**

---

## Sequencing
1. **Phase 3 gate — CLEARED (opus-adversary BLOCK → resolved in REV-2).** The three code-verified defects are fixed above (stub-directory shim, factory DI, completed register). `/storm` (once pushed) may still refine implementation ordering, but the design blockers are closed.
2. **Phase 4 build gate — CLEARED (REV-3).** Founder confirmed delivery = git tag-pin (orphan tag in `CleanExpo/Unite-Group`, no registry). All upstream blockers (shim mechanics, DI shape, delivery model) now decided. Build is unblocked.
3. **Phase 4 build** — once (2) is confirmed: extract package + factory + stub tree (Synthex green before/after via the full contract-test set), then the Part-A skills — 1 CREATE (`context-cockpit`) + 3 ENHANCE (`agent-workflow`, `hooks-system`, `improve-system`/`wiki-ingest`) + Tier-B enhances — into Pi-Dev-Ops SSOT + `~/.claude/skills/index.md` + Synthex `CLAUDE.md` routing.

Source corpus: `2nd Brain/Sources/Claude-Code-Club/` (richest: `07-agents`, `13-context-engineering`, `12-token-tips`, `02-memory`, `24-earn-commissions`, `09-social`). Constraint: memory `feedback-skool-substitute-our-stack`.
