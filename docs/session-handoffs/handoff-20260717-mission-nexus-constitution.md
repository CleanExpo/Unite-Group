# Session handoff — 2026-07-17 (Unite-Group Nexus: EPIC-000 landed, ARR-001..008 filed)

## 1. Summary

**State: WIP — DOCTRINE SHIPPED TO A DRAFT PR, NOTHING MERGED, NOTHING BUILT.**

- **Attempted:** resume from a handoff; produce a strategic architecture review; capture the founder's
  constitutional blocks; place the DR/FNOI strategy.
- **Completed:** EPIC-000 **landed in-repo** (it existed nowhere before). ARR-001..008 filed. Strategic
  architecture review filed. DR-938 created (Urgent). **PR #887 open as DRAFT.**
- **Partial:** ARR-001..008 **lack "alternatives considered"** — mandatory remediation (ARR-006 §5.1).
- **Not touched:** any code, any schema, any runtime, `main`.

**Verdict across the series: HOLD on EPIC-001. Zero of six governance mechanisms are live.**

**⚠ The single most important thing in this document:** everything below is **UNCHALLENGED** —
single-Claude-model authored. Per EPIC-000 §12/§18 it cannot validate itself. **Route to an independent
non-Claude reviewer before acting.**

## 2. Where it started

Resumed via `/resume-from-handoff` with **no argument**. The skill picked the newest handoff by
filename timestamp — **RestoreAssist's, the wrong repo.** Corrected by the founder mid-turn.

**Then the right repo's own handoff proved worse.** `docs/session-handoffs/handoff-20260709-150641.md`
claimed *"main @ `8585c147`, no branches in flight, safe to stop."* Reality: **main was 116 commits
ahead** at `52f4ee07`, with **six MC-P1 tickets In Progress**. The local branch
`unite-group-rls-exposure-fix` looked stranded; it had been **squash-merged as PR #763 on 2026-07-12**
(which is why its SHAs were absent from main while all its files were present).

**The pause was five days.** That failure is now recorded as ARR-008 §5.1's evidence: *a framework
promising continuity across time must first survive a working week.*

**Founder direction:** reconstruct state **from artefacts, not memory**; recovery report before code;
validate build-vs-adopt against EPIC-000; challenge the sequencing with evidence.

## 3. Decisions locked + what shipped

### Decisions locked

1. **Registry population precedes the ecosystem landscape scan** — founder-accepted correction to
   EPIC-000 §16. Stage 3 against a 0-row registry returns nothing for every candidate and concludes
   *"build new"*, **inverting Principles 2 and 18**.
2. **HOLD on EPIC-001**, on three foundations (§7).
3. **The Engineering Evidence Framework (ARR-006) and Organisational Knowledge Framework (ARR-007/008)
   are permanent constitutional layers** — APPROVED, binding, **not operational**.
4. **Models — including Kimi K3 — are interchangeable capabilities, never foundations.** Kimi K3 held
   as experimental-tier: **UNKNOWN**, no evidence record exists.
5. **DR and NRPG are two halves of one application** — DR = consumer front door; NRPG = contractor
   section within it. FNOI is the **DR half**.

### What shipped

| Artefact | Where | State |
| -- | -- | -- |
| **EPIC-000 constitution** | `docs/constitution/EPIC-000-nexus-engineering-constitution.md` | **Landed verbatim.** Existed nowhere before. |
| **ARR-001..008** | `docs/decisions/` | Filed. ARR-006/007/008 APPROVED; 001–005 HOLD. |
| **Strategic architecture review** | `.spm/2026-07-17-strategic-architecture-review.md` | Filed. Built from 5 parallel read-only scans. |
| **DR-938** | Linear, DR-NRPG / `Disaster Recovery Website` | **Urgent.** FNOI strategy + reuse evidence. |
| **PR #887** | <https://github.com/CleanExpo/Unite-Group/pull/887> | **DRAFT.** Docs only. |

## 4. Key files

| File | Status |
| -- | -- |
| `docs/constitution/EPIC-000-*.md` | **New.** Verbatim + an **Amendments** table logging **6 open conflicts** |
| `docs/decisions/ARR-001..008` | **New.** The ARR series (repo had **1** unrelated ADR before today) |
| `.spm/2026-07-17-strategic-architecture-review.md` | **New.** The evidence base for all of the above |
| `apps/web/src/lib/command-centre/tools/catalogue.ts` | **Read-only inspected** — hardcoded 14-entry literal; **never reads `cc_tools`** |
| `apps/web/supabase/migrations/20260604010000_cc_command_centre_phase2.sql:94` | **Read-only inspected** — `verdict CHECK IN ('APPROVED','HOLD','REJECTED')` — **blocks 3 of 5 dispositions** |

