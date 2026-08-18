# Unite-Group — THE canonical monorepo

**Read `SOURCE-OF-TRUTH.md` first.** This repo (`CleanExpo/Unite-Group`) is the
single canonical repository for the Unite-Group product and ecosystem. On
12/06/2026 it absorbed the former standalone CRM repository, hermes-workspace,
Unite-Group-Spine, pi-ceo-operator-mcp and brain-1 with full git history. On
15/06/2026 it absorbed Fabel-Prompt-Engineer (→ `apps/spec-board/`), the
fix-queue gate having been met.

## Layout

| Path | What it is |
|---|---|
| `apps/web/` | **The product** — Unite-Group. Next.js 16, React 19, Supabase, pnpm workspace. Its own `apps/web/CLAUDE.md` rules (NorthStar, No-Invaders, founder_id scoping, current design tokens) still apply inside it. |
| `apps/workspace/` | Hermes workspace — agent command centre (Vite/React 19) |
| `apps/empire/` | Pi-CEO / Margot voice / CEO activity app — source of voice + activity routes now ported to `apps/web`. Retained for reference only; do not build new features here. |
| `apps/spec-board/` | Fabel-Prompt-Engineer — plain-English vision → verified, build-ready spec (Next.js 16, npm, own Supabase project `yhteftfnoegmdkimzzjd`). Keeps its own lockfile/toolchain. Live founder data (visions/specs/board) untouched by the fold-in. |
| `apps/autopilot-runner/` | `@unite/autopilot-runner` — design/test-only OWNEST policy and adapters plus a one-file refusal container for the permanently retired Linear executor. Presence/heartbeat and all host runtime outputs are deleted; lineage UNI-2143. |
| `packages/spine/` | Unite-Group-Spine — greenfield shared-identity schema (gated, non-prod) |
| `packages/pi-ceo-operator-mcp/` | Portfolio-health MCP server |
| `docs/brain/` | Residual brain files (Drafts, NEXUS.md) — the strategic knowledge vault lives canonically at `~/2nd Brain/2nd Brain` (CleanExpo/brain-1); the stale `2nd Brain/` snapshot was removed 06/07/2026 after its 4 unique files were rescued to the canonical vault |
| `docs/legacy/authority-site/` | Old Authority-Site docs |
| `docs/convergence/` | Migration map + cutover & deletion runbook |
| `.portfolio/PORTFOLIO.yaml` | Portfolio registry SSOT (moved here during convergence) |

## Convergence programme

