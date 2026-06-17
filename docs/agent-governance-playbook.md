# Agent Governance Playbook — Unite-Group monorepo

> **STATUS: DRAFT — for founder review. NOT ratified doctrine.**
> Fulfils Linear **UNI-2136** ("Design comprehensive Claude Playbook for agent
> governance"). This is a *consolidated index/doctrine* that synthesises the
> governance surface that already exists in this repo. It invents no new policy.
> The authoritative sources remain `CLAUDE.md`, `AGENTS.md`,
> `.claude/FABEL_PLAYBOOK.md`, `.claude/rules/fabel-evidence-standard.md`, and
> the `.claude/skills/*` skills — this document points at them, it does not
> replace them.
>
> Every claim below carries exactly one Evidence Standard tag
> (`[VERIFIED]` / `[INFERENCE]` / `[UNCONFIRMED]`). An untagged claim is a defect.
> Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT.

---

## 1. Purpose & scope

[INFERENCE — from the brief in UNI-2136 + the source set below] This playbook is
the single doctrinal index that governs **all agent activity** in the
`CleanExpo/Unite-Group` monorepo, so that tactical sub-agent work stays aligned
with central orchestrator standards.

**What it governs** [INFERENCE]: the orchestrator↔sub-agent model, the
non-negotiable hard rules, the Evidence Standard, spec-first practice and the
human gate, review/critique governance, and multi-agent/swarm operating rules.

**What stays authoritative** [VERIFIED — `AGENTS.md:1–6`]: "The canonical, full
rules live in **`CLAUDE.md`** and **`SOURCE-OF-TRUTH.md`** — read those first."
This playbook is a derivative index; on any conflict, the cited source file
wins, not this document. [INFERENCE]

| Authority | File | Role |
|---|---|---|
| Canonical rules | `CLAUDE.md`, `SOURCE-OF-TRUTH.md` | Full hard rules; read first [VERIFIED — `AGENTS.md:1–6`] |
| Agent quick-rules | `AGENTS.md` | Restates "rules most often broken by automated agents" [VERIFIED — `AGENTS.md:1–6`] |
| Build rhythm | `.claude/FABEL_PLAYBOOK.md` | The 10 Fable-5 directives + scaffolding [VERIFIED] |
| Evidence rule | `.claude/rules/fabel-evidence-standard.md` | The 3-tag standard, always-on [VERIFIED] |
| Spec-first | `.claude/skills/fable-engine/SKILL.md` | Vague idea → build-ready spec → human gate [VERIFIED] |
| Orchestration | `.claude/skills/fable-prompt-engineer/SKILL.md` (+ `playbooks/convergence.md`) | Master-orchestrator + worker model [VERIFIED] |
| Review board | `.claude/agents/chief-reviewer.md`, `.claude/skills/review-board/review-metrics.md`, `apps/empire/.github/workflows/review-board.yml` | Critique-as-lens + CI gate [VERIFIED] |

---

## 2. The orchestrator ↔ sub-agent model

[VERIFIED — `.claude/skills/fable-prompt-engineer/SKILL.md` §1.1, lines 21–27]
Three roles:

- **Master Orchestrator = Fable 5** — owns the goal, decomposes the programme,
  dispatches and arbitrates. "Never does leaf work itself; never lets a worker
  redefine the goal."
- **Senior Project Manager = Opus 4.8** — turns each phase into a task DAG with
  explicit gates; reviews worker output against acceptance criteria before the
  orchestrator accepts it.
- **Workers = Haiku / Sonnet / Opus** — each executes one scoped task, then
  terminates.

### Model routing [VERIFIED — SKILL.md §1.2, lines 31–38]

| Tier | Use for |
|---|---|
| **Haiku** | Mechanical / high-volume / low-ambiguity: searches, file inventories, renames, lint fixes, classification sweeps |
| **Sonnet** | Standard implementation: porting a route, writing tests, adapting a component, doc drafting |
| **Opus** | Architecture & judgement: schema migrations, merge-conflict resolution, security boundaries, anything touching auth or money |

**Escalation rule** [VERIFIED — SKILL.md §1.2]: escalate UP one tier when a
worker fails once at its tier. "Never route auth, billing, schema, or deletion
decisions below Opus."

### The dispatch contract (mandatory in every sub-agent prompt)

[VERIFIED — SKILL.md §1.3, lines 42–48] Five required elements:
1. **Exact scope** — named files / routes / dirs.
2. **Observable, checkable success criteria.**
3. **File references to read first.**
4. **Constraints** — what NOT to touch (env, secrets, prod DB, other packages).
5. **Output shape** (diff summary, evidence, blockers).

"A dispatch missing any of the five is malformed — rewrite it, don't send it."
[VERIFIED — SKILL.md §1.3]

### Context scoping [VERIFIED — SKILL.md §1.6, lines 67–69]

Each worker gets ONLY its in-scope files (manifest-style allowlist); the
orchestrator holds the global picture, workers hold one slice.

### How tactical work aligns to central standards [INFERENCE — from §1.7 + the Evidence Standard]

A worker's self-report is a claim about its *isolated* context. It only becomes
fact once the orchestrator re-runs the gauntlet on the *integrated tree*
(see §4). This is the connective tissue between local tactical work and central
doctrine. [INFERENCE — reasoned from `fabel-evidence-standard.md:22–28` and
SKILL.md §1.7]

---

## 3. Hard rules (non-negotiable)

Sources: `CLAUDE.md` (§"Hard rules", lines 33–54) and `AGENTS.md` (lines 8–36).
All quotes [VERIFIED — read in-repo].

### 3.1 PR base = `main` / no stacking
[VERIFIED — `CLAUDE.md:48–53`] "**PR base = `main`, always.** Every pull request
must target `main` — never stack a PR on another feature branch… One issue → one
branch off the latest `main` → one PR into `main`." Incident precedent: PRs
#281/#282/#283 stranded on `codex/mobile-voice-intake`, recovered via #285.
[VERIFIED — `AGENTS.md:8–24`] Branch off the latest `main` (`git fetch origin
main` first), open with `--base main`; if work depends on an in-flight branch,
"wait for that branch to merge to `main`, then rebase onto `main` — do not stack."

### 3.2 Supabase DB — database branching; no sandbox; never autonomous prod writes
[VERIFIED — `CLAUDE.md:38–43`] "validate every schema change/migration on a
**Supabase database branch** before prod. There is no standing sandbox — the old
mirror project (`xgqwfwqumliuguzhshwv`) was deleted 15/06/2026 and won't be
replaced. Prod (`lksfwktwtmyznckodsau`) moves only via a merged, approved branch
— never apply to prod directly, never autonomously."
[VERIFIED — `AGENTS.md`] `AGENTS.md` now states the same branch-first workflow as
`CLAUDE.md` (aligned in this PR): validate on a Supabase database branch;
migration *files* may land in `main` but *applying* them to prod is gated —
explicit typed approval, never autonomous.

### 3.3 Evidence Standard tags
[VERIFIED — `.claude/rules/fabel-evidence-standard.md`] Every factual or progress
claim carries exactly one tag; an untagged claim is a defect (see §4 for detail).

### 3.4 founder_id scoping
[VERIFIED — `CLAUDE.md:42`] "founder_id scoping only in apps/web." [INFERENCE —
from `CLAUDE.md:14`] apps/web carries its own `apps/web/CLAUDE.md` rules
(including founder_id scoping) that still apply inside it. Convergence corollary
[VERIFIED — `convergence.md`]: "`founder_id` only, never `workspace_id`."

### 3.5 Deletion gates
[VERIFIED — `CLAUDE.md:46–47`] "**Deletion** of any repo/Supabase/Vercel
resource: runbook gates + Phill's typed approval only. Never autonomous."
[VERIFIED — `AGENTS.md:34–35`] restates the same. The hard-delete gate
(`convergence.md` Phase 4, lines 78–88) requires ALL of: unified app live on
`unite-group.in` → soak passed (test payment + real logins) → final backup
bundle → Phill types approval per deletion. "No agent ever deletes a repo,
database, or Vercel project autonomously." [VERIFIED]

### 3.6 Toolchain — per-package lockfiles
[VERIFIED — `CLAUDE.md:35–37`] "each package keeps its own lockfile/package
manager. The root is NOT a pnpm workspace (apps/web is one itself; pnpm cannot
nest). Verify via root `package.json` scripts (`npm run verify:web` etc.)."
[VERIFIED — `AGENTS.md:30–31`] restates.

### 3.7 Locale — en-AU
[VERIFIED — `CLAUDE.md:54`] "Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT."
[VERIFIED — `AGENTS.md:36`] adds a no-secrets clause: "Do not read or print
secrets." (en-AU spelling: colour, behaviour, optimisation, licence —
[VERIFIED — `fable-prompt-engineer/SKILL.md` §1.8, lines 79–81]).