## 5. Running state

- **Branch:** `docs/nexus-constitution-and-arr-series` @ `6aa3d658`, pushed, tracking origin.
- **`main`:** `52f4ee07` — **untouched**, 0 ahead / 0 behind at branch time.
- **PR #887:** **DRAFT.** Not merged. Merging `main` auto-deploys → **founder's call.**
- **Processes:** none belonging to this repo. (13 `node.exe` on this box are the session's own
  Playwright/Context7 MCP servers.)
- **Prod:** untouched. No migration applied. Prod migration head remains `20260714023022`.
- **Safe to stop:** **yes.**

## 6. Verification

- **Repo state:** `git rev-list --left-right --count origin/main...HEAD` → `0 0` before branching.
- **`cc_*` row counts** (Supabase `lksfwktwtmyznckodsau`): `cc_tools` **0**, `cc_agents` **0**,
  `cc_evidence_records` **0**. **Positive control: `cc_task_events` 97** — the zeros are real.
- **Enforcement absent:** `autonomy_max_level` appears in **exactly one file** estate-wide
  (`types/supabase.ts`, generated) with **zero application call sites**. Positive control: the grep
  returns the type definitions, so the null is real.
- **EPIC-000 absent (before this session):** zero repo hits; zero Linear tickets. **Positive controls:**
  `cc_tasks` → 81 files; `Nexus` → 200+; Linear queries returned full 25-issue result sets.
- **Live site read:** `disasterrecovery.com.au` — hero *"Policyholder first. Always."*, CTA *"Lodge a
  claim"*, nav *"About NRPG"*. **Screenshot viewed, not assumed.**