**COMPLETE as of 20/06/2026.** All `apps/authority-legacy` unique surface has been
ported to `apps/web` (Margot Voice, Notifications inbox, Wiki/knowledge base,
Pi-CEO activity — PRs #355/#356). `apps/authority-legacy` never existed locally
in this checkout; `apps/empire` was the actual source and is retained for reference.
The former standalone CRM repository and its Vercel project were fully wound down
20/06/2026 after all required environment configuration was confirmed in `apps/web`.

## Hard rules

- **Canonical identity**: the current product/project name is **Unite-Group**. Do not reintroduce retired product names into active prompts, docs, statuses, tasks, dashboards, memory, or code. Historical lineage belongs in explicit legacy/history context only.
- **Toolchain**: each package keeps its own lockfile/package manager. The root
  is NOT a pnpm workspace (apps/web is one itself; pnpm cannot nest). Verify
  via root `package.json` scripts (`npm run verify:web` etc.).
- **DB**: validate every schema change/migration on a **Supabase database
  branch** before prod. There is no standing sandbox — the old mirror project
  (`xgqwfwqumliuguzhshwv`) was deleted 15/06/2026 and won't be replaced. Prod
  (`lksfwktwtmyznckodsau`) moves only via a merged, approved branch — never apply
  to prod directly, never autonomously. founder_id scoping only in apps/web.
  See `apps/empire/CLAUDE.md` for the workflow. See `supabase-db-branch` skill for the branch process.
- **No writes to other repos.** `brain-1`, `hermes-workspace`, and
  `pi-ceo-operator-mcp` are frozen pending deletion per the runbook.
  **`CleanExpo/Unite-Group-Spine` was ARCHIVED on GitHub 05/07/2026** (Phill's
  typed instruction) — read-only; the canonical Spine is `packages/spine/` here.
  Full deletion, if ever, still needs runbook gates + Phill's typed approval.
  The retired standalone CRM repository and its Vercel project were deleted on
  20/06/2026 after the approved wind-down. Do not describe them as pending,
  query them as active infrastructure, or start new work against them.
- **Deletion** of any repo/Supabase/Vercel resource: runbook gates + Phill's
  typed approval only. Never autonomous.
- **PR base = `main`, always.** Every pull request must target `main` — never
  stack a PR on another feature branch. Stacked PRs merge into their base
  branch and strand the work there (it never reaches `main`); see the
  mobile-voice incident (PRs #281/#282/#283 stranded on
  `codex/mobile-voice-intake`, recovered via #285). One issue → one branch off
  the latest `main` → one PR into `main`.
- Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT.

## AI providers — what already exists (READ BEFORE BUILDING ANY LLM PLUMBING)

This monorepo already has multi-provider LLM plumbing. It has been rebuilt from
scratch at least once by an agent that did not look — see the standing lesson
below.

| What | Where | Notes |
|---|---|---|
| OpenRouter client (multi-model fallback, stub guard, streaming) | `apps/spec-board/lib/llm.ts` | Provider chain `minimax → openrouter → anthropic`, flipped by `LLM_PROVIDER`. Also defines the **critic** — a second-opinion model — via `CRITIC_MODEL`. |
| OpenRouter research calls | `apps/spec-board/lib/research.ts` | Raw `fetch` against `openrouter.ai/api/v1`. |
| Provider presence / usage tracking | `apps/web/src/lib/command-centre/provider-usage.ts`, `apps/empire/src/lib/mission-control/provider-usage.ts` | Reports which provider credentials are actually set. |
| Anthropic cost metering | `apps/web/src/lib/ai/{pricing,usage-recorder}.ts` → `ai_usage_logs` → `lib/metering/` | Rates SSOT + per-call recorder + aggregation. |
| Free-model review swarm (benchmark, quorum, refutation, cost ledger) | `scripts/swarm/` | Repo-root tooling, no dependencies. `README.md` there is the operator guide. |

**Canonical env names** (per `env-var-canon` — grep before minting, never invent
a synonym): `OPENROUTER_API_KEY` (and `OPENROUTER_API_KEY_2`),
`OPENROUTER_MODEL` (comma-separated roster, first is primary),
`OPENROUTER_BASE_URL`, `CRITIC_MODEL`, `LLM_PROVIDER`, `ANTHROPIC_API_KEY`.

**Container scoping is not absence.** Claude Code remote containers have no
`OPENROUTER_API_KEY` in `process.env` and `openrouter.ai:443` is denied by the
network policy (403 to CONNECT). That is a fact about *the container*, not about
the system: the key is provisioned on the Vercel/prod and fleet planes. Say
"unavailable from here", never "not configured" — the two send the reader to
completely different places.

### The standing lesson from the swarm build (PRs #1017, #1018)

Twenty defects were found across those two PRs. Essentially all of them were one
shape: **a check that validated the part it cared about while ignoring the
whole.** The scorer counted keywords but not whether the answer claimed
anything; quorum counted model ids but not lineages; refutation picked the right
challenger but the wrong diff chunk; the run printed the right message but the
wrong exit code; the question classifier read a severity its own schema forbade.

Two habits that actually caught them, both cheap:

1. **Check the exit code, not the message.** Three silent-success bugs survived
   review precisely because the human-readable output looked fine.
2. **Attack your own work before asking for review.** Constructing the bypass
   yourself finds it faster than waiting for someone else to.

This lesson is generalised and made binding by
`.claude/rules/ground-truth-standard.md` (always-on: nine principles, the 12-rung
delivery Ladder bound to UNI-2517, and the `Grounded` / `Waterline:` required
lines); the full evidence record from Turing to the whispers stack is
`docs/research/llm-code-generation-roots.md`.

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
- **waterline** — before claiming done/complete/shipped/live, or to settle any
  stage dispute: audits authority class, Ladder rung, and AAA evidence rating.
- **keeper-gate** — before opening, un-drafting, or pushing to ANY pull request
  (drafts included — drafts get merged): the six-gate pre-PR procedure; the full
  gauntlet runs on the committed SHA first, or the PR does not open.

The always-on rules in `.claude/rules/` bind every session alongside these
skills: `fabel-evidence-standard.md` (claims carry evidence tags) and
`ground-truth-standard.md` (build on ground truth only; know your rung).

## Sub-agent doctrine (persistent specialists)

Multi-round agent work follows the global `persistent-subagents` skill: keep ONE warm,
named specialist per domain per session and feed follow-ups via SendMessage resume —
never re-spawn for a second task in the same domain. The main thread coordinates only;
noisy collection (grep sweeps, web fan-outs, bulk reads) goes to throwaway children,
which return distilled verdicts. Standing specialist domains for this monorepo:
`frontend-founder-deck` (apps/web founder/command-centre surfaces),
`db-supabase-nexus` (schema, RLS, migrations — schema-gate rules still apply),
`integrations-connectors` (Google/social/Xero/Stripe planes),
`ci-infra` (workflows, gates, deploys). Name = `<type>-<durable-mission>`, frozen at
spawn, must still be true on resume #8. Retire a specialist near ~300k context with a
written handoff; domain change = fresh agent, always.

## Research-output contract

Research-producing sessions **on founder machines** also capture their findings to the
canonical vault working tree at `~/2nd Brain/2nd Brain` via the `brain-capture` skill, so
the 2nd Brain grows as a by-product of the work rather than as a separate chore. Captures
are raw entries with their source and an ISO capture date; synthesis into the wiki is a
separate, later step.

**Scope against the no-writes rule above.** `brain-capture` is the single, narrow
exception to "No writes to other repos", and it is bounded as follows:

- it writes **only** to the founder-machine vault working tree at `~/2nd Brain/2nd Brain`,
  and only under the vault's own capture paths;
- the exception covers the **local working tree**, not the freeze. Pushing, merging,
  deleting or otherwise mutating the `CleanExpo/brain-1` GitHub repository stays governed
  by the runbook gates and Phill's typed approval — unchanged by this contract;
- no other repo named in the no-writes rule gains any exception;
- **failure is reported, never redirected.** If the vault is absent, unreachable, or the
  write fails, the session says so and continues. It does not retarget the capture to
  `docs/brain/` (residual, must not grow), to `docs/` generally, or to any other store.

Remote and CI checkouts have no vault, so this binds only where the vault is actually
present — they report it unavailable and carry on. Routing rules for the entry points
that trigger such sessions: `docs/mission-control/harness-wrapper-contract.md`.

The freeze-versus-canonical-vault tension predates this section (`brain-1` is named both
as frozen and as the canonical knowledge store) — this narrows it to a stated exception
rather than resolving it. FLAGGED for founder confirmation.

## Session boot contract (UNI-2523)

**An explicit instruction from Phill outranks this contract.** This is what a
session does when it arrives with no task of its own — it is not a licence to
abandon the job you were actually given. The first draft said "every session"
without that qualifier, and the independent review demonstrated the consequence:
a session commissioned to review a fixed commit would have walked away from the
review to pick up an unrelated Linear ticket.

Steps 1 and 2 are unconditional. Step 3 applies only when no task was given.

1. Read `SOURCE-OF-TRUTH.md`, then `NORTH-STAR.md`, then `FOUNDER-QUEUE.md`.
2. **State the top FOUNDER-QUEUE blocker and its age in the first reply.** Not a
   summary of the queue — the single oldest open decision and how many days it
   has been waiting. **Read the age from `node scripts/founder-queue.mjs`, never
   from the file's Age column**, which reads `—` because a committed age decays
   every midnight and was found a day stale within a day of being written.
3. With no assigned task, take **the single top unblocked ticket from Linear
   (team UNI)** as the only queue. `.spm/` and `docs/specs/` are **read-only
   registers** — history and context, never task sources. Six places to look for
   work is why sessions re-orient instead of building.
4. End with **a PR URL or a named blocker with terminal evidence**. For a build
   session a zero-code ending is not a valid handoff state. A session
   commissioned to review, verify or investigate discharges this by delivering
   its report with the evidence in it — its deliverable was never code.

`NORTH-STAR.md` opens with a disambiguation block: "NorthStar" already names the
honest-sources rule and the `apps/web` completion spec, and those are three
different things.
