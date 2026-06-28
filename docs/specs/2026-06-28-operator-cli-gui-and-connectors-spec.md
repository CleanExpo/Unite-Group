---
type: spec
status: draft
created: 2026-06-28
author: SPM (/spm)
scope: unite-group monorepo (apps/web + apps/workspace)
evidence_standard: fabel — every claim tagged [VERIFIED]/[INFERENCE]/[UNCONFIRMED]
---

# SPM Spec — Operator CLI/GUI + Connectors: what's missing and why it isn't operational

## 1. Task

Understand the full Unite-Group application (CRM + Command Center), and identify with no
guessing: (a) the missing connectors and elements, and (b) the reason the internal CLI with
the multi-screen GUI is not installed, fitted out, and operational — plus anything else found.
Read-only investigation → decision-grade spec. No build.

## 2. Project context (what the application actually is)

The `unite-group` monorepo (`CleanExpo/Unite-Group`) holds four apps `[VERIFIED root CLAUDE.md + ls]`:

| App | What it is | Stack | Deployed? |
|---|---|---|---|
| `apps/web` | **Nexus CRM + web Command Centre** — the product | Next.js 16 / React 19 / Supabase | YES — Vercel project `prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0`, domain **unite-group.in**, rootDir `apps/web` `[VERIFIED Vercel API]` |
| `apps/workspace` | **Hermes Workspace** — the internal CLI + 16-screen GUI + Lane Orchestrator | Vite/React 19 + Electron + Node server (PTY/SSE/tmux) | NO `[VERIFIED no vercel.json, no dist, no node_modules]` |
| `apps/empire` | Pi-CEO / Margot voice — reference only | Next.js | n/a (retained for reference per CLAUDE.md) |
| `apps/spec-board` | Fabel-Prompt-Engineer | Next.js 15 | separate |

**There are two distinct "Command Centers" — this is the central source of confusion:**

1. **Web Command Centre** — `apps/web/src/app/(founder)/founder/command-centre/` `[VERIFIED ls]`.
   Deployed on unite-group.in. Tiles (ActionQueue, OperatingHealth, InProgressPRs,
   EvidenceStream, BlockedLanes), `IdeaConsole`, `QueueBoard`, `operator-gateway/`, `studio/`,
   `hermes-control-panel/`. Talks to **Pi-CEO** (`PI_CEO_API_URL`/`PI_CEO_API_KEY`) — there is
   **no `HERMES_API_URL`** anywhere in apps/web `[VERIFIED grep]`. Read-only operator dashboard.

2. **Hermes Workspace** — `apps/workspace` `[VERIFIED]`. The actual "internal CLI with
   multiple-screen GUI": an embedded **PTY terminal** (`components/terminal-panel.tsx`,
   `server/terminal-sessions.ts` + `pty-helper.py`, `routes/api/terminal-input.ts`) and **16
   screens** (`screens/`: command-center, swarm, swarm2, tasks, memory, chat, agents, crew,
   mcp, dashboard, files, skills, profiles, jobs, gateway, settings) `[VERIFIED ls]`. It is a
   **vendored zero-fork clone of the external `outsourc-e/hermes-workspace`** that fronts
   `NousResearch/hermes-agent` `[VERIFIED README]`. It also contains the **Lane Orchestrator**
   ("New IDE" wizard → spawns model-backed agent lanes in isolated git worktrees), fully built
   and unit-tested `[VERIFIED explorer: lane-orchestrator.ts + adapters + tests]`.

## 3. Problem

The internal CLI/GUI (`apps/workspace`) is not installed, fitted out, or operational, and the
two command centers are not bridged. Separately, the CRM has shipped a duplicate data model and
several connectors are missing/stubbed. The founder needs an unambiguous map of what's missing
and the precise reason the operator interface doesn't run.

## 4. Desired outcome

- A single operating operator console the founder can open and use (terminal + screens + lanes).
- A clear, decided answer on the CRM data-model fork (it is currently duplicated in prod).
- A connector inventory with the missing ones named and a fill order.

## 5. Scope

**In scope (this spec):** root-cause of the non-operational CLI/GUI; the make-it-operational
path; missing connectors; the CRM duplicate-model defect; the shared "persistent compute" crux.

**Out of scope:** building Stage-3 autonomy; legal/Duncan sign-off (Stage 4); new vendors;
rebuilding CRM features that already work.

## 6. Existing capability (do not rebuild)