- **⚠ No gate script exists.** `scripts/handoff-loop.sh` **does not exist in this repo** (it is
  RestoreAssist's). **This handoff is NOT gate-verified.** Docs-only change; CI is
  `Monorepo CI` on push/PR — check PR #887's own checks.

## 7. Deferred + open questions

### The three foundations — HOLD rests on these

| # | Foundation | State |
| -- | -- | -- |
| **0** | **Disposition the 66 canonical defects.** A standing **62/100 NOT-READY** makes EPIC-001 moot regardless of everything else | **UNKNOWN** — not walked against `main` |
| **1** | **Populate the Capability Registry + reconcile names** | 0 rows. Material quantified: **291 skills · 43 agents · ~23 MCP · 3 CLIs** |
| **2** | **Stand up the evidence board** | **No substrate — a build, not a population** |

### Founder rulings required (≈18) — **this is now the bottleneck, not the doctrine**

**Constitutional conflicts** (logged in EPIC-000 Amendments): dispositions **5 / 4 / 3** · scorecard
**20 / 8** · confidence **2 definitions** · SPM placement · §16 sequencing · Evidence
Registry/Register/Board naming.

**Structural:** track proliferation (Atlas vs MC-P1 vs UNI-2379 — **UNI-2409 is In Progress building
the enforcement gap Atlas was chartered to map**) · MC-P1 pause/grandfather/reclassify · `cc_decisions`
migration (founder-gated, **on the critical path**) · "always on" bounded by what · who approves an
evidence source · ARR-001..008 alternatives remediation.

**DR-938:** placement (recommend: DR vertical under `Nexus Concierge OS`, sibling to DR-854) ·
**RA-7076 evidence-capture boundary** (founder opened it **today 04:55**; collides with FNOI's
"evidence passport") · does *"Policyholder first. Always."* change?

## 8. Pick up here

**Next session begins with: the Continuous Cognitive Loop** (founder-stated). ARR-007 §2 already
defines it — **sense · research · prepare · surface gaps**, halting at governance. **Read ARR-007 §2 and
§2.1 first; do not re-derive it.** §2.1's open item (bounded by what?) is the live gap.

**Start here:**
1. `git fetch && gh pr view 887` — is it still draft? merged? closed?
2. Read `.spm/2026-07-17-strategic-architecture-review.md` — the evidence base. **Do not re-run the
   five scans.**
3. Read EPIC-000's **Amendments** table — 6 conflicts. **Any still unruled blocks the work below.**
4. Check whether the **66 defects** have a ledger. If not, that is Foundation 0.

**Do not redo:**
- **Do not re-derive `cc_tools`/`cc_agents`/`cc_evidence_records` = 0.** Evidenced, positive-controlled.
  **UNI-2435 (Urgent) is answered** — close it with the ARR-001 §3.1 evidence rather than researching it.
- **Do not rebuild what exists:** `Nexus Concierge OS` (Phase 1 **100% done**) · contractor matching
  (**DR-627, shipped**) · stakeholder portals (**RA-429 family**) · claim lifecycle (**RA-1129**) ·
  the knowledge graph (**`wiki_pages` 681 rows + tested `wiki-graph.ts`**).
- **Do not build a new evidence table.** `cc_evidence_records` exists, append-only, RLS-enforced —
  **extend it.**
- **Do not write more doctrine.** Eight constitutional records exist and **zero of six mechanisms are
  live**. Reuse-first was already written down on 2026-07-12 (*"an integration and governance build,
  not a new agent framework"*) and ignored. **The constraint is enforcement, not doctrine.**

**First command:**
```bash
cd /d/Authority-Site && git fetch && gh pr view 887 --json state,isDraft && git log --oneline -3
```

## 9. Risk notes

- **This session's output is unchallenged.** Single model. **ARR-006 mandates independent confidence
  assessment and fails its own §4 at approval** — it says so in its own §10. **Route to a non-Claude
  reviewer.** This is the highest-priority action in the document.
- **The ranked ecosystem report (EPIC-000 §16) was NOT delivered.** It needs external retrieval.
  **Scoped, not fabricated** — deliberately, because a plausible-looking table would have been the
  highest-risk artefact here.
- **Momentum was 100% human-supplied** (ARR-008 §8.1). Nothing in this estate would have produced any
  of this unprompted, and nothing will continue it. The runner is **not armed here**; the two
  `nexus-official-docs` crons have **never fired on schedule**; `.harness/learning/` has captured
  nothing in **56 days**.
- **"Done" is not evidence in this estate.** DR's own audits: **183 Done tickets with zero merge
  evidence, 61 confirmed falsely marked.** UNI-2373 is Done while its migrations are unapplied.
  **Verify against merged PRs.**
- **Inheritance does not work.** `~/.claude/hooks/` and `settings.json` are gitignored; `bootstrap.sh`
  wires **1 of 3** installers and swallows failure into an echo; **47 of 291 skills are uncatalogued —
  including `proof-discipline` and `goal-circuit-breaker`, the guards enforcing all of this.** A fresh
  machine inherits **nothing**, silently.
- **My own near-misses this session, recorded because they are the pattern:**
  - I almost wrote a readiness assessment **without checking one existed** — `.spm/2026-07-16-break-sweep-readiness-assessment.md` (**62/100, 58 defects**) was found only by a scan. Stage 4 catching its own author.
  - I spent hours reporting *"EPIC-000 has no artefact"* as a founder blocker **while holding the full text.** It was never the founder's to do.
  - I filed EPIC-000 with a **dangling cross-reference to ARR-008 before it existed** — the exact `cc_command_centre` defect, minutes after landing the rule against it.
  - **ARR-007 §5.2 claimed the ARRs were "in-repo, versioned" while they were untracked.** Caught at handoff. Committing made the claim true; had I not checked, the session's doctrine would have died on this machine — the `~/.hermes` failure, reproduced by the author of the record describing it.

## 10. Handoff quality check

- **No faked verification.** No gate script exists in this repo; **stated, not implied.** Every number
  cites its command or artefact; every null cites its positive control.
- **No hidden "still running."** No processes, servers, or background jobs belong to this repo.
- **Completed vs deferred is explicit.** Completed = §3. Deferred = §7, ~18 items, **all founder-gated**.
- **Known gaps stated, not buried:** unchallenged (§9) · ecosystem report undelivered · alternatives
  missing from ARR-001..008 · 66 defects UNKNOWN · this handoff is not gate-verified.

---

**Handoff complete. Next safe action:** open PR #887, read the EPIC-000 Amendments table, and rule on
the six constitutional conflicts — **or route the series to an independent non-Claude reviewer first,
which ARR-006 §4 arguably requires before any of it is acted upon.**