### 3.8 No writes to frozen repos
[VERIFIED — `CLAUDE.md:44–45`] "**No writes to the former repos** (Unite-Hub,
brain-1, Spine, hermes-workspace, pi-ceo-operator-mcp) — they are frozen pending
deletion per the runbook." [VERIFIED — `AGENTS.md:32–33`] restates the same five
repos.

---

## 4. The Evidence Standard

[VERIFIED — `.claude/rules/fabel-evidence-standard.md`, lines 1–43] Always-on.
Every factual or progress claim carries **exactly one** tag; "when in doubt,
downgrade."

| Tag | Meaning | Rule |
|---|---|---|
| `[VERIFIED]` | Backed by a checkable source: a tool result just run, a URL, or a file path/line read | Only `[VERIFIED]` material may be stated as fact or merged on |
| `[INFERENCE]` | A reasoned conclusion from verified material | Must name what it was inferred from |
| `[UNCONFIRMED]` | An assumption or unsourced claim | Must be flagged as a risk; never acted on as fact |

### Verify, don't trust [VERIFIED — fabel-evidence-standard.md:22–28]
A sub-agent's "build passes / tests green / type-check clean" is `[UNCONFIRMED]`
to the orchestrator until the orchestrator **re-runs the gauntlet on the
integrated tree** — `npm run build`, `npm run type-check`, `npm test` (plus
`npm run check:schema-drift` for schema-touching work
[VERIFIED — `FABEL_PLAYBOOK.md:44–48`]). Rationale: a sub-agent's "verified-green"
is a claim about its own isolated context, not the integrated tree — the two
diverge, and the divergence is exactly where breaks hide.

