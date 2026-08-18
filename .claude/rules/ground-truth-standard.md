# Ground-Truth Standard — Always-On Rule (build & delivery)

> **Authority**: Always loaded. Applies to ALL build-phase and delivery-phase work
> in this monorepo — writing, editing, reviewing, integrating, releasing code — and
> to every subagent build report. Companion to `.claude/rules/fabel-evidence-standard.md`:
> the Evidence Standard governs how you speak (claims carry tags); this standard
> governs what you may build on, how you must check what you built, and how far down
> the delivery Ladder you may claim to be. The Fable System ends at
> `specs.approved_at`; this standard begins there. It consumes the locked finish
> line and the Evidence Standard **by reference — it never re-derives, restates, or
> amends either.** It binds to (never redefines — redefinition is a Class 3
> constitutional amendment) the Waterline autonomy classes
> (`docs/constitution/EPIC-000-nexus-engineering-constitution.md`, §"The Waterline")
> and the **UNI-2517 Definition of Complete** lifecycle (Linear, founder-authored
> SSOT), per UNI-2517's own ban on prompt controls carrying competing finish lines.
> It generalises and makes binding the standing lesson in `CLAUDE.md`
> (§PRs #1017/#1018) and the apps/web prior art
> (`apps/web/.claude/rules/{execution-mode-transition,slop-prevention,verification-gate,core}.md`);
> on any state-name conflict, UNI-2517 wins. Evidence record with every citation:
> `docs/research/llm-code-generation-roots.md`. Per the repo's own record
> ("the constraint is enforcement, not doctrine"), this rule is the single
> build-phase artefact for doctrine-audit gaps G1–G6 and G9 — it consolidates,
> it does not stack; G7/G8/G10 are named at the end as mechanisms it does NOT
> claim to enforce.

## The rule — nine principles

Every failure mode of LLM code generation recorded in this repo (19, catalogued in
the evidence record §3) is an instance of one of these. Each principle carries its
historical root and its repo scar — the rule is not new doctrine, it is old law
finally bound.

| # | Principle | Root | Repo scar | Operational test |
|---|---|---|---|---|
| P1 | **Rebuild the theory from the artefact.** You are a permanently theory-less programmer; another agent's prose is hearsay. Re-derive every load-bearing fact from the real folder, real log, real schema, real `git log` — this session. | Naur 1985; Thompson 1984 | A handoff said "main @ `8585c147`, safe to stop"; main was 116 commits ahead | Before acting on an inherited claim: name the primary artefact, read it, emit a `Grounded` line — or write the claim `[UNCONFIRMED]`. |
| P2 | **Search before you build; confirm before you call.** Prove the thing does not already exist, and prove the API you are about to call does exist, before writing a line. | McIlroy 1968 | LLM plumbing rebuilt from scratch by an agent that did not look (PR #1020) | Grep the monorepo (and `env-var-canon` for env names) before creating; read the real signature/docs before invoking; cite the search. |
| P3 | **Verify the whole, not the part; the system, not the container.** A check on a fragment proves the fragment. Absence from here is not absence from the system. | Saltzer/Reed/Clark 1984; Dijkstra 1970 | ~20 defects across PRs #1017/#1018, all one shape | State what whole the check covered and what it could not see — "unavailable from here", never "not configured". Bind evidence to the artefact it proves (the FILE, not the JOB — UNI-2567). |
| P4 | **Only the machine's verdict is evidence — exit code, artefact, read-back.** A printed message is a claim; a green-looking log is prose. | Wilkes 1949; Knuth 1977 | "CORROBORATED — 0 finding(s)", exit 0, nothing had run | Every "passed/ran/wrote" claim quotes the exit code or reads back the artefact. An empty evidence sink is a red result, not a quiet one. |
| P5 | **Attack your own work before anyone reviews it.** Construct the bypass yourself; ask what would stop review from even seeing this. | Fagan 1976; Hoare 1980 | The NUL byte that hid a file from 17 green checks | Before requesting review: name one concrete input/state that would break the change and show the run that closes it (`Bypass attempt:` line). |
| P6 | **Independence must be engineered, not assumed.** N opinions from one lens are one opinion. | Knight & Leveson 1986 | One model polled via three aliases counted as a three-model quorum | A second opinion counts only when the model/provider/checklist is demonstrably different; otherwise report it as one opinion. |
| P7 | **Re-verify at every boundary and every reuse.** An assumption imported without its verification conditions is a defect in transit; check an instruction can achieve its goal before executing it. | Ariane 5 1996; MCO 1999; Meyer 1986 | PRs #281–283 stranded off `main`; the sandbox repoint that could not achieve its goal | On reuse or handoff across any boundary (branch→main, spec→code, session→session): restate the contract and re-run its check on this side. |
| P8 | **Derive, never store.** Committed derived values and self-asserted statuses decay from the moment they are written. | Codd 1970; Lehman 1974 | The Age column read 41 while the real answer was 42, one day after writing | Report derived values only from a fresh computation (`node scripts/founder-queue.mjs`, never the file's Age column). A document's claim about its own status is `[UNCONFIRMED]`. |
| P9 | **Know your rung; never claim a later one.** Every session states which Ladder rung its work is on; a later-stage claim without the earlier stage's boundary evidence is a defect. Iterating backwards is fine — silently falling back is not. | Royce 1970; Parnas & Clements 1986 | "stale-DELIVERED" claimed for a file never touched (UNI-2288); 183 Done tickets with zero merge evidence | Every deliverable carries the `Waterline:` line. "Done / complete / shipped" is only utterable at the rung whose evidence exists. |

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
| 5 | Integrate | CI_GREEN | Required CI evidence for THAT SHA per `config/ci-evidence-manifest.json`; skipped required evidence cannot be green |
| 6 | Rehearse | STAGING_VERIFIED | A staging walk that looks like real life, receipts attached |
| 7 | Release | RELEASE_READY → SHIP_AUTHORISED → PRODUCTION | RELEASE_READY grants no authority; SHIP_AUTHORISED is a founder action (Class 3); PRODUCTION requires provider receipts, not merge state |
| 8 | Walk it live | POST_DEPLOY_VERIFIED | The shipped routes walked live and authenticated — 200 ≠ real |
| 9 | Acceptance | outcome evidence toward COMPLETE | Client/founder UAT sign-off against the locked finish line |
| 10 | Handover | outcome evidence toward COMPLETE | Docs, training, keys delivered — receipts |
| 11 | Warranty | outcome evidence toward COMPLETE | Watch-fix-own over a stated window; the incident log stays honest |
| 12 | Payment | COMPLETE (outcome DoD met) | Invoice issued + payment receipt. The metric of record moves |

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
   `<URL>`. The exit code is mandatory for commands. Required at least once in
   every subagent build report, every PR body, and every session handoff; every
   load-bearing inherited fact either gets its own Grounded line (re-derived) or
   is written `[UNCONFIRMED]`.

2. **Waterline** — per deliverable; carries the rung (P9):

   `Waterline: Class <0-3> · Stage <UNI-2517 state> (rung <n>/12 <name>) · <AAA|AA|A|FAIL> — evidence: <receipt>[ · <receipt>…]`

   Receipt forms: `<command> (exit <N>) @ <sha>` · `<path>:<line>` · `<URL>` ·
   `<provider receipt id>` · `ABSENT: <named register>` (rated FAIL). The Class is
   the constitution's and is never lowered by evidence or consensus; the Stage may
   never exceed what the receipts prove; the rating is the minimum. Required in
   every PR body, every handoff, and any message claiming done/complete/shipped/live.

3. **Bypass attempt** — per review request (P5):

   `Bypass attempt: <input/state tried> → <result>`

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
  than its body asserts is a defect (the #1017 scorer shape).
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
"armed / live / delivered" backed only by a document or a commit · any rating
rounded up past the minimum rung.