- **CRM (apps/web) is mostly REAL and founder-scoped** `[VERIFIED explorer A]`. Contacts,
  opportunities, campaigns, analytics, experiments, wiki, vault, approvals, invoices (Xero),
  email (Gmail), notes (Drive), advisory, bookkeeper, strategy, knowledge-console, brand-video,
  calendar, skills, social — all query Supabase with `.eq('founder_id', user.id)` and have
  loading/error states. Settings is UI-only; Kanban→Linear wiring `[UNCONFIRMED]`.
- **Connectors wired (16)** `[VERIFIED explorer C]`: Xero, Gmail, Calendar, Drive, GA4, Search
  Console, Linear, Reddit, Anthropic/Claude, Gemini, HeyGen, GitHub, SendGrid, Apify, IMAP,
  Supabase. Telegram/WhatsApp/Slack(webhook) wired for notifications.
- **Hermes Workspace + Lane Orchestrator are BUILT and tested** `[VERIFIED explorer B]` — the
  code is not the gap; the runtime/host/wiring is.
- **Host already has:** `hermes` on PATH + hermes-agent at `~/.hermes/hermes-agent`; `claude`
  and `codex` CLIs on PATH `[VERIFIED]`.

## 7. Specialist board review

- **Architect:** Two operator surfaces with no bridge is the core defect. The web CC is
  serverless (Vercel) and read-only; the real console (workspace) needs persistent compute
  (PTY, SSE, tmux, spawned CLIs) that Vercel cannot host `[INFERENCE from stack]`. Don't try to
  port the terminal/lanes into Next.js serverless — run the workspace on a persistent host and
  bridge the web CC to its gateway.
- **Product:** The founder's mental model is "one command center." Deliver the workspace as the
  operating console; keep the web CC as the read-only glance surface, linked to the same gateway.
- **Security:** Workspace defaults to localhost-only; any non-loopback host **requires
  `HERMES_PASSWORD`** (enforced in `server-entry.js`) `[VERIFIED]`. MFA is not enforced in
  apps/web (B7 hard gate still open) `[VERIFIED explorer D]`. Lane side-effects (push/PR/deploy)
  must stay approval-gated.
- **QA:** Lane wizard shows all backends "available" even when the gateway is down / accounts
  unconfigured (`isAvailable` defaults to true) `[VERIFIED explorer B]` — silent runtime failure.
- **Devil's advocate:** Is the workspace worth operating at all vs. just using Claude Code in a
  terminal? Yes only if the founder wants the multi-lane/swarm/memory/MCP surface; otherwise the
  cheapest win is starting the gateway + the web CC bridge, deferring the full GUI.

## 8. Judge challenge — score 78/100 → APPROVE EXPERIMENT (reduce scope to Phase 1)

Below 85: do not attempt the whole operator+autonomy program at once. The high-leverage,
low-risk experiment is **Phase 1: make the workspace operational locally and bridge the web CC's
connection rail to the live gateway.** Everything else (Lane account fan-out, Stage-3 hosted
runner, CRM model unification) is sequenced behind it.

## 9. Proposed solution

### 9A. ROOT CAUSE — why the internal CLI/GUI is not operational (multi-factor, all verified)

