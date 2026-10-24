Reading additional input from stdin...
OpenAI Codex v0.163.0
--------
workdir: /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
model: gpt-6.1-sol
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a16c28-0957-7cc0-99f5-dcc2757f92e3
--------
user
You are an independent reviewer. Review the spec .claude/done/spm/2026-10-24-enquiry-alerts/spec.md and its engineering requirements .claude/done/spm/2026-10-24-enquiry-alerts/engineering.md against the actual code in apps/web (src/app/api/leads/route.ts, src/lib/notifications/*, src/lib/integrations/sendgrid.ts, src/app/api/webhooks/stripe/route.ts, scripts/validate-env.mjs, supabase/migrations). This is a spec only; no app code exists yet. Find BLOCKERS: claims that contradict the code, acceptance criteria that cannot fail or cannot be run as written, ways an alert or lead can be silently lost, privacy or secret leaks, and ambiguities that would let an implementer build the wrong thing. Do not list style nits. Output format: first line exactly 'VERDICT: PASS' or 'VERDICT: FAIL'; then 'BLOCKERS:' as a numbered list (each with the spec section and the evidence file:line), or 'BLOCKERS: none'; then 'NON-BLOCKING:' list. A FAIL requires at least one blocker.
hook: SessionStart
hook: SessionStart
hook: SessionStart Completed
hook: SessionStart Completed
hook: UserPromptSubmit
hook: UserPromptSubmit
hook: UserPromptSubmit
hook: UserPromptSubmit Completed
hook: UserPromptSubmit Completed
hook: UserPromptSubmit Completed
codex
I’ll check the spec and engineering requirements against the listed code and migrations, focusing on blockers. I’m loading the required model-router and unlazy skills first.
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc 'pwd; rg -n "enquiry|alerts|Unite-Group" /Users/phill-mac/.codex/memories/MEMORY.md' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
/Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
1:# Task Group: Synthex–Unite-Group production event integration and operational handoff
4:applies_to: cwd=/Volumes/Mini Mini 2T Storage/code/Synthex and Unite-Group Vercel projects; reuse_rule=production settings, deployments, PR state, and event delivery require fresh authenticated verification
6:## Task 1: Connect Synthex and Unite-Group production events
10:- extensions/skysight/resources/2026-10-23T01-00-00-xUDD-10min-memory-summary.md (cwd=Synthex and Unite-Group Vercel projects, rollout_path=extensions/skysight/resources/2026-10-23T01-00-00-xUDD-10min-memory-summary.md, updated_at=2026-10-23T01:00:00+00:00, thread_id=None, observed configuration and reported redeploy) [skysight memory]
11:- extensions/skysight/resources/2026-10-23T00-30-00-rOPB-10min-memory-summary.md (cwd=Synthex and Unite-Group Vercel projects, rollout_path=extensions/skysight/resources/2026-10-23T00-30-00-rOPB-10min-memory-summary.md, updated_at=2026-10-23T00:30:00+00:00, thread_id=None, setup initiated) [skysight memory]
15:- Synthex, Unite-Group, Vercel, production event settings, redeploy, b690f238, PR #1076, approval controls, design library
19:- when making Synthex operational within Unite-Group Nexus, the user prioritized “establish the Synthex–Unite-Group event connection,” strengthen approval controls, and apply the design library to generated sites and media rather than leaving it as reference material. [Task 1] [skysight memory]
23:- The observed configuration workflow set production event settings for both projects and initiated a Unite-Group redeploy; a later window reported the redeploy ready. Treat this as configuration/deploy observation, not proof of an authenticated end-to-end event, tenant correctness, approval integrity, or live patched runtime. [Task 1] [skysight memory]
80:- extensions/skysight/resources/2026-10-23T11-50-00-qACY-10min-memory-summary.md (cwd=YouTube Studio and media/card-demos/_upload-pack/4-Unite-Group-The-Relay, rollout_path=extensions/skysight/resources/2026-10-23T11-50-00-qACY-10min-memory-summary.md, updated_at=2026-10-23T11:50:00+00:00, thread_id=None, private Relay draft; 4K processing and initial checks still pending) [skysight memory]
81:- extensions/skysight/resources/2026-10-23T09-20-00-xwuv-10min-memory-summary.md (cwd=RestoreAssist YouTube Studio and /Volumes/Mini Mini 2T Storage/media/card-demos/_upload-pack/4-Unite-Group-The-Relay, rollout_path=extensions/skysight/resources/2026-10-23T09-20-00-xwuv-10min-memory-summary.md, updated_at=2026-10-23T09:20:00+00:00, thread_id=None, manual Relay upload attempt; no completion shown) [skysight memory]
89:- RestoreAssist walkthroughs, SynthexMedia, CARSI, NRPG, The Relay | Every recovery, connected | Unite-Group Nexus, YouTube Studio, STEPS.txt, captions.srt, English (Australia), Private, Unlisted, Publish, copyright check, Community Guidelines check, AI-content setting, _upload-pack/4-Unite-Group-The-Relay, upload limit
112:- extensions/skysight/resources/2026-10-23T13-20-00-duHb-10min-memory-summary.md (cwd=Claude Desktop / Unite-Group Nexus business-card request, rollout_path=extensions/skysight/resources/2026-10-23T13-20-00-duHb-10min-memory-summary.md, updated_at=2026-10-23T13:20:00+00:00, thread_id=None, content correction request; no revision yet observed) [skysight memory]
116:- Unite-Group Nexus, business-card, c733c9179, fff6059f1, nexus-check.mjs, business-card/tests/smoke.mjs, brand-kits/validate.py, strict HTTPS-only link validation, unsafe URI scheme, newline injection, eight business tiles, six YouTube listings, vCard, phone view, 3D prototype
124:- when the user said the delivered card was “not 100% correct, or what I need shown” and clarified that it must represent Unite-Group Nexus, linked businesses, professional classifications, linked contact details, and visibly labelled YouTube content -> treat the vCard/contact import and the visual web card as separate deliverables; establish the missing content before calling either complete. [Task 6] [skysight memory]
136:- The four brand-to-channel references for Synthex, CARSI, NRPG, and RestoreAssist were checked individually before distribution. The observed manual attempt to upload Relay from `_upload-pack/4-Unite-Group-The-Relay` followed an automated-upload limit, but did not capture a completed upload, status, or resulting URL. [Task 4] [skysight memory]
137:- An earlier The Relay Studio flow created a Private draft titled `The Relay | Every recovery, connected | Unite-Group Nexus`, attached `thumbnail.jpg`, set “not made for kids,” and saved Australian English `.srt` captions while 4K processing and checks were pending. Later evidence records it saved Unlisted after completion; neither phase is public publication. [Task 4] [skysight memory]
158:# Task Group: Unite-Group website showroom specification and visual direction
161:applies_to: cwd=ChatGPT / Research CRM Income Strategies and Codex / Build Unite-Group website; reuse_rule=project location and implementation status require fresh verification
167:- extensions/skysight/resources/2026-10-21T11-30-00-HoDw-10min-memory-summary.md (cwd=Codex / Build Unite-Group website, rollout_path=extensions/skysight/resources/2026-10-21T11-30-00-HoDw-10min-memory-summary.md, updated_at=2026-10-21T11:30:00+00:00, thread_id=None) [skysight memory]
174:- BUILD-PROMPT-SPEC.md, Build Unite-Group website, Research CRM Income Strategies, Higgsfield, Artlist, visual showroom, customer details, scope drift, /spm continue and go
184:- CleanExpo/Unite-Group, apps/web, codex/agency-showroom, 6d207871b269671d795550ba74ce8d0739167dc8, crm_leads, verify:pr-candidate, PR release gate BLOCKED, UNI-2988
193:- The complete sectioned specification was transferred into “Build Unite-Group website”; it covered the showroom, scoped customer context, fulfilment integration, evidence and release boundaries. The user then submitted `/spm continue and go`. Repository target, implementation and validation were not observed; inspect the live workspace before asserting progress. [Task 1] [skysight memory]
194:- The later bounded slice used the actual `CleanExpo/Unite-Group` repository and `apps/web` worktree, not a replacement app or parallel CRM. `6d207871b269671d795550ba74ce8d0739167dc8` passed local `npm run verify:pr-candidate` (771 files / 6,589 tests); this is local synthetic evidence, not deployment or Nexus fulfilment proof. [Task 2]
201:# Task Group: Unite-Group Nexus GBP imagery and public-brand boundaries
214:- Google Business Profile, GBP image loader, Unite-Group Nexus, Synthex internal AI Marketing agency, Nano Banana 2, Downloads, logo reference, SEO filename, conceptual imagery
218:- when public service imagery is prepared, the user said: “Synthex is our own internal AI Marketing agency so is not public and publicised” -> use Unite-Group Nexus/public service terminology in labels and files; do not present Synthex as customer-facing. [Task 1]
359:# Task Group: Unite-Group Mission Control UNI-2987 exact-SHA release progression
1480:- Repository PR pages for RestoreAssist, Pi-Dev-Ops, Unite-Group, and ATO (including ATO PR #38) were navigation-only; do not infer review, merge, comment, or code-change state from the observed browsing. [Task 1] [skysight memory]
1794:# Task Group: Unite-Group delivery, workspace permissions, and Vitest teardown reliability
1796:scope: Make bounded Unite-Group changes with real capability checks, mutation-backed tests, and exact-SHA merge proof.
1797:applies_to: cwd=/Volumes/Storage Unit/Unite-Group; reuse_rule=PRs/SHAs are historical; validation practices are reusable
1803:- rollout_summaries/2026-08-14T04-38-01-enpS-restart_resume_fix_vitest_teardown_flake.md (cwd=/Volumes/Storage Unit/Unite-Group, rollout_path=/Users/phill-mac/.codex/sessions/2026/08/14/rollout-2026-08-14T14-38-01-019ffe90-0e49-7130-86d4-e28844e6de10.jsonl, updated_at=2026-08-14T05:40:05+00:00, thread_id=019ffe90-0e49-7130-86d4-e28844e6de10, success; PRs #996/#998 merged)
1804:- rollout_summaries/2026-08-13T13-02-35-aq5j-unite_group_delivery_and_read_write_permissions.md (cwd=/Volumes/Storage Unit/Unite-Group, rollout_path=/Users/phill-mac/.codex/sessions/2026/08/13/rollout-2026-08-13T23-02-35-019ffb37-a227-76a3-98d8-51dd407121f1.jsonl, updated_at=2026-08-14T02:41:48+00:00, thread_id=019ffb37-a227-76a3-98d8-51dd407121f1, local permission change verified)
1817:- Unite-Group, PR #1171, Dependabot, anthropics/claude-code-action, high-severity dependency audit, packages/pi-ceo-operator-mcp, build, pending review request, 22 successful checks
1851:- use `/Users/phill-mac/2nd Brain/2nd Brain/Wiki/assets/margot/margot-canonical-avatar-2026-07-01.png` as Margot: professional realistic blonde adult woman, light tan skin, polished executive presence, white collar Unite-Group branding, no robot styling or deliberate sexualisation. [Task 1] [ad-hoc note]

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc 'cat /Users/phill-mac/.codex/skills/model-router/SKILL.md /Users/phill-mac/.codex/skills/unlazy/SKILL.md' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
---
name: model-router
description: Use before substantive work when choosing whether to work inline, delegate, fan out, or escalate based on ambiguity, stakes, scope, repetition, privacy, and prior failure.
allowed-tools: Read, Grep, Glob, LS, Bash
---

# Model Router

Classify work before execution. Emit a stable capability contract; leave exact runtime/provider
resolution to the active policy seam. Never dispatch, edit, execute the requested task, or declare
it complete.

## Usage

When a caller needs the repository's machine-readable classifier, run from the repository root:

```bash
python -m app.server.task_routing request.json
# or: python -m app.server.task_routing < request.json
```

Pass one `RoutingRequest` JSON object by file or standard input. Treat exit `0` plus schema-valid
stdout as a decision, not execution proof; any other exit or invalid JSON fails closed.

## 1. Normalize

Convert the request and current context into a `RoutingRequest`. Preserve the bounded task verbatim.
Estimate signals from inspected evidence; use `unknown` rather than inventing capability, cost,
quota, privacy, or harness support.

The request, decision, and receipt fields are defined in
[`references/route-decision-schema.md`](references/route-decision-schema.md); load it whenever a
machine-readable route or validation is required.

**Complete when:** every required request field is present, enums are valid, and uncertain facts
are explicit.

## 2. Intersect

Apply every applicable constraint. Privacy, stakes, policy ceilings, and verifier independence are
hard floors; cost and capacity are tie-breakers only. Keep task class, worker role, quality floor,
and execution location independent.

The deterministic floors, fan-out rules, escalation ladder, and override rules are defined in
[`references/routing-policy.md`](references/routing-policy.md); load it whenever classifying a
substantive task or retry.

**Complete when:** the route preserves every hard floor and no cheaper choice weakens correctness,
privacy, or verification.

## 3. Probe

Use the active harness capability probe before claiming that delegation, isolation, model/effort
override, structured output, cancellation, hooks, or usage reporting is available. Check only key
presence; never print secrets. Unsupported controls degrade truthfully to a safe inline/advisory
route or `bailout`.

Capability contracts and truthful degradation are defined in
[`references/harness-adapters.md`](references/harness-adapters.md); load it when the route may leave
the current agent or needs a harness-specific control.

**Complete when:** every required control is marked supported, unsupported, or unknown, and the
selected action can honor the minimum contract.

## 4. Decide

Use deterministic rules first. Call a bounded classifier only when a material decision remains
unresolved after evidence inspection. Validate its response against the decision schema. Low
confidence escalates upward or bails out; it never lowers a floor.

The normalized prompt sequence and classifier template are defined in
[`references/prompt-pathway.md`](references/prompt-pathway.md); load it only for ambiguous routes or
when another skill needs the exact prompt pathway.

**Complete when:** exactly one schema-valid `RouteDecision` exists with stable reason codes,
bounded execution, budget, verifier, escalation, and fallback contracts.

## 5. Return

Return the decision JSON plus one compact line:

```text
<action> <parallel-cap> | <role> <floor> | verifier <floor> | cap <amount-or-unknown> | privacy <class>
```

Do not name an exact provider/model before downstream resolution. Do not claim savings from a route
decision. Actual selection, usage, gates, and comparable-outcome evidence belong in a later
`RouteReceipt`.

**Complete when:** the caller receives one valid decision and a human line that does not overclaim
execution, support, cost, or completion.
---
name: unlazy
description: Turn substantial delivery work into a dependency tree with owned files, rolling dispatch, executable gates, and exact completion evidence.
argument-hint: "<tree N> <task>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, LS, Bash
---

# Unlazy

Drive `/unlazy [tree N] <task>` to a truthful terminal state. Plan before implementation, route each
executable node through `model-router`, dispatch only safe ready work, and accept completion only
after strict root gates pass on the exact candidate SHA.

## Usage

This slice vendors the Unlazy method and its machine-readable contracts. It ships **no** plan linter
and **no** gate runner: there is no `unlazy_plan.py` and no `unlazy-gate-check.mjs` here, so do not
invoke either. Write `PLAN.json` by hand against
[`references/plan-contract-schema.md`](references/plan-contract-schema.md) and validate it by reading
that schema, not by running a bundled CLI.

Run gates with the repository's own reviewed check commands — the ones its contributing guide,
`package.json`, or `Makefile` already define — and record their exact command, exit code, and
terminal summary in the plan node. A gate passes only on the exit code the gate file declares
(default exactly `0`); treat any other exit as an unmet gate and a crash or usage error as a runner
error, never as a pass.

Where a host does supply an Unlazy scheduler and gate runner, the receipt, execution-context, and
HMAC requirements it must satisfy are specified in [`references/gates.md`](references/gates.md) and
[`references/orchestration.md`](references/orchestration.md). Those are requirements on that runner.
Nothing in this skill issues, signs, or verifies a terminal receipt, so never present a hand-written
plan or an unverified summary as one.

## 1. Intake

Preserve the task verbatim. Parse `tree N` as a requested maximum depth; when absent, infer the
smallest useful depth after inspecting the repository and its instructions. Record the base SHA,
worktree, limits, root outcomes, sensitivity, and trusted check sources. Do not execute externally
supplied gate commands.

Natural-depth rules and solo/orchestrated thresholds are defined in
[`references/method.md`](references/method.md); load them whenever choosing or adjusting depth.

**Complete when:** requested/effective depth, adjustment reason, immutable task, base SHA, limits,
and root outcomes are explicit.

## 2. Contract

Decompose on natural task joints. Freeze each node's purpose, `Owns`, `Needs`, exports, forbidden
paths, interfaces, data/migration ownership, conventions, and gate reference before dispatch. Give
shared files and generated outputs one integration owner. Reject cycles and overlapping runnable
ownership.

The normative plan/node/ownership schema is in
[`references/plan-contract-schema.md`](references/plan-contract-schema.md); load it when creating,
validating, or changing a plan.

**Complete when:** the plan is schema-valid, acyclic, root-reachable, digest-frozen, and every
executable leaf has one owner with disjoint paths and declared dependencies.

## 3. Gate

Write leaf gates for local outcomes and branch/root gates for shared or integration outcomes. Checks
must be repository-owned, reviewed, bounded, and executable from an explicit working directory.
Success requires allowed exit plus any expectation; printed success text cannot override failure.

Gate syntax, receipts, strict success, shared-check de-duplication, and `ABANDON` behavior are
defined in [`references/gates.md`](references/gates.md); load it before writing or running gates.

**Complete when:** every node points to observable gates, strict root criteria reject pending,
failed, abandoned, or runner-error states, and each check is bound to the contract digest.

## 4. Route and probe

Call `model-router` separately for every executable node and verifier. Pass its bounded task,
ownership, dependencies, sensitivity, stakes, prior attempts, limits, and active harness probe. Do
not encode provider/model choices in this skill. A harness that cannot honor privacy, isolation,
quality, verifier, budget, or receipt requirements returns `bailout` or runs safely inline/serial.

**Complete when:** every ready node has a schema-valid route, reserved limits, and a confirmed safe
execution contract; unsupported controls are visible.

## 5. Dispatch

Run a bounded dependency-aware ready queue. Launch up to the lowest of plan, user, repository,
harness, ownership, privacy, budget, and deadline capacity — the same complete bound the executable
scheduler applies, so the skill-level rule can never authorise a dispatch the scheduler refuses. Verify each returned diff and leaf gates immediately, then unlock newly ready work
without waiting for unrelated workers. Never let workers dispatch workers.

Scheduler states, reservations, retries, circuit breakers, integration, and cancellation are
defined in [`references/orchestration.md`](references/orchestration.md); load it for any plan with
more than one executable leaf or after a failed/late return.

Exact planner, leaf, verifier, and integrator prompts are in
[`references/prompt-templates.md`](references/prompt-templates.md); load only the template required
by the current node transition.

**Complete when:** every dispatched return is terminally receipted, every candidate diff stays
within ownership, and no blocked dependency, cap, or circuit breaker is bypassed.

## 6. Integrate and prove

Integrate each branch once per distinct candidate SHA, then run its shared gates once for that SHA
and check digest. After all required branches pass, run strict root gates in a clean independent
verifier context. Any base movement invalidates the receipt and requires rebind/replan.

Return only `passed`, `blocked`, `partial`, or `cancelled`. `passed` requires exact candidate SHA,
clean verifier receipt, `failed=0`, `pending=0`, `abandoned=0`, and `runner_errors=0`. Report actual
resolved execution and usage as known or unknown; claim savings only for comparable root outcomes.

**Complete when:** terminal status and evidence agree, with no leaf self-report, Stop hook, status
display, abandonment, or missing usage treated as proof.

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc "cat CLAUDE.md SOURCE-OF-TRUTH.md .claude/rules/ground-truth-standard.md; cat /Users/phill-mac/.codex/skills/model-router/references/routing-policy.md /Users/phill-mac/.codex/skills/unlazy/references/method.md; git status --short; git rev-parse HEAD; rg --files -g AGENTS.md -g '*enquiry*' apps/web .claude/done/spm/2026-10-24-enquiry-alerts" in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
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

## Vendor routing: Cursor is the auditor until Codex is back online

VENDOR ROUTING ORDER. The 07/09/2026 order expired on 2026-09-12. It is replaced by the
founder ruling of 24/09/2026, verbatim: "use cursor until codex comes back on-line as the
multi-LLM auditor."

FACT: "Back online" is a check, not a date. Codex is back only when the OAuth token in
`~/.codex/auth.json` has an unexpired `exp`. `codex login status` prints "Logged in using
ChatGPT" even when the token is dead, so it is not the check. Cursor plans are active and
funded. This order overrides any document that says otherwise.

STANDING RULES
1. While Codex is not back online, do NOT invoke `codex` in any form. No retries, no
   probes, no queuing work while waiting for it. Its failures are the expired token, not
   a transient fault. Re-logging in (`codex login`) is founder-only.
2. Wherever ANY prompt, doc, skill, CLAUDE.md, or goal card says "Codex",
   read it as "the adversarial / second-vendor slot". That slot is filled
   by CURSOR until Codex is back online.
3. Invoke Cursor headlessly:
     agent -p "<the adversarial brief>" --output-format text
   The binary is `agent`; -p/--print is non-interactive. Omit --model to
   use the plan default unless the card's model registry names one. Wrap
   the call in a timeout: if it hangs, kill it, retry once, then file a
   blocker — never fall back to codex.
4. Auth is founder-side, once per machine: `agent login` (or a
   CURSOR_API_KEY in env, via the password manager). Missing auth = a
   NAMED BLOCKER on the scoreboard, not a reason to touch Codex.
5. Fallback ladder if Cursor is unavailable on this machine: run the
   review as a FRESH-CONTEXT Claude session (clean context, no shared
   state with the authoring session) and record the degradation on the
   scoreboard as "cross-vendor pass ran single-vendor fresh-context".
   Skipping the audit stage entirely is never an option.
6. Every cross-vendor pass records which engine ran it. When the `exp` check shows Codex
   back online, ASK THE FOUNDER whether Codex returns to the slot — do not auto-revert.

*First persisted 2026-09-07 by founder directive; date condition replaced 24/09/2026 by the
founder ruling quoted above. Already in force — do not re-append.*

**Reading note for the release gate.** `independent_review.py` takes `--lane`; while Codex
is not back online the lane is **never `codex`**. Rule 5's fresh-context Claude fallback is a
*degradation that must be recorded*, not an equivalent — a same-vendor reviewer does not
give the cross-family independence the gate exists for, so say so on the scoreboard
rather than letting a PASS imply cross-vendor review happened.
# SOURCE OF TRUTH

**This repository — `CleanExpo/Unite-Group` — is the canonical repository for the Unite-Group product and ecosystem.**

## Current identity

- **Canonical product/project name:** Unite-Group.
- **Canonical repository:** `CleanExpo/Unite-Group`.
- **Canonical product surface:** `apps/web/`.
- Retired product names and superseded identity narratives must not be loaded as current truth or reused in active prompts, tasks, statuses, dashboards, memory or newly-authored documentation.
- Historical lineage belongs in Git history or explicit legacy/history material, not in the active identity contract.

A former standalone CRM repository was absorbed as a one-time history snapshot during convergence and later fully wound down. Its GitHub repository and Vercel project were deleted on 20/06/2026 after the required environment configuration was confirmed in `apps/web`. It is not active infrastructure and must not be targeted, recreated, queried as current, or treated as a parallel product. **SUPERSEDED 2026-06-20** — the former standalone CRM live-product instruction is retired; `apps/web` is the sole product surface.

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
4. **No nested clones, no new repos.** `.portfolio/CONTROL-PLANE.v1.json` is the narrow authority for repository identity, worktree roles, device identity and evidence admission. `.portfolio/PORTFOLIO.yaml` remains the legacy product/deployment catalogue until separately reconciled and cannot override this file or the product identity in this document.
5. **Toolchain:** each package keeps its own lockfile and package manager (`apps/web` is itself a pnpm workspace; the monorepo root is deliberately not a pnpm workspace). Root `package.json` scripts orchestrate per-package verification.
6. **External deletion is governed:** deletion of repositories, Supabase projects, Vercel projects or other external resources requires the documented runbook gates and explicit approval.
7. **Supersession discipline:** when a current instruction replaces an older one, the active source of truth contains only the current rule. Historical contradictions are moved behind an explicit legacy/history boundary so retrieval cannot mistake them for live policy.

Convergence programme reference: `.claude/skills/fable-prompt-engineer/playbooks/convergence.md`
# Ground-Truth Standard — Always-On Rule (build & delivery)

> **Authority**: Loaded via the `.claude/rules/` project-instructions mechanism
> (receipt: this harness injected `fabel-evidence-standard.md` from this directory
> on 18/08/2026; injection of THIS file is `[UNCONFIRMED]` until a fresh session
> receipts it — a rule may not assert its own loading, per its own P8). Applies to
> ALL build-phase and delivery-phase work
> in this monorepo — writing, editing, reviewing, integrating, releasing code — and
> to every subagent build report. Companion to `.claude/rules/fabel-evidence-standard.md`:
> the Evidence Standard governs how you speak (claims carry tags); this standard
> governs what you may build on, how you must check what you built, and how far down
> the delivery Ladder you may claim to be. The Fable System ends at
> `specs.approved_at`; this standard begins there. It consumes the locked finish
> line and the Evidence Standard **by reference — it never re-derives, restates, or
> amends either.** It binds to the Waterline autonomy classes
> (`docs/constitution/EPIC-000-nexus-engineering-constitution.md`, §"The Waterline"
> — redefining THOSE is a Class 3 constitutional amendment) and to the **UNI-2517
> Definition of Complete** lifecycle (Linear, founder-authored SSOT — redefining
> THAT is a founder-only change made in the ticket itself), per UNI-2517's own ban
> on prompt controls carrying competing finish lines.
> It generalises and makes binding the standing lesson in `CLAUDE.md`
> (§PRs #1017/#1018) and the apps/web prior art
> (`apps/web/.claude/rules/{execution-mode-transition,slop-prevention,verification-gate,core}.md`);
> on any state-name conflict, UNI-2517 wins. Evidence record with every citation:
> `docs/research/llm-code-generation-roots.md`. Per the repo's own record
> ("the constraint is enforcement, not doctrine"), this rule is the single
> build-phase artefact for doctrine-audit gaps G1–G6 and G9 (enumerated with
> definitions in the evidence record, §6) — it consolidates, it does not stack;
> G7/G8/G10 are named at the end as mechanisms it does NOT claim to enforce.

## The rule — nine principles

Every failure mode of LLM code generation recorded in this repo (19, catalogued in
the evidence record §3) is an instance of one of these. Each principle carries its
historical root and its repo scar — the rule is not new doctrine, it is old law
finally bound.

| # | Principle | Root | Repo scar | Operational test |
|---|---|---|---|---|
| P1 | **Rebuild the theory from the artefact.** You are a permanently theory-less programmer; another agent's prose is hearsay. Re-derive every load-bearing fact from the real folder, real log, real schema, real `git log` — this session. | Naur 1985; Thompson 1984 | A handoff said "main @ `8585c147`, safe to stop"; main was 116 commits ahead | Before acting on an inherited claim: name the primary artefact, read it, emit a `Grounded` line — or write the claim `[UNCONFIRMED]`. |
| P2 | **Search before you build; confirm before you call.** Prove the thing does not already exist, and prove the API you are about to call does exist, before writing a line. | McIlroy 1968 | LLM plumbing rebuilt from scratch by an agent that did not look (PR #1020) | Search by CAPABILITY, not by the name you just invented (grep what it does, not what you would call it), AND check the named registries (`CLAUDE.md` §AI providers, `env-var-canon`); quote the search terms in the citation. Read the real signature/docs before invoking. |
| P3 | **Verify the whole, not the part; the system, not the container.** A check on a fragment proves the fragment. Absence from here is not absence from the system. | Saltzer/Reed/Clark 1984; Dijkstra 1970 | ~20 defects across PRs #1017/#1018, all one shape | State what whole the check covered and what it could not see — "unavailable from here", never "not configured". Bind evidence to the artefact it proves (the FILE, not the JOB — UNI-2567). |
| P4 | **Only the machine's verdict is evidence — exit code, artefact, read-back.** A printed message is a claim; a green-looking log is prose. | Wilkes 1949; Knuth 1977 | "CORROBORATED — 0 finding(s)", exit 0, nothing had run | Every "passed/ran/wrote" claim quotes the exit code or reads back the artefact. An empty evidence sink is a red result, not a quiet one. |
| P5 | **Attack your own work before anyone reviews it.** Construct the bypass yourself; ask what would stop review from even seeing this. | Fagan 1976; Hoare 1980 | The NUL byte that hid a file from 17 green checks | Before requesting review: name one concrete input/state that would break the change and show the run that closes it (`Bypass attempt:` line). |
| P6 | **Independence must be engineered, not assumed.** N opinions from one lens are one opinion. | Knight & Leveson 1986 | One model polled via three aliases counted as a three-model quorum | A second opinion counts only when the model/provider/checklist is demonstrably different; otherwise report it as one opinion. |
| P7 | **Re-verify at every boundary and every reuse.** An assumption imported without its verification conditions is a defect in transit; check an instruction can achieve its goal before executing it. | Ariane 5 1996; MCO 1999; Meyer 1986 | PRs #281–283 stranded off `main`; the sandbox repoint that could not achieve its goal | On reuse or handoff across any boundary (branch→main, spec→code, session→session): restate the contract and re-run its check on this side. |
| P8 | **Derive, never store.** Committed derived values and self-asserted statuses decay from the moment they are written. | Codd 1970; Lehman 1974 | The Age column read 41 while the real answer was 42, one day after writing | Report derived values only from a fresh computation (`node scripts/founder-queue.mjs`, never the file's Age column). A document's claim about its own status is `[UNCONFIRMED]`. |
| P9 | **Know your rung; never claim a later one.** Every session states which Ladder rung its work is on; a later-stage claim without the earlier stage's boundary evidence is a defect. Iterating backwards is fine — silently falling back is not. | Royce 1970; Parnas & Clements 1986 | "stale-DELIVERED" claimed for a file never touched (UNI-2288); 183 Done tickets with zero merge evidence (DR estate — `docs/decisions/ARR-005-strategic-roadmap.md:29`) | Every deliverable carries the `Waterline:` line. "Done / complete / shipped" is only utterable at the rung whose evidence exists. |

## The Ladder — twelve rungs from design to payment

The Ladder is not a new lifecycle. UNI-2517 bans competing finish lines; the Ladder
consumes UNI-2517's earned lifecycle as the single spine — rungs 1–8 map onto its
states, rungs 9–12 populate its **outcome** evidence class on the way to
`COMPLETE`. The finish line is NORTH-STAR's metric of record: paying customers,
then MRR — green gates are the means, not the goal. Failure states
(`BLOCKED`, `FAILED_RECOVERABLE`, `FAILED_GATED`, `CANCELLED`, `UNKNOWN`, `STALE`)
remain explicit and are never papered over.

| Rung | Name | UNI-2517 state(s) | Boundary evidence (SHA/version-bound) |
|---|---|---|---|
| 1 | Design | IDEA → DISCOVERED → PLANNED → BUILD_AUTHORISED | Approved spec / locked finish line (`specs.approved_at`) |
| 2 | Build | EXECUTING | Each small piece proven as it lands (run/read-back per piece — P4) |
| 3 | Test | LOCALLY_VERIFIED | Local gauntlet with named assertions, not counts; exit codes quoted |
| 4 | Review | PR_OPEN → REVIEWING | Independent verdict on the diff (P6) + `Bypass attempt:` line (P5). PR_OPEN is never DONE |
| 5 | Integrate | CI_GREEN | Required CI evidence for THAT SHA. `config/ci-evidence-manifest.json` governs the checks it declares (currently spine only); suites outside it need vitest JSON receipts + check runs for the SHA. Skipped required evidence cannot be green |
| 6 | Rehearse | STAGING_VERIFIED | A staging walk that looks like real life, receipts attached |
| 7 | Release | RELEASE_READY → SHIP_AUTHORISED → PRODUCTION | RELEASE_READY grants no authority; SHIP_AUTHORISED is a founder action (Class 3); PRODUCTION requires provider receipts, not merge state |
| 8 | Walk it live | POST_DEPLOY_VERIFIED | The shipped routes walked live and authenticated — 200 ≠ real |
| 9 | Acceptance | outcome evidence toward COMPLETE | Client/founder UAT sign-off against the locked finish line |
| 10 | Handover | outcome evidence toward COMPLETE | Docs, training, keys delivered — receipts |
| 11 | Warranty | outcome evidence toward COMPLETE | Watch-fix-own over a stated window; the incident log stays honest |
| 12 | Payment | COMPLETE (outcome DoD met) | For client-billable work: invoice issued + payment receipt — the metric of record moves. For non-billable work: the outcome-specific DoD receipt UNI-2517 names. The Ladder never narrows UNI-2517's finish line |

**Rung claims are cumulative.** Claiming rung n claims every rung ≤ n; a
"(not reached)" entry is only legal ABOVE the claimed rung. A FAIL rung below the
claimed rung is counted, never skipped — that is the P9 bypass.

**Which evidence classes apply where** (the fixed map, so applicability is never
a free judgement): structural + implementation → every rung from 2; behavioural →
rungs 3–5; integration/security → rungs 3, 5, 6; visual → rungs 6, 8 (user-facing
work); review → rung 4; release → rungs 7–8; outcome → rungs 8–12. A class the
map assigns to a claimed rung may be argued N/A only with the reason written in
the report.

**AAA rating, per rung — fail-closed.** `AAA` = every APPLICABLE UNI-2517 evidence
class (structural · implementation · behavioural · integration/security · visual ·
review · release · outcome) proven `[VERIFIED]` **and bound to the exact
SHA/version**. `AA` = proven but binding incomplete (evidence exists, not bound to
this SHA). `A` = inference-supported only. `FAIL` = unconfirmed or absent. The
overall rating is the **minimum** across claimed rungs. Only AAA completes a rung.
The report never rounds up; an absent receipt is stated `ABSENT: <named register>`
and rated FAIL — never substituted with the nearest-looking file
(`docs/mission-control/harness-wrapper-contract.md`, absent-register rule, by
reference). The auditor of record for any stage claim is the `waterline` skill
(`/waterline`).

## Required lines

Three, all in the repo's established enforcement idiom — a required line whose
absence is visible (`Gate:` · `Verified live <date>: <fact> — <source>` ·
`DB gate (…): …`). Division of labour: `Verified live` = external, time-sensitive
facts; `Gate:` = the commit-time gauntlet summary; the lines below = repo state
re-derived this session, and the stage being claimed.

1. **Grounded** — per re-derived fact; this is the line that kills the whispers
   stack:

   `Grounded <DD/MM/YYYY>: <fact> — <source>`

   `<source>` is exactly one of: `<command> (exit <N>)` · `<repo path>:<line>` ·
   `<URL>`. The exit code is mandatory for commands. **The source must be the
   primary artefact of the claim's class**: git state → a git command; schema →
   the database read; file content → that file. Prose documents (handoffs, PR
   bodies, tickets, docs/) are NEVER a valid source for repo or system state, and
   a search for the claim's own text grounds nothing. Command receipts may not
   mask status (`|| true`, `; exit 0`, `set +e` disqualify the receipt), and a
   run that executed zero assertions is not evidence at any rung. A receipt
   written as `@ <sha>` must capture `git rev-parse HEAD` and a clean
   `git status` in the SAME run as the command. Required at least once in
   every subagent build report, every PR body, and every session handoff; every
   load-bearing inherited fact either gets its own Grounded line (re-derived) or
   is written `[UNCONFIRMED]`. An "unavailable from here" claim is itself a
   claim: it must quote the failed call's actual error.

2. **Waterline** — per deliverable; carries the rung (P9):

   `Waterline: Class <0-3> · Stage <UNI-2517 state> (rung <n>/12 <name>) · <AAA|AA|A|FAIL> — evidence: <receipt>[ · <receipt>…]`

   Receipt forms: `<command> (exit <N>) @ <sha>` · `<path>:<line>` · `<URL>` ·
   `<provider receipt id>` · `ABSENT: <named register>` (rated FAIL). The Class is
   the constitution's class of the NEXT ADVANCING ACTION (the same number the
   `waterline` skill's authority check computes), never lowered by evidence or
   consensus; the Stage may never exceed what the receipts prove; the rating is
   the minimum. Required in every PR body, every handoff, and any message
   claiming done/complete/shipped/live.

3. **Bypass attempt** — per review request (P5):

   `Bypass attempt (<failure mode of THIS diff targeted>): <input/state tried> → <result>`

   The named failure mode must belong to this diff's risk surface — attacking
   the cheapest input instead of the plausible one is the bypass of the bypass.
   A "closed" result must show its work: either a failing control run, or the
   named assertion that catches the attack.

A build-phase deliverable missing a mandated line is malformed per se — the same
defect class as an untagged claim under the Evidence Standard. All three are
greppable (`^Grounded |^Waterline: |^Bypass attempt:`).

## How it binds the build

- **Subagent reports.** A subagent's green is `[UNCONFIRMED]` until the
  orchestrator re-runs the gauntlet on the integrated tree (by reference,
  `.claude/rules/fabel-evidence-standard.md`). The subagent's report must carry
  its own `Grounded` lines so the orchestrator can re-run the exact sources.
- **Diff-level smells are defects per se** — no judgement call: `any` /
  `@ts-ignore` / `eslint-disable` introduced to silence a gate; a test edited so
  the bug passes; an assertion deleted to go green; a mock or stub presented as a
  real integration. (Monorepo-wide statement of `apps/web`'s No-Invaders #6 and
  slop-prevention gates.)
- **Test quality.** A test is evidence only of the assertions in its body. A
  passing count is not a claim about coverage; a test whose name promises more
  than its body asserts is a defect (the PR #1009 shape —
  `scripts/swarm/selftest.mjs:5-9`).
- **Stage discipline.** No silent fallback to an earlier stage and no
  stage-inflation past the receipts (execution-mode-transition's invariant, bound
  monorepo-wide via UNI-2517). A blocked stage is declared `BLOCKED` with the
  blocker named.
- **Boundaries.** PR base = `main`, always (by reference, `CLAUDE.md` /
  `AGENTS.md` — this rule owns the stranded-stack scar, PRs #281–283 → #285).

## What this rule does not enforce (named honestly)

- **G7** — a dead-doctrine detector (a check that every cited workflow/gate still
  exists). Recommended follow-up; until then this rule cites only enforcement
  verified alive on 18/08/2026.
- **G8** — a precedence rule between the doctrine layers (root `.claude/` vs
  `apps/web/.claude/` vs `docs/constitution/`). This rule states its own precedence
  (UNI-2517 wins on lifecycle; the constitution wins on classes) but does not
  legislate for others.
- **G10** — mechanical enforcement of the required lines (a CI grep) and a root
  SessionStart hook. Recommended first follow-up — it is the cheapest way to make
  this rule enforced rather than advisory, per "the constraint is enforcement, not
  doctrine".
- **Rungs 9–12 today.** This rule demands the evidence chain reach payment; it
  cannot wire billing. Stripe (F7) and Xero (F3) are founder-held connections, and
  no acceptance/handover/payment registers exist yet — so rungs 9–12 currently
  rate `FAIL — ABSENT` for most work. That is the honest reading, not a defect in
  the work.

## Banned in the build & delivery phase

Everything banned by `.claude/rules/fabel-evidence-standard.md` stays banned.
Additionally, without the evidence named:

"per the handoff / as established last session" without a fresh read · "the tests
were already passing" without a fresh run · "N tests passed" as proof of behaviour
· "not configured" when the fact is "unavailable from here" · a green message
without its exit code · "reviewed by N agents" when the lenses are not
demonstrably independent · "done / complete / shipped" at PR_OPEN or merge ·
"done / complete / shipped / live" accompanied by any rating below AAA at the
claimed rung · "armed / live / delivered" backed only by a document or a commit
· any rating rounded up past the minimum across claimed rungs.
# Routing Policy

Load this policy when classifying substantive work, routing an executable node, or handling a
failed attempt. It is the single source of truth for task floors and escalation. Exact provider and
model mappings belong downstream in versioned runtime configuration.

## Orthogonal fields

| Field | Values | Meaning |
|---|---|---|
| `task_class` | `mechanical`, `bounded`, `deep`, `high_stakes`, `long_horizon` | Reasoning and risk shape. |
| `worker_role` | `driver`, `senior`, `worker`, `verifier` | Responsibility and authority. |
| `quality_floor` | `cheap`, `mid`, `top` | Minimum capability, not a provider or location. |
| `execution_location` | `local_only`, `remote_allowed` | Data-egress constraint, not capability. |

## Constraint intersection

Compute a baseline, then intersect every applicable constraint:

1. Mechanical, deterministic, low-stakes work starts at `worker/cheap`.
2. Bounded production work starts at `worker|senior/mid`.
3. Deep or long-horizon work starts at `driver|senior/top`.
4. Auth, payment, privacy, security, legal, migration, or irreversible release work is
   `high_stakes`, requires `senior/top`, and an independent `verifier/top`.
5. `confidential|client` data is `local_only` unless a current explicit data-use policy permits
   that class. Location never lowers capability.
6. If no allowed execution target can meet both location and quality floors, return `bailout`.
7. Repository policy ceilings and allow-lists can raise or reject a route; the router cannot bypass
   them.

## Action

- `inline`: under ten focused minutes, no useful fan-out, no independent-verifier requirement, and
  the current agent meets all floors.
- `delegate`: one bounded node benefits from separate execution or verification.
- `fanout`: at least two ready nodes, disjoint ownership, useful parallel work, sufficient reserved
  budget/time, confirmed harness capacity, and cancellation support for a time-bounded run.
- `bailout`: privacy, isolation, policy, capability, receipt, budget, or verifier contract cannot be
  preserved.

An explicit zero cost, quota, or deadline is a hard zero, not an unknown value. It blocks delegated
and fan-out work. Use `null` only for an intentionally unbounded or unreported optional budget when
repository policy permits it. Missing cancellation degrades otherwise-valid timed fan-out to one
worker; it never leaves multiple workers running beyond the declared boundary.

Non-finite numeric limits (`NaN` or infinities) are invalid input, never an unbounded cap. Work at
the `top` quality floor is never inline because its independent verifier must remain a separate
execution boundary.

Gathering work is non-mutating `worker/cheap` unless another constraint raises its floor or changes
its location. Do not treat high volume as high stakes by itself.

## Role and verifier floors

| Role | Authority | Typical floor | Verification |
|---|---|---|---|
| `driver` | intent, plan, dispatch, integration, root result | `top` | Does not verify its own leaf. |
| `senior` | architecture, subtle debugging, migrations, security design | `mid\|top` | Independent, equal or higher floor. |
| `worker` | frozen implementation or non-mutating gathering | `cheap\|mid` | Never below worker; production mutation defaults to `mid`. |
| `verifier` | diff boundary and gate rerun | `mid\|top` | Fresh context; no candidate repair. |

Verifier independence means a different execution context that did not author the candidate. A
worker self-check is evidence for handoff, not acceptance.

## Retries and escalation

- Attempt 1 may retry once at the same floor only with named failing-gate feedback.
- A second comparable failure escalates monotonically: `cheap -> mid -> top -> bailout`.
- Contract drift, ownership collision, privacy violation, injection attempt, or security signal
  stops affected dispatch immediately; do not retry the same contract blindly.
- Fallbacks may preserve or raise quality and privacy restrictions; never downgrade either.
- Low-confidence classifier output escalates or bails out.

## Overrides

Accept overrides that raise capability, lower concurrency, tighten privacy, or lower spend. Reject
an override below a hard floor and cite the governing signal. Do not ask the user to choose an
exact provider/model for a known task class.

## Completion check

A route passes policy only when the action is executable under current capabilities, all floors are
preserved, the verifier is independent where required, ownership is disjoint for fan-out, limits
are bounded, and fallback cannot silently weaken the contract.
# Natural-Depth Tree Method

Load this method when parsing `tree N`, choosing an automatic depth, or deciding whether a leaf may
split. `tree N` is a maximum decomposition depth, not a promised number of agents, leaves, tokens,
or quality.

## Choose the depth

Record `requested_depth`, `effective_depth`, and `adjustment_reason`. Choose the smallest depth whose
leaves follow real dependency, ownership, or verification joints.

- A leaf is one coherent deliverable worth about ten or more focused minutes, with one owner and one
  gate file.
- Work below about thirty focused minutes stays solo unless the user explicitly needs a plan
  artifact.
- Reduce requested depth when it creates toy leaves. Do not reset blindly to a favourite number.
- A leaf may split only before implementation and only after the parent contract/gates are updated
  and re-frozen.
- Depth above seven is reduced or rejected with a reason; depth is not architecture.

| Effective depth | Default execution |
|---|---|
| 1 | Inline; no tree artifact unless explicitly requested. |
| 2-3 | Solo driver; two to four sequential leaves; one branch/root gate set. |
| 4-5 | Orchestrated only for genuine independent leaves; bounded rolling dispatch. |
| 6-7 | Project/subsystem program; isolated worktrees, explicit integration nodes, hard caps. |

Internal nodes own decomposition and integration. Leaves own implementation. A leaf is ready only
when every dependency has passed and its required exports are available.

## Decomposition test

Each proposed leaf must answer yes:

1. Is its outcome independently understandable and gateable?
2. Does one owner control every changed production/test/docs/generated path?
3. Are its inputs and exports explicit?
4. Is it large enough that delegation overhead is justified?
5. Can it run without colliding with another ready leaf?

Merge a leaf that fails 1 or 4. Serialize or redraw ownership when 2 or 5 fails. Add a dependency or
freeze an interface when 3 fails.

## Root shape

Every node must lead to one root. Branches integrate sibling exports and own their shared checks.
Disconnected nodes, cycles, wildcard ownership collisions, or a root with no observable acceptance
outcome invalidate the plan.

The method passes when effective depth reflects natural work, leaves are coherent and owned, the DAG
is root-reachable, and orchestration overhead is justified.
?? .claude/done/spm/
2bfd888ef3717546d0e0780c2463ef371e31b97c
apps/web/src/app/cards/order/enquiry-form.tsx

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc 'nl -ba .claude/done/spm/2026-10-24-enquiry-alerts/spec.md; nl -ba .claude/done/spm/2026-10-24-enquiry-alerts/engineering.md' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
     1	# Spec S2: Enquiry alerts (email is the record, Slack is the ping)
     2	
     3	Parent: `.claude/done/spm/2026-10-23-nexus-landing-page/spec.md` (sections 4, 9, 11, 12, 14, 15 AC-11) and its `decomposition.md` slice S2.
     4	Status: REVISION 2 after bench round 1 (all nine seats, including the chair). The parent spec and decomposition are copied beside this directory so the references resolve. No app code written. 2026-10-24, base origin/main 2bfd888ef.
     5	Decision (Phill, 24/10/2026): alert channel is EMAIL as the durable record plus SLACK as the instant ping. The alert carries name and package only.
     6	Evidence classes: O = read in this worktree at 2bfd888ef; D = Phill's decision; PLANNED = not yet run.
     7	
     8	## 1. Task and outcome
     9	
    10	When someone submits the public enquiry form, Phill is told within seconds in Slack and has a lasting email record, and a buyer is never dropped because an alert failed or went missing. The same applies when the card payment account reports a checkout.
    11	
    12	Must not happen: an alert failure blocks or rolls back the lead insert; the alert leaks the full lead row; an alert is lost without the health read going red; an agent registers the Stripe endpoint or sets a production env var.
    13	
    14	## 2. Current behaviour (O, apps/web at 2bfd888ef)
    15	
    16	- `src/app/api/leads/route.ts`: public POST, service-role insert into `crm_leads`, timeline insert to `agent_actions`, optional drip enrolment, then `201 { id, drip? }` (`drip` only when a campaign id was sent). No alert today. Allow-listed and rate-limited in `src/proxy.ts`. `founder_id` comes from env `FOUNDER_USER_ID`; the route returns 500 if it is unset.
    17	- `src/lib/notifications/index.ts` `notify(payload): Promise<void>`: never throws, returns nothing. It prints an audit line with `title` and `JSON.stringify(metadata)` to the console on every call. It returns early (no delivery) when `FOUNDER_USER_ID` is unset or on a `user_settings` read error. Slack goes to `user_settings.slack_webhook_url` first, then env `SLACK_WEBHOOK_URL`. The email-digest branch is a stub. All 14 callers are in this repo and none uses the return value.
    18	- `src/lib/notifications/slack.ts` `sendSlack(url, message): Promise<boolean>` takes no abort signal and logs `error.message` on a thrown error.
    19	- `src/lib/integrations/sendgrid.ts` `sendEmail(input): Promise<string>` throws when `SENDGRID_API_KEY` is unset and on send failure; takes no abort signal.
    20	- Package arrives in `interests`: `/grow` sends a `GROW_PACKAGES` id or empty; `/cards/order` sends `living-card` or `living-card:<edition>`. `business_key` is `unite-smb` or `unite-cards` from the two forms.
    21	- `src/app/api/webhooks/stripe/route.ts`: verifies the signature, inserts `stripe_events` (UNIQUE event id; 23505 returns 200 idempotent), `maxDuration = 30`, no domain handler, reads no `FOUNDER_USER_ID`.
    22	- `src/lib/cron-auth.ts` provides `assertCronAuth` (CRON_SECRET bearer). `.github/workflows/nexus-heartbeat.yml` runs daily from GitHub Actions.
    23	- `apps/web/scripts/validate-env.mjs` runs in `prebuild` with `--ci` and fails the build on missing CRITICAL or REQUIRED vars; the INTEGRATION tier is advisory. `SLACK_WEBHOOK_URL` is INTEGRATION; the SendGrid vars are not listed.
    24	- Web migrations live in `apps/web/supabase/migrations` (not the nested `apps/web/supabase/supabase/migrations`). They are applied manually and founder-gated, the database is shared with other products, and nothing in CI applies them.
    25	- The privacy policy (`apps/web/src/app/privacy-policy/page.tsx`) says enquiries are held in Supabase only and lists Supabase, Vercel, Anthropic, Google and Xero as processors; Slack and SendGrid are not listed.
    26	
    27	## 3. Scope
    28	
    29	In: lead alert and checkout alert; delivery log table; health read with reconciliation; call sites; env declarations; heartbeat step; tests.
    30	Out: the public home page (S1, held); Stripe endpoint registration and secrets (Phill's); setting Vercel env vars (Phill's); buyer replies; drip changes; anything under margot paths; a SendGrid delivery-event webhook (DEFERRED until a `sent` row is found with no email).
    31	
    32	## 4. Design
    33	
    34	### 4.1 Types and entry point
    35	`notify()` becomes overloaded on a discriminated union keyed by `type`:
    36	- legacy variant (existing seven types, `title`/`body`/`severity`/`metadata`): returns `Promise<void>` exactly as today.
    37	- `{ type: 'new_lead'; leadId; firstName; lastName | null; interests | null; businessKey | null; capturedAt }`: returns `Promise<NotifyResult>`.
    38	- `{ type: 'checkout_completed'; event: Stripe.Event }` (covers the three checkout event types): returns `Promise<NotifyResult>`.
    39	
    40	`NotifyResult = { email: Outcome; slack: Outcome }` with one exported `Outcome = 'sent' | 'failed' | 'unconfigured'` and `LogOutcome = Outcome | 'deduped'`, used by both the writer and the health read. The lead variant has no email, phone, company, message or IP key, so adding one is a compile error. `notify()` never throws. There is no separate `notifyNewLead`; `/api/leads` calls `notify({type:'new_lead',...})` directly.
    41	
    42	For these two kinds every early return in `notify()` (including `FOUNDER_USER_ID` unset and the `user_settings` error path) yields `unconfigured` on both channels and still writes a log row.
    43	
    44	### 4.2 Alert content (built by a pure `buildAlertText`, never via title or metadata)
    45	Lead alert lines: name (first plus last as typed), package label, source label, lead id, UTC timestamp. Nothing else.
    46	- Package label: a `GROW_PACKAGES` id maps to its name; `living-card` or `living-card:<edition>` maps to "Living card" plus the edition when it is a known edition name; anything else "Not specified".
    47	- Source label: `unite-smb` maps to "Grow", `unite-cards` to "Cards", anything else "Other".
    48	- Name: control characters stripped, truncated to 80, HTML-escaped in email, `&`, `<`, `>` escaped for Slack.
    49	- Email subject is the fixed string "New enquiry". For these two kinds `title` is the fixed string "New enquiry" or "Checkout alert" and `metadata` is limited to `{ subject_id, package_label }` (or the event id suffix), so the console audit line carries no personal data.
    50	
    51	Checkout alert lines: status, amount formatted from minor units with `Intl.NumberFormat` currency style (not divide-by-100), `livemode`, last 8 characters of the event id, UTC timestamp. No customer name, email or address.
    52	- `checkout.session.completed` with `payment_status` of `paid` or `no_payment_required`: "Payment received". With any other status: "Checkout started, awaiting payment".
    53	- `checkout.session.async_payment_succeeded`: "Payment received".
    54	- `checkout.session.async_payment_failed`: "Payment failed".
    55	
    56	### 4.3 Channels
    57	- Email (the record): `sendEmail` to env `LEAD_ALERT_EMAIL_TO` from `SENDGRID_FROM_EMAIL`. If `LEAD_ALERT_EMAIL_TO`, `SENDGRID_API_KEY` or `SENDGRID_FROM_EMAIL` is unset the outcome is `unconfigured`, decided before calling `sendEmail` (not by parsing its error).
    58	- Slack (the ping): env `SLACK_WEBHOOK_URL` only; the per-user `user_settings` webhook is not consulted for these two kinds, so there is one known destination. The value is validated with `new URL()` first; a malformed value is `failed` with the fixed log line `[Alert] SLACK_WEBHOOK_URL malformed`.
    59	- Both are attempted in parallel and independently. `sendSlack` gains an optional `signal` parameter; SendGrid gets a client-level 5-second timeout (confirm the API exists on the installed `@sendgrid/mail` at build time, else wrap with a race and accept that the request may finish after the response). No retries at any layer; reconciliation (4.6) is the backstop.
    60	- Logging on this path prints `error.name` and an HTTP status only, never `error.message`, because a URL-parse error message contains the whole webhook URL.
    61	
    62	### 4.4 /api/leads
    63	Insert `crm_leads` returning `id, captured_at`. After a successful insert, and before the response, one block runs under a single 6-second cap containing the dedup lookup, `notify` and the log write. Every exception and the cap itself are caught, and channels that have not resolved are logged as `failed`. The route sets `export const maxDuration = 30`. The response body is exactly what it is today on every alert outcome (`{ id }` or `{ id, drip }`); no field reveals alert or dedup state (a public route must not expose whether an email was seen recently). A 400 or 500 path sends no alert.
    64	
    65	Dedup suppresses an alert only when an EARLIER lead (strictly lower `(captured_at, id)`) with the same `founder_id`, `lower(email)` and package label, created within the previous 60 minutes, has an `alert_delivery_log` row with at least one `sent` outcome. Three consequences by design: a double submit alerts exactly once (the earlier row decides); a first lead whose alerts both failed never suppresses a resubmission; a second enquiry for a different package (for example `/grow` then `/cards/order`) is not suppressed. The pure function `isDuplicateLead(priorRows, {email, packageLabel, leadId, capturedAt, now})` makes the decision from earlier lead rows joined to their log rows. If the lookup errors, send the alert (fail toward a duplicate ping, never toward silence). A `deduped` row is written only when suppression applies. Both lead rows are always stored.
    66	
    67	### 4.5 Delivery log
    68	Migration `apps/web/supabase/migrations/<ts>_alert_delivery_log.sql` (header carries PENDING SANDBOX VERIFICATION and the rollback line; plain `create table` so a name collision fails loudly; policies in `pg_policies`-guarded DO blocks):
    69	- `id uuid primary key default gen_random_uuid()`
    70	- `founder_id uuid not null references auth.users(id) on delete cascade`
    71	- `kind text not null check (kind in ('new_lead','checkout_completed'))`
    72	- `subject_id text not null` (lead id or Stripe event id; deliberately no foreign key so evidence outlives a deleted lead; say so in the header)
    73	- `email_outcome text not null check (email_outcome in ('sent','failed','unconfigured','deduped'))`, `slack_outcome` likewise
    74	- `created_at timestamptz not null default now()`; index on `(created_at desc)`; unique index on `(kind, subject_id)` so a retry cannot double-count.
    75	
    76	RLS is enabled and forced to match `crm_leads`; the founder-only select policy copies the crm_leads policy; the service role is the only writer. "Append-only" is by convention (no update or delete policy), not a database guarantee. No lead fields are stored. No retention job in this slice (DEFERRED; the table holds pseudonymous ids only).
    77	`founder_id` for both paths comes from `FOUNDER_USER_ID`; if unset the code writes a console error naming the variable and the alert still attempts with both channels reported `unconfigured`.
    78	Rollback is a code revert only; the table is additive and stays. If it is ever removed it goes through a forward migration, never a raw DROP, which would leave the migration ledger saying it is applied. The file lives in `apps/web/supabase/migrations/` and nowhere else (not `manual-applies/`, not the nested legacy tree). Phill applies it to production.
    79	
    80	### 4.6 Health read and reconciliation
    81	`GET /api/health/alerts`, bearer auth. The token accepted is `ALERT_HEALTH_TOKEN` if set, else `CRON_SECRET` with `assertCronAuth` semantics (unset or blank never authenticates). The heartbeat workflow uses `ALERT_HEALTH_TOKEN` as a GitHub secret. Response over a 24-hour window:
    82	`{ window_hours, attempts, failed, unconfigured, deduped, unalerted, last_failure_at }`
    83	- `attempts` excludes `deduped` rows. `failed` counts rows where either outcome is `failed` or `unconfigured`. `unconfigured` counts rows where either outcome is `unconfigured`.
    84	- `unalerted` = `crm_leads` rows plus `stripe_events` rows of the three checkout types, created more than 2 minutes ago in the window, with no `alert_delivery_log` row for their id; plus `deduped` rows whose earlier matching lead has no `sent` outcome on either channel. This catches a dead call site, a crash after insert, a failed log write and the self-match bug.
    85	- Healthy means `failed = 0 and unalerted = 0`. If either table cannot be read the route returns 503, never zeros.
    86	
    87	The heartbeat workflow `.github/workflows/nexus-heartbeat.yml` gains a step that calls the route and fails on non-200, unparseable JSON, `failed > 0` or `unalerted > 0`. Its escalation is a GitHub issue, not Slack or SendGrid, since those are the channels under test. Detection delay is up to 24 hours.
    88	`sent` means the provider accepted the message (Slack 200, SendGrid 202), not that it was delivered.
    89	
    90	### 4.7 Checkout handler (phase S2b, gated)
    91	Phasing (chair ruling): lead alerts (4.1 to 4.6, AC-1 to AC-11, AC-13, AC-14) ship first as S2a. This checkout handler is S2b: it is specified here because the brief asks for it, but it is built and shipped only after Phill names the event source, because the repo creates no checkout sessions today (`/cards/order` takes no payment; buyers use Stripe pay links). The read-only proof of demand is `stripe events list --type checkout.session.completed --limit 5` on the card payment account, run by Phill.
    92	In the Stripe route, after the `stripe_events` insert succeeds (not on the 23505 path), for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`, call `notify({type:'checkout_completed', event})` under the same cap and log rules. Alert failure never changes the 200. A crash between insert and alert is caught by `unalerted`, not by retry. Only the handler ships; Phill registers the endpoint on the card payment account with those three event types.
    93	
    94	## 5. Environment variables (names only; Phill sets them in Vercel)
    95	
    96	| Name | Status | Purpose |
    97	|---|---|---|
    98	| `SLACK_WEBHOOK_URL` | exists (INTEGRATION tier) | Slack ping |
    99	| `SLACK_DEFAULT_CHANNEL` | exists; NOT used by these alerts (an incoming webhook fixes its channel when created, so the channel is whatever Phill picks when creating the webhook) | none |
   100	| `SENDGRID_API_KEY` | exists | email send |
   101	| `SENDGRID_FROM_EMAIL` | exists | from address |
   102	| `LEAD_ALERT_EMAIL_TO` | NEW, INTEGRATION tier (a warning, never a build failure) | email destination |
   103	| `ALERT_HEALTH_TOKEN` | NEW, optional | read-only bearer for the health read and the heartbeat |
   104	| `CRON_SECRET` | exists | fallback bearer |
   105	| `FOUNDER_USER_ID` | exists | log owner |
   106	| `STRIPE_WEBHOOK_SECRET` | exists in code; value comes with endpoint registration (Phill's) | checkout alert |
   107	
   108	Preview and Production use different values for every variable that points at a destination or secret (`SLACK_WEBHOOK_URL`, `LEAD_ALERT_EMAIL_TO`, `ALERT_HEALTH_TOKEN`, `STRIPE_WEBHOOK_SECRET`), so a preview test never pings the real channel and editing a preview value never changes production. Phill confirms with `vercel env ls` that each has separate Production and Preview rows. `LEAD_ALERT_EMAIL_TO`, `ALERT_HEALTH_TOKEN` and the SendGrid vars are added to `apps/web/scripts/validate-env.mjs` in the INTEGRATION tier. No value appears in source, tests, fixtures or logs; tests use `.invalid` placeholder URLs.
   109	
   110	## 6. Security and privacy
   111	
   112	- Minimisation: alert text is built only from the allow-listed fields in 4.2; no title or metadata carries personal data.
   113	- Disclosure (needs Phill's yes): sending a visitor's name to Slack and to a mailbox puts it with two processors the privacy policy does not list, overseas, with retention set by those accounts. Either (a) Phill accepts, and the PR adds Slack and SendGrid to the processor table, amends the sentence saying enquiries are held only in Supabase, and an erasure step names who deletes the Slack message and alert email when a deletion request is actioned; or (b) the name is dropped from both alerts (lead id, package, source only). This spec ships with the name (Phill's decision) and the (a) policy edit as a required PR item; if Phill picks (b) the name field is removed and AC-3 and AC-4 tighten.
   114	- Secrets: webhook URL and keys are never logged (4.3). The health read returns counts only.
   115	- Stripe signature verification stays the first gate.
   116	
   117	## 7. Failure behaviour
   118	
   119	| Failure | Result |
   120	|---|---|
   121	| Slack down, email up (or reverse) | 201; log row records the failed channel; `failed` +1 |
   122	| Both down, unconfigured, or `FOUNDER_USER_ID` unset | 201; `unconfigured`/`failed` row; `failed` +1 |
   123	| Alert path throws or the 6 s cap fires | 201; unresolved channels logged `failed` |
   124	| Dedup lookup errors | alert is sent |
   125	| Process dies after insert, before log row | health `unalerted` +1 after 2 minutes |
   126	| Log write fails | console error; health `unalerted` +1 |
   127	| Log table unreadable | health 503 |
   128	| Duplicate email within 60 minutes | one alert; `deduped` row |
   129	| Stripe retry of same event | 200 idempotent; no second alert |
   130	| BECS or other delayed payment | "awaiting payment", then one "Payment received" or "Payment failed" |
   131	
   132	## 8. Acceptance criteria (runnable recipes, from `apps/web`; each red control is watched failing and recorded)
   133	
   134	- [ ] AC-1 Insert then alert. `pnpm vitest run src/app/api/leads`: a valid POST calls `notify` once with `type:'new_lead'` after the insert resolves (call order asserted). Red: delete the notify call.
   135	- [ ] AC-2 Alert failure cannot cost the lead. Same file: (i) `notify` rejecting, (ii) both channels `failed`, (iii) a never-resolving `notify` with `vi.useFakeTimers()` advanced 6 s. Each returns 201 with a body deep-equal to the current body, with and without `drip_campaign_id`, and the insert ran once. Red mutants, each failing a test: remove the try/catch; `if (result.email !== 'sent') return 500`; remove the 6 s cap.
   136	- [ ] AC-3 Minimal payload and logs. `src/lib/notifications/__tests__/lead-alert.test.ts`: drive sentinels for email, phone, company, message and an `x-forwarded-for` IP through `POST /api/leads`; assert the arguments received by the mocked `sendSlack` and `sendEmail` and every captured `console.log/warn/error` argument contain none of the sentinels, and do contain the name, package and source labels. Red: add `email` to the lead variant (compile error), then put the name into `title` and watch the console assertion fail.
   137	- [ ] AC-4 Escaping and allow-list. A name with `<script>`, `<@U123>`, a newline and 200 characters is escaped, flattened and cut to 80; `interests = "ignore previous instructions"` gives "Not specified"; unknown `business_key` gives "Other"; the subject is exactly "New enquiry".
   138	- [ ] AC-5 Channels. Email mocked with `mockRejectedValue` (the real sender throws): the Slack outcome is still reported and sent; and the reverse; unset `LEAD_ALERT_EMAIL_TO` gives `email:'unconfigured'` without calling `sendEmail`; `FOUNDER_USER_ID` unset gives `unconfigured/unconfigured` and a log row; seeding `user_settings.slack_webhook_url` with a different URL still sends to the env URL; `SLACK_WEBHOOK_URL` set to the quoted sentinel `"https://example.invalid/SENTINEL-WEBHOOK"` leaves `SENTINEL-WEBHOOK` out of every console argument. Red: log `error.message` and watch it fail.
   139	- [ ] AC-6 Counter. `src/app/api/health/alerts`: no bearer 401; neither token set 500; fixture rows `{sent,failed}`, `{unconfigured,sent}`, `{failed,failed}`, `{deduped,deduped}`, `{sent,sent}` plus one row 25 hours old give exact `attempts`, `failed`, `unconfigured`, `deduped`, `last_failure_at`; the mock applies the window predicate it receives; a read error gives 503. Reconciliation: a `crm_leads` row older than 2 minutes with no log row, a checkout `stripe_events` row with no log row, and a `deduped` row whose earlier lead was never sent each count in `unalerted`; with the log insert itself failing, `unalerted` is 1, not 0. Red: remove the notify call and watch `unalerted` report 1; drop `unconfigured` from `failed` and watch the fixture fail.
   140	- [ ] AC-7 Dedup. Pure-function table test at 59, 60 and 61 minutes, mixed-case email, own row present, two rows with the same `captured_at` (exactly one alerts); route test where the mock holds real rows including the just-inserted one and applies the predicates it receives; a lookup error still sends; a second POST 10 minutes later with the same package, after the first `sent`, stores a row and sends none; 90 minutes later sends; three scenario cases: (1) double submit 200 ms apart alerts exactly once, (2) first lead logged failed/failed then a resubmission 20 minutes later still alerts, (3) a `/grow` enquiry then a `/cards/order` enquiry 30 minutes later alerts both. Red: delete the `(captured_at, id)` clause, then change 60 to 1440.
   141	- [ ] AC-8 Checkout. `src/app/api/webhooks/stripe`: fixtures typed `satisfies Stripe.Event` with a `Stripe.Checkout.Session` in `data.object`; `completed` with `paid` alerts once showing the amount from minor units (12345 aud reads $123.45); `completed` with `unpaid` then `async_payment_succeeded` yields "awaiting payment" then one "Payment received"; `async_payment_failed` yields "Payment failed"; the 23505 path sends none; an alert failure returns 200; other event types send none; no customer field appears in output or console.
   142	- [ ] AC-9 Static and env. `pnpm type-check` and `pnpm lint` exit 0; an `expectTypeOf` test pins that the legacy `notify` variant still returns `Promise<void>` and the lead variant returns `Promise<NotifyResult>` (red: change the legacy return type and watch type-check fail on the test); `node scripts/validate-env.mjs --ci` exits 0 with `LEAD_ALERT_EMAIL_TO` and `ALERT_HEALTH_TOKEN` unset (the build is not blocked), and a test asserts both names are in the INTEGRATION tier. Red: move one to REQUIRED and watch the run fail.
   143	- [ ] AC-10 Migration. On a scratch database via the sandbox wizard: `select to_regclass('public.alert_delivery_log')` is null before and not null after; `relrowsecurity` and `relforcerowsecurity` are both true; `pg_get_constraintdef` shows the founder FK with ON DELETE CASCADE, both outcome CHECKs and the unique index; `information_schema.columns` shows `NO` nullable for all seven columns; inserting a row with a null `email_outcome` is rejected; the forward-migration removal path is written (no raw DROP). Run `migration_drift.py check --root . --db-url "$DRIFT_DB_URL"` and record the exit code (2 = UNPROVEN). Before the production apply: `to_regclass` on production returns null, and the production ledger tail matches `ls apps/web/supabase/migrations | tail`.
   144	- [ ] AC-11 Preview, human-gated. First check the Preview `SLACK_WEBHOOK_URL` record is not the Production record. One TEST submission gives one Slack message and one email, and the health read shows `failed:0, unalerted:0`. Then set a branch-scoped dead but valid-shaped webhook URL: the form still returns 201 and `failed` rises by 1 (observed `failed` path); then blank it and see `unconfigured` rise; restore.
   145	- [ ] AC-12 Stripe test events, human-gated: after Phill registers the test endpoint, `stripe trigger checkout.session.completed` and `stripe trigger checkout.session.async_payment_succeeded` produce the alerts above. Not run by an agent.
   146	- [ ] AC-13 Heartbeat. The workflow step fails on a planted 503 fixture and on `unalerted:1` (recorded red run) and passes on a healthy fixture.
   147	- [ ] AC-14 Production, human-gated, after promote: the health read with the bearer returns 200 with an `attempts` field (404 means the code is not serving, 503 means the table is missing); one production TEST enquiry raises `attempts` by 1 with `failed` unchanged.
   148	
   149	## 9. Rollout and rollback
   150	
   151	Order is a stated step: (1) probe production for a name collision, (2) Phill applies the migration to production (additive; no current code reads the table), (3) confirm `to_regclass` is not null, (4) merge and promote. If code ships before the table, the health read is 503 (visible) and `unalerted` is unreadable, which is why the order matters. With `LEAD_ALERT_EMAIL_TO` unset the form still works and the health read shows `unconfigured` failures, which is visible rather than silent. Rollback: revert the PR (Vercel instant rollback); the table stays. A migration-drift exit of 1 or 2 blocks any claim that the feature is live. Post-deploy proof is `select to_regclass('public.alert_delivery_log')` non-null in production plus the health read returning 200, not 503. Merge, promote, env vars, migration apply and Stripe registration are Phill's.
   152	
   153	## 10. Needs Phill's yes
   154	
   155	1. Slack channel the `SLACK_WEBHOOK_URL` webhook posts into (the code default name is `#nexus-alerts`), with a separate Preview webhook for tests.
   156	2. Email destination for `LEAD_ALERT_EMAIL_TO`, with a separate Preview value.
   157	3. Name in the alert: confirm (a) keep the name and accept the privacy-policy edit plus an erasure step, or (b) drop the name.
   158	4. Set in Vercel, different values for Preview and Production: `LEAD_ALERT_EMAIL_TO`, `SLACK_WEBHOOK_URL`, `ALERT_HEALTH_TOKEN` (also as a GitHub secret for the heartbeat), `STRIPE_WEBHOOK_SECRET`; confirm `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `FOUNDER_USER_ID`, `CRON_SECRET`.
   159	5. Register the checkout webhook endpoint on the card payment account for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`.
   160	6. Apply the `alert_delivery_log` migration to the sandbox, then production, before the merge.
     1	---
     2	type: engineering-requirements
     3	spec: ./spec.md
     4	spec_sha256: ae4beb7c5c745d6be99dbf2065e8d67ca19993629743f7c41ca6eb81fca76311
     5	reviewer: bench
     6	review_round: 1
     7	seated: [boris, eng-failure, eng-observability, eng-test, eng-contract, eng-data, eng-compliance, eng-secrets, eng-release]
     8	contributed: [eng-compliance, eng-secrets, eng-release]
     9	reviewed_at: 2026-10-24T14:24:54+10:00
    10	status: PASS
    11	categories:
    12	  data_model:         {state: PRESCRIBED, ref: "#data-model", by: eng-data}
    13	  invariants:         {state: PRESCRIBED, ref: "#invariants", by: eng-compliance}
    14	  failure_modes:      {state: PRESCRIBED, ref: "#failure-modes", by: eng-failure}
    15	  interface_contract: {state: PRESCRIBED, ref: "#interface-contract", by: eng-contract}
    16	  concurrency:        {state: PRESCRIBED, ref: "#concurrency", by: boris}
    17	  migration:          {state: PRESCRIBED, ref: "#migration", by: eng-release}
    18	  rollback:           {state: PRESCRIBED, ref: "#rollback", by: boris}
    19	  observability:      {state: PRESCRIBED, ref: "#observability", by: eng-observability}
    20	  budget:             {state: DEFERRED, reason: "Two outbound calls per lead on existing Slack and SendGrid plans; a budget becomes real if enquiry volume passes 1,000 leads in a month or the SendGrid plan quota reaches 80 percent.", by: boris}
    21	  test_oracle:        {state: PRESCRIBED, ref: "#test-oracle", by: eng-test}
    22	disagreements:
    23	  - "boris says split checkout alerts (S2b) from lead alerts (S2a) because nothing in the repo creates checkout sessions; the brief asks for the handler in this spec. Chair ruling adopted as phasing: one spec, S2b gated on Phill naming the event source (spec 4.7)."
    24	  - "eng-compliance says drop the name from the alert (cheapest fix); Phill's decision 24/10/2026 is name and package. Spec keeps the name and makes the privacy-policy edit and an erasure step a required PR item, with Phill's yes needed (spec section 10 item 3)."
    25	  - "eng-secrets says CRON_SECRET is too broad a credential for the health read; spec adds optional ALERT_HEALTH_TOKEN with CRON_SECRET as fallback (eng-secrets said not blocking)."
    26	notes:
    27	  - "Seats reviewed spec revision 1; every blocking finding was written into revision 2, whose hash is bound above. The seats have not re-read revision 2; Codex review rounds cover the revised pair."
    28	  - "migration_drift.py was not run (no database URL available to this session): exit 2, cannot determine, so eng-release sat. Reported UNPROVEN."
    29	  - "The parent spec lives untracked in the home checkout; it was copied beside this directory in this worktree. Requirements whose only authority is the parent remain PRESCRIBED, not DECIDED."
    30	---
    31	
    32	# Engineering requirements: enquiry alerts (S2)
    33	
    34	Round 1, nine seats. Findings below are the seats' requirements, adopted into spec revision 2.
    35	
    36	## Data model
    37	By eng-data. `alert_delivery_log` carries `founder_id` with `references auth.users(id) on delete cascade`; `kind`, `subject_id`, both outcome columns and `created_at` are NOT NULL; both outcome columns have CHECKs over `sent|failed|unconfigured|deduped`; `subject_id` has no foreign key on purpose; unique `(kind, subject_id)`. Plain `create table` so a collision on the shared database fails loudly. One exported outcome type is shared by writer and health read. "Append-only" is convention only. Spec 4.5 and AC-10.
    38	
    39	## Invariants
    40	By eng-compliance. For `new_lead` and `checkout_completed`, no `crm_leads` value other than the lead id and the allow-listed name, package and source, and no Stripe customer field, appears in any email, Slack body, or `console.*` output. `notify()` prints `title` and `metadata` on every call, so title is a fixed string and metadata is limited to ids and labels. Privacy-policy processor table and the "Supabase only" sentence must change if the name is kept, and an erasure step names who deletes Slack and email copies. Spec 4.2, 6 and AC-3. eng-secrets adds: no `error.message` is logged on this path because a URL parse error embeds the whole webhook URL (spec 4.3, AC-5).
    41	
    42	## Failure modes
    43	By eng-failure. The failure table must cover paths that never reach a catch: the dedup rule matching its own row, a process dying after the insert and before the log row, a failed log write, and `FOUNDER_USER_ID` unset on the Stripe path. Timeouts must really abort (`sendSlack` takes a signal, SendGrid gets a client timeout) and the dedup lookup and log write sit inside the same 6-second cap. No retries; reconciliation is the backstop. A lookup error sends the alert. Spec 4.3, 4.4, 4.6, section 7.
    44	
    45	## Interface contract
    46	By eng-contract. The `/api/leads` body stays exactly `{ id }` or `{ id, drip }` on every alert outcome and never reveals alert or dedup state (enumeration oracle). `notify()` is an overload on a discriminated union keyed by `type`; legacy callers keep `Promise<void>`, the two new kinds return `NotifyResult`; the lead variant has no email, phone, message or IP key. Checkout alerts gate on `payment_status`, handle `async_payment_failed`, and format amounts from minor units. The alert carries a source label from `business_key` through an allow-list. Health returns `attempts` (excluding deduped), `failed`, `unconfigured`, `deduped`, `unalerted`. Spec 4.1, 4.2, 4.4, 4.6, 4.7, AC-2, AC-8.
    47	
    48	## Concurrency
    49	By boris. Dedup decides against strictly earlier leads that have a `sent` outcome and the same package label, with `(captured_at, id)` as tie-break, so a double submit alerts once, a failed first alert never suppresses a resubmission, and a different package is never suppressed. The unique `(kind, subject_id)` index stops a retry double-counting. Spec 4.4, 4.5, AC-7.
    50	
    51	## Migration
    52	By eng-release. The migration is additive and applied manually by Phill; nothing in CI applies web migrations. Order is a stated step: probe production for a name collision, apply, confirm `to_regclass`, then merge. File lives in `apps/web/supabase/migrations/` only. A drift exit of 1 or 2 blocks any claim that the feature is live. `LEAD_ALERT_EMAIL_TO` and the new token are INTEGRATION tier in `apps/web/scripts/validate-env.mjs` so an unset value warns and never fails the build. Spec 4.5, section 5, section 9, AC-9, AC-10.
    53	
    54	## Rollback
    55	By boris. Code revert only (Vercel instant rollback); the table is additive and stays; removal, if ever wanted, is a forward migration and never a raw DROP, which would leave the ledger claiming it is applied. Preview and Production use different values for destination and secret variables so a preview test cannot change production. Spec section 9.
    56	
    57	## Observability
    58	By eng-observability. Failures are not the only signal; absence is. The health read adds `unalerted` (leads and checkout events with no log row after 2 minutes, plus deduped rows whose earlier lead was never sent), returns 503 when either table is unreadable, and treats `FOUNDER_USER_ID` unset as `unconfigured` with a row. A scheduled poller exists: a step in `nexus-heartbeat.yml` fails on non-200, `failed > 0` or `unalerted > 0`, escalating to a GitHub issue rather than the channels under test. `sent` means accepted, not delivered; a SendGrid event webhook is DEFERRED until a `sent` row is found without an email. Spec 4.6, AC-6, AC-13, AC-14.
    59	
    60	## Test oracle
    61	By eng-test. The existing leads test mock answers per table from a first-in-first-out queue and ignores predicates, so dedup and window tests must use mocks that hold real rows and apply the predicates they receive. Each acceptance criterion names the mutants that must go red (remove the try/catch, return 500 on a non-sent email, remove the 6-second cap, delete the `(captured_at, id)` clause, widen 60 to 1440, drop `unconfigured` from `failed`, log `error.message`, put the name in `title`). Email failure is mocked with a rejection because the real sender throws. Stripe fixtures are typed `satisfies Stripe.Event`. The privacy check spies on console output as well as payloads. A type test pins the overload. Spec section 8.

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc 'nl -ba .claude/done/spm/2026-10-24-enquiry-alerts/spec.md | head -n 110; cat apps/web/CLAUDE.md .claude/skills/nexus-conventions/SKILL.md; rg --files apps/web/src/lib/notifications; git status --short; git rev-parse HEAD' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
     1	# Spec S2: Enquiry alerts (email is the record, Slack is the ping)
     2	
     3	Parent: `.claude/done/spm/2026-10-23-nexus-landing-page/spec.md` (sections 4, 9, 11, 12, 14, 15 AC-11) and its `decomposition.md` slice S2.
     4	Status: REVISION 2 after bench round 1 (all nine seats, including the chair). The parent spec and decomposition are copied beside this directory so the references resolve. No app code written. 2026-10-24, base origin/main 2bfd888ef.
     5	Decision (Phill, 24/10/2026): alert channel is EMAIL as the durable record plus SLACK as the instant ping. The alert carries name and package only.
     6	Evidence classes: O = read in this worktree at 2bfd888ef; D = Phill's decision; PLANNED = not yet run.
     7	
     8	## 1. Task and outcome
     9	
    10	When someone submits the public enquiry form, Phill is told within seconds in Slack and has a lasting email record, and a buyer is never dropped because an alert failed or went missing. The same applies when the card payment account reports a checkout.
    11	
    12	Must not happen: an alert failure blocks or rolls back the lead insert; the alert leaks the full lead row; an alert is lost without the health read going red; an agent registers the Stripe endpoint or sets a production env var.
    13	
    14	## 2. Current behaviour (O, apps/web at 2bfd888ef)
    15	
    16	- `src/app/api/leads/route.ts`: public POST, service-role insert into `crm_leads`, timeline insert to `agent_actions`, optional drip enrolment, then `201 { id, drip? }` (`drip` only when a campaign id was sent). No alert today. Allow-listed and rate-limited in `src/proxy.ts`. `founder_id` comes from env `FOUNDER_USER_ID`; the route returns 500 if it is unset.
    17	- `src/lib/notifications/index.ts` `notify(payload): Promise<void>`: never throws, returns nothing. It prints an audit line with `title` and `JSON.stringify(metadata)` to the console on every call. It returns early (no delivery) when `FOUNDER_USER_ID` is unset or on a `user_settings` read error. Slack goes to `user_settings.slack_webhook_url` first, then env `SLACK_WEBHOOK_URL`. The email-digest branch is a stub. All 14 callers are in this repo and none uses the return value.
    18	- `src/lib/notifications/slack.ts` `sendSlack(url, message): Promise<boolean>` takes no abort signal and logs `error.message` on a thrown error.
    19	- `src/lib/integrations/sendgrid.ts` `sendEmail(input): Promise<string>` throws when `SENDGRID_API_KEY` is unset and on send failure; takes no abort signal.
    20	- Package arrives in `interests`: `/grow` sends a `GROW_PACKAGES` id or empty; `/cards/order` sends `living-card` or `living-card:<edition>`. `business_key` is `unite-smb` or `unite-cards` from the two forms.
    21	- `src/app/api/webhooks/stripe/route.ts`: verifies the signature, inserts `stripe_events` (UNIQUE event id; 23505 returns 200 idempotent), `maxDuration = 30`, no domain handler, reads no `FOUNDER_USER_ID`.
    22	- `src/lib/cron-auth.ts` provides `assertCronAuth` (CRON_SECRET bearer). `.github/workflows/nexus-heartbeat.yml` runs daily from GitHub Actions.
    23	- `apps/web/scripts/validate-env.mjs` runs in `prebuild` with `--ci` and fails the build on missing CRITICAL or REQUIRED vars; the INTEGRATION tier is advisory. `SLACK_WEBHOOK_URL` is INTEGRATION; the SendGrid vars are not listed.
    24	- Web migrations live in `apps/web/supabase/migrations` (not the nested `apps/web/supabase/supabase/migrations`). They are applied manually and founder-gated, the database is shared with other products, and nothing in CI applies them.
    25	- The privacy policy (`apps/web/src/app/privacy-policy/page.tsx`) says enquiries are held in Supabase only and lists Supabase, Vercel, Anthropic, Google and Xero as processors; Slack and SendGrid are not listed.
    26	
    27	## 3. Scope
    28	
    29	In: lead alert and checkout alert; delivery log table; health read with reconciliation; call sites; env declarations; heartbeat step; tests.
    30	Out: the public home page (S1, held); Stripe endpoint registration and secrets (Phill's); setting Vercel env vars (Phill's); buyer replies; drip changes; anything under margot paths; a SendGrid delivery-event webhook (DEFERRED until a `sent` row is found with no email).
    31	
    32	## 4. Design
    33	
    34	### 4.1 Types and entry point
    35	`notify()` becomes overloaded on a discriminated union keyed by `type`:
    36	- legacy variant (existing seven types, `title`/`body`/`severity`/`metadata`): returns `Promise<void>` exactly as today.
    37	- `{ type: 'new_lead'; leadId; firstName; lastName | null; interests | null; businessKey | null; capturedAt }`: returns `Promise<NotifyResult>`.
    38	- `{ type: 'checkout_completed'; event: Stripe.Event }` (covers the three checkout event types): returns `Promise<NotifyResult>`.
    39	
    40	`NotifyResult = { email: Outcome; slack: Outcome }` with one exported `Outcome = 'sent' | 'failed' | 'unconfigured'` and `LogOutcome = Outcome | 'deduped'`, used by both the writer and the health read. The lead variant has no email, phone, company, message or IP key, so adding one is a compile error. `notify()` never throws. There is no separate `notifyNewLead`; `/api/leads` calls `notify({type:'new_lead',...})` directly.
    41	
    42	For these two kinds every early return in `notify()` (including `FOUNDER_USER_ID` unset and the `user_settings` error path) yields `unconfigured` on both channels and still writes a log row.
    43	
    44	### 4.2 Alert content (built by a pure `buildAlertText`, never via title or metadata)
    45	Lead alert lines: name (first plus last as typed), package label, source label, lead id, UTC timestamp. Nothing else.
    46	- Package label: a `GROW_PACKAGES` id maps to its name; `living-card` or `living-card:<edition>` maps to "Living card" plus the edition when it is a known edition name; anything else "Not specified".
    47	- Source label: `unite-smb` maps to "Grow", `unite-cards` to "Cards", anything else "Other".
    48	- Name: control characters stripped, truncated to 80, HTML-escaped in email, `&`, `<`, `>` escaped for Slack.
    49	- Email subject is the fixed string "New enquiry". For these two kinds `title` is the fixed string "New enquiry" or "Checkout alert" and `metadata` is limited to `{ subject_id, package_label }` (or the event id suffix), so the console audit line carries no personal data.
    50	
    51	Checkout alert lines: status, amount formatted from minor units with `Intl.NumberFormat` currency style (not divide-by-100), `livemode`, last 8 characters of the event id, UTC timestamp. No customer name, email or address.
    52	- `checkout.session.completed` with `payment_status` of `paid` or `no_payment_required`: "Payment received". With any other status: "Checkout started, awaiting payment".
    53	- `checkout.session.async_payment_succeeded`: "Payment received".
    54	- `checkout.session.async_payment_failed`: "Payment failed".
    55	
    56	### 4.3 Channels
    57	- Email (the record): `sendEmail` to env `LEAD_ALERT_EMAIL_TO` from `SENDGRID_FROM_EMAIL`. If `LEAD_ALERT_EMAIL_TO`, `SENDGRID_API_KEY` or `SENDGRID_FROM_EMAIL` is unset the outcome is `unconfigured`, decided before calling `sendEmail` (not by parsing its error).
    58	- Slack (the ping): env `SLACK_WEBHOOK_URL` only; the per-user `user_settings` webhook is not consulted for these two kinds, so there is one known destination. The value is validated with `new URL()` first; a malformed value is `failed` with the fixed log line `[Alert] SLACK_WEBHOOK_URL malformed`.
    59	- Both are attempted in parallel and independently. `sendSlack` gains an optional `signal` parameter; SendGrid gets a client-level 5-second timeout (confirm the API exists on the installed `@sendgrid/mail` at build time, else wrap with a race and accept that the request may finish after the response). No retries at any layer; reconciliation (4.6) is the backstop.
    60	- Logging on this path prints `error.name` and an HTTP status only, never `error.message`, because a URL-parse error message contains the whole webhook URL.
    61	
    62	### 4.4 /api/leads
    63	Insert `crm_leads` returning `id, captured_at`. After a successful insert, and before the response, one block runs under a single 6-second cap containing the dedup lookup, `notify` and the log write. Every exception and the cap itself are caught, and channels that have not resolved are logged as `failed`. The route sets `export const maxDuration = 30`. The response body is exactly what it is today on every alert outcome (`{ id }` or `{ id, drip }`); no field reveals alert or dedup state (a public route must not expose whether an email was seen recently). A 400 or 500 path sends no alert.
    64	
    65	Dedup suppresses an alert only when an EARLIER lead (strictly lower `(captured_at, id)`) with the same `founder_id`, `lower(email)` and package label, created within the previous 60 minutes, has an `alert_delivery_log` row with at least one `sent` outcome. Three consequences by design: a double submit alerts exactly once (the earlier row decides); a first lead whose alerts both failed never suppresses a resubmission; a second enquiry for a different package (for example `/grow` then `/cards/order`) is not suppressed. The pure function `isDuplicateLead(priorRows, {email, packageLabel, leadId, capturedAt, now})` makes the decision from earlier lead rows joined to their log rows. If the lookup errors, send the alert (fail toward a duplicate ping, never toward silence). A `deduped` row is written only when suppression applies. Both lead rows are always stored.
    66	
    67	### 4.5 Delivery log
    68	Migration `apps/web/supabase/migrations/<ts>_alert_delivery_log.sql` (header carries PENDING SANDBOX VERIFICATION and the rollback line; plain `create table` so a name collision fails loudly; policies in `pg_policies`-guarded DO blocks):
    69	- `id uuid primary key default gen_random_uuid()`
    70	- `founder_id uuid not null references auth.users(id) on delete cascade`
    71	- `kind text not null check (kind in ('new_lead','checkout_completed'))`
    72	- `subject_id text not null` (lead id or Stripe event id; deliberately no foreign key so evidence outlives a deleted lead; say so in the header)
    73	- `email_outcome text not null check (email_outcome in ('sent','failed','unconfigured','deduped'))`, `slack_outcome` likewise
    74	- `created_at timestamptz not null default now()`; index on `(created_at desc)`; unique index on `(kind, subject_id)` so a retry cannot double-count.
    75	
    76	RLS is enabled and forced to match `crm_leads`; the founder-only select policy copies the crm_leads policy; the service role is the only writer. "Append-only" is by convention (no update or delete policy), not a database guarantee. No lead fields are stored. No retention job in this slice (DEFERRED; the table holds pseudonymous ids only).
    77	`founder_id` for both paths comes from `FOUNDER_USER_ID`; if unset the code writes a console error naming the variable and the alert still attempts with both channels reported `unconfigured`.
    78	Rollback is a code revert only; the table is additive and stays. If it is ever removed it goes through a forward migration, never a raw DROP, which would leave the migration ledger saying it is applied. The file lives in `apps/web/supabase/migrations/` and nowhere else (not `manual-applies/`, not the nested legacy tree). Phill applies it to production.
    79	
    80	### 4.6 Health read and reconciliation
    81	`GET /api/health/alerts`, bearer auth. The token accepted is `ALERT_HEALTH_TOKEN` if set, else `CRON_SECRET` with `assertCronAuth` semantics (unset or blank never authenticates). The heartbeat workflow uses `ALERT_HEALTH_TOKEN` as a GitHub secret. Response over a 24-hour window:
    82	`{ window_hours, attempts, failed, unconfigured, deduped, unalerted, last_failure_at }`
    83	- `attempts` excludes `deduped` rows. `failed` counts rows where either outcome is `failed` or `unconfigured`. `unconfigured` counts rows where either outcome is `unconfigured`.
    84	- `unalerted` = `crm_leads` rows plus `stripe_events` rows of the three checkout types, created more than 2 minutes ago in the window, with no `alert_delivery_log` row for their id; plus `deduped` rows whose earlier matching lead has no `sent` outcome on either channel. This catches a dead call site, a crash after insert, a failed log write and the self-match bug.
    85	- Healthy means `failed = 0 and unalerted = 0`. If either table cannot be read the route returns 503, never zeros.
    86	
    87	The heartbeat workflow `.github/workflows/nexus-heartbeat.yml` gains a step that calls the route and fails on non-200, unparseable JSON, `failed > 0` or `unalerted > 0`. Its escalation is a GitHub issue, not Slack or SendGrid, since those are the channels under test. Detection delay is up to 24 hours.
    88	`sent` means the provider accepted the message (Slack 200, SendGrid 202), not that it was delivered.
    89	
    90	### 4.7 Checkout handler (phase S2b, gated)
    91	Phasing (chair ruling): lead alerts (4.1 to 4.6, AC-1 to AC-11, AC-13, AC-14) ship first as S2a. This checkout handler is S2b: it is specified here because the brief asks for it, but it is built and shipped only after Phill names the event source, because the repo creates no checkout sessions today (`/cards/order` takes no payment; buyers use Stripe pay links). The read-only proof of demand is `stripe events list --type checkout.session.completed --limit 5` on the card payment account, run by Phill.
    92	In the Stripe route, after the `stripe_events` insert succeeds (not on the 23505 path), for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`, call `notify({type:'checkout_completed', event})` under the same cap and log rules. Alert failure never changes the 200. A crash between insert and alert is caught by `unalerted`, not by retry. Only the handler ships; Phill registers the endpoint on the card payment account with those three event types.
    93	
    94	## 5. Environment variables (names only; Phill sets them in Vercel)
    95	
    96	| Name | Status | Purpose |
    97	|---|---|---|
    98	| `SLACK_WEBHOOK_URL` | exists (INTEGRATION tier) | Slack ping |
    99	| `SLACK_DEFAULT_CHANNEL` | exists; NOT used by these alerts (an incoming webhook fixes its channel when created, so the channel is whatever Phill picks when creating the webhook) | none |
   100	| `SENDGRID_API_KEY` | exists | email send |
   101	| `SENDGRID_FROM_EMAIL` | exists | from address |
   102	| `LEAD_ALERT_EMAIL_TO` | NEW, INTEGRATION tier (a warning, never a build failure) | email destination |
   103	| `ALERT_HEALTH_TOKEN` | NEW, optional | read-only bearer for the health read and the heartbeat |
   104	| `CRON_SECRET` | exists | fallback bearer |
   105	| `FOUNDER_USER_ID` | exists | log owner |
   106	| `STRIPE_WEBHOOK_SECRET` | exists in code; value comes with endpoint registration (Phill's) | checkout alert |
   107	
   108	Preview and Production use different values for every variable that points at a destination or secret (`SLACK_WEBHOOK_URL`, `LEAD_ALERT_EMAIL_TO`, `ALERT_HEALTH_TOKEN`, `STRIPE_WEBHOOK_SECRET`), so a preview test never pings the real channel and editing a preview value never changes production. Phill confirms with `vercel env ls` that each has separate Production and Preview rows. `LEAD_ALERT_EMAIL_TO`, `ALERT_HEALTH_TOKEN` and the SendGrid vars are added to `apps/web/scripts/validate-env.mjs` in the INTEGRATION tier. No value appears in source, tests, fixtures or logs; tests use `.invalid` placeholder URLs.
   109	
   110	## 6. Security and privacy
# Unite-Group

@.portfolio/PORTFOLIO.yaml

## Identity (Portfolio SSOT)
**Canonical name:** Unite-Group
**Current aliases:** "Unite Group", "Unite-Group CRM", "the CRM", "Marketing CRM", "Nexus"
**Canonical repo/path:** `CleanExpo/Unite-Group` → `apps/web`

> If the user uses a current alias, this is what they mean.
> Retired product names are not aliases and must not be reintroduced into active context.
> Do NOT create new repos or clones. Do NOT create folders matching
> `local.do_not_clone_to[]` in `.portfolio/PORTFOLIO.yaml`.

> **Sibling product:** Authority-Site (at `D:\Authority-Site`, repo `CleanExpo/Unite-Group`) is a SEPARATE product.
> Despite the repo name `Unite-Group`, that's the EMPIRE COMMAND CENTER, not this CRM.
> If the user asks about Empire / CEO dashboard / Pi-CEO / portfolio metrics → switch to that project.
> Otherwise (CRM / contacts / drip campaigns / email AI / marketing) → stay here.

---

## NorthStar Doctrine

**The NorthStar:** a real, comprehensive, working founder CRM **in production** where **every section is GREEN** —
real data + auth + founder-scope + loading/error + verify-pass. **200 ≠ real**: a rendered page or green CI
tick is not evidence; real founder-scoped data behind auth is.

**No-Invaders rule** — reject all seven on sight:
1. No fake-as-real (mock/hardcoded data shown as live) — surface `source`, prefer honest "not_connected".
2. No scope-creep — build only what's asked.
3. No new dependencies — use what's in the repo.
4. No duplicate systems — search before creating.
5. No new repos/clones — one canonical repo per product.
6. No shortcut hacks — no `|| true`, `--no-verify`, swallowed errors, bypassed gates.
7. No speculative crons/skills — don't scaffold for unconnected sources/providers.

**Consult [`.skills/custom/northstar-navigator`](.skills/custom/northstar-navigator/SKILL.md) before deciding
what to build, skip, or finish.** It holds the full Definition of GREEN, the Navigation Loop, and the substrate map.

---


## Identity
Private founder CRM for Phill McGurk. NOT a public SaaS. One user.
Stack: Next.js 16 App Router (src/ root), React 19, Supabase, Vercel, Tailwind CSS, pnpm monorepo. No FastAPI, no Python backend.
Design: app-global editorial theme (globals.css light/dark, `rounded-sm` only) plus the command deck's own ratified registers — Gun Metal canvas `#0e1014` with green `#2dbb57` signals (UNI-2339; `command-deck.module.css` + `shell.module.css`) and the opt-in Daylight paper/indigo register behind the Feel toggle (PR #830). The former Scientific Luxury palette is retired on the deck; echoes of it in older docs are stale — the CSS modules are the token source of truth.
Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT

## Agent Routing Rules
ALWAYS delegate to subagents. Never do the work yourself.

### Parallel dispatch (ALL conditions met):
- 3+ unrelated tasks across different domains
- No shared state between tasks
- Clear file boundaries with no overlap

### Sequential dispatch (ANY condition triggers):
- Tasks have dependencies (B needs output from A)
- Shared files or state (merge conflict risk)
- Unclear scope (need to understand before proceeding)

## Subagent Invocation Protocol
Every dispatch MUST include:
1. Exact scope (which files, which routes)
2. Success criteria (what done looks like)
3. Relevant file references
4. Constraints (what NOT to touch)

## Available Agents — Nexus Rebuild Team
- `project-manager`    — planning, specs, Linear issues, roadmap
- `senior-fullstack`   — Next.js/React/Supabase implementation
- `database-architect` — schema, migrations, RLS, type generation
- `frontend-designer`  — UI components, Notion sidebar, layouts
- `api-integrations`   — Xero, Gmail, Calendar, Stripe, Linear, social
- `code-auditor`       — forensic audit, dead code, security scan (READ ONLY)
- `devops-engineer`    — Vercel, CI/CD, env config, monitoring
- `qa-tester`          — E2E tests, smoke tests, verification gate

## Existing Specialist Agents (pre-rebuild)
See `.claude/agents/` for: frontend-specialist, database-specialist,
security-auditor, test-engineer, verification, spec-builder,
deploy-guardian, orchestrator, and 23 others (31 total).

## Critical Rules
- DB queries: always `.eq('founder_id', founderId)` — NEVER workspace_id
- Auth: Supabase PKCE server-side only. Single-tenant.
- Source of truth: `.claude/memory/CONSTITUTION.md`

## Environment Variables (Vercel)
NEVER delete or modify these without understanding the impact:
- `ANTHROPIC_API_KEY` — Claude API. Powers Bron, Advisory, Strategy, Experiments. CRITICAL.
- `VAULT_ENCRYPTION_KEY` — AES-256-GCM encryption for credentials vault. CRITICAL.
- `SUPABASE_SERVICE_ROLE_KEY` — Bypasses RLS for server-side operations. CRITICAL.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL. PUBLIC.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key. PUBLIC.
- `CRON_SECRET` — Validates scheduled jobs (bookkeeper). CRITICAL.
- `FOUNDER_USER_ID` — Founder's Supabase auth UUID. Used by CRON jobs.

Integration keys (optional — features degrade gracefully):
- `XERO_CLIENT_ID/SECRET` — Xero accounting OAuth
- `GOOGLE_CLIENT_ID/SECRET` — Gmail + Calendar OAuth
- `LINEAR_API_KEY` — Linear issue tracking sync
- `FACEBOOK_APP_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET` — Social OAuth

## Vault Index

Wiki-link syntax for O(1) asset discovery. Canonical index: `.claude/VAULT-INDEX.md`

**Resolution rules**:
- `[[orchestrator]]` → `.claude/agents/orchestrator/agent.md`
- `[[type/id]]` → `.claude/{type}/{id}` (e.g., `[[rules/core]]` → `.claude/rules/core.md`)
- `[[id#section]]` → Asset file, specific heading (e.g., `[[orchestrator#routing]]`)
- Fuzzy threshold: 0.8 (handles plurals, case variation)

**When to use**: Before searching the codebase, check the Vault Index for known assets.

## Human Goal Translation

Map common outcome phrases to concrete checklists:

| Phrase | Translates To |
|--------|--------------|
| "Make it work" | Production-equivalent build passes + type-check + tests + no runtime errors + applicable integration checks + Playwright/visual verification + intended outcome evidence |
| "Ship it" | Route through the governed SPM release path; require release-ready evidence, applicable approval, deployment receipt, and post-release verification before COMPLETE |
| "Clean this up" | Lint + format + remove dead code + simplify + remove duplicate/obsolete capability where safe |
| "Is this safe?" | Security audit + RLS check + env var audit + OWASP scan + rollback/reversibility assessment where applicable |
| "Make it fast" | Lighthouse audit + bundle analysis + query optimisation + before/after performance evidence |
| "Make it pretty" | Current ratified design tokens + responsive check + Playwright/visual review across key breakpoints |

## Blueprint-First Protocol

For structured task execution, use the Blueprint DAG system:

- **Blueprints**: `.claude/blueprints/` — DAGs for feature, bugfix, migration, refactor
- **Minion command**: `/minion` — One-shot execution with hard iteration caps
- **Harness protocol**: `.claude/AGENT_HARNESS.md` — Multi-agent convergence for complex tasks (3+ agents)
- **Routing**: Orchestrator decides — simple tasks → Minion, complex tasks → Harness
---
name: nexus-conventions
description: The engineering constitution for the Unite-Group Nexus monorepo (CleanExpo/Unite-Group). Use whenever writing, reviewing, planning, or committing ANY code in this repo — features, fixes, migrations, crons, CRM Mission Control or autonomy work, integrations, Synthex event handling — even if the user never mentions conventions. Also use when drafting commit messages or PR descriptions, or when deciding how to gate, flag, or arm a new capability.
---

# Nexus conventions

The Nexus is the system-of-action for a multi-business empire run by one founder.
Every unsafe default becomes a silent production incident that nobody is paged
about, so the repo survives on a small set of idioms. Follow them even when a
shortcut would "work" — the idioms exist because the shortcuts already failed.

## The NorthStar rule: honest sources

Never fabricate data. Readers report their source honestly — `'not_connected'`,
`'error'` — rather than inventing rows or plausible values. When a signal is
missing or wrong-typed, degrade to `'signal_unavailable'`; never guess. UI
components show honest empty and not-connected states instead of placeholders
that look like data. If you cannot verify something, say so in the output
rather than smoothing over it.

## Write-then-confirm

Every authoritative write reads back to confirm it landed. A write failure over
a completed mutation surfaces a 500 — never a green 200 on top of a stale row.
Throw on any persistence failure so no false `'executed'` is ever journaled.
Dedup on a stable id (e.g. the approval id) so retries stay safe.

## Dormant by default, gated arming

New capabilities ship inert. The standard to meet in every PR: "merging this
arms nothing." The pattern has three layers:

1. **Admission gate** — a kill switch (e.g. `CRM_AUTO_EXECUTE`) that is unset
   in prod by default; unset means nothing is admitted.
2. **Arming flag** — a separate dispatch flag (e.g. `CRM_DISPATCH_ARMED`,
   default off) flipped only at go-live.
3. **Founder/Board gate** — the go-live flip itself is a human decision,
   documented as an arming checklist, never a side effect of a merge.

Where possible, be doubly inert (flag off AND null executors) so prod
behaviour is provably unchanged. Behaviour-neutral until armed.

## The autonomy ladder

- **L1** — low-risk subjects. May auto-execute only when admitted AND armed.
  Admission signals (confidence, existing entity links) are threaded only on
  the `may_execute` path; every non-executable decision stays unsafe
  regardless of signals.
- **L2 / L3** — always `needs_review`. Executors resolve to null. Do not
  build L2/L3 execution paths without an explicit founder decision.

## Two queues, one rule: reuse, never invent a third

There are exactly two job surfaces. Both are live. Pick by who executes the
work, then reuse that surface's idiom — do not build a parallel harness.

| Surface | Owns | Executor |
|---|---|---|
| `cc_tasks` + `cc_task_events` | Command Centre work the founder approves from the deck | Nexus Runner (UNI-2383), which claims approved rows via `POST /api/agents/runner/claim` |
| `operator_jobs` + `operator_events` | Model Operator Gateway work — CRM mission-control execution, wiki/lane jobs | The operator-gateway routes, synchronously |

`operator_jobs` is NOT superseded. The autopilot README's "superseded queue
surface" line is scoped to OWNEST's consumption of it — OWNEST's host worker is
permanently retired (UNI-2143) and its old LaunchAgent must stay unloaded — not
to the gateway itself, which 18 files under `apps/web/src` still use.

Status transitions on `operator_jobs` follow the gateway idiom:
`blocked → running → done | failed`, one `status_changed` event per hop.
Outcome statuses (`running`, `done`, `failed`) must stay OUTSIDE the autopilot
poller's claim set (`planned`, `queued`) so the Mac-side runner can never
double-claim work that another path is executing synchronously.

Retired names that must not come back as executors: the Linear autonomous claim
lane (`/api/cron/linear-claim` and `/api/cron/linear-handoff` are authenticated
410 tombstones returning `next_action: "use_cc_tasks_queue"`) and the OWNEST
host worker.

## Migrations are founder-gated

Prod schema changes ship as a separate migration, flagged `FOUNDER-GATED` in
the commit, applied via the standard migration path after review — never
inline with feature code. Before writing code that assumes schema, run the
`supabase-schema-gate` skill (read-only verification against prod comes
first, always).

## Commit and PR format

Subject: conventional commit + Linear ref.
Body: explain the safety invariant, not just the change — a reviewer should
understand what CANNOT happen after this merge. End with the gate line and
co-author trailer for AI-assisted work.

**Example:**

```
feat(crm): real lead_conversion executor, wired behind the arming gates (UNI-2234 go-live)

Step 1 of the go-live: the concrete L1 lead_conversion mutation. STILL
DORMANT — runs only when admitted AND CRM_DISPATCH_ARMED=1 (default off)
AND CRM_AUTO_EXECUTE=1. Merging this arms nothing.

- executeLeadConversion(): founder-scoped write-then-confirm — guards the
  lead is convertible, creates the client contact, marks the lead
  converted, then reads back to confirm. Throws on any failure so no
  false 'executed' is journaled.

Semantics FLAGGED for founder confirmation before arming.

Gate: tsc PASS · eslint clean · vitest 501 files / 3077 passed (+10).

Co-Authored-By: Claude <noreply@anthropic.com>
```

## External facts are verified live

Model IDs, package and SDK versions, API parameters, provider limits and
pricing all change underneath the repo. Verify them against live sources
(Exa MCP, web search, official docs) before pinning; route every pin through
an env var or a single constants module so it updates in one place; and when
a pinned external fact changes, add a verification line to the PR body:
`Verified live <date>: <fact> — <source>`. Full procedure: the live-verify
skill.

## When in doubt

Prefer inert, honest, and reversible. If a semantic question arises (what
counts as "converted", which column is authoritative), do not guess — flag it
in the PR as `FLAGGED for founder confirmation` and build the safe default.
Run the full gate (tsc, eslint, vitest) before declaring any work done, and
report real counts, never "tests pass" without running them.
apps/web/src/lib/notifications/slack.ts
apps/web/src/lib/notifications/index.ts
apps/web/src/lib/notifications/__tests__/index.test.ts
?? .claude/done/spm/
2bfd888ef3717546d0e0780c2463ef371e31b97c

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse Completed
hook: PreToolUse Completed
hook: PreToolUse Completed
exec
/bin/zsh -lc 'nl -ba apps/web/src/app/api/leads/route.ts; nl -ba apps/web/src/lib/notifications/index.ts; nl -ba apps/web/src/lib/notifications/slack.ts' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
     1	// src/app/api/leads/route.ts
     2	// Public website lead capture → crm_leads (UNI-2355), with optional
     3	// capture→enroll into a drip campaign in the same call (UNI-2356).
     4	//
     5	// PUBLIC route (allow-listed in src/proxy.ts, rate-limited there before auth).
     6	// crm_leads has FORCED RLS with founder-only policies and deliberately NO anon
     7	// insert policy — inserts go through the service-role client with founder_id
     8	// set explicitly from FOUNDER_USER_ID (single-tenant doctrine). The service
     9	// role key never reaches the client bundle.
    10	
    11	import { NextRequest, NextResponse } from 'next/server'
    12	import { createServiceClient } from '@/lib/supabase/service'
    13	import {
    14	  buildCrmActivityTimelineEvent,
    15	  buildCrmTimelineAgentActionInsert,
    16	} from '@/lib/crm/activity-timeline'
    17	
    18	export const dynamic = 'force-dynamic'
    19	
    20	type LeadBody = {
    21	  first_name?: string
    22	  last_name?: string
    23	  email?: string
    24	  phone?: string
    25	  company?: string
    26	  job_title?: string
    27	  message?: string
    28	  interests?: string
    29	  referral_source?: string
    30	  marketing_consent?: boolean
    31	  /** Optional business slug the lead came from (dr, nrpg, carsi, restore, …). */
    32	  business_key?: string
    33	  /** Optional drip campaign to enroll the lead into (capture → enroll in one call). */
    34	  drip_campaign_id?: string
    35	}
    36	
    37	type ContactRow = {
    38	  id: string
    39	  email: string | null
    40	  first_name: string | null
    41	  last_name: string | null
    42	}
    43	
    44	const MAX_SHORT_FIELD = 256
    45	const MAX_LONG_FIELD = 4000
    46	
    47	function clean(value: unknown, max: number): string | null {
    48	  if (typeof value !== 'string') return null
    49	  const trimmed = value.trim()
    50	  if (!trimmed) return null
    51	  return trimmed.slice(0, max)
    52	}
    53	
    54	type ServiceClient = ReturnType<typeof createServiceClient>
    55	
    56	/**
    57	 * Find-or-create the founder's contact for this email, then enroll it in the
    58	 * campaign. Never throws — lead capture must succeed even if enrollment fails.
    59	 */
    60	async function enrollLeadInDrip(
    61	  supabase: ServiceClient,
    62	  founderId: string,
    63	  campaignId: string,
    64	  lead: { email: string; firstName: string; lastName: string | null }
    65	): Promise<{ enrolled: boolean; contactId?: string; reason?: string }> {
    66	  const { data: campaign, error: campaignError } = await supabase
    67	    .from('drip_campaigns')
    68	    .select('id')
    69	    .eq('id', campaignId)
    70	    .eq('founder_id', founderId)
    71	    .single()
    72	
    73	  if (campaignError || !campaign) return { enrolled: false, reason: 'campaign_not_found' }
    74	
    75	  const { data: steps, error: stepsError } = await supabase
    76	    .from('drip_steps')
    77	    .select('id, step_order')
    78	    .eq('campaign_id', campaignId)
    79	    .eq('founder_id', founderId)
    80	    .order('step_order', { ascending: true })
    81	
    82	  if (stepsError || !steps || steps.length === 0) {
    83	    return { enrolled: false, reason: 'campaign_has_no_steps' }
    84	  }
    85	
    86	  const { data: existingContact, error: contactLookupError } = await supabase
    87	    .from('contacts')
    88	    .select('id, email, first_name, last_name')
    89	    .eq('founder_id', founderId)
    90	    .eq('email', lead.email)
    91	    .maybeSingle()
    92	
    93	  if (contactLookupError) return { enrolled: false, reason: 'contact_lookup_failed' }
    94	
    95	  let contact = existingContact as ContactRow | null
    96	  if (!contact) {
    97	    const { data: created, error: createError } = await supabase
    98	      .from('contacts')
    99	      .insert({
   100	        founder_id: founderId,
   101	        first_name: lead.firstName,
   102	        last_name: lead.lastName,
   103	        email: lead.email,
   104	        status: 'lead',
   105	        tags: [],
   106	        metadata: { source: 'website_form' },
   107	      })
   108	      .select('id, email, first_name, last_name')
   109	      .single()
   110	
   111	    if (createError || !created) return { enrolled: false, reason: 'contact_create_failed' }
   112	    contact = created as ContactRow
   113	  }
   114	
   115	  const { data: existingEnrollment, error: enrollmentLookupError } = await supabase
   116	    .from('drip_enrollments')
   117	    .select('id')
   118	    .eq('campaign_id', campaignId)
   119	    .eq('contact_id', contact.id)
   120	    .eq('founder_id', founderId)
   121	    .maybeSingle()
   122	
   123	  if (enrollmentLookupError) {
   124	    return { enrolled: false, contactId: contact.id, reason: 'enrollment_lookup_failed' }
   125	  }
   126	  if (existingEnrollment) {
   127	    return { enrolled: false, contactId: contact.id, reason: 'already_enrolled' }
   128	  }
   129	
   130	  const now = new Date().toISOString()
   131	  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || null
   132	  const { error: enrollError } = await supabase.from('drip_enrollments').insert({
   133	    founder_id: founderId,
   134	    campaign_id: campaignId,
   135	    contact_id: contact.id,
   136	    email: lead.email,
   137	    name,
   138	    status: 'active',
   139	    current_step_order: 1,
   140	    next_run_at: now,
   141	    enrolled_at: now,
   142	  })
   143	
   144	  if (enrollError) {
   145	    console.error('[leads] drip enroll failed:', enrollError.message)
   146	    return { enrolled: false, contactId: contact.id, reason: 'enroll_failed' }
   147	  }
   148	
   149	  return { enrolled: true, contactId: contact.id }
   150	}
   151	
   152	export async function POST(request: NextRequest) {
   153	  const founderId = process.env.FOUNDER_USER_ID?.trim()
   154	  if (!founderId) {
   155	    console.error('[leads] FOUNDER_USER_ID not configured')
   156	    return NextResponse.json({ error: 'Lead capture unavailable' }, { status: 500 })
   157	  }
   158	
   159	  let body: LeadBody
   160	  try {
   161	    body = (await request.json()) as LeadBody
   162	  } catch {
   163	    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
   164	  }
   165	
   166	  const firstName = clean(body.first_name, MAX_SHORT_FIELD)
   167	  if (!firstName) {
   168	    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
   169	  }
   170	
   171	  const email = clean(body.email, MAX_SHORT_FIELD)?.toLowerCase() ?? null
   172	  if (!email || !/\S+@\S+\.\S+/.test(email)) {
   173	    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
   174	  }
   175	
   176	  const lastName = clean(body.last_name, MAX_SHORT_FIELD)
   177	  const businessKey = clean(body.business_key, MAX_SHORT_FIELD)
   178	  const ipAddress =
   179	    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
   180	    request.headers.get('x-real-ip') ||
   181	    null
   182	  const userAgent = request.headers.get('user-agent')?.slice(0, MAX_SHORT_FIELD) ?? null
   183	
   184	  const supabase = createServiceClient()
   185	
   186	  const { data: leadRow, error: insertError } = await supabase
   187	    .from('crm_leads')
   188	    .insert({
   189	      founder_id: founderId,
   190	      first_name: firstName,
   191	      last_name: lastName,
   192	      email,
   193	      phone: clean(body.phone, MAX_SHORT_FIELD),
   194	      company: clean(body.company, MAX_SHORT_FIELD),
   195	      job_title: clean(body.job_title, MAX_SHORT_FIELD),
   196	      message: clean(body.message, MAX_LONG_FIELD),
   197	      interests: clean(body.interests, MAX_LONG_FIELD),
   198	      referral_source: clean(body.referral_source, MAX_SHORT_FIELD),
   199	      marketing_consent: body.marketing_consent === true,
   200	      source: 'website_form',
   201	      ip_address: ipAddress,
   202	      user_agent: userAgent,
   203	      additional_data: businessKey ? { business_key: businessKey } : {},
   204	    })
   205	    .select('id')
   206	    .single()
   207	
   208	  if (insertError || !leadRow) {
   209	    console.error('[leads] insert failed:', insertError?.message)
   210	    return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 })
   211	  }
   212	
   213	  const subjectLabel = [firstName, lastName].filter(Boolean).join(' ').trim() || clean(body.company, MAX_SHORT_FIELD) || email
   214	  const timelineEvent = buildCrmActivityTimelineEvent({
   215	    type: 'lead_captured',
   216	    actor: 'website_form',
   217	    subjectId: leadRow.id,
   218	    subjectLabel,
   219	    occurredAt: new Date().toISOString(),
   220	    source: 'api/leads',
   221	    businessSlug: businessKey,
   222	    metadata: {
   223	      marketingConsent: body.marketing_consent === true,
   224	      email,
   225	      phone: clean(body.phone, MAX_SHORT_FIELD),
   226	      ipAddress,
   227	    },
   228	  })
   229	  const timelineInsert = buildCrmTimelineAgentActionInsert(timelineEvent)
   230	  try {
   231	    const { error: timelineError } = await supabase.from('agent_actions').insert(timelineInsert)
   232	    if (timelineError) console.error('[leads] timeline insert failed:', timelineError.message)
   233	  } catch (err) {
   234	    const message = err instanceof Error ? err.message : String(err)
   235	    console.error('[leads] timeline insert failed:', message)
   236	  }
   237	
   238	  const dripCampaignId = clean(body.drip_campaign_id, MAX_SHORT_FIELD)
   239	  let drip: Awaited<ReturnType<typeof enrollLeadInDrip>> | undefined
   240	  if (dripCampaignId) {
   241	    // Spam Act 2003: no commercial email without consent (UNI-2918). The lead
   242	    // is still captured; only the drip enrolment needs the explicit opt-in.
   243	    drip =
   244	      body.marketing_consent === true
   245	        ? await enrollLeadInDrip(supabase, founderId, dripCampaignId, {
   246	            email,
   247	            firstName,
   248	            lastName,
   249	          })
   250	        : { enrolled: false, reason: 'no_marketing_consent' }
   251	  }
   252	
   253	  return NextResponse.json({ id: leadRow.id, ...(drip ? { drip } : {}) }, { status: 201 })
   254	}
     1	// src/lib/notifications/index.ts
     2	// Centralised notification router
     3	// All notification delivery is fire-and-forget — never throws, never blocks callers.
     4	
     5	import { sendSlack, formatSlackNotification } from './slack'
     6	import { getFounderUserId } from '@/lib/auth/founder-user-id'
     7	import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service'
     8	import type { Json } from '@/types/database'
     9	
    10	/**
    11	 * Persist a notification into the founder_notifications inbox.
    12	 * Uses the service client so it can be called from cron/agent contexts
    13	 * where the founder is not the active session user.
    14	 * Never throws — fire-and-forget.
    15	 */
    16	export async function saveNotification(
    17	  founderId: string,
    18	  type: string,
    19	  payload: Record<string, unknown> = {}
    20	): Promise<void> {
    21	  try {
    22	    if (!hasSupabaseServiceConfig()) {
    23	      console.warn('[saveNotification] Supabase service config not set — skipping DB insert')
    24	      return
    25	    }
    26	    const supabase = createServiceClient()
    27	    const { error } = await supabase
    28	      .from('founder_notifications')
    29	      .insert({ founder_id: founderId, type, payload: payload as Json })
    30	    if (error) {
    31	      console.error('[saveNotification] Insert failed:', error.message)
    32	    }
    33	  } catch (err) {
    34	    console.error('[saveNotification] Unhandled error:', err instanceof Error ? err.message : err)
    35	  }
    36	}
    37	
    38	export type NotificationType =
    39	  | 'cron_complete'
    40	  | 'advisory_update'
    41	  | 'approval_alert'
    42	  | 'bookkeeper_summary'
    43	  | 'experiment_update'
    44	  | 'whatsapp_idea_received'
    45	  | 'email_triage_result'
    46	
    47	export interface NotificationPayload {
    48	  type: NotificationType
    49	  title: string
    50	  body: string
    51	  businessKey?: string
    52	  severity: 'info' | 'warning' | 'critical'
    53	  metadata?: Record<string, unknown>
    54	}
    55	
    56	/**
    57	 * Route a notification to all enabled channels for the founder.
    58	 * Never throws — wraps everything in try/catch so callers can fire-and-forget.
    59	 */
    60	export async function notify(payload: NotificationPayload): Promise<void> {
    61	  try {
    62	    const { type, title, body, businessKey, severity, metadata } = payload
    63	    const founderId = getFounderUserId()
    64	
    65	    // Audit log — always fires regardless of channel preferences
    66	    console.log(
    67	      `[Notify] type=${type} severity=${severity} title="${title}"` +
    68	        (businessKey ? ` business=${businessKey}` : '') +
    69	        (metadata ? ` metadata=${JSON.stringify(metadata)}` : '')
    70	    )
    71	
    72	    if (!founderId) {
    73	      console.warn('[Notify] FOUNDER_USER_ID not set — skipping channel delivery')
    74	      return
    75	    }
    76	
    77	    if (!hasSupabaseServiceConfig()) {
    78	      console.warn('[Notify] Supabase service config not set — skipping DB-backed channel delivery')
    79	      await attemptEnvSlack(payload)
    80	      return
    81	    }
    82	
    83	    // Fetch founder's notification preferences
    84	    const supabase = createServiceClient()
    85	    const { data: settings, error } = await supabase
    86	      .from('user_settings')
    87	      .select(
    88	        'notification_slack, notification_digest, slack_webhook_url, slack_channel'
    89	      )
    90	      .eq('user_id', founderId)
    91	      .single()
    92	
    93	    if (error) {
    94	      console.warn('[Notify] Could not fetch user_settings:', error.message)
    95	      // Fall back to env-based Slack if available
    96	      await attemptEnvSlack(payload)
    97	      return
    98	    }
    99	
   100	    // ── Slack channel ───────────────────────────────────────────
   101	    if (settings?.notification_slack && settings?.slack_webhook_url) {
   102	      const message = formatSlackNotification({ title, body, severity, businessKey })
   103	      if (settings.slack_channel) {
   104	        message.channel = settings.slack_channel
   105	      }
   106	      const sent = await sendSlack(settings.slack_webhook_url, message)
   107	      if (!sent) {
   108	        console.warn('[Notify] Slack delivery failed — message was logged above')
   109	      }
   110	    } else {
   111	      // Try env-based Slack as fallback
   112	      await attemptEnvSlack(payload)
   113	    }
   114	
   115	    // ── Email digest channel (stub) ─────────────────────────────
   116	    if (settings?.notification_digest) {
   117	      // Future: queue for daily digest email
   118	      console.log(`[Notify] Digest queued: ${title}`)
   119	    }
   120	  } catch (error) {
   121	    // Absolute last resort — never let notification errors propagate
   122	    console.error(
   123	      '[Notify] Unhandled error:',
   124	      error instanceof Error ? error.message : 'Unknown error'
   125	    )
   126	  }
   127	}
   128	
   129	/**
   130	 * Attempt Slack delivery using environment variables when DB settings
   131	 * are unavailable or Slack is not configured in user_settings.
   132	 */
   133	async function attemptEnvSlack(payload: NotificationPayload): Promise<void> {
   134	  const envWebhook = process.env.SLACK_WEBHOOK_URL
   135	  if (!envWebhook) return
   136	
   137	  const message = formatSlackNotification({
   138	    title: payload.title,
   139	    body: payload.body,
   140	    severity: payload.severity,
   141	    businessKey: payload.businessKey,
   142	  })
   143	  message.channel = process.env.SLACK_DEFAULT_CHANNEL ?? '#nexus-alerts'
   144	
   145	  await sendSlack(envWebhook, message)
   146	}
     1	// src/lib/notifications/slack.ts
     2	// Slack message sender using Incoming Webhooks
     3	// Never throws — notifications must not crash the calling service
     4	
     5	import { BUSINESSES } from '@/lib/businesses'
     6	
     7	export interface SlackMessage {
     8	  text: string
     9	  blocks?: SlackBlock[]
    10	  channel?: string
    11	}
    12	
    13	interface SlackBlock {
    14	  type: 'section' | 'header' | 'divider' | 'context'
    15	  text?: { type: 'mrkdwn' | 'plain_text'; text: string }
    16	  fields?: { type: 'mrkdwn'; text: string }[]
    17	  elements?: { type: 'mrkdwn'; text: string }[]
    18	}
    19	
    20	/**
    21	 * POST a message to a Slack Incoming Webhook URL.
    22	 * Returns true on success, false on failure. Never throws.
    23	 */
    24	export async function sendSlack(
    25	  webhookUrl: string,
    26	  message: SlackMessage
    27	): Promise<boolean> {
    28	  try {
    29	    const response = await fetch(webhookUrl, {
    30	      method: 'POST',
    31	      headers: { 'Content-Type': 'application/json' },
    32	      body: JSON.stringify(message),
    33	    })
    34	
    35	    if (!response.ok) {
    36	      console.error(
    37	        `[Slack] Webhook failed: ${response.status} ${response.statusText}`
    38	      )
    39	      return false
    40	    }
    41	
    42	    return true
    43	  } catch (error) {
    44	    console.error(
    45	      '[Slack] Send error:',
    46	      error instanceof Error ? error.message : 'Unknown error'
    47	    )
    48	    return false
    49	  }
    50	}
    51	
    52	const SEVERITY_COLOURS: Record<string, string> = {
    53	  info: '#16a34a',     // Cyan — Scientific Luxury palette
    54	  warning: '#FFB800',  // Amber
    55	  critical: '#ef4444', // Red
    56	}
    57	
    58	const SEVERITY_EMOJI: Record<string, string> = {
    59	  info: ':large_blue_circle:',
    60	  warning: ':warning:',
    61	  critical: ':rotating_light:',
    62	}
    63	
    64	/**
    65	 * Format a notification payload into a Slack Block Kit message
    66	 * with colour-coded severity and optional business context.
    67	 */
    68	export function formatSlackNotification(payload: {
    69	  title: string
    70	  body: string
    71	  severity: 'info' | 'warning' | 'critical'
    72	  businessKey?: string
    73	}): SlackMessage {
    74	  const { title, body, severity, businessKey } = payload
    75	  const colour = SEVERITY_COLOURS[severity] ?? SEVERITY_COLOURS.info
    76	  const emoji = SEVERITY_EMOJI[severity] ?? SEVERITY_EMOJI.info
    77	
    78	  const business = businessKey
    79	    ? BUSINESSES.find((b) => b.key === businessKey)
    80	    : undefined
    81	
    82	  const businessLabel = business ? ` — ${business.name}` : ''
    83	
    84	  const blocks: SlackBlock[] = [
    85	    {
    86	      type: 'header',
    87	      text: {
    88	        type: 'plain_text',
    89	        text: `${title}${businessLabel}`,
    90	      },
    91	    },
    92	    {
    93	      type: 'section',
    94	      text: {
    95	        type: 'mrkdwn',
    96	        text: body,
    97	      },
    98	    },
    99	    { type: 'divider' },
   100	    {
   101	      type: 'context',
   102	      elements: [
   103	        {
   104	          type: 'mrkdwn',
   105	          text: `${emoji} *Severity:* ${severity.toUpperCase()} | *Colour:* \`${colour}\` | *Sent:* <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
   106	        },
   107	      ],
   108	    },
   109	  ]
   110	
   111	  // Add business fields if applicable
   112	  if (business) {
   113	    blocks.splice(2, 0, {
   114	      type: 'section',
   115	      fields: [
   116	        { type: 'mrkdwn', text: `*Business:*\n${business.name}` },
   117	        { type: 'mrkdwn', text: `*Key:*\n\`${business.key}\`` },
   118	      ],
   119	    })
   120	  }
   121	
   122	  return {
   123	    text: `${title}${businessLabel}: ${body}`, // Fallback for non-Block Kit clients
   124	    blocks,
   125	  }
   126	}

