# Strategic Architecture Review & Readiness Assessment — Nexus / EPIC-000

**Date:** 2026-07-17 · **Repo state at review:** `main` @ `52f4ee07`, clean, CI green
**Verdict: HOLD on EPIC-001.** Three foundations must close first (§6).
**Status of this document:** review only. No code written. No state changed. Nothing merged.

---

## 0. Method and provenance

Reconstructed **from artefacts, not from memory**, per founder directive. Five parallel read-only
scans: commits/branches, Linear board, specs/ADRs, capability ground truth, runtime/logs.

Discipline applied throughout, per `CLAUDE.md` §0 and the EPIC-000 evidence bar:

- Every claim is labelled **FACT** (with the artefact proving it), **ASSUMPTION**, or **UNKNOWN**.
- **A null result is not evidence until a positive control passes.** Every "X does not exist" below
  cites the control that proves the check can return non-null.
- A doc asserting something exists is a **lead**, not an entry.

**Provenance caveat on this review itself:** it was produced by a single Claude model. Per EPIC-000
§12 and §18, it must not be its own validator. It is **unchallenged** as written. Route to an
independent non-Claude reviewer before acting on §6.

---

## 1. Recovery report — reconstructed state

### 1.1 Code

- **FACT.** `main` @ `52f4ee07`, working tree clean, in sync with `origin/main`. 58 commits landed
  between 2026-07-14T00:00:30Z and 2026-07-17T08:41:28Z.
- **FACT.** **Zero open PRs; zero unmerged remote branches.** Positive control: `git branch -r`
  returns only `origin/HEAD` and `origin/main`, and `delete_branch_on_merge: true` on the repo — so
  the empty result is real, not a broken query.
- **FACT.** **Main is green at HEAD.** Positive control: extending `gh run list` to 60 runs surfaces
  exactly one genuine `failure` (branch `feat/uni-2246-mission-control-phase1`, sha `3ce7eba2`,
  2026-07-16T23:49Z), self-healed six minutes later and merged green. The failure-detection query is
  therefore non-vacuous; main was never red.