### Status / done claims [VERIFIED — fabel-evidence-standard.md:29–34]
"Deployed", "live", "passing", "no schema drift" require the proving tool
output. Schema/DB-writing claims stay `[UNCONFIRMED]` until proven on a Supabase
**database branch** before prod (`lksfwktwtmyznckodsau`); prod must never be used
as a shortcut to "prove" a DB claim.

### Banned without a tag [VERIFIED — fabel-evidence-standard.md:40–42]
"should work" · "probably passes" · "looks correct" · "all green" (as an
assertion rather than a quoted tool result) · "no drift" (without the diff) ·
any external fact (price, API shape, version) stated without its source.

---

## 5. Spec-first & the human gate

Source: `.claude/skills/fable-engine/SKILL.md`. The split of authority is
explicit [VERIFIED — SKILL.md:8–9]: **"You propose; the human decides."**

[VERIFIED — SKILL.md:12–14] Applies to features, CRM/command-centre
workstreams, risky refactors, schema changes, or multi-agent fan-out; skipped
for one-line fixes or conversational answers.

The forward pipeline [VERIFIED — SKILL.md:16–78]:
1. **Lock the finish line** (SKILL.md:18–22) — restate as one testable sentence,
   *"Done when ___."* Emit `[STATUS] finish-line: locked`.
2. **Research channels** (SKILL.md:23–33) — **source** (read actual code,
   `.claude/` rules, `CLAUDE.md`; "Docs are stale; the source is truth"),
   **prior-work** (PRs, `docs/margot/`, `docs/decisions/`, memories),
   **web** (Context7/web with source URLs; if unavailable, mark skipped and
   downgrade affected claims to `[UNCONFIRMED]`).