exec
/bin/zsh -lc 'nl -ba apps/web/src/lib/integrations/sendgrid.ts; nl -ba apps/web/src/app/api/webhooks/stripe/route.ts; nl -ba apps/web/scripts/validate-env.mjs' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
     1	// src/lib/integrations/sendgrid.ts
     2	// SendGrid email client wrapper for campaign sending.
     3	
     4	import sgMail from '@sendgrid/mail'
     5	
     6	function ensureApiKey(): void {
     7	  const key = process.env.SENDGRID_API_KEY?.trim()
     8	  if (!key) throw new Error('[SendGrid] SENDGRID_API_KEY not configured')
     9	  sgMail.setApiKey(key)
    10	}
    11	
    12	export interface EmailRecipient {
    13	  email: string
    14	  name?: string
    15	}
    16	
    17	export interface SendEmailInput {
    18	  to: EmailRecipient | EmailRecipient[]
    19	  from: EmailRecipient
    20	  subject: string
    21	  html: string
    22	  text?: string
    23	  replyTo?: EmailRecipient
    24	  categories?: string[]
    25	  customArgs?: Record<string, string>
    26	}
    27	
    28	/**
    29	 * Send a single email via SendGrid.
    30	 * Returns the SendGrid message ID on success.
    31	 */
    32	export async function sendEmail(input: SendEmailInput): Promise<string> {
    33	  ensureApiKey()
    34	
    35	  const msg: sgMail.MailDataRequired = {
    36	    to: input.to,
    37	    from: input.from,
    38	    subject: input.subject,
    39	    html: input.html,
    40	    text: input.text,
    41	    replyTo: input.replyTo,
    42	    categories: input.categories,
    43	    customArgs: input.customArgs,
    44	  }
    45	
    46	  const [response] = await sgMail.send(msg)
    47	  const messageId = response.headers['x-message-id'] as string | undefined
    48	  return messageId ?? response.statusCode.toString()
    49	}
    50	
    51	/** Maximum recipients per SendGrid API call */
    52	const BATCH_SIZE = 1000
    53	
    54	/**
    55	 * Send a batch of emails (up to 1000 per call).
    56	 * Uses SendGrid's sendMultiple for efficiency.
    57	 */
    58	export async function sendBatchEmails(
    59	  inputs: SendEmailInput[]
    60	): Promise<{ sent: number; failed: number; errors: string[] }> {
    61	  ensureApiKey()
    62	
    63	  let sent = 0
    64	  let failed = 0
    65	  const errors: string[] = []
    66	
    67	  // Process in chunks of BATCH_SIZE
    68	  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    69	    const chunk = inputs.slice(i, i + BATCH_SIZE)
    70	
    71	    const messages: sgMail.MailDataRequired[] = chunk.map((input) => ({
    72	      to: input.to,
    73	      from: input.from,
    74	      subject: input.subject,
    75	      html: input.html,
    76	      text: input.text,
    77	      replyTo: input.replyTo,
    78	      categories: input.categories,
    79	      customArgs: input.customArgs,
    80	    }))
    81	
    82	    try {
    83	      await sgMail.send(messages)
    84	      sent += chunk.length
    85	    } catch (err: unknown) {
    86	      failed += chunk.length
    87	      const message = err instanceof Error ? err.message : String(err)
    88	      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${message}`)
    89	    }
    90	  }
    91	
    92	  return { sent, failed, errors }
    93	}
    94	
    95	/**
    96	 * Send a campaign email to a list of recipients.
    97	 * Handles batching if > 1000 recipients.
    98	 */
    99	export async function sendCampaignEmail(
   100	  recipients: EmailRecipient[],
   101	  from: EmailRecipient,
   102	  subject: string,
   103	  html: string,
   104	  text?: string,
   105	  categories?: string[]
   106	): Promise<{ sent: number; failed: number }> {
   107	  if (recipients.length === 0) {
   108	    return { sent: 0, failed: 0 }
   109	  }
   110	
   111	  // Build individual emails for each recipient (personalised to/from)
   112	  const inputs: SendEmailInput[] = recipients.map((recipient) => ({
   113	    to: recipient,
   114	    from,
   115	    subject,
   116	    html,
   117	    text,
   118	    categories,
   119	  }))
   120	
   121	  const result = await sendBatchEmails(inputs)
   122	
   123	  if (result.errors.length > 0) {
   124	    console.error('[SendGrid] Campaign send errors:', result.errors)
   125	  }
   126	
   127	  return { sent: result.sent, failed: result.failed }
   128	}
     1	// POST /api/webhooks/stripe — Stripe webhook receiver (UNI-2328).
     2	//
     3	// Verifies the Stripe signature, then idempotently persists the event to the
     4	// `stripe_events` ledger. This is the audited baseline: NO domain dispatch yet
     5	// — specific event handlers (checkout, invoice, etc.) are added when a concrete
     6	// Nexus billing flow is defined, so nothing speculative ships. Register this
     7	// endpoint in the Stripe dashboard to obtain STRIPE_WEBHOOK_SECRET.
     8	
     9	import { NextRequest, NextResponse } from 'next/server'
    10	import type Stripe from 'stripe'
    11	import { getStripe } from '@/lib/integrations/stripe/client'
    12	import { createServiceClient } from '@/lib/supabase/service'
    13	
    14	export const dynamic = 'force-dynamic'
    15	export const runtime = 'nodejs' // signature verification needs the Node crypto runtime
    16	export const maxDuration = 30
    17	
    18	export async function POST(request: NextRequest) {
    19	  const stripe = getStripe()
    20	  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    21	  if (!stripe || !webhookSecret) {
    22	    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
    23	  }
    24	
    25	  const signature = request.headers.get('stripe-signature')
    26	  if (!signature) {
    27	    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
    28	  }
    29	
    30	  const rawBody = await request.text()
    31	
    32	  let event: Stripe.Event
    33	  try {
    34	    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    35	  } catch {
    36	    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
    37	  }
    38	
    39	  // Idempotency: UNIQUE(stripe_event_id) lets Postgres adjudicate Stripe's
    40	  // at-least-once retries (23505 == duplicate == already accepted).
    41	  const admin = createServiceClient()
    42	  const { error } = await admin.from('stripe_events').insert({
    43	    stripe_event_id: event.id,
    44	    type: event.type,
    45	    api_version: event.api_version,
    46	    livemode: event.livemode,
    47	    payload: event,
    48	  })
    49	
    50	  if (error) {
    51	    if ((error as { code?: string }).code === '23505') {
    52	      return NextResponse.json({ received: true, idempotent: true }, { status: 200 })
    53	    }
    54	    console.error('[webhooks/stripe] persist failed:', error.message)
    55	    return NextResponse.json({ error: 'event_persist_failed' }, { status: 500 })
    56	  }
    57	
    58	  return NextResponse.json({ received: true }, { status: 200 })
    59	}
     1	#!/usr/bin/env node
     2	
     3	/**
     4	 * Nexus 2.0 — Environment Variable Validation
     5	 *
     6	 * Validates all required environment variables before starting/deploying.
     7	 * Groups vars by tier: CRITICAL (blocks boot), REQUIRED (blocks features), INTEGRATION (optional).
     8	 *
     9	 * Usage:
    10	 *   node scripts/validate-env.mjs           # Check local .env.local
    11	 *   node scripts/validate-env.mjs --ci      # Check process.env (CI/Vercel)
    12	 */
    13	
    14	import { config } from 'dotenv'
    15	import { existsSync } from 'fs'
    16	import { join } from 'path'
    17	
    18	const isCI = process.argv.includes('--ci')
    19	const skipValidation = process.env.SKIP_ENV_VALIDATION === '1'
    20	
    21	if (skipValidation) {
    22	  console.log('  ⚠️  SKIP_ENV_VALIDATION=1 — skipping validation\n')
    23	  process.exit(0)
    24	}
    25	
    26	// Load .env.local if not in CI mode
    27	if (!isCI) {
    28	  const envPath = join(process.cwd(), '.env.local')
    29	  if (existsSync(envPath)) {
    30	    config({ path: envPath })
    31	    console.log('  Loaded .env.local\n')
    32	  } else {
    33	    console.warn('  .env.local not found — using system environment variables\n')
    34	  }
    35	}
    36	
    37	// ─── Tier Definitions ───────────────────────────────────────────────────────
    38	
    39	const CRITICAL = [
    40	  { name: 'NEXT_PUBLIC_SUPABASE_URL', hint: 'Supabase project URL (https://xxx.supabase.co)' },
    41	  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', hint: 'Supabase anon/public key' },
    42	  { name: 'SUPABASE_SERVICE_ROLE_KEY', hint: 'Supabase service role key (server-side only)' },
    43	]
    44	
    45	const REQUIRED = [
    46	  { name: 'ANTHROPIC_API_KEY', hint: 'Anthropic API key (sk-ant-xxx)' },
    47	  { name: 'VAULT_ENCRYPTION_KEY', hint: 'AES-256 key — openssl rand -hex 32' },
    48	  { name: 'CRON_SECRET', hint: 'Secret for cron route auth' },
    49	  { name: 'FOUNDER_USER_ID', hint: 'Supabase auth.users UUID for the founder' },
    50	]
    51	
    52	const INTEGRATION = [
    53	  // Linear
    54	  { name: 'LINEAR_API_KEY', hint: 'Linear personal API key', group: 'Linear' },
    55	  // Xero — CARSI account
    56	  { name: 'XERO_CLIENT_ID', hint: 'Xero shared OAuth client ID', group: 'Xero' },
    57	  { name: 'XERO_CLIENT_SECRET', hint: 'Xero shared OAuth client secret', group: 'Xero' },
    58	  // Xero — DR account (code reads DR_CLIENT_ID / DR_CLIENT_SECRET — see xero/client.ts)
    59	  { name: 'XERO_TENANT_ID_CARSI', hint: 'Xero tenant ID for CARSI', group: 'Xero' },
    60	  { name: 'XERO_TENANT_ID_DR', hint: 'Xero tenant ID for Disaster Recovery', group: 'Xero' },
    61	  { name: 'XERO_WEBHOOK_KEY', hint: 'Xero webhook signing key', group: 'Xero' },
    62	  // Google
    63	  { name: 'GOOGLE_CLIENT_ID', hint: 'Google OAuth client ID', group: 'Google' },
    64	  { name: 'GOOGLE_CLIENT_SECRET', hint: 'Google OAuth client secret', group: 'Google' },
    65	  // Social
    66	  { name: 'FACEBOOK_APP_ID', hint: 'Facebook app ID', group: 'Social' },
    67	  { name: 'LINKEDIN_CLIENT_ID', hint: 'LinkedIn client ID', group: 'Social' },
    68	  { name: 'TIKTOK_CLIENT_KEY', hint: 'TikTok client key', group: 'Social' },
    69	  // Slack
    70	  { name: 'SLACK_WEBHOOK_URL', hint: 'Slack incoming webhook URL', group: 'Slack' },
    71	  // App
    72	  { name: 'NEXT_PUBLIC_APP_URL', hint: 'App URL for OAuth callbacks (http://localhost:3000)', group: 'App' },
    73	]
    74	
    75	// ─── Validation ─────────────────────────────────────────────────────────────
    76	
    77	function checkVars(vars, tierName) {
    78	  const missing = []
    79	  const present = []
    80	
    81	  for (const v of vars) {
    82	    const value = process.env[v.name]
    83	    if (!value || value.trim() === '') {
    84	      missing.push(v)
    85	    } else {
    86	      present.push(v)
    87	    }
    88	  }
    89	
    90	  return { tierName, missing, present, total: vars.length }
    91	}
    92	
    93	// ─── Output ─────────────────────────────────────────────────────────────────
    94	
    95	console.log('┌─ Nexus 2.0 Environment Validation ──────────────────────')
    96	console.log('│')
    97	
    98	const criticalResult = checkVars(CRITICAL, 'CRITICAL')
    99	const requiredResult = checkVars(REQUIRED, 'REQUIRED')
   100	const integrationResult = checkVars(INTEGRATION, 'INTEGRATION')
   101	
   102	let hasBlockers = false
   103	
   104	for (const result of [criticalResult, requiredResult, integrationResult]) {
   105	  const icon = result.missing.length === 0 ? '\u2705' : result.tierName === 'INTEGRATION' ? '\u26A0\uFE0F' : '\u274C'
   106	  console.log(`\u2502 ${icon} ${result.tierName}: ${result.present.length}/${result.total} set`)
   107	
   108	  if (result.missing.length > 0) {
   109	    for (const v of result.missing) {
   110	      console.log(`\u2502   \u2514 ${v.name} — ${v.hint}`)
   111	    }
   112	    if (result.tierName !== 'INTEGRATION') {
   113	      hasBlockers = true
   114	    }
   115	  }
   116	}
   117	
   118	console.log('│')
   119	
   120	// Check for stale/legacy vars that should be removed from Vercel
   121	const STALE_VARS = [
   122	  'NEXTAUTH_URL', 'NEXTAUTH_SECRET',
   123	  'STRIPE_SECRET_KEY', 'STRIPE_TEST_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
   124	  'STRIPE_SECRET_TOKEN', 'STRIPE_RESTRICTED_KEY_TEST', 'STRIPE_RESTRICTED_KEY_LIVE',
   125	  'STRIPE_PRICE_ID_STARTER',
   126	  'CONVEX_URL', 'CONVEX_DEPLOYMENT',
   127	  'ABACUS_API_KEY', 'ABACUS_CLI_KEY',
   128	  'DATADOG_API_KEY', 'DATADOG_SITE',
   129	  'DIGITALOCEAN_API_TOKEN',
   130	  'ELEVENLABS_API_KEY',
   131	  'OPENROUTER_API_KEY',
   132	  'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET',
   133	  'FIELD_ENCRYPTION_KEY',
   134	  'META_APP_ID', 'META_APP_SECRET',
   135	  'OPENAI_API_KEY',
   136	]
   137	
   138	const foundStale = STALE_VARS.filter(name => process.env[name])
   139	if (foundStale.length > 0) {
   140	  console.log(`\u2502 \u26A0\uFE0F  ${foundStale.length} STALE vars detected (old SaaS — safe to remove):`)
   141	  for (const name of foundStale) {
   142	    console.log(`\u2502   \u2514 ${name}`)
   143	  }
   144	  console.log('│')
   145	}
   146	
   147	// Check for incorrectly-named DR Xero vars (old wrong names that were never in the codebase)
   148	if (process.env.DR_XERO_CLIENT_ID && !process.env.DR_CLIENT_ID) {
   149	  console.log('\u2502 \u26A0\uFE0F  NAMING MISMATCH: DR_XERO_CLIENT_ID found but code expects DR_CLIENT_ID')
   150	  console.log('\u2502   Rename in Vercel: DR_XERO_CLIENT_ID \u2192 DR_CLIENT_ID')
   151	}
   152	if (process.env.DR_XERO_CLIENT_SECRET && !process.env.DR_CLIENT_SECRET) {
   153	  console.log('\u2502 \u26A0\uFE0F  NAMING MISMATCH: DR_XERO_CLIENT_SECRET found but code expects DR_CLIENT_SECRET')
   154	  console.log('\u2502   Rename in Vercel: DR_XERO_CLIENT_SECRET \u2192 DR_CLIENT_SECRET')
   155	}
   156	
   157	console.log('└─────────────────────────────────────────────────────────')
   158	console.log('')
   159	
   160	if (hasBlockers) {
   161	  console.error('\u274C VALIDATION FAILED — missing CRITICAL or REQUIRED env vars')
   162	  console.error('')
   163	  console.error('To fix:')
   164	  console.error('  1. Copy .env.example to .env.local')
   165	  console.error('  2. Fill in the missing values')
   166	  console.error('  3. For Vercel: vercel env add <NAME>')
   167	  console.error('')
   168	  process.exit(1)
   169	}
   170	
   171	console.log('\u2705 VALIDATION PASSED — all critical + required vars present')
   172	process.exit(0)

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
exec
/bin/zsh -lc "nl -ba .github/workflows/nexus-heartbeat.yml; rg -n 'crm_leads|stripe_events' apps/web/supabase/migrations; rg --files apps/web | rg '(vitest|tsconfig|api/leads.*test|api/webhooks/stripe.*test|cron-auth|privacy-policy/page)'" in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
     1	name: Nexus Heartbeat
     2	
     3	# The pulse (UNI-2523): proves the gates and reports the distance to the North
     4	# Star. Runs daily on a cron and is also dispatchable by hand — see the ARMED
     5	# note on the trigger below.
     6	#
     7	# AUTHORITY. This workflow OBSERVES AND REPORTS — Waterline Class 0/1. It must not
     8	# deploy, merge, or arm anything: merge is not deploy (UNI-2542) and there is one
     9	# release authority (UNI-2562).
    10	#
    11	# THE WRITE TOKEN'S BLAST RADIUS IS REDUCED, NOT ELIMINATED. Permissions are
    12	# granted per job, so `observe` — the job that runs the three repository-controlled
    13	# gate scripts — holds `contents: read` and nothing else. Only `report` holds
    14	# `issues: write`, and it sparse-checks-out a single file. Both checkouts set
    15	# `persist-credentials: false`. Neither job installs anything: the repository root
    16	# declares zero dependencies, and round eight proved an `npm ci` step here could
    17	# never have run at all, because there is no lockfile for it to read.
    18	#
    19	# State the limit exactly, because round two was right to push on it: `report`
    20	# still EXECUTES one repository-controlled file (scripts/nexus-heartbeat.mjs)
    21	# while holding that token, and sparse checkout restricts files, not API reach.
    22	# Anyone able to land arbitrary code in that file can call the issues API with it.
    23	# What the split buys is that the three gate scripts — which read the whole tree
    24	# and are the far larger surface — do not run under the token at all. That is a
    25	# real reduction and it is not the same as containment.
    26	#
    27	# HONEST DEGRADATION, AND ITS CEILING. Every gate runs with its exit code
    28	# captured, so one red gate cannot hide the others, and `report` runs with
    29	# `if: always()` so a dead observe job publishes NOT RUN rows under a DEGRADED
    30	# banner instead of leaving yesterday's PASS standing. The ceiling: if the report
    31	# job itself cannot run — checkout fails, the import throws, the API rejects the
    32	# write — NOTHING updates the issue, and the previous body stays live. No workflow
    33	# can report its own total failure from inside itself. That is why every body is
    34	# stamped with its run id and generation time and says so: a reader checks the
    35	# timestamp, and an external watchdog is the only real answer.
    36	#
    37	# All decision logic lives in scripts/nexus-heartbeat.mjs where tests can reach
    38	# it. The capture step records EXIT CODES ONLY — it does not decide PASS or FAIL.
    39	#
    40	# THREAT MODEL — three things this does NOT defend against, named so nobody
    41	# mistakes the guards above for them. Review round three raised all three as P0
    42	# and it was right to; they are stated rather than closed because they cannot be
    43	# closed from inside the repository they audit.
    44	#
    45	#   1. AN AUTHOR WHO CAN LAND ARBITRARY CODE HERE. Changing `code=$?` to `code=0`
    46	#      in the capture, or `npm run "$gate"` to `true`, or editing
    47	#      scripts/nexus-heartbeat.mjs to call the issues client directly, all produce
    48	#      a green report. No in-repo gate survives an author who can edit the gate.
    49	#      What the tests below DO enforce is that such a change must be visible in
    50	#      the diff rather than emergent from a subtle refactor.
    51	#   2. THE REPORT JOB NOT RUNNING AT ALL. If checkout fails, the import throws, or
    52	#      the issues API rejects the write, no body is published and the previous
    53	#      run's PASS stays live. Every body is stamped with its run id and generation
    54	#      time precisely so a reader can see that; only an external watchdog can
    55	#      actually detect the silence.
    56	#   3. AN ISSUE CARRYING THE OWNERSHIP MARKER THAT THIS WORKFLOW DID NOT WRITE.
    57	#      The marker is public. Someone who opens an issue with this exact title and
    58	#      the marker in its body before the first run — or after the canonical issue
    59	#      is closed — will be adopted. The lowest-numbered owned issue wins, so this
    60	#      cannot hijack an existing pin, only pre-empt a missing one.
    61	
    62	# ARMED 05/09/2026. The cron below is the separately-approved change this file's
    63	# previous note reserved. Both of its stated preconditions are met:
    64	#
    65	#   1. FOUNDER APPROVAL. Phill, 05/09/2026: "turn the heartbeat cron on".
    66	#   2. A DISPATCHED RUN OBSERVED FIRST. Run 33949077396 on `main` — the first
    67	#      execution this workflow has ever had. Until that run, `gh run list
    68	#      --workflow=nexus-heartbeat.yml` returned an empty array while the same
    69	#      query against claude-code-review.yml returned rows, so the workflow had
    70	#      genuinely never executed, not merely gone unlisted.
    71	#
    72	# 19:00 UTC = 05:00 Brisbane (AEST, UTC+10, no DST), the time this file already
    73	# specified. Daily.
    74	#
    75	# WHY THIS IS BEING ARMED, in one line: `claude-review` failed 22 consecutive
    76	# times across all 10 open pull requests for 16 days and nothing raised it,
    77	# because the repository's only health monitor had never run. A control that is
    78	# built but never armed reads as coverage while providing none (UNI-2610).
    79	#
    80	# TO DISARM: comment out the two `schedule:` lines. `workflow_dispatch` stays, so
    81	# the workflow remains runnable by hand either way.
    82	on:
    83	  schedule:
    84	    - cron: '0 19 * * *'
    85	  workflow_dispatch:
    86	
    87	permissions:
    88	  contents: read
    89	
    90	concurrency:
    91	  group: nexus-heartbeat
    92	  cancel-in-progress: false
    93	
    94	jobs:
    95	  observe:
    96	    name: Run the gates and capture every result
    97	    runs-on: ubuntu-latest
    98	    timeout-minutes: 20
    99	    permissions:
   100	      contents: read
   101	    steps:
   102	      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
   103	        with:
   104	          persist-credentials: false
   105	
   106	      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
   107	        with:
   108	          # engines require >=24.14.1 <25. The root is NOT a pnpm workspace
   109	          # (apps/web is one itself; pnpm cannot nest), so the root uses npm.
   110	          node-version: '24.14.1'
   111	
   112	      # NO INSTALL STEP, AND THIS IS THE FINDING THAT MATTERED MOST.
   113	      #
   114	      # This step used to be `npm ci`, and it could never have succeeded: the
   115	      # repository root has no `package-lock.json` and no `npm-shrinkwrap.json`,
   116	      # so `npm ci` exits 1 with EUSAGE before doing anything. The observe job
   117	      # would have died here, before running a single gate, and every dispatch
   118	      # would have reported all three gates as NOT RUN — a heartbeat that only
   119	      # ever published its own failure.
   120	      #
   121	      # Nothing was wrong with the tests. They were all green, the mutation
   122	      # harness was clean, and the workflow was broken anyway, because nothing
   123	      # here had ever been executed. That is the whole of "shipped is not
   124	      # observed" in one step.
   125	      #
   126	      # No install is needed at all: the root declares zero dependencies and
   127	      # zero devDependencies, and the three gates run on `node --test` alone.
   128	      # Adding a lockfile to satisfy a command we do not need would be fixing
   129	      # the symptom.
   130	
   131	      # The shell records EXIT CODES ONLY. It used to decide `status=PASS` itself,
   132	      # which put a verdict back inside the YAML where no test could reach it —
   133	      # the same shape as the round-one P0, one layer down. reconcileGates derives
   134	      # PASS/FAIL from the exit code now, and a test asserts the YAML never
   135	      # mentions PASS again.
   136	      - name: Run gates and capture every exit code
   137	        run: |
   138	          set +e
   139	          mkdir -p /tmp/heartbeat
   140	          results='[]'
   141	          for gate in verify:readiness verify:docs-watch verify:docs-review; do
   142	            npm run "$gate" > "/tmp/heartbeat/${gate//:/-}.log" 2>&1
   143	            code=$?
   144	            results=$(node -e '
   145	              const [existing, name, code] = process.argv.slice(1);
   146	              const list = JSON.parse(existing);
   147	              list.push({ name, exitCode: Number(code) });
   148	              console.log(JSON.stringify(list));
   149	            ' "$results" "$gate" "$code")
   150	          done
   151	          printf '%s' "$results" > /tmp/heartbeat/gate-results.json
   152	          cat /tmp/heartbeat/gate-results.json
   153	
   154	      # `|| true` IS A DECISION, NOT A SHRUG, and it is the one place in this
   155	      # workflow where an exit code is deliberately discarded.
   156	      #
   157	      # Exit 1 means the ledger does not read cleanly — either rows the parser
   158	      # could not read at all, or rows that parse and are semantically wrong (an
   159	      # unknown status, an empty required cell, a date that cannot be aged). The
   160	      # summary JSON is written to stdout either way and carries
   161	      # `integrity: MALFORMED`, which the report turns into an UNTRUSTWORTHY
   162	      # queue block with every note listed.
   163	      #
   164	      # So failing this step would DESTROY the report rather than protect it: the
   165	      # heartbeat exists to say "the queue could not be read", and a dead step
   166	      # says nothing at all. A gate reading this exit code must still treat it as
   167	      # blocking — that is `founder-queue.mjs`'s contract with its callers, and
   168	      # this workflow is a reporter, not a gate.
   169	      - name: Compute founder-queue age
   170	        run: node scripts/founder-queue.mjs > /tmp/heartbeat/queue.json || true
   171	
   172	      - name: Upload the evidence
   173	        if: always()
   174	        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
   175	        with:
   176	          name: heartbeat-evidence
   177	          path: /tmp/heartbeat
   178	          if-no-files-found: warn
   179	          retention-days: 7
   180	
   181	  report:
   182	    name: Create or update the pinned heartbeat issue
   183	    needs: [observe]
   184	    # ALWAYS. A skipped report is the failure mode this workflow exists to prevent:
   185	    # it leaves the previous run's PASS body live as the newest thing anyone reads.
   186	    if: always()
   187	    runs-on: ubuntu-latest
   188	    timeout-minutes: 10
   189	    permissions:
   190	      contents: read
   191	      issues: write
   192	    steps:
   193	      # Exactly one file, no history, no credentials, no install. Nothing in this
   194	      # job executes repository code other than scripts/nexus-heartbeat.mjs.
   195	      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
   196	        with:
   197	          persist-credentials: false
   198	          sparse-checkout: scripts/nexus-heartbeat.mjs
   199	          sparse-checkout-cone-mode: false
   200	
   201	      - name: Download the evidence
   202	        if: always()
   203	        continue-on-error: true
   204	        uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
   205	        with:
   206	          name: heartbeat-evidence
   207	          path: /tmp/heartbeat
   208	
   209	      - name: Create or update the pinned heartbeat issue
   210	        if: always()
   211	        uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
   212	        with:
   213	          script: |
   214	            const {
   215	              DECLARED_GATES, brisbaneReportDate,
   216	              composeHeartbeat, findOwnedIssue, readEvidence, upsertHeartbeatIssue,
   217	            } = await import(`${process.env.GITHUB_WORKSPACE}/scripts/nexus-heartbeat.mjs`);
   218	
   219	            const client = {
   220	              // paginate, not per_page: a heartbeat sitting past the first page
   221	              // reads as absent and opens a duplicate every single run.
   222	              listOpenIssues: async () => {
   223	                const data = await github.paginate(github.rest.issues.listForRepo, {
   224	                  owner: context.repo.owner, repo: context.repo.repo, state: 'open', per_page: 100,
   225	                });
   226	                // pull_request is carried through: this endpoint returns PRs too,
   227	                // and findOwnedIssue must be able to tell them apart.
   228	                return data.map((issue) => ({
   229	                  number: issue.number,
   230	                  title: issue.title,
   231	                  body: issue.body,
   232	                  pull_request: issue.pull_request,
   233	                }));
   234	              },
   235	              createIssue: async ({ title, body }) => {
   236	                const { data } = await github.rest.issues.create({
   237	                  owner: context.repo.owner, repo: context.repo.repo, title, body,
   238	                });
   239	                return { number: data.number };
   240	              },
   241	              updateIssue: async (issue_number, { title, body }) => {
   242	                const { data } = await github.rest.issues.update({
   243	                  owner: context.repo.owner, repo: context.repo.repo, issue_number, title, body,
   244	                });
   245	                return { number: data.number };
   246	              },
   247	              // The readback. A create/update response is a claim about a
   248	              // request; this is the observation that it landed. upsert throws
   249	              // unless the live body matches what was sent.
   250	              // `state` IS PART OF THE OBSERVATION, not metadata. The readback
   251	              // compared number, title, marker and body and never asked whether
   252	              // the issue was still open — so an issue closed between the
   253	              // listing and the update passed every check, and the run reported
   254	              // success with the report written where nobody reads it.
   255	              getIssue: async (issue_number) => {
   256	                const { data } = await github.rest.issues.get({
   257	                  owner: context.repo.owner, repo: context.repo.repo, issue_number,
   258	                });
   259	                return {
   260	                  number: data.number, title: data.title, body: data.body, state: data.state,
   261	                };
   262	              },
   263	            };
   264	
   265	            // ONE listing, used for both the drift read and the write target.
   266	            // Two lookups race: the issue drift was measured against can be closed
   267	            // between them, and the report is then written somewhere else while
   268	            // claiming a regression it measured elsewhere.
   269	            const issues = await client.listOpenIssues();
   270	            const previous = findOwnedIssue(issues);
   271	
   272	            const { body, failed, failureReasons } = composeHeartbeat({
   273	              // Brisbane wall clock, DD/MM/YYYY. A UTC date stamps the PREVIOUS
   274	              // day on a 19:00Z run whose queue ages were computed in Brisbane.
   275	              date: brisbaneReportDate(),
   276	              gateEvidence: readEvidence('/tmp/heartbeat/gate-results.json'),
   277	              queueEvidence: readEvidence('/tmp/heartbeat/queue.json'),
   278	              previousBody: previous?.body ?? null,
   279	              provenance: {
   280	                runId: context.runId,
   281	                runUrl: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
   282	                generatedAt: new Date().toISOString(),
   283	              },
   284	              declared: DECLARED_GATES,
   285	            });
   286	
   287	            const result = await upsertHeartbeatIssue({ client, body, issues });
   288	            core.info(`Heartbeat issue ${result.action}: #${result.number}`);
   289	
   290	            // The report is published, THEN the run is failed. Publishing first
   291	            // is what keeps the issue honest; failing after is what makes the
   292	            // problem visible in the Actions list.
   293	            //
   294	            // `failed`, NOT `degraded`. `degraded` means the report is
   295	            // untrustworthy; a gate that ran and FAILED produces a perfectly
   296	            // trustworthy report and raised no anomaly, so gating on `degraded`
   297	            // published a body saying FAIL while this run went green. `failed`
   298	            // covers both, and is derived from the same gate rows the body
   299	            // renders so the two cannot disagree.
   300	            if (failed) {
   301	              core.setFailed(`Heartbeat is not green:\n${failureReasons.map((r) => `- ${r}`).join('\n')}`);
   302	            }
apps/web/supabase/migrations/20260713191051_site_keys.sql:10:-- 20260612020000_crm_leads.sql.
apps/web/supabase/migrations/20260711100000_stripe_events.sql:8:CREATE TABLE IF NOT EXISTS public.stripe_events (
apps/web/supabase/migrations/20260711100000_stripe_events.sql:19:CREATE INDEX IF NOT EXISTS stripe_events_type_received_idx
apps/web/supabase/migrations/20260711100000_stripe_events.sql:20:  ON public.stripe_events(type, received_at DESC);
apps/web/supabase/migrations/20260711100000_stripe_events.sql:22:ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
apps/web/supabase/migrations/20260711100000_stripe_events.sql:23:ALTER TABLE public.stripe_events FORCE ROW LEVEL SECURITY;
apps/web/supabase/migrations/20260618020000_appsweb_force_rls_and_founder_indexes.sql:72:ALTER TABLE public.stripe_events FORCE ROW LEVEL SECURITY;
apps/web/supabase/migrations/20260612021000_crm_contacts_opportunities.sql:37:  linked_lead_id uuid references public.crm_leads(id) on delete set null,
apps/web/supabase/migrations/20260612021000_crm_contacts_opportunities.sql:158:  linked_lead_id uuid references public.crm_leads(id) on delete set null,
apps/web/supabase/migrations/20260714000000_project_cost_metering.sql:8:-- no policy) — matching the stripe_events pattern.
apps/web/supabase/migrations/20260612000000_stripe_events.sql:3:-- Ported from apps/authority-legacy/supabase/migrations/20260514150000_stripe_events.sql
apps/web/supabase/migrations/20260612000000_stripe_events.sql:7:-- stripe_events:  append-only audit of every webhook event received, with the
apps/web/supabase/migrations/20260612000000_stripe_events.sql:22:CREATE TABLE IF NOT EXISTS public.stripe_events (
apps/web/supabase/migrations/20260612000000_stripe_events.sql:33:CREATE INDEX IF NOT EXISTS stripe_events_type_received_idx
apps/web/supabase/migrations/20260612000000_stripe_events.sql:34:  ON public.stripe_events(type, received_at DESC);
apps/web/supabase/migrations/20260612000000_stripe_events.sql:53:ALTER TABLE public.stripe_events                ENABLE ROW LEVEL SECURITY;
apps/web/supabase/migrations/20260612000000_stripe_events.sql:56:DROP POLICY IF EXISTS stripe_events_service_all ON public.stripe_events;
apps/web/supabase/migrations/20260612000000_stripe_events.sql:57:CREATE POLICY stripe_events_service_all ON public.stripe_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
apps/web/supabase/migrations/20260612020000_crm_leads.sql:3:-- Ported from Authority-Site supabase/migrations/20260523100000_crm_leads.sql, 12/06/2026.
apps/web/supabase/migrations/20260612020000_crm_leads.sql:14:--   DROP TABLE IF EXISTS public.crm_leads;
apps/web/supabase/migrations/20260612020000_crm_leads.sql:20:create table if not exists public.crm_leads (
apps/web/supabase/migrations/20260612020000_crm_leads.sql:48:  constraint crm_leads_status_check check (
apps/web/supabase/migrations/20260612020000_crm_leads.sql:51:  constraint crm_leads_qualification_score_check check (
apps/web/supabase/migrations/20260612020000_crm_leads.sql:56:create index if not exists crm_leads_founder_id_idx on public.crm_leads (founder_id);
apps/web/supabase/migrations/20260612020000_crm_leads.sql:57:create index if not exists crm_leads_email_idx on public.crm_leads (lower(email));
apps/web/supabase/migrations/20260612020000_crm_leads.sql:58:create index if not exists crm_leads_status_idx on public.crm_leads (status);
apps/web/supabase/migrations/20260612020000_crm_leads.sql:59:create index if not exists crm_leads_captured_at_idx on public.crm_leads (captured_at desc);
apps/web/supabase/migrations/20260612020000_crm_leads.sql:60:create index if not exists crm_leads_assigned_owner_idx on public.crm_leads (assigned_owner);
apps/web/supabase/migrations/20260612020000_crm_leads.sql:62:alter table public.crm_leads enable row level security;
apps/web/supabase/migrations/20260612020000_crm_leads.sql:63:alter table public.crm_leads force row level security;
apps/web/supabase/migrations/20260612020000_crm_leads.sql:70:      and tablename = 'crm_leads'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:71:      and policyname = 'crm_leads_founder_select'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:73:    create policy crm_leads_founder_select
apps/web/supabase/migrations/20260612020000_crm_leads.sql:74:      on public.crm_leads
apps/web/supabase/migrations/20260612020000_crm_leads.sql:85:      and tablename = 'crm_leads'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:86:      and policyname = 'crm_leads_founder_insert'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:88:    create policy crm_leads_founder_insert
apps/web/supabase/migrations/20260612020000_crm_leads.sql:89:      on public.crm_leads
apps/web/supabase/migrations/20260612020000_crm_leads.sql:100:      and tablename = 'crm_leads'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:101:      and policyname = 'crm_leads_founder_update'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:103:    create policy crm_leads_founder_update
apps/web/supabase/migrations/20260612020000_crm_leads.sql:104:      on public.crm_leads
apps/web/supabase/migrations/20260612020000_crm_leads.sql:116:      and tablename = 'crm_leads'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:117:      and policyname = 'crm_leads_founder_delete'
apps/web/supabase/migrations/20260612020000_crm_leads.sql:119:    create policy crm_leads_founder_delete
apps/web/supabase/migrations/20260612020000_crm_leads.sql:120:      on public.crm_leads
apps/web/supabase/migrations/20260710120000_aiw_engine.sql:8:--   * Public visitors NEVER write `crm_leads` directly (it is founder-RLS-scoped, so a
apps/web/supabase/migrations/20260710120000_aiw_engine.sql:11:--     promotes intake rows into `crm_leads`, stamping the founder id.
apps/web/tsconfig.json
apps/web/vitest.setup.ts
apps/web/vitest.config.api.ts
apps/web/vitest.config.mts
apps/web/packages/sdk/tsconfig.json
apps/web/src/app/privacy-policy/page.tsx
apps/web/packages/veritas-kanban-mcp/mcp/tsconfig.json
apps/web/packages/shared/tsconfig.json
apps/web/src/app/api/leads/__tests__/route.test.ts
apps/web/src/lib/cron-auth.ts
apps/web/src/lib/cron-auth.test.ts
apps/web/src/app/api/webhooks/stripe/__tests__/route.test.ts

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
codex
Two issues stand out so far: concurrent submissions can both pass the dedup check, and the required “log even when founder ID is missing” path conflicts with the log table’s non-null founder key. I’m checking the health and acceptance-test recipes for similar gaps.
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc 'nl -ba apps/web/src/lib/integrations/sendgrid.ts; nl -ba apps/web/src/app/api/webhooks/stripe/route.ts; nl -ba apps/web/scripts/validate-env.mjs | head -n 200; nl -ba apps/web/src/proxy.ts | head -n 240' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
     1	// src/lib/integrations/sendgrid.ts
     2	// SendGrid email client wrapper for campaign sending.
     3	
     4	import sgMail from '@sendgrid/mail'
     5	
     6	function ensureApiKey(): void {
     7	  const key = process.env.SENDGRID_API_KEY?.trim()
     8	  if (!key) throw new Error('[SendGrid] SENDGRID_API_KEY not configured')
     9	  sgMail.setApiKey(key)
    10	}
    11	
    12	export interface EmailRecipient {
    13	  email: string
    14	  name?: string
    15	}
    16	
    17	export interface SendEmailInput {
    18	  to: EmailRecipient | EmailRecipient[]
    19	  from: EmailRecipient
    20	  subject: string
    21	  html: string
    22	  text?: string
    23	  replyTo?: EmailRecipient
    24	  categories?: string[]
    25	  customArgs?: Record<string, string>
    26	}
    27	
    28	/**
    29	 * Send a single email via SendGrid.
    30	 * Returns the SendGrid message ID on success.
    31	 */
    32	export async function sendEmail(input: SendEmailInput): Promise<string> {
    33	  ensureApiKey()
    34	
    35	  const msg: sgMail.MailDataRequired = {
    36	    to: input.to,
    37	    from: input.from,
    38	    subject: input.subject,
    39	    html: input.html,
    40	    text: input.text,
    41	    replyTo: input.replyTo,
    42	    categories: input.categories,
    43	    customArgs: input.customArgs,
    44	  }
    45	
    46	  const [response] = await sgMail.send(msg)
    47	  const messageId = response.headers['x-message-id'] as string | undefined
    48	  return messageId ?? response.statusCode.toString()
    49	}
    50	
    51	/** Maximum recipients per SendGrid API call */
    52	const BATCH_SIZE = 1000
    53	
    54	/**
    55	 * Send a batch of emails (up to 1000 per call).
    56	 * Uses SendGrid's sendMultiple for efficiency.
    57	 */
    58	export async function sendBatchEmails(
    59	  inputs: SendEmailInput[]
    60	): Promise<{ sent: number; failed: number; errors: string[] }> {
    61	  ensureApiKey()
    62	
    63	  let sent = 0
    64	  let failed = 0
    65	  const errors: string[] = []
    66	
    67	  // Process in chunks of BATCH_SIZE
    68	  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    69	    const chunk = inputs.slice(i, i + BATCH_SIZE)
    70	
    71	    const messages: sgMail.MailDataRequired[] = chunk.map((input) => ({
    72	      to: input.to,
    73	      from: input.from,
    74	      subject: input.subject,
    75	      html: input.html,
    76	      text: input.text,
    77	      replyTo: input.replyTo,
    78	      categories: input.categories,
    79	      customArgs: input.customArgs,
    80	    }))
    81	
    82	    try {
    83	      await sgMail.send(messages)
    84	      sent += chunk.length
    85	    } catch (err: unknown) {
    86	      failed += chunk.length
    87	      const message = err instanceof Error ? err.message : String(err)
    88	      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${message}`)
    89	    }
    90	  }
    91	
    92	  return { sent, failed, errors }
    93	}
    94	
    95	/**
    96	 * Send a campaign email to a list of recipients.
    97	 * Handles batching if > 1000 recipients.
    98	 */
    99	export async function sendCampaignEmail(
   100	  recipients: EmailRecipient[],
   101	  from: EmailRecipient,
   102	  subject: string,
   103	  html: string,
   104	  text?: string,
   105	  categories?: string[]
   106	): Promise<{ sent: number; failed: number }> {
   107	  if (recipients.length === 0) {
   108	    return { sent: 0, failed: 0 }
   109	  }
   110	
   111	  // Build individual emails for each recipient (personalised to/from)
   112	  const inputs: SendEmailInput[] = recipients.map((recipient) => ({
   113	    to: recipient,
   114	    from,
   115	    subject,
   116	    html,
   117	    text,
   118	    categories,
   119	  }))
   120	
   121	  const result = await sendBatchEmails(inputs)
   122	
   123	  if (result.errors.length > 0) {
   124	    console.error('[SendGrid] Campaign send errors:', result.errors)
   125	  }
   126	
   127	  return { sent: result.sent, failed: result.failed }
   128	}
     1	// POST /api/webhooks/stripe — Stripe webhook receiver (UNI-2328).
     2	//
     3	// Verifies the Stripe signature, then idempotently persists the event to the
     4	// `stripe_events` ledger. This is the audited baseline: NO domain dispatch yet
     5	// — specific event handlers (checkout, invoice, etc.) are added when a concrete
     6	// Nexus billing flow is defined, so nothing speculative ships. Register this
     7	// endpoint in the Stripe dashboard to obtain STRIPE_WEBHOOK_SECRET.
     8	
     9	import { NextRequest, NextResponse } from 'next/server'
    10	import type Stripe from 'stripe'
    11	import { getStripe } from '@/lib/integrations/stripe/client'
    12	import { createServiceClient } from '@/lib/supabase/service'
    13	
    14	export const dynamic = 'force-dynamic'
    15	export const runtime = 'nodejs' // signature verification needs the Node crypto runtime
    16	export const maxDuration = 30
    17	
    18	export async function POST(request: NextRequest) {
    19	  const stripe = getStripe()
    20	  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    21	  if (!stripe || !webhookSecret) {
    22	    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
    23	  }
    24	
    25	  const signature = request.headers.get('stripe-signature')
    26	  if (!signature) {
    27	    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
    28	  }
    29	
    30	  const rawBody = await request.text()
    31	
    32	  let event: Stripe.Event
    33	  try {
    34	    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    35	  } catch {
    36	    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
    37	  }
    38	
    39	  // Idempotency: UNIQUE(stripe_event_id) lets Postgres adjudicate Stripe's
    40	  // at-least-once retries (23505 == duplicate == already accepted).
    41	  const admin = createServiceClient()
    42	  const { error } = await admin.from('stripe_events').insert({
    43	    stripe_event_id: event.id,
    44	    type: event.type,
    45	    api_version: event.api_version,
    46	    livemode: event.livemode,
    47	    payload: event,
    48	  })
    49	
    50	  if (error) {
    51	    if ((error as { code?: string }).code === '23505') {
    52	      return NextResponse.json({ received: true, idempotent: true }, { status: 200 })
    53	    }
    54	    console.error('[webhooks/stripe] persist failed:', error.message)
    55	    return NextResponse.json({ error: 'event_persist_failed' }, { status: 500 })
    56	  }
    57	
    58	  return NextResponse.json({ received: true }, { status: 200 })
    59	}
     1	#!/usr/bin/env node
     2	
     3	/**
     4	 * Nexus 2.0 — Environment Variable Validation
     5	 *
     6	 * Validates all required environment variables before starting/deploying.
     7	 * Groups vars by tier: CRITICAL (blocks boot), REQUIRED (blocks features), INTEGRATION (optional).
     8	 *
     9	 * Usage:
    10	 *   node scripts/validate-env.mjs           # Check local .env.local
    11	 *   node scripts/validate-env.mjs --ci      # Check process.env (CI/Vercel)
    12	 */
    13	
    14	import { config } from 'dotenv'
    15	import { existsSync } from 'fs'
    16	import { join } from 'path'
    17	
    18	const isCI = process.argv.includes('--ci')
    19	const skipValidation = process.env.SKIP_ENV_VALIDATION === '1'
    20	
    21	if (skipValidation) {
    22	  console.log('  ⚠️  SKIP_ENV_VALIDATION=1 — skipping validation\n')
    23	  process.exit(0)
    24	}
    25	
    26	// Load .env.local if not in CI mode
    27	if (!isCI) {
    28	  const envPath = join(process.cwd(), '.env.local')
    29	  if (existsSync(envPath)) {
    30	    config({ path: envPath })
    31	    console.log('  Loaded .env.local\n')
    32	  } else {
    33	    console.warn('  .env.local not found — using system environment variables\n')
    34	  }
    35	}
    36	
    37	// ─── Tier Definitions ───────────────────────────────────────────────────────
    38	
    39	const CRITICAL = [
    40	  { name: 'NEXT_PUBLIC_SUPABASE_URL', hint: 'Supabase project URL (https://xxx.supabase.co)' },
    41	  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', hint: 'Supabase anon/public key' },
    42	  { name: 'SUPABASE_SERVICE_ROLE_KEY', hint: 'Supabase service role key (server-side only)' },
    43	]
    44	
    45	const REQUIRED = [
    46	  { name: 'ANTHROPIC_API_KEY', hint: 'Anthropic API key (sk-ant-xxx)' },
    47	  { name: 'VAULT_ENCRYPTION_KEY', hint: 'AES-256 key — openssl rand -hex 32' },
    48	  { name: 'CRON_SECRET', hint: 'Secret for cron route auth' },
    49	  { name: 'FOUNDER_USER_ID', hint: 'Supabase auth.users UUID for the founder' },
    50	]
    51	
    52	const INTEGRATION = [
    53	  // Linear
    54	  { name: 'LINEAR_API_KEY', hint: 'Linear personal API key', group: 'Linear' },
    55	  // Xero — CARSI account
    56	  { name: 'XERO_CLIENT_ID', hint: 'Xero shared OAuth client ID', group: 'Xero' },
    57	  { name: 'XERO_CLIENT_SECRET', hint: 'Xero shared OAuth client secret', group: 'Xero' },
    58	  // Xero — DR account (code reads DR_CLIENT_ID / DR_CLIENT_SECRET — see xero/client.ts)
    59	  { name: 'XERO_TENANT_ID_CARSI', hint: 'Xero tenant ID for CARSI', group: 'Xero' },
    60	  { name: 'XERO_TENANT_ID_DR', hint: 'Xero tenant ID for Disaster Recovery', group: 'Xero' },
    61	  { name: 'XERO_WEBHOOK_KEY', hint: 'Xero webhook signing key', group: 'Xero' },
    62	  // Google
    63	  { name: 'GOOGLE_CLIENT_ID', hint: 'Google OAuth client ID', group: 'Google' },
    64	  { name: 'GOOGLE_CLIENT_SECRET', hint: 'Google OAuth client secret', group: 'Google' },
    65	  // Social
    66	  { name: 'FACEBOOK_APP_ID', hint: 'Facebook app ID', group: 'Social' },
    67	  { name: 'LINKEDIN_CLIENT_ID', hint: 'LinkedIn client ID', group: 'Social' },
    68	  { name: 'TIKTOK_CLIENT_KEY', hint: 'TikTok client key', group: 'Social' },
    69	  // Slack
    70	  { name: 'SLACK_WEBHOOK_URL', hint: 'Slack incoming webhook URL', group: 'Slack' },
    71	  // App
    72	  { name: 'NEXT_PUBLIC_APP_URL', hint: 'App URL for OAuth callbacks (http://localhost:3000)', group: 'App' },
    73	]
    74	
    75	// ─── Validation ─────────────────────────────────────────────────────────────
    76	
    77	function checkVars(vars, tierName) {
    78	  const missing = []
    79	  const present = []
    80	
    81	  for (const v of vars) {
    82	    const value = process.env[v.name]
    83	    if (!value || value.trim() === '') {
    84	      missing.push(v)
    85	    } else {
    86	      present.push(v)
    87	    }
    88	  }
    89	
    90	  return { tierName, missing, present, total: vars.length }
    91	}
    92	
    93	// ─── Output ─────────────────────────────────────────────────────────────────
    94	
    95	console.log('┌─ Nexus 2.0 Environment Validation ──────────────────────')
    96	console.log('│')
    97	
    98	const criticalResult = checkVars(CRITICAL, 'CRITICAL')
    99	const requiredResult = checkVars(REQUIRED, 'REQUIRED')
   100	const integrationResult = checkVars(INTEGRATION, 'INTEGRATION')
   101	
   102	let hasBlockers = false
   103	
   104	for (const result of [criticalResult, requiredResult, integrationResult]) {
   105	  const icon = result.missing.length === 0 ? '\u2705' : result.tierName === 'INTEGRATION' ? '\u26A0\uFE0F' : '\u274C'
   106	  console.log(`\u2502 ${icon} ${result.tierName}: ${result.present.length}/${result.total} set`)
   107	
   108	  if (result.missing.length > 0) {
   109	    for (const v of result.missing) {
   110	      console.log(`\u2502   \u2514 ${v.name} — ${v.hint}`)
   111	    }
   112	    if (result.tierName !== 'INTEGRATION') {
   113	      hasBlockers = true
   114	    }
   115	  }
   116	}
   117	
   118	console.log('│')
   119	
   120	// Check for stale/legacy vars that should be removed from Vercel
   121	const STALE_VARS = [
   122	  'NEXTAUTH_URL', 'NEXTAUTH_SECRET',
   123	  'STRIPE_SECRET_KEY', 'STRIPE_TEST_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
   124	  'STRIPE_SECRET_TOKEN', 'STRIPE_RESTRICTED_KEY_TEST', 'STRIPE_RESTRICTED_KEY_LIVE',
   125	  'STRIPE_PRICE_ID_STARTER',
   126	  'CONVEX_URL', 'CONVEX_DEPLOYMENT',
   127	  'ABACUS_API_KEY', 'ABACUS_CLI_KEY',
   128	  'DATADOG_API_KEY', 'DATADOG_SITE',
   129	  'DIGITALOCEAN_API_TOKEN',
   130	  'ELEVENLABS_API_KEY',
   131	  'OPENROUTER_API_KEY',
   132	  'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET',
   133	  'FIELD_ENCRYPTION_KEY',
   134	  'META_APP_ID', 'META_APP_SECRET',
   135	  'OPENAI_API_KEY',
   136	]
   137	
   138	const foundStale = STALE_VARS.filter(name => process.env[name])
   139	if (foundStale.length > 0) {
   140	  console.log(`\u2502 \u26A0\uFE0F  ${foundStale.length} STALE vars detected (old SaaS — safe to remove):`)
   141	  for (const name of foundStale) {
   142	    console.log(`\u2502   \u2514 ${name}`)
   143	  }
   144	  console.log('│')
   145	}
   146	
   147	// Check for incorrectly-named DR Xero vars (old wrong names that were never in the codebase)
   148	if (process.env.DR_XERO_CLIENT_ID && !process.env.DR_CLIENT_ID) {
   149	  console.log('\u2502 \u26A0\uFE0F  NAMING MISMATCH: DR_XERO_CLIENT_ID found but code expects DR_CLIENT_ID')
   150	  console.log('\u2502   Rename in Vercel: DR_XERO_CLIENT_ID \u2192 DR_CLIENT_ID')
   151	}
   152	if (process.env.DR_XERO_CLIENT_SECRET && !process.env.DR_CLIENT_SECRET) {
   153	  console.log('\u2502 \u26A0\uFE0F  NAMING MISMATCH: DR_XERO_CLIENT_SECRET found but code expects DR_CLIENT_SECRET')
   154	  console.log('\u2502   Rename in Vercel: DR_XERO_CLIENT_SECRET \u2192 DR_CLIENT_SECRET')
   155	}
   156	
   157	console.log('└─────────────────────────────────────────────────────────')
   158	console.log('')
   159	
   160	if (hasBlockers) {
   161	  console.error('\u274C VALIDATION FAILED — missing CRITICAL or REQUIRED env vars')
   162	  console.error('')
   163	  console.error('To fix:')
   164	  console.error('  1. Copy .env.example to .env.local')
   165	  console.error('  2. Fill in the missing values')
   166	  console.error('  3. For Vercel: vercel env add <NAME>')
   167	  console.error('')
   168	  process.exit(1)
   169	}
   170	
   171	console.log('\u2705 VALIDATION PASSED — all critical + required vars present')
   172	process.exit(0)
     1	/**
     2	 * Next.js Middleware — Rate Limiting + Supabase PKCE Auth
     3	 *
     4	 * Execution order:
     5	 *   1. Rate limiting (returns 429 if exceeded)
     6	 *   2. Supabase session refresh (PKCE token rotation)
     7	 *   3. Auth redirect (unauthenticated users → /auth/login)
     8	 */
     9	
    10	import { NextResponse, type NextRequest } from 'next/server';
    11	import { updateSession } from '@/lib/supabase/middleware';
    12	import { checkRateLimit } from '@/lib/middleware/rate-limit';
    13	import { hasPrivateAccess, isPrivateAccessConfigured } from '@/lib/auth/private-access';
    14	
    15	const isDev = process.env.NODE_ENV === 'development';
    16	
    17	function generateNonce(): string {
    18	  const bytes = new Uint8Array(16);
    19	  crypto.getRandomValues(bytes);
    20	  return Buffer.from(bytes).toString('base64');
    21	}
    22	
    23	function buildCSP(nonce: string): string {
    24	  return [
    25	    "default-src 'self'",
    26	    // nonce replaces unsafe-inline; strict-dynamic trusts scripts loaded by trusted scripts.
    27	    // unsafe-eval kept in dev only (Turbopack source maps).
    28	    [
    29	      "script-src 'self'",
    30	      `'nonce-${nonce}'`,
    31	      "'strict-dynamic'",
    32	      isDev ? "'unsafe-eval'" : null,
    33	      'https://accounts.google.com',
    34	      'https://va.vercel-scripts.com',  // Vercel Analytics
    35	    ].filter(Boolean).join(' '),
    36	    "style-src 'self' 'unsafe-inline'",
    37	    "img-src 'self' data: blob: https: http:",
    38	    "font-src 'self' data:",
    39	    // wss: required for Supabase Realtime
    40	    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://accounts.google.com https://va.vercel-scripts.com",
    41	    "frame-src 'self' https://accounts.google.com",
    42	    "object-src 'none'",
    43	    "base-uri 'self'",
    44	    "form-action 'self'",
    45	    "frame-ancestors 'none'",
    46	    "upgrade-insecure-requests",
    47	  ].filter(Boolean).join('; ');
    48	}
    49	
    50	// ---------------------------------------------------------------------------
    51	// Routes that do NOT require authentication
    52	// ---------------------------------------------------------------------------
    53	const PUBLIC_PATHS = [
    54	  '/auth',
    55	  '/forgot-password',
    56	  '/privacy-policy',
    57	  '/terms-of-service',
    58	  '/api/auth',     // OAuth callbacks — must be public so Supabase can return auth codes
    59	  '/api/health',
    60	  '/api/cron',
    61	  '/api/webhooks', // External provider callbacks verify their own signatures/secrets
    62	  '/api/leads',    // Public website lead capture (UNI-2355) — service-role insert, rate-limited above
    63	  '/api/agent',    // Public site chat agent — auth is the publishable site key, validated in-route (UNI-2359)
    64	  '/widget',       // Embeddable chat widget script must load on third-party sites (UNI-2359)
    65	  '/cards/media',  // Living-card showroom clips: static files in public/cards/media (.mp4 is not in the matcher's asset list)
    66	] as const;
    67	
    68	// Single public files and pages, matched EXACTLY. They have no sub-routes, so the
    69	// segment rule above would grant '/llms.txt/<anything>' an exemption nobody
    70	// approved (independent review, Wave 1).
    71	const EXACT_PUBLIC_FILES: ReadonlySet<string> = new Set([
    72	  '/llms.txt', // AI-agent identification file; static, no private data
    73	  '/robots.txt',
    74	  '/sitemap.xml',
    75	  '/site.webmanifest',
    76	  '/founder-os-sw.js',
    77	  '/grow', // Public SMB services offer page; its form posts to the public /api/leads
    78	  '/cards', // Public living-card showroom (ten editions + signature reveal)
    79	  '/cards/order', // Public card enquiry page; no payment, its form posts to the public /api/leads
    80	]);
    81	
    82	export function isPublicPath(pathname: string): boolean {
    83	  if (EXACT_PUBLIC_FILES.has(pathname)) return true;
    84	
    85	  if (process.env.KNOWLEDGE_CONSOLE_PREVIEW === '1' && pathname === '/preview/knowledge-console') {
    86	    return true;
    87	  }
    88	
    89	  // Segment-aware, NOT a bare prefix. A bare startsWith let '/api/agent'
    90	  // (the public site chat, UNI-2359) hand its exemption to '/api/agents/*',
    91	  // where three authenticated runner/event routes live — so the middleware ran
    92	  // on them and then waved them straight through. Match the whole entry or a
    93	  // real path segment beneath it.
    94	  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    95	}
    96	
    97	// These exact POST handlers authenticate their own bearer or enrolled signature.
    98	// Cookies grant no transport authority; siblings and descendants stay private.
    99	function isRouteAuthenticatedPath(pathname: string): boolean {
   100	  return pathname === '/api/agents/runner/research' ||
   101	    pathname === '/api/agents/runner/claim' ||
   102	    pathname === '/api/agents/runner/release' ||
   103	    pathname === '/api/integrations/idea-evidence';
   104	}
   105	
   106	// ---------------------------------------------------------------------------
   107	// Middleware
   108	// ---------------------------------------------------------------------------
   109	
   110	export async function proxy(request: NextRequest) {
   111	  const { pathname } = request.nextUrl;
   112	
   113	  // ------------------------------------------------------------------
   114	  // 1. Rate limiting — runs BEFORE auth to reject abusive traffic early
   115	  // ------------------------------------------------------------------
   116	  const rateLimitResult = checkRateLimit(request);
   117	
   118	  if (rateLimitResult !== null && !rateLimitResult.success) {
   119	    const retryAfter = Math.max(1, rateLimitResult.reset - Math.floor(Date.now() / 1000));
   120	
   121	    return NextResponse.json(
   122	      { error: 'Too many requests', retryAfter },
   123	      {
   124	        status: 429,
   125	        headers: {
   126	          'X-RateLimit-Limit': String(rateLimitResult.limit),
   127	          'X-RateLimit-Remaining': '0',
   128	          'X-RateLimit-Reset': String(rateLimitResult.reset),
   129	          'Retry-After': String(retryAfter),
   130	        },
   131	      },
   132	    );
   133	  }
   134	
   135	  // ------------------------------------------------------------------
   136	  // 2. Supabase session refresh (PKCE token rotation)
   137	  //    Nonce is threaded via forwarded request headers so Server Components
   138	  //    can read it via headers() from next/headers.
   139	  // ------------------------------------------------------------------
   140	  const nonce = generateNonce();
   141	  const requestHeaders = new Headers(request.headers);
   142	  requestHeaders.set('x-nonce', nonce);
   143	  const routeAuthenticated = request.method === 'POST' && isRouteAuthenticatedPath(pathname);
   144	  const { response, user } = routeAuthenticated
   145	    ? {
   146	      response: NextResponse.next({ request: { headers: requestHeaders } }),
   147	      user: null,
   148	    }
   149	    : await updateSession(request, { 'x-nonce': nonce });
   150	
   151	  // Attach rate-limit headers to successful responses so clients can
   152	  // monitor their remaining budget.
   153	  if (rateLimitResult !== null) {
   154	    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
   155	    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
   156	    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
   157	  }
   158	
   159	  // Set CSP with per-request nonce on the response (enforced by browser)
   160	  response.headers.set('Content-Security-Policy', buildCSP(nonce));
   161	
   162	  // ------------------------------------------------------------------
   163	  // 3. Auth guard — redirect unauthenticated users to login
   164	  // ------------------------------------------------------------------
   165	  if (!user && !isPublicPath(pathname) && !routeAuthenticated) {
   166	    const loginUrl = request.nextUrl.clone();
   167	    loginUrl.pathname = '/auth/login';
   168	    loginUrl.searchParams.set('redirectTo', pathname);
   169	    return NextResponse.redirect(loginUrl);
   170	  }
   171	
   172	  // ------------------------------------------------------------------
   173	  // 4. Private CRM guard — only explicit founder/invite allow-list can enter
   174	  // ------------------------------------------------------------------
   175	  if (user && !isPublicPath(pathname) && !routeAuthenticated && !hasPrivateAccess(user)) {
   176	    // Log the rejected identity so a lockout is diagnosable from Vercel runtime
   177	    // logs alone (2026-07-14: a stale FOUNDER_USER_ID denied the real founder
   178	    // and the logs showed nothing about who was rejected or why).
   179	    console.error(
   180	      `[private-access] Denied ${user.email ?? 'unknown-email'} (id ${user.id}) at ${pathname} — identity not on founder allow-list`,
   181	    );
   182	
   183	    if (pathname.startsWith('/api/')) {
   184	      return NextResponse.json(
   185	        { error: 'Forbidden', message: 'This Unite-Hub CRM is private.' },
   186	        { status: 403 },
   187	      );
   188	    }
   189	
   190	    const deniedUrl = request.nextUrl.clone();
   191	    deniedUrl.pathname = '/auth/login';
   192	    deniedUrl.searchParams.set('access', 'denied');
   193	    return NextResponse.redirect(deniedUrl);
   194	  }
   195	
   196	  if (isPrivateAccessConfigured()) {
   197	    response.headers.set('X-Unite-Hub-Private', 'allow-list');
   198	  }
   199	
   200	  return response;
   201	}
   202	
   203	// ---------------------------------------------------------------------------
   204	// Matcher — skip static assets, images, and favicon
   205	// ---------------------------------------------------------------------------
   206	export const config = {
   207	  matcher: [
   208	    /*
   209	     * Match all request paths EXCEPT:
   210	     * - _next/static (static files)
   211	     * - _next/image (image optimisation)
   212	     * - favicon.ico (browser icon)
   213	     * - public folder assets (images, fonts, etc.) — but NEVER under /api/ or
   214	     *   /founder/, see below.
   215	     *
   216	     * SECURITY: the asset exemption is gated behind `(?!api/|founder/)`.
   217	     *
   218	     * Without that guard the exemption applied to EVERY path, so appending a
   219	     * static-looking extension skipped this middleware entirely — the only
   220	     * control that distinguishes the founder from any other authenticated
   221	     * user. Confirmed against production 10/08/2026: `/api/contacts/probe`
   222	     * returned the login redirect (proxy ran) while `/api/contacts/probe.png`
   223	     * returned a bare 401 (proxy did NOT run, and the request reached the
   224	     * route handler). Nothing leaked, because every dynamic route scopes its
   225	     * query with `.eq('founder_id', user.id)` — but that made the routes the
   226	     * last line of defence rather than the second.
   227	     *
   228	     * A regex change here is load-bearing. Both directions are covered by
   229	     * src/__tests__/proxy-matcher.test.ts: protected paths must MATCH even
   230	     * with an asset extension, and genuine static assets must NOT match (or
   231	     * the login page loses its own CSS and images).
   232	     */
   233	    '/((?!_next/static|_next/image|favicon\\.ico|(?!api/|founder/).*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
   234	  ],
   235	};

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
hook: PostToolUse
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc 'nl -ba apps/web/supabase/migrations/20260612000000_stripe_events.sql | head -n 65; nl -ba apps/web/supabase/migrations/20260711100000_stripe_events.sql; nl -ba apps/web/supabase/migrations/20260612020000_crm_leads.sql | head -n 82; nl -ba apps/web/supabase/migrations/20260710120000_aiw_engine.sql | head -n 95; nl -ba scripts/nexus-heartbeat.mjs | head -n 170; nl -ba apps/web/src/lib/integrations/stripe/client.ts; nl -ba apps/web/tsconfig.json; nl -ba apps/web/vitest.config.mts | head -n 115' in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
     1	-- Stripe event ledger + provisioning queue
     2	--
     3	-- Ported from apps/authority-legacy/supabase/migrations/20260514150000_stripe_events.sql
     4	-- (re-timestamped for apps/web). See docs/convergence/migration-map.md (P1 — Stripe
     5	-- billing + webhooks).
     6	--
     7	-- stripe_events:  append-only audit of every webhook event received, with the
     8	-- raw payload preserved for replay and forensic inspection. Dedupe by
     9	-- stripe_event_id ensures Stripe's at-least-once delivery doesn't double-fire
    10	-- side effects.
    11	--
    12	-- stripe_provisioning_queue:  rows the swarm worker picks up to trigger the
    13	-- Hour-1 portal provisioning when a first-payment lands. Pull pattern keeps
    14	-- the webhook handler small and bounded.
    15	--
    16	-- NOTE (web adaptation): apps/web does NOT yet carry the nexus_clients table
    17	-- that the provisioning queue references conceptually (via nexus_slug). The
    18	-- queue table is still created here because it is stripe-adjacent and the
    19	-- webhook handler writes to it, but the downstream "activate client" join is
    20	-- degraded in the route until nexus_clients is migrated. See migration-map.md.
    21	
    22	CREATE TABLE IF NOT EXISTS public.stripe_events (
    23	  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    24	  stripe_event_id     TEXT NOT NULL UNIQUE,
    25	  type                TEXT NOT NULL,
    26	  api_version         TEXT,
    27	  livemode            BOOLEAN NOT NULL DEFAULT FALSE,
    28	  payload             JSONB NOT NULL,
    29	  processing_error    TEXT,
    30	  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    31	);
    32	
    33	CREATE INDEX IF NOT EXISTS stripe_events_type_received_idx
    34	  ON public.stripe_events(type, received_at DESC);
    35	
    36	CREATE TABLE IF NOT EXISTS public.stripe_provisioning_queue (
    37	  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    38	  stripe_customer_id  TEXT NOT NULL,
    39	  nexus_slug          TEXT NOT NULL,
    40	  trigger             TEXT NOT NULL,
    41	  trigger_payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    42	  status              TEXT NOT NULL DEFAULT 'pending'
    43	                        CHECK (status IN ('pending','processing','done','failed')),
    44	  processing_error    TEXT,
    45	  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    46	  processed_at        TIMESTAMPTZ
    47	);
    48	
    49	CREATE INDEX IF NOT EXISTS stripe_provisioning_queue_pending_idx
    50	  ON public.stripe_provisioning_queue(status, created_at)
    51	  WHERE status = 'pending';
    52	
    53	ALTER TABLE public.stripe_events                ENABLE ROW LEVEL SECURITY;
    54	ALTER TABLE public.stripe_provisioning_queue    ENABLE ROW LEVEL SECURITY;
    55	
    56	DROP POLICY IF EXISTS stripe_events_service_all ON public.stripe_events;
    57	CREATE POLICY stripe_events_service_all ON public.stripe_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    58	
    59	DROP POLICY IF EXISTS stripe_provisioning_service_all ON public.stripe_provisioning_queue;
    60	CREATE POLICY stripe_provisioning_service_all ON public.stripe_provisioning_queue FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
     1	-- Stripe webhook event ledger (UNI-2328).
     2	-- Append-only audit of every signature-verified Stripe webhook event. The
     3	-- UNIQUE(stripe_event_id) constraint dedupes Stripe's at-least-once delivery so
     4	-- the webhook handler is idempotent. Written only by the service role (the
     5	-- webhook route); RLS is enabled + forced with no policy, so anon/authenticated
     6	-- cannot read or write it while service_role bypasses RLS by design.
     7	
     8	CREATE TABLE IF NOT EXISTS public.stripe_events (
     9	  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    10	  stripe_event_id  TEXT NOT NULL UNIQUE,
    11	  type             TEXT NOT NULL,
    12	  api_version      TEXT,
    13	  livemode         BOOLEAN NOT NULL DEFAULT FALSE,
    14	  payload          JSONB NOT NULL,
    15	  processing_error TEXT,
    16	  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    17	);
    18	
    19	CREATE INDEX IF NOT EXISTS stripe_events_type_received_idx
    20	  ON public.stripe_events(type, received_at DESC);
    21	
    22	ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
    23	ALTER TABLE public.stripe_events FORCE ROW LEVEL SECURITY;
     1	-- =============================================================================
     2	-- Migration: CRM lead persistence for public marketing intake
     3	-- Ported from Authority-Site supabase/migrations/20260523100000_crm_leads.sql, 12/06/2026.
     4	-- PENDING SANDBOX VERIFICATION — apply via sandbox-wizard.sh before production.
     5	--
     6	-- Adaptations from source:
     7	--   - Added founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
     8	--     (source used service_role-only RLS with no user scoping; apps/web requires
     9	--      founder_id scoping per docs/migration/unite-group-to-unite-hub-consolidation-plan.md)
    10	--   - Replaced service_role-only RLS with founder_id = auth.uid() policies
    11	--   - Service-role bypass is implicit (service_role bypasses RLS by design)
    12	--
    13	-- Rollback:
    14	--   DROP TABLE IF EXISTS public.crm_leads;
    15	-- =============================================================================
    16	
    17	-- CRM lead persistence for public marketing intake.
    18	-- Website leads are first-class CRM records; SendGrid is a side integration.
    19	
    20	create table if not exists public.crm_leads (
    21	  id uuid primary key default gen_random_uuid(),
    22	  founder_id uuid not null references auth.users(id) on delete cascade,
    23	  first_name text not null,
    24	  last_name text,
    25	  email text not null,
    26	  phone text,
    27	  company text,
    28	  job_title text,
    29	  message text,
    30	  interests text,
    31	  referral_source text,
    32	  marketing_consent boolean not null default false,
    33	  email_list_id text,
    34	  source text not null default 'website_form',
    35	  status text not null default 'new',
    36	  qualification_score integer,
    37	  assigned_owner text not null default 'Margot',
    38	  matched_client_id uuid,
    39	  matched_business_id uuid,
    40	  converted_client_id uuid,
    41	  ip_address text,
    42	  user_agent text,
    43	  additional_data jsonb not null default '{}'::jsonb,
    44	  captured_at timestamptz not null default now(),
    45	  created_at timestamptz not null default now(),
    46	  updated_at timestamptz not null default now(),
    47	  converted_at timestamptz,
    48	  constraint crm_leads_status_check check (
    49	    status in ('new', 'qualified', 'nurture', 'converted', 'disqualified', 'spam')
    50	  ),
    51	  constraint crm_leads_qualification_score_check check (
    52	    qualification_score is null or (qualification_score >= 0 and qualification_score <= 100)
    53	  )
    54	);
    55	
    56	create index if not exists crm_leads_founder_id_idx on public.crm_leads (founder_id);
    57	create index if not exists crm_leads_email_idx on public.crm_leads (lower(email));
    58	create index if not exists crm_leads_status_idx on public.crm_leads (status);
    59	create index if not exists crm_leads_captured_at_idx on public.crm_leads (captured_at desc);
    60	create index if not exists crm_leads_assigned_owner_idx on public.crm_leads (assigned_owner);
    61	
    62	alter table public.crm_leads enable row level security;
    63	alter table public.crm_leads force row level security;
    64	
    65	do $$
    66	begin
    67	  if not exists (
    68	    select 1 from pg_policies
    69	    where schemaname = 'public'
    70	      and tablename = 'crm_leads'
    71	      and policyname = 'crm_leads_founder_select'
    72	  ) then
    73	    create policy crm_leads_founder_select
    74	      on public.crm_leads
    75	      for select
    76	      using (founder_id = auth.uid());
    77	  end if;
    78	end $$;
    79	
    80	do $$
    81	begin
    82	  if not exists (
     1	-- AI-Website (AIW) engine — Phase 2 schema.
     2	--
     3	-- STATUS: NOT YET APPLIED. Apply only on a Supabase DB branch after verifying the
     4	-- `vector`, `pg_cron`, and `pg_net` extensions are available (judge NOT-CHECKED item).
     5	-- Never `supabase db push` against prod (migration history has diverged before).
     6	--
     7	-- Design (from the adversarial review):
     8	--   * Public visitors NEVER write `crm_leads` directly (it is founder-RLS-scoped, so a
     9	--     public write would need the service-role key and bypass RLS). They insert into the
    10	--     append-only `aiw_lead_intake` via a SECURITY DEFINER RPC; a trusted server job
    11	--     promotes intake rows into `crm_leads`, stamping the founder id.
    12	--   * `aiw_embeddings` and `aiw_drip_queue` are service-role only (no anon policies).
    13	--   * `aiw_drip_queue` enforces unique(lead_id, drip_step) for idempotent enrolment.
    14	
    15	create extension if not exists vector;
    16	
    17	-- ---------------------------------------------------------------------------
    18	-- 1. Append-only public lead intake (no public reads)
    19	-- ---------------------------------------------------------------------------
    20	create table if not exists public.aiw_lead_intake (
    21	  id                uuid primary key default gen_random_uuid(),
    22	  created_at        timestamptz not null default now(),
    23	  source_path       text not null,
    24	  name              text,
    25	  email             text,
    26	  phone             text,
    27	  message           text,
    28	  qualifying        jsonb not null default '[]'::jsonb,
    29	  promoted_at       timestamptz,
    30	  promoted_lead_id  uuid
    31	);
    32	
    33	alter table public.aiw_lead_intake enable row level security;
    34	-- No SELECT/INSERT policies for anon: PostgREST cannot read or write it directly.
    35	-- Inserts flow exclusively through aiw_submit_lead() below. The service role (used by
    36	-- the promotion job) bypasses RLS.
    37	
    38	create or replace function public.aiw_submit_lead(
    39	  p_source_path text,
    40	  p_name        text,
    41	  p_email       text default null,
    42	  p_phone       text default null,
    43	  p_message     text default null,
    44	  p_qualifying  jsonb default '[]'::jsonb
    45	) returns uuid
    46	language plpgsql
    47	security definer
    48	set search_path = public
    49	as $$
    50	declare
    51	  v_id uuid;
    52	begin
    53	  if coalesce(p_email, '') = '' and coalesce(p_phone, '') = '' then
    54	    raise exception 'email or phone required';
    55	  end if;
    56	
    57	  insert into public.aiw_lead_intake (source_path, name, email, phone, message, qualifying)
    58	  values (left(p_source_path, 300), left(p_name, 120), left(p_email, 200),
    59	          left(p_phone, 40), left(p_message, 2000), coalesce(p_qualifying, '[]'::jsonb))
    60	  returning id into v_id;
    61	
    62	  return v_id;
    63	end;
    64	$$;
    65	
    66	grant execute on function public.aiw_submit_lead(text, text, text, text, text, jsonb)
    67	  to anon, authenticated;
    68	
    69	-- ---------------------------------------------------------------------------
    70	-- 2. RAG corpus embeddings (service-role only)
    71	-- ---------------------------------------------------------------------------
    72	create table if not exists public.aiw_embeddings (
    73	  id           uuid primary key default gen_random_uuid(),
    74	  source_path  text not null,
    75	  chunk_index  integer not null,
    76	  content      text not null,
    77	  embedding    vector(1536),
    78	  created_at   timestamptz not null default now(),
    79	  unique (source_path, chunk_index)
    80	);
    81	
    82	alter table public.aiw_embeddings enable row level security;
    83	-- No anon policies: only the service role (server) reads/writes embeddings.
    84	
    85	-- ---------------------------------------------------------------------------
    86	-- 3. Drip queue (service-role only, idempotent)
    87	-- ---------------------------------------------------------------------------
    88	create table if not exists public.aiw_drip_queue (
    89	  id          uuid primary key default gen_random_uuid(),
    90	  lead_id     uuid not null,
    91	  drip_step   integer not null,
    92	  status      text not null default 'pending',
    93	  send_at     timestamptz not null default now(),
    94	  attempts    integer not null default 0,
    95	  created_at  timestamptz not null default now(),
     1	#!/usr/bin/env node
     2	
     3	/**
     4	 * Nexus heartbeat (UNI-2523) — the scheduled pulse that keeps distance-to-goal
     5	 * visible while nobody is watching.
     6	 *
     7	 * It OBSERVES AND REPORTS. Waterline Class 0/1: it must not deploy, merge, or arm
     8	 * anything (UNI-2542 merge is not deploy; UNI-2562 one release authority).
     9	 *
    10	 * It degrades honestly. A gate that failed says FAIL with its exit code, a gate
    11	 * that never ran says NOT RUN, and a gate whose evidence file never arrived says
    12	 * NOT RUN with the reason stated at the top of the report. Never omitted, never
    13	 * silently green. That is the UNI-2567 lesson applied to this surface: a job
    14	 * whose evidence did not execute must not read the same as one that passed.
    15	 *
    16	 * EVERY DECISION LIVES IN THIS FILE, NOT IN THE WORKFLOW YAML. Round one of the
    17	 * independent review found the NOT RUN reconstruction inlined in
    18	 * `.github/workflows/nexus-heartbeat.yml` while the test that claimed to cover it
    19	 * exercised a different copy here: mutating the workflow's fallback to
    20	 * `{ status: 'PASS' }` left the suite green. Logic that only exists in YAML is
    21	 * logic no test can reach, so the YAML is now a thin caller and
    22	 * `nexus-heartbeat.test.mjs` asserts that it stays one.
    23	 */
    24	
    25	import { readFileSync } from 'node:fs';
    26	import { resolve } from 'node:path';
    27	import { fileURLToPath } from 'node:url';
    28	
    29	export const HEARTBEAT_TITLE = 'Heartbeat — distance to North Star';
    30	
    31	/**
    32	 * The report's date, as a Brisbane wall clock would read it, in en-AU order.
    33	 *
    34	 * The workflow used `new Date().toISOString().slice(0, 10)`. At the schedule's
    35	 * own documented moment — 19:00 UTC, which is 05:00 the next Brisbane day — that
    36	 * stamps the PREVIOUS calendar date on a body whose queue ages were computed in
    37	 * Brisbane. One report, two timezones, and the header disagreeing with the
    38	 * content it heads. It was also ISO where the repo's locale is DD/MM/YYYY.
    39	 *
    40	 * Exported and used by the workflow rather than inlined there, for the same
    41	 * reason every other decision lives in this file: logic in YAML is logic no
    42	 * test can reach.
    43	 */
    44	const BRISBANE_REPORT_DATE = new Intl.DateTimeFormat('en-AU', {
    45	  timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit',
    46	});
    47	
    48	export function brisbaneReportDate(instant = new Date()) {
    49	  const parts = Object.fromEntries(
    50	    BRISBANE_REPORT_DATE.formatToParts(instant).map((part) => [part.type, part.value]),
    51	  );
    52	  if (!parts.year || !parts.month || !parts.day) {
    53	    throw new Error('Could not resolve a Brisbane report date.');
    54	  }
    55	  return `${parts.day}/${parts.month}/${parts.year}`;
    56	}
    57	
    58	/**
    59	 * Ownership marker. An exact title match is NOT proof of ownership — a human can
    60	 * open an issue with the same title, and the review demonstrated the upsert
    61	 * overwriting one. Only an issue whose body carries this marker was written by
    62	 * this workflow, so only such an issue may be rewritten.
    63	 */
    64	export const OWNER_MARKER = '<!-- nexus-heartbeat:v1 -->';
    65	
    66	export const DECLARED_GATES = Object.freeze([
    67	  'verify:readiness',
    68	  'verify:docs-watch',
    69	  'verify:docs-review',
    70	]);
    71	
    72	const STATUS_LABEL = Object.freeze({
    73	  PASS: 'PASS',
    74	  FAIL: 'FAIL',
    75	  NOT_RUN: 'NOT RUN',
    76	});
    77	
    78	/**
    79	 * Rebuilds the full declared gate list from whatever the capture step produced.
    80	 *
    81	 * A gate missing from the capture NEVER RAN — it is reported NOT RUN rather than
    82	 * dropped, because a dropped row reads exactly like a passing one. A gate present
    83	 * with an unrecognised status is also NOT RUN: an unknown token must not be
    84	 * rendered verbatim into a table a human scans for the word PASS.
    85	 *
    86	 * Returns `{ gates, anomalies }`. `anomalies` is non-empty whenever the capture
    87	 * disagreed with the declaration, and the caller must surface it.
    88	 */
    89	export function reconcileGates(declared, captured) {
    90	  const anomalies = [];
    91	
    92	  /*
    93	   * ZERO DECLARED GATES IS NOT A GREEN RUN.
    94	   *
    95	   * Everything below reconciles the capture AGAINST the declaration, so with an
    96	   * empty declaration there is nothing to disagree with: no gate rows, no
    97	   * anomalies, `failed` false. A report whose Gates table is a bare header,
    98	   * published as a success. Vacuous green — the same defect class as a required
    99	   * CI job passing with every suite skipped, which is the entire subject of the
   100	   * sibling branch.
   101	   *
   102	   * The declaration is the one input that cannot be allowed to fail soft,
   103	   * because it is what every other check is measured against. Duplicates matter
   104	   * too: `byName` is keyed by name, so a duplicated declaration silently reports
   105	   * one gate under two rows and the count stops meaning anything.
   106	   */
   107	  /*
   108	   * THE DECLARATION IS COPIED THROUGH A CHANNEL THE CALLER CANNOT INTERPOSE ON.
   109	   *
   110	   * `Array.isArray` returns TRUE for a Proxy over an array, and `.filter` is an
   111	   * own property anyone can override — so `[42]` with its own `filter` returning
   112	   * `['verify:readiness']`, and a Proxy over `[]` whose traps report length 1,
   113	   * both reached a green run with one PASS gate while the underlying array held
   114	   * nothing valid. Every check below was reading values the caller synthesised
   115	   * for it.
   116	   *
   117	   * `structuredClone` cannot be interposed on: it walks internal slots, throws
   118	   * DataCloneError on a Proxy (verified, not assumed), and returns a genuine
   119	   * plain array otherwise — so own-property overrides do not survive the copy.
   120	   * Everything downstream reads the CLONE, never the argument.
   121	   *
   122	   * A clone failure is an anomaly rather than a crash, because this is a
   123	   * reporter: it must publish "the declaration could not be read" rather than
   124	   * die and publish nothing.
   125	   */
   126	  let declaredList = [];
   127	  let cloneFailed = false;
   128	  try {
   129	    const cloned = structuredClone(declared);
   130	    declaredList = Array.isArray(cloned) ? cloned : [];
   131	    if (!Array.isArray(cloned)) cloneFailed = !Array.isArray(declared) ? false : true;
   132	  } catch {
   133	    cloneFailed = true;
   134	  }
   135	  if (cloneFailed) {
   136	    anomalies.push(
   137	      'The declared gate list could not be copied into a trusted array, so what it really '
   138	      + 'contains is unknown and nothing can be certified against it.',
   139	    );
   140	  }
   141	  // `Array.prototype.filter.call` rather than `declaredList.filter`, so an own
   142	  // `filter` on a plain array cannot choose its own answer either.
   143	  const usableNames = Array.prototype.filter.call(
   144	    declaredList,
   145	    (name) => typeof name === 'string' && name.trim() !== '',
   146	  );
   147	  if (cloneFailed || !Array.isArray(declared) || declaredList.length === 0) {
   148	    anomalies.push(
   149	      'No gates are declared, so this run certifies nothing. An empty declaration cannot be '
   150	      + 'reported as a pass.',
   151	    );
   152	  } else if (usableNames.length !== declaredList.length) {
   153	    anomalies.push(
   154	      `${declaredList.length - usableNames.length} declared gate(s) have no usable name, so the `
   155	      + 'declaration cannot be reconciled against the capture.',
   156	    );
   157	  } else if (new Set(usableNames).size !== usableNames.length) {
   158	    anomalies.push(
   159	      'The same gate is declared more than once, so one result would be reported under two rows.',
   160	    );
   161	  } else {
   162	    /*
   163	     * A SUBSET OF THE REQUIRED GATES IS NOT A GREEN RUN EITHER.
   164	     *
   165	     * Two rounds ago I refused an EMPTY declaration and stopped there. Declaring
   166	     * ONE of the three required gates then produced a perfectly green heartbeat
   167	     * certifying a third of what the report claims — no anomaly, `failed` false,
   168	     * a Gates table with one PASS row and no sign the other two exist.
   169	     *
   170	     * That is the vacuous-green defect one level up from where I fixed it, and
     1	// Lazy, fail-safe Stripe client for Nexus (UNI-2328).
     2	// Returns null when STRIPE_SECRET_KEY is unset so the app boots and CI builds
     3	// without credentials — every caller must handle the null case (graceful
     4	// degradation, per src/lib/integrations/CLAUDE.md). apiVersion is intentionally
     5	// omitted so the pinned SDK default is used (avoids a brittle literal-type pin).
     6	
     7	import Stripe from 'stripe'
     8	
     9	let cached: Stripe | null | undefined
    10	
    11	export function getStripe(): Stripe | null {
    12	  if (cached !== undefined) return cached
    13	  const key = process.env.STRIPE_SECRET_KEY?.trim()
    14	  cached = key ? new Stripe(key) : null
    15	  return cached
    16	}
    17	
    18	export function isStripeConfigured(): boolean {
    19	  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
    20	}
     1	{
     2	  "compilerOptions": {
     3	    "target": "ES2022",
     4	    "lib": [
     5	      "ES2022",
     6	      "DOM",
     7	      "DOM.Iterable"
     8	    ],
     9	    "jsx": "react-jsx",
    10	    "module": "esnext",
    11	    "moduleResolution": "bundler",
    12	    "strict": true,
    13	    "skipLibCheck": true,
    14	    "esModuleInterop": true,
    15	    "forceConsistentCasingInFileNames": true,
    16	    "resolveJsonModule": true,
    17	    "isolatedModules": true,
    18	    "noEmit": true,
    19	    "incremental": true,
    20	    "types": [
    21	      "node",
    22	      "react",
    23	      "react-dom",
    24	      "vitest/globals"
    25	    ],
    26	    "plugins": [
    27	      {
    28	        "name": "next"
    29	      }
    30	    ],
    31	    "paths": {
    32	      "@/*": [
    33	        "./src/*"
    34	      ]
    35	    },
    36	    "allowJs": true
    37	  },
    38	  "include": [
    39	    "next-env.d.ts",
    40	    "src/**/*.ts",
    41	    "src/**/*.tsx",
    42	    "tests/**/*.ts",
    43	    "tests/**/*.tsx",
    44	    "vitest.config.ts",
    45	    "next.config.ts",
    46	    "instrumentation.ts",
    47	    ".next/types/**/*.ts",
    48	    ".next/dev/types/**/*.ts"
    49	  ],
    50	  "exclude": [
    51	    "node_modules",
    52	    ".next",
    53	    "external",
    54	    "NodeJS-Starter-V1",
    55	    "scripts",
    56	    "logs",
    57	    "next",
    58	    "packages",
    59	    "sentry.client.config.ts",
    60	    "sentry.server.config.ts",
    61	    "sentry.edge.config.ts",
    62	    "**/__tests__/**",
    63	    "**/*.test.ts",
    64	    "**/*.test.tsx",
    65	    "**/*.spec.ts",
    66	    "**/*.spec.tsx"
    67	  ]
    68	}
     1	import { defineConfig } from 'vitest/config';
     2	import tsconfigPaths from 'vite-tsconfig-paths';
     3	import path from 'path';
     4	
     5	/**
     6	 * Vitest Configuration — Unite-Group Nexus 2.0
     7	 *
     8	 * Unit + integration tests for all Nexus 2.0 source files.
     9	 * E2E tests use Playwright (playwright.config.ts).
    10	 */
    11	
    12	export default defineConfig({
    13	  plugins: [tsconfigPaths()],
    14	  test: {
    15	    globals: true,
    16	    environment: 'node',
    17	    projects: [
    18	      {
    19	        extends: true,
    20	        test: {
    21	          name: 'node',
    22	          environment: 'node',
    23	          include: ['src/**/*.test.ts'],
    24	          exclude: ['src/components/**/*.test.ts', 'src/**/*.test.tsx'],
    25	        },
    26	      },
    27	      {
    28	        extends: true,
    29	        test: {
    30	          name: 'jsdom',
    31	          environment: 'jsdom',
    32	          include: ['src/**/*.test.tsx', 'src/components/**/*.test.ts'],
    33	        },
    34	      },
    35	    ],
    36	    setupFiles: ['./vitest.setup.ts'],
    37	    exclude: [
    38	      '**/node_modules/**',
    39	      '**/dist/**',
    40	      '**/.next/**',
    41	      '**/coverage/**',
    42	      'external/**',
    43	      '**/tests/**',                          // v1 legacy test suite — references deleted modules
    44	      '**/*.spec.ts',                         // Playwright E2E — use `pnpm playwright test` instead
    45	      '**/e2e/**',
    46	      'apps/web/**',                          // apps/web has its own @/ alias (apps/web root), incompatible with root config
    47	      'packages/veritas-kanban-mcp/web/**',   // separate package with own vitest.config.ts
    48	      'NodeJS-Starter-V1/**',                 // separate project — has its own test setup
    49	      '.claude/worktrees/**',                 // git worktrees — each runs tests against its own src/
    50	    ],
    51	    coverage: {
    52	      provider: 'v8',
    53	      reporter: ['text', 'json', 'html', 'lcov'],
    54	      include: [
    55	        'src/lib/**/*.ts',
    56	        'src/app/api/**/*.ts',
    57	        'src/components/ui/**/*.tsx',
    58	        'src/hooks/**/*.ts',
    59	      ],
    60	      exclude: [
    61	        'node_modules/',
    62	        '**/*.test.ts',
    63	        '**/*.test.tsx',
    64	        '**/*.spec.ts',
    65	        '**/types.ts',
    66	        '**/index.ts',
    67	      ],
    68	      thresholds: {
    69	        lines: 80,
    70	        functions: 80,
    71	        branches: 75,
    72	        statements: 80,
    73	      },
    74	    },
    75	    testTimeout: 30000,
    76	    hookTimeout: 30000,
    77	  },
    78	  resolve: {
    79	    alias: {
    80	      '@': path.resolve(__dirname, './src'),
    81	      '@config': path.resolve(__dirname, './config'),
    82	    },
    83	  },
    84	});

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc "rg -n 'sandbox|mirror|branch|project.ref' scripts/sandbox-wizard.sh; rg --files | rg '(migration_drift.py|sandbox-wizard.sh)"'$'"'; rg -n 'type-check|lint|prebuild' apps/web/package.json; rg -n 'typecheck|expectTypeOf' apps/web/vitest.config* apps/web/package.json; nl -ba apps/web/src/app/api/leads/__tests__/route.test.ts | head -n 110; nl -ba apps/web/src/lib/notifications/__tests__/index.test.ts | head -n 75; nl -ba .claude/rules/ground-truth-standard.md | tail -n 42" in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
rg: scripts/sandbox-wizard.sh: IO error for operation on scripts/sandbox-wizard.sh: No such file or directory (os error 2)
11:    "prebuild": "node scripts/sync-portfolio-registry.mjs && node scripts/sync-founder-queue.mjs && node scripts/sync-capability-registry.mjs && node scripts/validate-env.mjs --ci",
15:    "lint": "eslint src/",
16:    "lint:all": "turbo run lint",
17:    "type-check": "tsc --noEmit",
18:    "type-check:all": "turbo run type-check",
50:    "@eslint/eslintrc": "^3.3.6",
65:    "@typescript-eslint/eslint-plugin": "^8.63.0",
66:    "@typescript-eslint/parser": "^8.63.0",
76:    "eslint": "^9.39.3",
77:    "eslint-config-next": "^16.2.11",
78:    "eslint-plugin-react": "^7.37.5",
79:    "eslint-plugin-react-hooks": "^7.1.1",
215:  "lint-staged": {
217:      "eslint --fix",
     1	import { describe, it, expect, vi, beforeEach } from 'vitest'
     2	
     3	// --- Supabase service mock: per-table FIFO queues + write capture --------
     4	let responses: Record<string, any[]>
     5	let inserts: Array<{ table: string; payload: any }>
     6	
     7	function makeChain(table: string) {
     8	  const next = () => {
     9	    const queue = responses[table] ?? []
    10	    return queue.shift() ?? { data: null, error: null }
    11	  }
    12	  const b: Record<string, any> = {
    13	    select: vi.fn(),
    14	    eq: vi.fn(),
    15	    order: vi.fn(),
    16	    insert: vi.fn(),
    17	    single: vi.fn(() => Promise.resolve(next())),
    18	    maybeSingle: vi.fn(() => Promise.resolve(next())),
    19	    then(onFulfilled: any, onRejected: any) {
    20	      return Promise.resolve(next()).then(onFulfilled, onRejected)
    21	    },
    22	  }
    23	  b.select.mockReturnValue(b)
    24	  b.eq.mockReturnValue(b)
    25	  b.order.mockReturnValue(b)
    26	  b.insert.mockImplementation((payload: any) => {
    27	    inserts.push({ table, payload })
    28	    return b
    29	  })
    30	  return b
    31	}
    32	
    33	const mockFrom = vi.fn((table: string) => makeChain(table))
    34	
    35	vi.mock('@/lib/supabase/service', () => ({
    36	  createServiceClient: vi.fn(() => ({ from: mockFrom })),
    37	}))
    38	
    39	import { POST } from '../route'
    40	
    41	function req(body: unknown, headers: Record<string, string> = {}) {
    42	  return new Request('https://app.test/api/leads', {
    43	    method: 'POST',
    44	    body: typeof body === 'string' ? body : JSON.stringify(body),
    45	    headers,
    46	  }) as any
    47	}
    48	
    49	const VALID_LEAD = { first_name: 'Jane', email: 'Jane@Example.com' }
    50	
    51	describe('POST /api/leads', () => {
    52	  beforeEach(() => {
    53	    vi.clearAllMocks()
    54	    vi.unstubAllEnvs()
    55	    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    56	    responses = {}
    57	    inserts = []
    58	  })
    59	
    60	  it('returns 500 when FOUNDER_USER_ID is not configured', async () => {
    61	    vi.stubEnv('FOUNDER_USER_ID', '')
    62	    const res = await POST(req(VALID_LEAD))
    63	    expect(res.status).toBe(500)
    64	  })
    65	
    66	  it('returns 400 on invalid JSON', async () => {
    67	    const res = await POST(req('not-json'))
    68	    expect(res.status).toBe(400)
    69	  })
    70	
    71	  it('returns 400 when first_name is missing', async () => {
    72	    const res = await POST(req({ email: 'jane@example.com' }))
    73	    expect(res.status).toBe(400)
    74	    expect(await res.json()).toMatchObject({ error: 'first_name is required' })
    75	  })
    76	
    77	  it('returns 400 when email is invalid', async () => {
    78	    const res = await POST(req({ first_name: 'Jane', email: 'not-an-email' }))
    79	    expect(res.status).toBe(400)
    80	  })
    81	
    82	  it('captures a lead with founder scoping, source, request metadata, and a sanitized CRM timeline event', async () => {
    83	    responses.crm_leads = [{ data: { id: 'lead-1' }, error: null }]
    84	
    85	    const res = await POST(
    86	      req(
    87	        {
    88	          ...VALID_LEAD,
    89	          phone: '0400 000 000',
    90	          business_key: 'dr',
    91	          marketing_consent: true,
    92	        },
    93	        { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'vitest' }
    94	      )
    95	    )
    96	
    97	    expect(res.status).toBe(201)
    98	    expect(await res.json()).toMatchObject({ id: 'lead-1' })
    99	    const insert = inserts.find((i) => i.table === 'crm_leads')
   100	    expect(insert?.payload).toMatchObject({
   101	      founder_id: 'founder-1',
   102	      first_name: 'Jane',
   103	      email: 'jane@example.com',
   104	      source: 'website_form',
   105	      marketing_consent: true,
   106	      ip_address: '203.0.113.7',
   107	      user_agent: 'vitest',
   108	      additional_data: { business_key: 'dr' },
   109	    })
   110	
     1	import { beforeEach, describe, expect, it, vi } from 'vitest'
     2	
     3	const serviceMocks = vi.hoisted(() => ({
     4	  hasSupabaseServiceConfig: vi.fn(),
     5	  createServiceClient: vi.fn(),
     6	  from: vi.fn(),
     7	  select: vi.fn(),
     8	  eq: vi.fn(),
     9	  single: vi.fn(),
    10	}))
    11	
    12	vi.mock('@/lib/supabase/service', () => ({
    13	  hasSupabaseServiceConfig: serviceMocks.hasSupabaseServiceConfig,
    14	  createServiceClient: serviceMocks.createServiceClient,
    15	}))
    16	
    17	vi.mock('../slack', () => ({
    18	  formatSlackNotification: vi.fn(),
    19	  sendSlack: vi.fn(),
    20	}))
    21	
    22	import { notify, type NotificationPayload } from '../index'
    23	
    24	const payload: NotificationPayload = {
    25	  type: 'cron_complete',
    26	  title: 'Daily run complete',
    27	  body: 'The daily run completed.',
    28	  severity: 'info',
    29	}
    30	
    31	describe('notify founder identity', () => {
    32	  beforeEach(() => {
    33	    vi.clearAllMocks()
    34	    vi.unstubAllEnvs()
    35	    serviceMocks.hasSupabaseServiceConfig.mockReturnValue(true)
    36	    serviceMocks.single.mockResolvedValue({
    37	      data: {
    38	        notification_slack: false,
    39	        notification_digest: false,
    40	        slack_webhook_url: null,
    41	        slack_channel: null,
    42	      },
    43	      error: null,
    44	    })
    45	    serviceMocks.eq.mockReturnValue({ single: serviceMocks.single })
    46	    serviceMocks.select.mockReturnValue({ eq: serviceMocks.eq })
    47	    serviceMocks.from.mockReturnValue({ select: serviceMocks.select })
    48	    serviceMocks.createServiceClient.mockReturnValue({ from: serviceMocks.from })
    49	  })
    50	
    51	  it('trims the founder ID before querying user_settings', async () => {
    52	    vi.stubEnv('FOUNDER_USER_ID', '  founder-uuid\r\n')
    53	
    54	    await notify(payload)
    55	
    56	    expect(serviceMocks.from).toHaveBeenCalledWith('user_settings')
    57	    expect(serviceMocks.eq).toHaveBeenCalledWith('user_id', 'founder-uuid')
    58	  })
    59	
    60	  it.each([
    61	    ['missing', undefined],
    62	    ['whitespace-only', ' \n\t'],
    63	  ])('fails closed for a %s founder ID before DB-backed channel work', async (_label, founderId) => {
    64	    vi.stubEnv('FOUNDER_USER_ID', founderId)
    65	
    66	    await notify(payload)
    67	
    68	    expect(serviceMocks.hasSupabaseServiceConfig).not.toHaveBeenCalled()
    69	    expect(serviceMocks.createServiceClient).not.toHaveBeenCalled()
    70	    expect(serviceMocks.from).not.toHaveBeenCalled()
    71	  })
    72	})
   163	  passing count is not a claim about coverage; a test whose name promises more
   164	  than its body asserts is a defect (the PR #1009 shape —
   165	  `scripts/swarm/selftest.mjs:5-9`).
   166	- **Stage discipline.** No silent fallback to an earlier stage and no
   167	  stage-inflation past the receipts (execution-mode-transition's invariant, bound
   168	  monorepo-wide via UNI-2517). A blocked stage is declared `BLOCKED` with the
   169	  blocker named.
   170	- **Boundaries.** PR base = `main`, always (by reference, `CLAUDE.md` /
   171	  `AGENTS.md` — this rule owns the stranded-stack scar, PRs #281–283 → #285).
   172	
   173	## What this rule does not enforce (named honestly)
   174	
   175	- **G7** — a dead-doctrine detector (a check that every cited workflow/gate still
   176	  exists). Recommended follow-up; until then this rule cites only enforcement
   177	  verified alive on 18/08/2026.
   178	- **G8** — a precedence rule between the doctrine layers (root `.claude/` vs
   179	  `apps/web/.claude/` vs `docs/constitution/`). This rule states its own precedence
   180	  (UNI-2517 wins on lifecycle; the constitution wins on classes) but does not
   181	  legislate for others.
   182	- **G10** — mechanical enforcement of the required lines (a CI grep) and a root
   183	  SessionStart hook. Recommended first follow-up — it is the cheapest way to make
   184	  this rule enforced rather than advisory, per "the constraint is enforcement, not
   185	  doctrine".
   186	- **Rungs 9–12 today.** This rule demands the evidence chain reach payment; it
   187	  cannot wire billing. Stripe (F7) and Xero (F3) are founder-held connections, and
   188	  no acceptance/handover/payment registers exist yet — so rungs 9–12 currently
   189	  rate `FAIL — ABSENT` for most work. That is the honest reading, not a defect in
   190	  the work.
   191	
   192	## Banned in the build & delivery phase
   193	
   194	Everything banned by `.claude/rules/fabel-evidence-standard.md` stays banned.
   195	Additionally, without the evidence named:
   196	
   197	"per the handoff / as established last session" without a fresh read · "the tests
   198	were already passing" without a fresh run · "N tests passed" as proof of behaviour
   199	· "not configured" when the fact is "unavailable from here" · a green message
   200	without its exit code · "reviewed by N agents" when the lenses are not
   201	demonstrably independent · "done / complete / shipped" at PR_OPEN or merge ·
   202	"done / complete / shipped / live" accompanied by any rating below AAA at the
   203	claimed rung · "armed / live / delivered" backed only by a document or a commit
   204	· any rating rounded up past the minimum across claimed rungs.

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc "node -e 'console.log(new Intl.NumberFormat(\"en-AU\", {style:\"currency\",currency:\"AUD\"}).format(12345)); const poll=86400; const created=-60; console.log(JSON.stringify({firstPollAgeSeconds:-created,eligibleAtFirstPoll:-created>120,nextPollAgeSeconds:poll-created,eligibleAtNextPoll:poll-created<=86400})); const prior={capturedAt:0,id:\"a\",log:null}; console.log(JSON.stringify({firstRequestHasPriorSent:false,secondRequestHasPriorSent:prior.log?.email===\"sent\",uniqueSubjects:[\"a\",\"b\"]}));'" in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
$12,345.00
{"firstPollAgeSeconds":60,"eligibleAtFirstPoll":false,"nextPollAgeSeconds":86460,"eligibleAtNextPoll":false}
{"firstRequestHasPriorSent":false,"secondRequestHasPriorSent":false,"uniqueSubjects":["a","b"]}

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc "rg --files --hidden -g '"'!node_modules'"' -g '"'!.git'"' | rg '(sandbox-wizard.sh|migration_drift.py)"'$'"'; nl -ba apps/web/src/app/privacy-policy/page.tsx | sed -n '60,160p'; rg -n 'stripe_events|crm_leads' apps/web/src/app/api apps/web/src/lib --glob '*.ts' | head -n 45; rg -n 'Grounded|Waterline' .claude/rules/ground-truth-standard.md" in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
    60	            {COMPANY} ({companyAbnLabel()}) (&#8220;we&#8221;, &#8220;our&#8221;, &#8220;us&#8221;) operates the Unite-Group Application
    61	            (the &#8220;Application&#8221;) available at{' '}
    62	            <a href={APP_URL} style={{ color: '#15803d' }}>{APP_URL}</a>. This Privacy Policy explains
    63	            how we collect, use, disclose, and safeguard information in connection with the Application.
    64	          </p>
    65	          <p>
    66	            The Application is a private, single-operator business management platform. It is not a public-facing
    67	            SaaS product and is not intended for use by the general public. By accessing or using the Application,
    68	            you acknowledge this policy.
    69	          </p>
    70	          <p>
    71	            We are bound by the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs)
    72	            contained in that Act. Where we interact with users or data subjects in the European Economic Area,
    73	            we also comply with the General Data Protection Regulation (GDPR) to the extent applicable.
    74	          </p>
    75	        </Section>
    76	
    77	        <Section title="2. Information We Collect">
    78	          <SubHeading>2.1 Account and Authentication Data</SubHeading>
    79	          <p>
    80	            We use Google OAuth (via Supabase Auth) for sign-in. When you authenticate, we receive your
    81	            Google account email address, name, and profile picture. We do not receive or store your Google password.
    82	          </p>
    83	
    84	          <SubHeading>2.2 Third-Party Integration Data</SubHeading>
    85	          <p>
    86	            The Application connects to third-party services on your behalf. The following data may be accessed
    87	            and stored in an encrypted credentials vault:
    88	          </p>
    89	          <ul>
    90	            <li><strong>Xero:</strong> OAuth access tokens, refresh tokens, and tenant identifiers for linked Xero organisations. Financial data (invoices, transactions, revenue figures) is fetched in real time and may be temporarily cached.</li>
    91	            <li><strong>Gmail / Google Calendar / Google Drive:</strong> OAuth tokens permitting read and send access to email, calendar events, and Drive documents. Message content, calendar entries, and file metadata are processed locally within the Application and not transferred to third parties.</li>
    92	            <li><strong>Linear:</strong> API token for project and issue management. Issue titles, descriptions, and status updates are accessed.</li>
    93	            <li><strong>Social Platforms (Facebook, LinkedIn, TikTok):</strong> OAuth tokens for publishing and analytics. Post content and engagement metrics are accessed.</li>
    94	          </ul>
    95	          <p>
    96	            All OAuth tokens are encrypted at rest using AES-256-GCM via the Supabase Vault (pgsodium). Tokens
    97	            are stored in a private Supabase PostgreSQL database hosted on Supabase&#8217;s AWS infrastructure
    98	            in ap-southeast-2 (Sydney).
    99	          </p>
   100	
   101	          <SubHeading>2.3 Usage and Technical Data</SubHeading>
   102	          <p>
   103	            We collect standard server logs including IP addresses, browser type, pages visited, and timestamps.
   104	            Vercel (our hosting provider) retains deployment and request logs, provides error monitoring via
   105	            Vercel Observability, and Vercel Analytics for aggregated usage data.
   106	          </p>
   107	        </Section>
   108	
   109	        <Section title="3. How We Use Information">
   110	          <p>We use collected information for the following purposes:</p>
   111	          <ul>
   112	            <li>Operating and improving the Application&#8217;s functionality</li>
   113	            <li>Authenticating and authorising access to the Application</li>
   114	            <li>Fetching, displaying, and acting on business data from connected integrations</li>
   115	            <li>Generating reports, dashboards, and AI-assisted insights</li>
   116	            <li>Diagnosing technical errors and maintaining system health</li>
   117	            <li>Complying with legal obligations under Australian law</li>
   118	          </ul>
   119	          <p>
   120	            We do not sell, rent, or share your personal information with third parties for marketing purposes.
   121	            We do not use your data to train AI models or share it with AI providers beyond the minimum required
   122	            to process a given request (e.g., sending an excerpt to the Anthropic API to generate a summary).
   123	          </p>
   124	        </Section>
   125	
   126	        <Section title="4. Google API Scopes">
   127	          <p>
   128	            The Application requests the following Google OAuth scopes to provide its features. Use of
   129	            information received from Google APIs adheres to the{' '}
   130	            <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: '#15803d' }}>
   131	              Google API Services User Data Policy
   132	            </a>
   133	            , including the Limited Use requirements.
   134	          </p>
   135	          <ul>
   136	            <li><code>openid</code>, <code>profile</code>, <code>email</code> — identity and sign-in</li>
   137	            <li><code>gmail.readonly</code>, <code>gmail.modify</code>, <code>gmail.send</code> — email inbox access and outgoing email</li>
   138	            <li><code>calendar.readonly</code> — calendar events for scheduling features</li>
   139	            <li><code>drive.readonly</code> — reading documents from a designated Drive folder for the notes vault</li>
   140	            <li><code>offline_access</code> — refresh tokens so connections persist without repeated sign-in</li>
   141	          </ul>
   142	          <p>
   143	            Data obtained through Google APIs is used solely to provide the Application&#8217;s features to
   144	            the authorised operator. It is not transferred to third parties, used for advertising, or
   145	            combined with data from other sources except as necessary to operate the Application.
   146	          </p>
   147	        </Section>
   148	
   149	        <Section title="5. Data Storage and Security">
   150	          <p>
   151	            All data is stored in a Supabase PostgreSQL database hosted in the <strong>ap-southeast-2 (Sydney)</strong> AWS
   152	            region. Row-Level Security (RLS) policies ensure data is accessible only to the authorised account
   153	            holder.
   154	          </p>
   155	          <p>
   156	            OAuth tokens and credentials are encrypted at rest using AES-256-GCM. Database connections use TLS
   157	            in transit. The Application is hosted on Vercel&#8217;s global edge network with HTTPS enforced.
   158	          </p>
   159	          <p>
   160	            We retain audit logs of sensitive operations (credential access, financial data changes) for a
apps/web/src/app/api/leads/route.ts:2:// Public website lead capture → crm_leads (UNI-2355), with optional
apps/web/src/app/api/leads/route.ts:6:// crm_leads has FORCED RLS with founder-only policies and deliberately NO anon
apps/web/src/app/api/leads/route.ts:187:    .from('crm_leads')
apps/web/src/app/api/leads/__tests__/route.test.ts:83:    responses.crm_leads = [{ data: { id: 'lead-1' }, error: null }]
apps/web/src/app/api/leads/__tests__/route.test.ts:99:    const insert = inserts.find((i) => i.table === 'crm_leads')
apps/web/src/app/api/leads/__tests__/route.test.ts:143:    responses.crm_leads = [{ data: null, error: { message: 'boom' } }]
apps/web/src/app/api/leads/__tests__/route.test.ts:149:    responses.crm_leads = [{ data: { id: 'lead-1' }, error: null }]
apps/web/src/app/api/leads/__tests__/route.test.ts:183:    responses.crm_leads = [{ data: { id: 'lead-1' }, error: null }]
apps/web/src/app/api/leads/__tests__/route.test.ts:199:      responses = { crm_leads: [{ data: { id: 'lead-1' }, error: null }] }
apps/web/src/app/api/leads/__tests__/route.test.ts:210:      expect(inserts.some((i) => i.table === 'crm_leads')).toBe(true)
apps/web/src/app/api/command-centre/crm/approvals/[id]/process/__tests__/route.test.ts:46:// update, plus the real lead_conversion executor's crm_leads/crm_contacts calls.
apps/web/src/app/api/command-centre/crm/approvals/[id]/process/__tests__/route.test.ts:79:      if (table === 'crm_leads') {
apps/web/src/lib/crm/executors/lead-conversion.ts:12:// crm_leads.status='converted' + converted_at. `converted_client_id` is left null
apps/web/src/lib/crm/executors/lead-conversion.ts:58:  from(table: 'crm_leads'): {
apps/web/src/lib/crm/executors/lead-conversion.ts:76:  /** The crm_leads.id this approval converts. */
apps/web/src/lib/crm/executors/lead-conversion.ts:89:  if (!subjectId) throw new Error('lead_conversion: subjectId (crm_leads.id) is required')
apps/web/src/lib/crm/executors/lead-conversion.ts:91:  const read = await client.from('crm_leads').select(LEAD_COLS).eq('id', subjectId).eq('founder_id', founderId).single()
apps/web/src/lib/crm/executors/lead-conversion.ts:123:    .from('crm_leads')
apps/web/src/lib/crm/executors/__tests__/lead-conversion.test.ts:31:      if (table === 'crm_leads') {
apps/web/src/lib/crm/crm-auto-executor.ts:45:  /** The subject row id the approval acts on (e.g. crm_leads.id for lead_conversion). */
apps/web/src/app/api/webhooks/stripe/route.ts:4:// `stripe_events` ledger. This is the audited baseline: NO domain dispatch yet
apps/web/src/app/api/webhooks/stripe/route.ts:42:  const { error } = await admin.from('stripe_events').insert({
apps/web/src/lib/command-centre/overnight-summary.ts:218:        .from('crm_leads')
apps/web/src/lib/command-centre/__tests__/overnight-summary.test.ts:216:      crm_leads: [
apps/web/src/lib/command-centre/__tests__/overnight-summary.test.ts:260:    expect(calls.filter((call) => call.table === 'crm_leads')[0]?.filters).toContainEqual(['founder_id', 'f'])
apps/web/src/lib/command-centre/__tests__/overnight-summary.test.ts:269:      crm_leads: leads,
apps/web/src/lib/command-centre/__tests__/overnight-summary.test.ts:287:      crm_leads: [],
apps/web/src/lib/command-centre/__tests__/overnight-summary.test.ts:289:    }, calls, { crm_leads: 'permission denied' })
apps/web/src/lib/command-centre/__tests__/overnight-summary.test.ts:301:    expect(calls.filter((call) => call.table === 'crm_leads')[0]?.filters).toContainEqual(['founder_id', 'f'])
15:> amends either.** It binds to the Waterline autonomy classes
16:> (`docs/constitution/EPIC-000-nexus-engineering-constitution.md`, §"The Waterline"
40:| P1 | **Rebuild the theory from the artefact.** You are a permanently theory-less programmer; another agent's prose is hearsay. Re-derive every load-bearing fact from the real folder, real log, real schema, real `git log` — this session. | Naur 1985; Thompson 1984 | A handoff said "main @ `8585c147`, safe to stop"; main was 116 commits ahead | Before acting on an inherited claim: name the primary artefact, read it, emit a `Grounded` line — or write the claim `[UNCONFIRMED]`. |
48:| P9 | **Know your rung; never claim a later one.** Every session states which Ladder rung its work is on; a later-stage claim without the earlier stage's boundary evidence is a defect. Iterating backwards is fine — silently falling back is not. | Royce 1970; Parnas & Clements 1986 | "stale-DELIVERED" claimed for a file never touched (UNI-2288); 183 Done tickets with zero merge evidence (DR estate — `docs/decisions/ARR-005-strategic-roadmap.md:29`) | Every deliverable carries the `Waterline:` line. "Done / complete / shipped" is only utterable at the rung whose evidence exists. |
106:1. **Grounded** — per re-derived fact; this is the line that kills the whispers
109:   `Grounded <DD/MM/YYYY>: <fact> — <source>`
122:   load-bearing inherited fact either gets its own Grounded line (re-derived) or
126:2. **Waterline** — per deliverable; carries the rung (P9):
128:   `Waterline: Class <0-3> · Stage <UNI-2517 state> (rung <n>/12 <name>) · <AAA|AA|A|FAIL> — evidence: <receipt>[ · <receipt>…]`
149:greppable (`^Grounded |^Waterline: |^Bypass attempt:`).
156:  its own `Grounded` lines so the orchestrator can re-run the exact sources.

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
codex
The daily health poll has a blind spot: a lost alert from one minute before a poll is too new to count, then falls outside the 24-hour window before the next poll. I also confirmed that the prescribed type-check excludes test files, so it cannot catch the acceptance criterion’s overload-type mutation.
hook: PreToolUse
hook: PreToolUse Completed
exec
/bin/zsh -lc "rg -n 'Prod|branch|migration' CLAUDE.md | head -n 12; node -e 'try { new URL(\"\\\"https://example.invalid/SENTINEL-WEBHOOK\\\"\") } catch (e) { console.log(JSON.stringify({name:e.name,rejectedBeforeSender:true})) }'; nl -ba .claude/done/spm/2026-10-24-enquiry-alerts/spec.md | tail -n 31" in /Volumes/Mini Mini 2T Storage/worktrees/Unite-Group/spec-enquiry-alerts
 succeeded in 0ms:
41:- **DB**: validate every schema change/migration on a **Supabase database
42:  branch** before prod. There is no standing sandbox — the old mirror project
43:  (`xgqwfwqumliuguzhshwv`) was deleted 15/06/2026 and won't be replaced. Prod
44:  (`lksfwktwtmyznckodsau`) moves only via a merged, approved branch — never apply
46:  See `apps/empire/CLAUDE.md` for the workflow. See `supabase-db-branch` skill for the branch process.
58:  stack a PR on another feature branch. Stacked PRs merge into their base
59:  branch and strand the work there (it never reaches `main`); see the
61:  `codex/mobile-voice-intake`, recovered via #285). One issue → one branch off
144:`db-supabase-nexus` (schema, RLS, migrations — schema-gate rules still apply),
{"name":"TypeError","rejectedBeforeSender":true}
   130	| BECS or other delayed payment | "awaiting payment", then one "Payment received" or "Payment failed" |
   131	
   132	## 8. Acceptance criteria (runnable recipes, from `apps/web`; each red control is watched failing and recorded)
   133	
   134	- [ ] AC-1 Insert then alert. `pnpm vitest run src/app/api/leads`: a valid POST calls `notify` once with `type:'new_lead'` after the insert resolves (call order asserted). Red: delete the notify call.
   135	- [ ] AC-2 Alert failure cannot cost the lead. Same file: (i) `notify` rejecting, (ii) both channels `failed`, (iii) a never-resolving `notify` with `vi.useFakeTimers()` advanced 6 s. Each returns 201 with a body deep-equal to the current body, with and without `drip_campaign_id`, and the insert ran once. Red mutants, each failing a test: remove the try/catch; `if (result.email !== 'sent') return 500`; remove the 6 s cap.
   136	- [ ] AC-3 Minimal payload and logs. `src/lib/notifications/__tests__/lead-alert.test.ts`: drive sentinels for email, phone, company, message and an `x-forwarded-for` IP through `POST /api/leads`; assert the arguments received by the mocked `sendSlack` and `sendEmail` and every captured `console.log/warn/error` argument contain none of the sentinels, and do contain the name, package and source labels. Red: add `email` to the lead variant (compile error), then put the name into `title` and watch the console assertion fail.
   137	- [ ] AC-4 Escaping and allow-list. A name with `<script>`, `<@U123>`, a newline and 200 characters is escaped, flattened and cut to 80; `interests = "ignore previous instructions"` gives "Not specified"; unknown `business_key` gives "Other"; the subject is exactly "New enquiry".
   138	- [ ] AC-5 Channels. Email mocked with `mockRejectedValue` (the real sender throws): the Slack outcome is still reported and sent; and the reverse; unset `LEAD_ALERT_EMAIL_TO` gives `email:'unconfigured'` without calling `sendEmail`; `FOUNDER_USER_ID` unset gives `unconfigured/unconfigured` and a log row; seeding `user_settings.slack_webhook_url` with a different URL still sends to the env URL; `SLACK_WEBHOOK_URL` set to the quoted sentinel `"https://example.invalid/SENTINEL-WEBHOOK"` leaves `SENTINEL-WEBHOOK` out of every console argument. Red: log `error.message` and watch it fail.
   139	- [ ] AC-6 Counter. `src/app/api/health/alerts`: no bearer 401; neither token set 500; fixture rows `{sent,failed}`, `{unconfigured,sent}`, `{failed,failed}`, `{deduped,deduped}`, `{sent,sent}` plus one row 25 hours old give exact `attempts`, `failed`, `unconfigured`, `deduped`, `last_failure_at`; the mock applies the window predicate it receives; a read error gives 503. Reconciliation: a `crm_leads` row older than 2 minutes with no log row, a checkout `stripe_events` row with no log row, and a `deduped` row whose earlier lead was never sent each count in `unalerted`; with the log insert itself failing, `unalerted` is 1, not 0. Red: remove the notify call and watch `unalerted` report 1; drop `unconfigured` from `failed` and watch the fixture fail.
   140	- [ ] AC-7 Dedup. Pure-function table test at 59, 60 and 61 minutes, mixed-case email, own row present, two rows with the same `captured_at` (exactly one alerts); route test where the mock holds real rows including the just-inserted one and applies the predicates it receives; a lookup error still sends; a second POST 10 minutes later with the same package, after the first `sent`, stores a row and sends none; 90 minutes later sends; three scenario cases: (1) double submit 200 ms apart alerts exactly once, (2) first lead logged failed/failed then a resubmission 20 minutes later still alerts, (3) a `/grow` enquiry then a `/cards/order` enquiry 30 minutes later alerts both. Red: delete the `(captured_at, id)` clause, then change 60 to 1440.
   141	- [ ] AC-8 Checkout. `src/app/api/webhooks/stripe`: fixtures typed `satisfies Stripe.Event` with a `Stripe.Checkout.Session` in `data.object`; `completed` with `paid` alerts once showing the amount from minor units (12345 aud reads $123.45); `completed` with `unpaid` then `async_payment_succeeded` yields "awaiting payment" then one "Payment received"; `async_payment_failed` yields "Payment failed"; the 23505 path sends none; an alert failure returns 200; other event types send none; no customer field appears in output or console.
   142	- [ ] AC-9 Static and env. `pnpm type-check` and `pnpm lint` exit 0; an `expectTypeOf` test pins that the legacy `notify` variant still returns `Promise<void>` and the lead variant returns `Promise<NotifyResult>` (red: change the legacy return type and watch type-check fail on the test); `node scripts/validate-env.mjs --ci` exits 0 with `LEAD_ALERT_EMAIL_TO` and `ALERT_HEALTH_TOKEN` unset (the build is not blocked), and a test asserts both names are in the INTEGRATION tier. Red: move one to REQUIRED and watch the run fail.
   143	- [ ] AC-10 Migration. On a scratch database via the sandbox wizard: `select to_regclass('public.alert_delivery_log')` is null before and not null after; `relrowsecurity` and `relforcerowsecurity` are both true; `pg_get_constraintdef` shows the founder FK with ON DELETE CASCADE, both outcome CHECKs and the unique index; `information_schema.columns` shows `NO` nullable for all seven columns; inserting a row with a null `email_outcome` is rejected; the forward-migration removal path is written (no raw DROP). Run `migration_drift.py check --root . --db-url "$DRIFT_DB_URL"` and record the exit code (2 = UNPROVEN). Before the production apply: `to_regclass` on production returns null, and the production ledger tail matches `ls apps/web/supabase/migrations | tail`.
   144	- [ ] AC-11 Preview, human-gated. First check the Preview `SLACK_WEBHOOK_URL` record is not the Production record. One TEST submission gives one Slack message and one email, and the health read shows `failed:0, unalerted:0`. Then set a branch-scoped dead but valid-shaped webhook URL: the form still returns 201 and `failed` rises by 1 (observed `failed` path); then blank it and see `unconfigured` rise; restore.
   145	- [ ] AC-12 Stripe test events, human-gated: after Phill registers the test endpoint, `stripe trigger checkout.session.completed` and `stripe trigger checkout.session.async_payment_succeeded` produce the alerts above. Not run by an agent.
   146	- [ ] AC-13 Heartbeat. The workflow step fails on a planted 503 fixture and on `unalerted:1` (recorded red run) and passes on a healthy fixture.
   147	- [ ] AC-14 Production, human-gated, after promote: the health read with the bearer returns 200 with an `attempts` field (404 means the code is not serving, 503 means the table is missing); one production TEST enquiry raises `attempts` by 1 with `failed` unchanged.
   148	
   149	## 9. Rollout and rollback
   150	
   151	Order is a stated step: (1) probe production for a name collision, (2) Phill applies the migration to production (additive; no current code reads the table), (3) confirm `to_regclass` is not null, (4) merge and promote. If code ships before the table, the health read is 503 (visible) and `unalerted` is unreadable, which is why the order matters. With `LEAD_ALERT_EMAIL_TO` unset the form still works and the health read shows `unconfigured` failures, which is visible rather than silent. Rollback: revert the PR (Vercel instant rollback); the table stays. A migration-drift exit of 1 or 2 blocks any claim that the feature is live. Post-deploy proof is `select to_regclass('public.alert_delivery_log')` non-null in production plus the health read returning 200, not 503. Merge, promote, env vars, migration apply and Stripe registration are Phill's.
   152	
   153	## 10. Needs Phill's yes
   154	
   155	1. Slack channel the `SLACK_WEBHOOK_URL` webhook posts into (the code default name is `#nexus-alerts`), with a separate Preview webhook for tests.
   156	2. Email destination for `LEAD_ALERT_EMAIL_TO`, with a separate Preview value.
   157	3. Name in the alert: confirm (a) keep the name and accept the privacy-policy edit plus an erasure step, or (b) drop the name.
   158	4. Set in Vercel, different values for Preview and Production: `LEAD_ALERT_EMAIL_TO`, `SLACK_WEBHOOK_URL`, `ALERT_HEALTH_TOKEN` (also as a GitHub secret for the heartbeat), `STRIPE_WEBHOOK_SECRET`; confirm `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `FOUNDER_USER_ID`, `CRON_SECRET`.
   159	5. Register the checkout webhook endpoint on the card payment account for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`.
   160	6. Apply the `alert_delivery_log` migration to the sandbox, then production, before the merge.

hook: PostToolUse
hook: PostToolUse
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
hook: PostToolUse Completed
codex
VERDICT: FAIL

BLOCKERS:

1. **§4.4 / AC-7; engineering “Concurrency”: dedup does not prevent concurrent alerts.** Request B can query while earlier request A is still sending and has no `sent` log. Both therefore send. Ordering by `(captured_at, id)` provides no synchronisation, and uniqueness on different subject IDs cannot prevent this. Specify an atomic claim/serialisation mechanism and test overlapping requests with A’s delivery held pending. Evidence: `.claude/done/spm/2026-10-24-enquiry-alerts/spec.md:65`, `:74`, `:140`; `engineering.md:49`.

2. **§§4.1, 4.5 / AC-5: missing-founder behaviour is impossible as prescribed.** Every early return must write a log, but `founder_id` is mandatory, references `auth.users`, and comes exclusively from the missing variable. Additionally, the existing lead route returns 500 before inserting, contradicting §7’s promised 201 for this condition. Define distinct lead and checkout behaviour without inventing a founder ID. Evidence: `spec.md:42`, `:70`, `:77`, `:122`; `apps/web/src/app/api/leads/route.ts:153–156`.

3. **§4.6: reconciliation can permanently miss a lost alert.** A lead inserted one minute before the daily poll is excluded by the two-minute grace period. At the next poll it is 24 hours and one minute old, outside the window. Both polls can remain healthy. Persist unresolved gaps or use a polling/window contract that guarantees coverage. Evidence: `spec.md:81–87`; `.github/workflows/nexus-heartbeat.yml:83–84`.

4. **§4.6 / AC-13; engineering “Observability”: failing a workflow step does not ensure issue escalation.** The existing issue publisher derives its verdict from captured evidence for three declared gates. Merely adding a failing HTTP step can leave the published issue green because that result is absent from the report inputs. Require alert-health evidence to reach the issue composer and test the resulting issue body. Evidence: `spec.md:87`, `:146`; `scripts/nexus-heartbeat.mjs:66–70`; `.github/workflows/nexus-heartbeat.yml:272–285`.

5. **§§4.6–4.7: phased reconciliation has no activation boundary.** S2a must count checkout events without logs even though their handler is deliberately withheld until S2b. Existing checkout events will therefore produce false failures. The join is also ambiguous: `stripe_events.id` is a UUID, whereas log subjects use Stripe event IDs; its timestamp is `received_at`. Define phase/cutover eligibility and the exact join keys. Evidence: `spec.md:72`, `:84`, `:91–92`; `apps/web/supabase/migrations/20260711100000_stripe_events.sql:9–16`.

6. **§4.2 / AC-8: the amount instructions contradict the expected output.** `Intl.NumberFormat` formats major units; it does not convert Stripe minor units. Formatting `12345` AUD directly produces `$12,345.00`, not `$123.45`. Specify currency-aware minor-unit conversion before formatting. Evidence: `spec.md:51`, `:141`. Confirmed with a local Node check.

7. **§5 / §10: Stripe configuration omits a required credential and retains removal advice.** The handler returns 503 unless `getStripe()` succeeds, which requires `STRIPE_SECRET_KEY`; the setup checklist only covers the webhook secret. Meanwhile, env validation labels both credentials “safe to remove”. Include the client credential and correct that contradictory validator guidance. Evidence: `spec.md:94–108`, `:158`; `apps/web/src/lib/integrations/stripe/client.ts:11–14`; `apps/web/src/app/api/webhooks/stripe/route.ts:19–22`; `apps/web/scripts/validate-env.mjs:123`, `:140`.

8. **AC-9; engineering “Test oracle”: the required type mutation has no compiler gate.** `pnpm type-check` invokes `tsc --noEmit`, but its configuration excludes test files. Normal Vitest execution does not supply the missing type-check. Thus the prescribed `expectTypeOf` test cannot provide the claimed compiler failure. Add an explicit test-type-check configuration and command. Evidence: `spec.md:142`; `apps/web/package.json:17`; `apps/web/tsconfig.json:62–66`; `apps/web/vitest.config.mts:14–35`.

9. **AC-3: the privacy oracle does not reject its named mutation.** Its forbidden sentinels exclude the visitor’s name; its positive assertions require the name. Moving that name into `title` therefore need not fail, although the router logs titles. Require name presence in channel payloads and name absence from every console argument separately. Evidence: `spec.md:49`, `:136`; `engineering.md:40`; `apps/web/src/lib/notifications/index.ts:65–70`.

10. **§4.3 / AC-5: the secret-leak test bypasses the vulnerable sender path.** The quoted webhook sentinel fails `new URL()` before `sendSlack` runs. It cannot detect the existing sender’s logging of `error.message` after a fetch exception. Add a valid-shaped URL plus a rejected fetch whose error contains the secret sentinel, exercising the real sender. Evidence: `spec.md:58–60`, `:138`; `apps/web/src/lib/notifications/slack.ts:43–46`.

11. **AC-10 / §9; engineering “Migration”: migration verification and rollout cannot run as prescribed.** `pg_get_constraintdef` cannot show a standalone unique index; use an index-catalog assertion. The instructions also require production application before merge, while repository policy permits production changes only through a merged, approved branch. Specify a compliant migration-first release sequence and an executable database-branch validation recipe. Evidence: `spec.md:74`, `:143`, `:151`; `engineering.md:52`; `CLAUDE.md:41–46`.

NON-BLOCKING:

- §2 incorrectly says a `user_settings` read error stops delivery; current code attempts env Slack fallback. Evidence: `apps/web/src/lib/notifications/index.ts:93–97`.
- Provider acceptance is explicitly distinguished from delivery; the deferred delivery-event integration leaves actual email receipt unverified.
- Read-only review at `2bfd888ef3717546d0e0780c2463ef371e31b97c`. No files changed; no application tests or mutation runs performed.
hook: Stop
hook: Stop
hook: Stop
hook: Stop
hook: Stop
hook: Stop Completed
hook: Stop Completed
hook: Stop Completed
hook: Stop Completed
hook: Stop Completed
tokens used
98,258
VERDICT: FAIL

BLOCKERS:

1. **§4.4 / AC-7; engineering “Concurrency”: dedup does not prevent concurrent alerts.** Request B can query while earlier request A is still sending and has no `sent` log. Both therefore send. Ordering by `(captured_at, id)` provides no synchronisation, and uniqueness on different subject IDs cannot prevent this. Specify an atomic claim/serialisation mechanism and test overlapping requests with A’s delivery held pending. Evidence: `.claude/done/spm/2026-10-24-enquiry-alerts/spec.md:65`, `:74`, `:140`; `engineering.md:49`.

2. **§§4.1, 4.5 / AC-5: missing-founder behaviour is impossible as prescribed.** Every early return must write a log, but `founder_id` is mandatory, references `auth.users`, and comes exclusively from the missing variable. Additionally, the existing lead route returns 500 before inserting, contradicting §7’s promised 201 for this condition. Define distinct lead and checkout behaviour without inventing a founder ID. Evidence: `spec.md:42`, `:70`, `:77`, `:122`; `apps/web/src/app/api/leads/route.ts:153–156`.

3. **§4.6: reconciliation can permanently miss a lost alert.** A lead inserted one minute before the daily poll is excluded by the two-minute grace period. At the next poll it is 24 hours and one minute old, outside the window. Both polls can remain healthy. Persist unresolved gaps or use a polling/window contract that guarantees coverage. Evidence: `spec.md:81–87`; `.github/workflows/nexus-heartbeat.yml:83–84`.

4. **§4.6 / AC-13; engineering “Observability”: failing a workflow step does not ensure issue escalation.** The existing issue publisher derives its verdict from captured evidence for three declared gates. Merely adding a failing HTTP step can leave the published issue green because that result is absent from the report inputs. Require alert-health evidence to reach the issue composer and test the resulting issue body. Evidence: `spec.md:87`, `:146`; `scripts/nexus-heartbeat.mjs:66–70`; `.github/workflows/nexus-heartbeat.yml:272–285`.

5. **§§4.6–4.7: phased reconciliation has no activation boundary.** S2a must count checkout events without logs even though their handler is deliberately withheld until S2b. Existing checkout events will therefore produce false failures. The join is also ambiguous: `stripe_events.id` is a UUID, whereas log subjects use Stripe event IDs; its timestamp is `received_at`. Define phase/cutover eligibility and the exact join keys. Evidence: `spec.md:72`, `:84`, `:91–92`; `apps/web/supabase/migrations/20260711100000_stripe_events.sql:9–16`.

6. **§4.2 / AC-8: the amount instructions contradict the expected output.** `Intl.NumberFormat` formats major units; it does not convert Stripe minor units. Formatting `12345` AUD directly produces `$12,345.00`, not `$123.45`. Specify currency-aware minor-unit conversion before formatting. Evidence: `spec.md:51`, `:141`. Confirmed with a local Node check.

7. **§5 / §10: Stripe configuration omits a required credential and retains removal advice.** The handler returns 503 unless `getStripe()` succeeds, which requires `STRIPE_SECRET_KEY`; the setup checklist only covers the webhook secret. Meanwhile, env validation labels both credentials “safe to remove”. Include the client credential and correct that contradictory validator guidance. Evidence: `spec.md:94–108`, `:158`; `apps/web/src/lib/integrations/stripe/client.ts:11–14`; `apps/web/src/app/api/webhooks/stripe/route.ts:19–22`; `apps/web/scripts/validate-env.mjs:123`, `:140`.

8. **AC-9; engineering “Test oracle”: the required type mutation has no compiler gate.** `pnpm type-check` invokes `tsc --noEmit`, but its configuration excludes test files. Normal Vitest execution does not supply the missing type-check. Thus the prescribed `expectTypeOf` test cannot provide the claimed compiler failure. Add an explicit test-type-check configuration and command. Evidence: `spec.md:142`; `apps/web/package.json:17`; `apps/web/tsconfig.json:62–66`; `apps/web/vitest.config.mts:14–35`.

9. **AC-3: the privacy oracle does not reject its named mutation.** Its forbidden sentinels exclude the visitor’s name; its positive assertions require the name. Moving that name into `title` therefore need not fail, although the router logs titles. Require name presence in channel payloads and name absence from every console argument separately. Evidence: `spec.md:49`, `:136`; `engineering.md:40`; `apps/web/src/lib/notifications/index.ts:65–70`.

10. **§4.3 / AC-5: the secret-leak test bypasses the vulnerable sender path.** The quoted webhook sentinel fails `new URL()` before `sendSlack` runs. It cannot detect the existing sender’s logging of `error.message` after a fetch exception. Add a valid-shaped URL plus a rejected fetch whose error contains the secret sentinel, exercising the real sender. Evidence: `spec.md:58–60`, `:138`; `apps/web/src/lib/notifications/slack.ts:43–46`.

11. **AC-10 / §9; engineering “Migration”: migration verification and rollout cannot run as prescribed.** `pg_get_constraintdef` cannot show a standalone unique index; use an index-catalog assertion. The instructions also require production application before merge, while repository policy permits production changes only through a merged, approved branch. Specify a compliant migration-first release sequence and an executable database-branch validation recipe. Evidence: `spec.md:74`, `:143`, `:151`; `engineering.md:52`; `CLAUDE.md:41–46`.

NON-BLOCKING:

- §2 incorrectly says a `user_settings` read error stops delivery; current code attempts env Slack fallback. Evidence: `apps/web/src/lib/notifications/index.ts:93–97`.
- Provider acceptance is explicitly distinguished from delivery; the deferred delivery-event integration leaves actual email receipt unverified.
- Read-only review at `2bfd888ef3717546d0e0780c2463ef371e31b97c`. No files changed; no application tests or mutation runs performed.