| # | Blocker | Evidence | Severity |
|---|---|---|---|
| R1 | **Workspace not installed** — no `node_modules` | `[VERIFIED ls apps/workspace/node_modules]` | blocks |
| R2 | **Workspace not built** — no `dist/` | `[VERIFIED ls]` | blocks |
| R3 | **Workspace not configured** — no `.env` | `[VERIFIED ls]` | blocks |
| R4 | **Gateway not running** — LaunchAgent `ai.hermes.gateway` loaded, status 0 / no PID; :8642 not listening | `[VERIFIED launchctl + lsof]` | blocks gateway lanes + chat |
| R5 | **Lane account dirs missing** — `~/.hermes/accounts/{max-1,max-2,max-3,openai-pro}` absent | `[VERIFIED ls]` | blocks CLI lanes |
| R6 | **Lane worktree root missing** — `~/.hermes/lanes` absent | `[VERIFIED ls]` | created-or-fails at runtime |
| R7 | **No web↔workspace bridge** — apps/web has no `HERMES_API_URL`; web CC connection rail can't show real Hermes status | `[VERIFIED grep]` | degrades web CC |
| R8 | **Architectural host mismatch** — workspace is Electron/Vite + Node PTY/SSE/tmux; cannot run on Vercel serverless where the CRM lives | `[INFERENCE from stack + no vercel.json VERIFIED]` | structural |
| R9 | **No preflight/setup docs** — LanesPanel renders unconditionally; backends default `isAvailable→true`; fails silently if gateway/accounts absent | `[VERIFIED explorer B]` | UX/correctness |
| R10 | **Conductor screen needs an upstream dashboard plugin** not in vanilla hermes-agent (issue #262) — shows placeholder | `[VERIFIED README]` | one screen only |

**One-line root cause:** the operator console is fully *coded* but never *operated* — its
install→build→configure→start-gateway→provision-accounts→bridge chain was never run, and its
server/Electron architecture is incompatible with the serverless host the CRM uses, so nothing
auto-starts it. `[INFERENCE]` It reads as vendored-but-not-commissioned, not abandoned (code is
current and tested); there is no decision-record proving intent either way `[UNCONFIRMED]`.

### 9B. Missing connectors / elements

| Connector | State | Evidence | Action |
|---|---|---|---|
| **Stripe** | MISSING — env-referenced, no client | `[VERIFIED explorer C]` | build `lib/integrations/stripe.ts`, wire payment routes |
| **Microsoft 365 / Outlook** | PARTIAL — OAuth route, no client | `[VERIFIED]` | build client like google-oauth |
| **MCP client (apps/web)** | STUB — returns empty tool list | `[VERIFIED lib/mcp/client.ts]` | wire to gateway MCP hub or remove the screen's promise |
| **Social analytics (Meta/LinkedIn/TikTok)** | STUB — OAuth/connect works, analytics endpoints stubbed | `[VERIFIED]` | implement per-platform insights |
| **Composio / NotebookLM** | NOT REFERENCED in apps/web | `[VERIFIED]` | none unless required |
| **Web↔Hermes bridge** | MISSING — no `HERMES_API_URL` | `[VERIFIED]` | add env + connection-rail fetch (R7) |
| **Central env validation** | MISSING — each integration self-validates | `[VERIFIED explorer C]` | add `validate:env` coverage |

### 9C. CRM duplicate-model defect (anything-else finding)

Prod contains **both** CRM data models simultaneously: `contacts`, `leads`, `pipeline_stages`
**and** `crm_contacts`, `crm_leads`, `crm_opportunities` `[VERIFIED prod information_schema]`.
The app is split across them: `/api/contacts` → `contacts`; `/api/founder/opportunities` →
`crm_opportunities` `[VERIFIED explorer A]`. This is the "B1 model-fork" from the readiness docs,
except it has already shipped as duplicate tables — violating apps/web/CLAUDE.md No-Invaders rule
4 (no duplicate systems). Also missing: contacts `GET` (only POST/PATCH), approval
request/execute routes, pipeline-forecast READ `[VERIFIED explorer D]`.

### 9D. The shared crux (highest-leverage insight)

The "persistent off-Vercel runner" that Stage-3 autonomy needs `[VERIFIED explorer D]` and the
"persistent host" the workspace + gateway need (R8) are **the same missing piece**. Provisioning
one persistent compute host (local Mac LaunchAgent now; Docker/VPS later) unblocks both the
operator console and the future autonomy loop. Solve it once.

## 10. UX

Phase 1 target: founder runs one command (or clicks the Electron app), the gateway is up, the
workspace opens at `/command-center` with a green Hermes dot, terminal works, and the web CC at
unite-group.in/founder/command-centre shows the same gateway status live. Lane wizard greys out
backends that aren't authed (fix R9) instead of failing silently.

## 11. Technical plan (phased)

**Phase 1 — Commission the local operator console (small, reversible):**
1. Start the gateway: `launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway`; verify :8642
   listening (R4).
2. `cd apps/workspace && pnpm install` (R1) → `pnpm build` (R2) → create `.env` from example with
   `HERMES_API_URL=http://127.0.0.1:8642`, `ANTHROPIC_API_KEY`/OAuth, `OBSIDIAN_VAULT`,
   `KNOWLEDGE_DIR`, and `HERMES_PASSWORD` if exposing beyond localhost (R3).
3. Run: `pnpm start` (server) or `pnpm electron:dev` (desktop).
4. Provision lane accounts: create `~/.hermes/accounts/{max-1,max-2,max-3}` via
   `CLAUDE_CONFIG_DIR=… claude auth login`; `openai-pro` via `CODEX_HOME=… codex auth login`
   (R5); ensure `~/.hermes/lanes` exists (R6).

**Phase 2 — Bridge the web CC (small):**
5. Add `HERMES_API_URL` (+ read token) to apps/web prod env; wire the connection-rail tile to
   fetch live gateway/mission-control status (R7). Keep web CC read-only.

**Phase 3 — Harden (medium):**
6. Lane preflight: make `isAvailable()` actually probe gateway/accounts; grey out unauthed
   backends; add a setup/QUICKSTART doc (R9). Conductor placeholder stays until #262 (R10).

**Phase 4 — CRM model unification (medium, decision-gated):**
7. Founder decides one model family; migrate routes + data to it; retire the other tables
   sandbox-first; add contacts `GET`, approval request/execute, pipeline-forecast READ (9C).

**Phase 5 — Persistent host + autonomy (large, later):**
8. Promote the Phase-1 host to durable compute (Docker/VPS/Tailscale) and reuse it as the
   Stage-3 hosted runner (9D).

## 12. Security

Never expose the workspace non-loopback without `HERMES_PASSWORD` (enforced). Lane side-effects
approval-gated. No secrets entered through the assistant. Enforce TOTP MFA on admins (B7) before
real PII flows — separate track. Don't write the 94 prod-only migration artifact (see
nexus-prod-migration-reconcile).