3. **Tag every finding** per the Evidence Standard (SKILL.md:35–37).
4. **Synthesise** — "infer-and-tag rather than ask"; list ≤5 concrete answerable
   questions only where info is genuinely missing (SKILL.md:39–41).
5. **(Optional) board** — run `review-board`/`chief-reviewer` on high-stakes
   specs, labelled `[INFERENCE] — persona synthesis, not fact`; it feeds the
   gate, never bypasses it (SKILL.md:43–46). See §6.
6. **Human gate** (SKILL.md:48–53) — "Present the spec and stop. Nothing builds
   until the human approves." Emit `[STATUS] gate: awaiting approval`. The
   prod-migration / prod-deploy gate remains the founder's call.

The spec output (SKILL.md:55–73) requires: the locked finish line; a phased plan
where no later phase starts before the earlier definition-of-done is met;
branch-first data modelling (Supabase branch → `npm run check:schema-drift`);
structural security/cost guardrails (`npm run security:routes-check`); a
risk/assumption register catching every `[UNCONFIRMED]`; and a verification plan
naming the exact commands that prove "done" — "a claim isn't done until its tool
result says so." [VERIFIED — SKILL.md:55–73]

---

## 6. Review / critique governance (review-board / chief-reviewer)

Sources: `.claude/agents/chief-reviewer.md`,
`.claude/skills/review-board/review-metrics.md`,
`apps/empire/.github/workflows/review-board.yml`,
`apps/empire/scripts/review/{chief-reviewer.js,run-specialist.js,review-metrics.js}`.

Note on layout [VERIFIED]: the board *documentation* lives in `.claude/`; the
*executable* board (CI workflow + Node scripts) lives under `apps/empire/`, not
at repo root. There is **no `SKILL.md`** in `.claude/skills/review-board/` — only
`review-metrics.md`.

### Two triggers
- **Automated, on every PR to `main`** [VERIFIED — `review-board.yml`] — three
  sequential jobs:
  - **`triage`** (lines 34–58) — risk tier from changed paths: `critical`
    (`middleware|auth|migration|stripe|payment|billing|.env`), `standard`
    (`app/api|src/lib|schema|supabase|database`), else `trivial`. Tier selects
    the roster (16 / 10 / 3 specialists).
  - **`specialist-review`** — matrix runs `run-specialist.js`, uploads findings.
  - **`chief-reviewer`** — runs `chief-reviewer.js` over all findings.
- **Manual / spec-time** [VERIFIED] — `@chief-reviewer` in a PR comment
  (`chief-reviewer.md:9`), or run against a draft spec in the fable-engine flow
  (`fable-engine/SKILL.md:43–46`, `FABEL_PLAYBOOK.md:91–93`).

### How findings gate merges
- **Binary verdict** [VERIFIED — `chief-reviewer.md:30–35`,
  `chief-reviewer.js:60–62`]: `REQUEST_CHANGES` if any finding is CRITICAL or
  HIGH; otherwise `APPROVE` (MEDIUM/LOW/INFO never block).
- **The gate is the script exit code** [VERIFIED — `chief-reviewer.js:208–214`]:
  `process.exit(1)` on `REQUEST_CHANGES` fails the CI job → blocks merge;
  `process.exit(0)` on approve. Also posts a `gh pr review` (line 144).
- **Confidence filter** [VERIFIED] — 80% threshold filters low-confidence
  findings (`chief-reviewer.md:86`).
- **Chief adds no findings of its own** [VERIFIED — `chief-reviewer.md:18–22`] —
  it aggregates, deduplicates, ranks by business impact, decides.

### Escape hatches (never permanently block)
- **Circuit breaker** [VERIFIED — `chief-reviewer.md:92–98`,
  `chief-reviewer.js:194–220`]: API down / specialist timeout (>5 min) → defaults
  to `APPROVE` ("Review Board temporarily unavailable"); any thrown error →
  `process.exit(0)`.