- **FACT.** Last 6h of work: UNI-2153 Margot email epic close-out (#877–#882), then a pivot to
  security/governance hardening — cron auth (#883), mission-control lane lifecycle (#884), and two
  back-to-back UNI-2417 commits (#885, #886) closing task-promotion bypasses of the transition matrix.

### 1.2 Production versus repo

- **FACT.** Prod migration head is `20260714023022`. `cc_agent_events` and `cc_tasks_claim` are
  **repo-only, unapplied**, and their own migration headers mark them `FOUNDER-GATED APPLY` / inert
  on merge. Source: `.spm/2026-07-16-break-sweep-readiness-assessment.md:31-33`.
- **Consequence:** some surfaces the board records as shipped are **not in production**. "Merged" and
  "live" are different states here and must not be conflated.

### 1.3 The actual live frontier

- **FACT.** The active design document is `.spm/2026-07-17-mission-control-phase1-foundation.md`
  (today), covering epic **UNI-2246**, tickets **UNI-2403–2415**. Its status line reads:
  *"APPROVED FOR SLICE A BUILD; fleet activation and production merge remain founder-gated."*
- **FACT.** Six MC-P1 tickets are **In Progress** (UNI-2403, 2404, 2405, 2408, 2409, plus UNI-2354).
- **This — not EPIC-000, not Atlas — is what the estate is currently building.**

---

## 2. Constitutional completeness and governance audit

### C1 — EPIC-000 has no artefact anywhere. **FACT.**

The binding constitution exists in **neither the repo nor the tracker**.

- Repo: zero hits for `EPIC-000`, `Adaptive Control Plane`, `twenty-stage`, `Engineering Scorecard`,
  `build-versus-adopt` across `.md/.mdx/.sql/.ts`. Positive control: the same tooling trivially finds
  `cc_tasks` (81 files) and `Nexus` (200+ files).
- Linear: no ticket contains the literal token `EPIC-000`. Positive control: the same queries returned
  full 25-issue result sets.

**Consequence:** nothing on the board is traceable to the document that supposedly binds it. §15's
Definition of Done is **unmeasurable** — there is no artefact to measure. A constitution that exists
only in chat context dies with the session, which is precisely how this estate loses doctrine
(compare `CLAUDE.md` §0 on the playbook that "loaded nowhere").

### C2 — The registry Stage 3 searches is empty *and* unenforced. **FACT.**

- Row counts, Supabase `lksfwktwtmyznckodsau`: `cc_tools` **0**, `cc_agents` **0**,
  `cc_evidence_records` **0**. Positive control in the same query: `cc_task_events` **97**. The zeros
  are real.
- `autonomy_max_level` appears in **exactly one file estate-wide** — `types/supabase.ts`, the
  *generated types* — with **zero application call sites**. `required_level` likewise; its only other
  hits are archived migrations doing unrelated role-hierarchy RBAC.
- **The check `cc_agents.autonomy_max_level >= cc_tools.required_level` does not exist in code.**
- `apps/web/src/lib/command-centre/tools/catalogue.ts` — the only real `cc_tools` consumer —
  **never reads the table**. It returns a hardcoded 14-entry `KNOWN_TOOLS` literal; its own comment
  concedes the enums *"mirror cc_tools"* (copy, not query); every entry is permanently
  `invocable: false`, so `approval_required` and `risk_class` are decorative fields nothing consumes.

**This resolves UNI-2435 (Urgent) with evidence.** Answer: *not populated, not enforced, not wired.*

**Consequence for the reuse principle — the load-bearing finding.** EPIC-000 §16 directs the
ecosystem landscape scan first. But Stage 3 ("Registry Search... before external discovery or new
construction") run against a zero-row registry returns nothing for **every** candidate, falls through
to Stage 5, and concludes **"build new."** This inverts Principle 2 (*reuse before creating*) and
Principle 18 (*build only when adoption or adaptation cannot satisfy*). **An empty registry does not
fail safe — it manufactures the wrong answer with full governance ceremony attached.**

**Second, independent failure mode — identity mismatch.** Populating the registry is necessary but
**not sufficient**. The static catalogue captures ~10 MCP servers; **at least 13 real ones are absent**
(`artlist`, `higgsfield`, `xapi`, `margot-deep-research`, `mobbin`, `stripe`, `vercel`, `geo-builders`,
`shadcn`, `filesystem`, `memory`, and more). Two of the ten catalogued entries use names that do not
match the real server identifiers — `chrome` is actually `claude-in-chrome`; `google` is three
separate connectors, not one server. **An exact-match reuse check would miss a capability that
genuinely exists and return "build new" anyway.** Name reconciliation is part of the fix, not a
follow-up.

### C3 — Track proliferation: three governance efforts that cannot see each other. **FACT.**

| Track | Artefact | State |
|---|---|---|
| Mission Control Phase 1 | `.spm/2026-07-17-...`, UNI-2246 / UNI-2403–2415 | **Approved for Slice A build, 6 tickets In Progress** |
| Atlas | UNI-2433 + UNI-2434 + UNI-2435 (created 07:57–07:58 today) | Backlog, no repo artefact |
| "The loop is real" | UNI-2379 | Todo, unreferenced by either map |

**UNI-2409 — "[MC-P1][SECURITY] Enforce L3 approval at real tool-call boundary" — is In Progress and
is solving the same enforcement gap Atlas (UNI-2433) was chartered to map.** Neither map references
the other track. This is duplicate work being commissioned under a constitution whose Principle 2 is
*reuse before creating*.

**The primary risk to EPIC-001 is not the empty registry. It is track proliferation** — a third
governance layer opened on top of an already-approved, mid-build control plane, while an unclosed
NOT-READY verdict stands (C7).

### C4 — Naming collisions, three of them. **FACT.**

- **"Atlas"** is already an **agent persona** in this codebase (Atlas/Forge/Pixel/Grid/Quill, the
  Replit Agent 3 role mapping) — `apps/web/.claude/docs/AGENT-PROTOCOL.md:10`,
  `apps/workspace/src/screens/gateway/components/hub-constants.tsx:223,232,268`.
- **"Nexus 2.0"** names two materially different systems: a single-tenant SaaS product
  (`AGENT-PROTOCOL.md`, June 12) versus the July orchestration layer over CRM `cc_tasks`. No
  cross-reference between them.
- **"control plane"**: Atlas's *access* control plane versus UNI-2403's *"one control-plane source of
  truth"* (In Progress, different scope).

Ambiguous names defeat registry lookup — see C2's identity-mismatch finding. This is the same defect
class, at the level of the doctrine rather than the data.

### C5 — Reuse-first already exists as doctrine and is already being ignored. **FACT.**

`docs/superpowers/specs/2026-07-12-nexus-agentic-automation-foundation.md:28-42` states plainly:
*"This is an integration and governance build, not a new agent framework."*

EPIC-000 is in part **re-deriving a principle the estate committed to three weeks ago and did not
follow**. That is evidence the binding constraint is **not** the absence of a principle — it is the
absence of enforcement. Writing EPIC-001..010 will not fix a doctrine-adherence problem.

### C6 — The evidence infrastructure is empty, and one skill lies about it. **FACT.**

- `.harness/learning/` — **5 of 5 JSONL files are 0 bytes**, mtime 2026-05-22 (**56 days stale**).
  Its own README concedes the capture hooks are *"shipping separately"* — i.e. never shipped.
- **`.harness/swarm/swarm.jsonl` does not exist anywhere in the repo**, yet the `audit-emit` skill
  description asserts it writes to *".harness/swarm/swarm.jsonl (existing immutable append)"*.
  A registered skill makes a false claim about live infrastructure.

**Consequence:** the founder's directed **engineering evidence board** has no substrate today. It
must be built, not merely populated. This is the correct next foundation and it is currently at zero.

### C7 — An unclosed NOT-READY verdict stands. **FACT.**

`.spm/2026-07-16-break-sweep-readiness-assessment.md` — 70-agent adversarial review, **58 confirmed
defects, verdict 62/100 NOT-READY**, with file:line evidence per finding.
`.spm/2026-07-16-audit-reconciliation.md` merges two independent audits (58 and 43 findings) into
**66 canonical defects**.

**UNKNOWN:** how many of the 66 are now closed. Not established by this review — it requires walking
each finding against current `main`. **Until dispositioned, EPIC-001 was never a live option**,
independent of every other finding here.

### C8 — Self-attestation is standing in for evidence. **FACT / ASSUMPTION.**

The single strongest "it's live" claim in the repo — `scripts/nexus-runner` README's
*"2026-07-16: runner armed in prod and demo-proven (UNI-2385)"* — is **a one-line documentation
commit** (`647ed171`) with no code change, no test, no CI artifact, no `cc_agent_events` export.

It is **contradicted by the same day's handoff** (`docs/session-handoffs/handoff-20260716-114500.md`),
which lists *"UNI-2385 arming sitting"* as still-open and founder-gated, warns *"the E2E proof is
LOCAL evidence; prod behaviour after arming still needs the README smoke"*, and records *"no servers
or runners left running."*

- **FACT:** not running on this box — no `zsh`/`tmux`, no `nexus-runner.env`, no `HARD_STOP` marker,
  and all 13 `node.exe` processes are this session's own MCP servers.
- **UNKNOWN:** prod arming on the founder's Mac. Unverifiable read-only from here.
- **UNKNOWN:** PRs #872/#873 carry `[nexus-runner]` tags, but their `wf_074ea5fe-591` workflow ID does
  **not** match `runner.mjs`'s own `run-${Date.now().toString(36)}` session scheme. Attribution to the
  runner is unproven; a different overnight mechanism likely produced them.

**Counter-example worth preserving:** `apps/autopilot-runner` is the inverse and the model to copy —
its entrypoint is a **refusal tombstone**, ~30 retired paths fail the build if restored, and the code
*proves* non-execution rather than asserting it. **Enforced non-execution beats a doc claiming
non-execution.** Apply this pattern to arming claims.

### C9 — ADR practice is effectively absent. **FACT.**

Exactly **one ADR exists** in the repo (`apps/empire/docs/adr/ai-marketing-advisor.md`, 2026-03-31,
status "Proposed", unrelated to this workstream). No ADR covers Nexus, OWNEST, Mission Control, or
Atlas. `.spm/*.md` is the **de facto** decision record. EPIC-000 §9 requires an architecture decision
record per internal build; that practice does not exist to inherit.

### C10 — Broken provenance in load-bearing migrations. **FACT.**

`apps/web/supabase/migrations/20260604000000_cc_command_centre.sql:3-4` cites
`NEXUS_AUTONOMOUS_COMMAND_CENTER_SPEC.md §6` and `NEXUS_BUILD_QUEUE_PLAN.md CC-03` as its design
source. **Neither file exists anywhere in the repo.** Positive control: the grep finds the migration
and its comment text, so the search is sound — the targets are absent. The schema underpinning the
entire capability registry has **no reachable design rationale**. EPIC-000 §20 ("all material
technical decisions must remain explainable... and attributable") is already violated at the
foundation.

---

## 3. Sequencing correction — accepted

**Directive as written (§16):** begin with the source-backed capability landscape scan.
**Correction (founder-accepted):** **populate the Capability Registry first.**

Grounds: C2. An empty registry inverts Principles 2 and 18 by construction. The landscape scan's
output would be systematically biased toward "build" — and would look rigorous while being wrong.

**Scope of the correction, per C2's second finding:** population alone is insufficient. The fix is
population **plus name reconciliation**, or exact-match lookups still return false "build" answers.

Raw material now quantified and available (**FACT**):

| Registry | Ground truth | Notes |
|---|---|---|
| Skills | **291** resolvable top-level | README claims 243; **47 uncatalogued**, incl. `proof-discipline` and `goal-circuit-breaker`; 4 broken symlinks |
| Agents | **43** (11 `.md` + 31 legacy `.json`); +1 in-repo | `chief-reviewer.md` cites 16 specialist reviewers that exist as no file |
| MCP | **~23** across 4 config files | vs 10 catalogued; 2 name mismatches |
| CLI | `gh` (CleanExpo), `vercel` (zenithfresh25-1436), `doctl` (contact@unite-group.in) authed | `supabase`, `linear` not on PATH — MCP-only |

**Note the irony and treat it as a finding, not a joke:** the guards that enforce evidence discipline
(`proof-discipline`, `goal-circuit-breaker`) are **absent from the catalogue that is supposed to know
what exists**. The registry cannot bootstrap trust in itself while blind to its own enforcement.

---

## 4. Ecosystem and model assessment — **NOT COMPLETED. Scoped, not faked.**

**Status: OUTSTANDING.** This review **cannot** discharge this part, and does not pretend to.

Evaluating GitHub, Hugging Face, MCP servers, and commercial platforms against the §7 scorecard is
genuine external research — 20 dimensions per candidate, each requiring provenance, licence,
supply-chain, and maintainership **evidence** (§6 Stages 5–17). **None of the five scans reach outside
the estate.** Producing a ranked table now would mean generating plausible candidates from training
recall — exactly what §3 classifies as unverified and §16 forbids. It would also be the highest-risk
artefact in this review, because it would *look* the most authoritative.

**Kimi K3 — UNKNOWN.** I have **no verified knowledge** of this model. It is absent from my training
data and from estate memory. I can neither validate nor refute a tier placement. The founder's call to
hold it as an **experimental-tier candidate, not a foundation piece**, is correct *because* the
evidence record does not exist. It is a good first real test of the evidence board (C6) rather than a
question to settle by assertion. (Distinct from `kimi-k2.6`, recorded as the live Hermes brain via
OpenRouter.)

**Required to discharge Part 3:** a dedicated research pass with external retrieval, producing one
evidence record per candidate against the §7 scorecard and a §8 disposition. Estimated as its own
work item — **not** a subsection of this review.

---

## 5. Missing work — accounted for by neither the constitution nor the board

1. **EPIC-000 has no artefact** (C1) — the constitution must land in-repo and be ticketed before it
   can bind anything.
2. **The evidence board has no substrate** (C6) — `.harness/learning` hooks were never shipped;
   `swarm.jsonl` does not exist. Directed by the founder; currently at zero.
3. **The 66 canonical defects have no disposition ledger** (C7).
4. **No name-reconciliation pass** across registry/catalogue/doctrine (C2, C4).
5. **No ADR practice** to inherit for §9's per-build ADR requirement (C9).
6. **`cc_command_centre` migrations have no reachable design rationale** (C10).
7. **No mechanism forces a claim to be true.** C5 + C8: doctrine exists and is ignored; arming is
   asserted in a README. `apps/autopilot-runner`'s enforced-refusal pattern is the only working
   counter-example in the estate and should be generalised.
8. **Track reconciliation** across Atlas / MC-P1 / UNI-2379 (C3) — nobody owns this today.

---

## 6. Verdict — **HOLD on EPIC-001**

Not close. Three foundations must close first; the first was not in the original two.

| # | Foundation | Why it blocks | State |
|---|---|---|---|
| **0** | **Disposition the 66 canonical defects** (C7) | A standing 62/100 NOT-READY makes EPIC-001 moot regardless of everything else | UNKNOWN — needs a walk against `main` |
| **1** | **Populate the Capability Registry + reconcile names** (C2) | Until then every Stage 3 search returns "build new" and the reuse principle is inverted | Ground truth quantified (§3); registry at 0 rows |
| **2** | **Stand up the engineering evidence board** (C6) | Living evaluation records are the substrate for Parts 3–4; a one-time scan rots within days (this session watched a 5-day-old handoff be 116 commits wrong) | No substrate exists |

**Additionally required before EPIC-001 is even well-posed:** resolve track proliferation (C3). Three
governance tracks that cannot see each other will not be fixed by adding a fourth.

**Recommended immediate actions** (none taken; all await founder authority):

1. **Close UNI-2435 (Urgent) with the C2 evidence.** It is answered. Leaving it open manufactures
   duplicate discovery — the exact failure the ticket exists to prevent.
2. **Land EPIC-000 in-repo** as `.spm/` (the de facto ADR practice, C9) and ticket it. A constitution
   with no artefact binds nothing.
3. **Reconcile Atlas (UNI-2433) against MC-P1 (UNI-2246), specifically UNI-2409**, before either
   proceeds. Rename Atlas to clear the persona collision (C4).
4. **Then** Foundation 0 → 1 → 2, in that order.
5. **Then** the ecosystem research pass (§4), and only then a go/no-go on EPIC-001..010.

---

## 7. This review's own limits — stated, not buried

- **It is unchallenged.** Single Claude model, no independent review. Per §12/§18 it cannot validate
  itself; a self-scored architecture review is the same anti-pattern as a self-scored merge gate.
  **Route to a non-Claude reviewer before acting.**
- **Part 3 is not delivered** (§4). Named, not faked.
- **C7's disposition is UNKNOWN** — the 66 defects were not walked against current `main`.
- **C8's prod-arming status is UNKNOWN** — unverifiable read-only from this box.
- **Live cron execution is UNKNOWN** — 40 Vercel cron entries are configured (FACT); whether they
  execute in the live deployment was not checked from here.
- **One near-miss worth recording:** this review almost produced a parallel readiness assessment
  without checking whether one existed. `.spm/2026-07-16-break-sweep-readiness-assessment.md` was
  found only by the specs scan. That is EPIC-000 Stage 4 catching its own author — and it is the best
  available argument that Stage 4 works when it actually runs.

---

*Produced 2026-07-17 from artefacts only. No code written. No state changed. Every claim above cites
its evidence or is labelled ASSUMPTION / UNKNOWN.*