## 13. Verification

- Phase 1: `lsof -iTCP:8642 -sTCP:LISTEN` shows the gateway; workspace loads `/command-center`;
  terminal echoes a command; a gateway lane runs a trivial mission.
- Phase 2: web CC connection rail shows live Hermes status (not stubbed).
- Phase 4: `supabase ... information_schema` shows a single CRM model family; route tests green.
- Always: `pnpm -C apps/web run type-check && lint && vitest run` before any web change.

## 14. Loop + stress testing

Run the gateway under load (multiple lanes), kill it mid-mission and confirm the workspace
degrades to "disconnected" (it already falls through zero-fork→…→disconnected `[VERIFIED
explorer B]`) rather than crashing. Confirm lane worktrees clean up.

## 15. Acceptance criteria

- [ ] Gateway running and reachable (:8642). 
- [ ] Workspace installed+built+configured; `/command-center` opens; terminal works.
- [ ] At least one gateway lane and one CLI lane run a mission end-to-end.
- [ ] Web CC shows live gateway status (bridge live).
- [ ] CRM model fork decided; single family in prod; split routes reconciled.
- [ ] Missing connectors triaged: Stripe/MS365 built or explicitly deferred.

## 16. /goal command

```
/goal Commission the Hermes Workspace operator console (apps/workspace) and bridge it to the
web Command Centre, per docs/specs/2026-06-28-operator-cli-gui-and-connectors-spec.md.
Definition of done: (1) Hermes gateway running on :8642 (launchctl kickstart ai.hermes.gateway,
verified via lsof); (2) apps/workspace pnpm install + build + .env (HERMES_API_URL=127.0.0.1:8642,
Anthropic creds, OBSIDIAN_VAULT, KNOWLEDGE_DIR, HERMES_PASSWORD if non-loopback) and it serves
/command-center with a working terminal; (3) ~/.hermes/accounts/{max-1,max-2,max-3,openai-pro}
provisioned + ~/.hermes/lanes present, one gateway lane and one CLI lane each run a trivial
mission; (4) apps/web gets HERMES_API_URL and the web CC connection rail fetches live gateway
status (branch off main, PR to main, type-check+lint+vitest green). Do NOT port the terminal into
Vercel; do NOT touch CRM tables in this goal. Stop and surface the CRM model-fork decision (9C)
and any non-loopback exposure for founder approval.
```

## 17. Implementation sequence

Phase 1 (host commission) → Phase 2 (web bridge) → Phase 3 (lane hardening) → Phase 4 (CRM
model decision+unify, founder-gated) → Phase 5 (durable host = Stage-3 runner). Phases 1–3 are
local/reversible and need no prod writes; Phase 4 is sandbox-first + founder decision; Phase 5 is
a spend/architecture decision (escalate).

## 18. Session-handoff seed

- Branch: main (clean; untracked `supabase/` junk only). Repo: ~/pi-seo-workspace/unite-group.
- Verified state captured above (all [VERIFIED] tags from this session's tool runs 2026-06-28).
- Open founder decisions: CRM model fork (9C); whether to expose workspace beyond localhost;
  Phase-5 durable host spend.
- Do-not-redo: the investigation (this spec is the artifact); the founder-access fix (separate).

## 19. Final recommendation

**APPROVE EXPERIMENT — execute Phase 1 + Phase 2 now (local commission + web bridge).** They are
small, reversible, and need no prod writes; the host already has hermes-agent + claude + codex
installed, so the gap is start-gateway → install/build/configure workspace → provision accounts →
add one web env var. Defer Phases 4–5 (CRM unification, durable host) to founder decisions. The
single highest-leverage move overall is provisioning **one persistent compute host**, because it
is simultaneously the operator console's host and the Stage-3 autonomy runner (9D).