- **Human override** [VERIFIED — `chief-reviewer.md:72`, `chief-reviewer.js:124`]:
  `OVERRIDE: [reason]` + dismissing the review (team lead) clears the gate.

### Subordination to the human gate
[VERIFIED — `FABEL_PLAYBOOK.md:91–93`, `fable-engine/SKILL.md:43–46`] Board
critique on a spec or diff **informs the human gate and never bypasses it**; its
output is labelled `[INFERENCE] — persona synthesis, not fact`. [INFERENCE — from
the Evidence Standard] a board "APPROVE" is a persona synthesis, not proof the
integrated tree builds.

### Audit trail
[VERIFIED — `review-metrics.md:63–66`] `chief-reviewer.js` appends one JSON line
per verdict to `.review-metrics.jsonl` (verdict, risk tier, critical/high
counts) — append-only, never deleted; the `/review-metrics` skill aggregates it.

**Gap** [VERIFIED]: `.claude/DESIGN.md:182` claims root CI includes
`review-board.yml`, but root `.github/workflows/` has only `ci.yml`; the board
workflow lives only under `apps/empire/`. So the board gates the `apps/empire`
Actions context, not necessarily the monorepo root. Whether
`ANTHROPIC_API_KEY` / branch-protection requiring this check are configured in
GitHub is `[UNCONFIRMED]` (not checkable from the repo).

---

## 7. Multi-agent / swarm operating rules

Sources: `FABEL_PLAYBOOK.md` directive 7,
`fable-prompt-engineer/SKILL.md` + `playbooks/convergence.md`.

### When to fan out
[VERIFIED — SKILL.md §1.4, lines 52–54] Plan-then-execute: no implementation
before a written, gated task list exists; one phase in flight at a time; a phase
closes only when its gate passes. **"Parallel dispatch only when tasks share no
files, no state, and no ordering."** [VERIFIED — `FABEL_PLAYBOOK.md:53–55`]
delegate independent subtasks into isolated worktrees; keep working; intervene
only on drift; async over blocking; disjoint file lanes per agent, integrated
with one combined gauntlet.

### Worktree isolation & disjoint lanes
[VERIFIED — `FABEL_PLAYBOOK.md:53–55`] Each parallel sub-agent runs in its own
isolated worktree with a disjoint file lane.

### Iteration caps & escalation
[VERIFIED — SKILL.md §1.5, lines 58–63]: worker failure → one retry at a higher
model tier; same failure class 3× → STOP and escalate to the human channel (PR
thread) with diagnosis, do not thrash; ambiguous requirement mid-task → halt,
orchestrator resolves/asks ("workers never guess intent"); destructive/
irreversible step → hard gate requiring explicit typed human approval every time.

### Integrate + verify before merge
[VERIFIED — SKILL.md §1.7, lines 73–75] "Done" requires pasted evidence (command
output, passing test names, route lists, diff stats). **"200 ≠ real; compiled ≠
correct; merged ≠ verified."** A green claim without evidence is rejected by the
PM agent. [INFERENCE — from fabel-evidence-standard.md] this is the repo-wide
Evidence Standard applied at the orchestrator/worker boundary: re-run the
combined gauntlet on the integrated tree before merge.

### Convergence-programme specifics [VERIFIED — `convergence.md`]
- **Phase 1 — import** (lines 24–35): history via `git subtree add` from local
  clones. "Never flat-copy (`cp -R`) a repo in. Never `git merge` an unrelated
  repo at root."
- **Phase 2 — C-then-A port** (lines 37–65): `apps/authority-legacy` → `apps/web`
  adapting to Hub conventions (founder_id scoping, server-side PKCE, Scientific
  Luxury tokens). Conflict rule: on path collision `apps/web` wins unless the
  file is on the port list; record every override in the migration map. Safety:
  no edits to `.env`/secrets/Vercel env; no prod Supabase migrations (branch
  only); `founder_id` only; no bulk copies; every slice documents source path +
  commit/PR + omissions + evidence.
- **Phase 2 exit gate** (lines 61–65): `docs/convergence/migration-map.md`
  classifies every legacy path (migrated/rejected/obsolete/deferred); no
  unclassified file may remain when `apps/authority-legacy/` is deleted.
- **Phase 3 — verify loop** (lines 68–76): per package `typecheck → lint → unit
  tests → build`, then the **route gate** (built route manifest ⊇ union of both
  legacy apps' routes minus rejected). On failure: Opus 4.8 PM diagnoses → worker
  fixes → re-run; cap 3 iterations/failure class then escalate; CI on the draft
  PR is the external arbiter; merge is human-gated.
- **Phase 4 — cutover & deletion** (lines 78–88): runbook-only
  (`docs/convergence/cutover-and-deletion-runbook.md`), see §3.5.

---

## 8. Sources & gaps

### Source files this playbook is built from
| File | Verified? |
|---|---|
| `CLAUDE.md` (§Hard rules, lines 33–54) | [VERIFIED] |
| `AGENTS.md` (lines 1–36) | [VERIFIED] |
| `.claude/FABEL_PLAYBOOK.md` (94 lines) | [VERIFIED] |
| `.claude/rules/fabel-evidence-standard.md` (lines 1–43) | [VERIFIED] |
| `.claude/skills/fable-engine/SKILL.md` | [VERIFIED] |
| `.claude/skills/fable-prompt-engineer/SKILL.md` + `playbooks/convergence.md` | [VERIFIED] |
| `.claude/agents/chief-reviewer.md` | [VERIFIED] |
| `.claude/skills/review-board/review-metrics.md` | [VERIFIED] |
| `apps/empire/.github/workflows/review-board.yml` | [VERIFIED] |
| `apps/empire/scripts/review/{chief-reviewer.js,run-specialist.js,review-metrics.js}` | [VERIFIED] |
| `apps/spec-board/lib/{playbook-catalogue.ts,playbook.ts}`, `knowledge/playbook/fable-5-official-behaviors.md` | [VERIFIED] |

### Gaps flagged
- **PRIMARY-SOURCE GAP (load-bearing).** The UNI-2136 ticket's primary source,
  `plaud/2026-06-14-06-15-bridging-the-gap-…md`, is **NOT present in the repo**
  [UNCONFIRMED — not found in the research surface]. Any
  prompt-engineering-research-derived doctrine that source would carry is
  therefore **pending** and is `[UNCONFIRMED]` until that file is located and
  read. This playbook is built only from the established in-repo governance
  surface; it does not anticipate that source's content.
- **Naming collision.** "Playbook" in `apps/spec-board` is already owned by the
  **Fable Playbook Generator** (model-behaviour distiller; `FABLE_BEHAVIOURS`,
  `playbook-catalogue.ts`/`playbook.ts`) — a behaviour-conditioning tool, NOT an
  org/process governance catalogue [VERIFIED]. This governance playbook is a
  different concept and must not extend `FABLE_BEHAVIOURS` (contractually scoped
  to "behaviours Anthropic documented"; invented behaviours forbidden,
  `playbook-catalogue.ts:92–93`) [VERIFIED].
- **Unopened referenced authorities** [UNCONFIRMED]: `SOURCE-OF-TRUTH.md`,
  `apps/empire/CLAUDE.md` (DB-branch workflow), `apps/web/CLAUDE.md` (founder_id),
  and the `docs/convergence/*` runbook/migration-map were referenced but not read
  in this synthesis; their additional rules are not captured here.
- **Sandbox-label drift — RESOLVED in this PR** [VERIFIED]: `AGENTS.md` previously
  said "Sandbox-first DB" while `CLAUDE.md` said "no standing sandbox / database
  branch." `AGENTS.md` has been updated to the branch-first wording so both agree.
- **Board CI scope** [VERIFIED]: `review-board.yml` exists only under
  `apps/empire/`, not root; GitHub branch-protection enforcement is
  `[UNCONFIRMED]`.

---

*Draft prepared for UNI-2136. Pending: founder review + the missing
`plaud/…bridging-the-gap` primary source.*
