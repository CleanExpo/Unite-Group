# Session handoff — 2026-07-17 (Unite-Group Nexus: the constitutional stack)

---

# PART 1 — THE ONE-PAGE VERSION

*Plain language, per Chapter 9 §9.11–§9.12. Detail is in Part 2. **Read this part only if that's all you read.***

## What happened

**You wrote a constitution. It's now real, in the repository, and most of it is merged.**

Before today, EPIC-000 existed **only in a chat window**. It was binding on work that could not read it. Now there are **eleven constitutional documents on disk**, plus twelve decision records explaining what was decided and why.

## What's done

- **Merged and live on `main`:** the Mission (Ch1), Operations (Ch2), EPIC-000, and ARR-001 through ARR-010.
- **Waiting on you:** PR **#893** — Chapters 3 to 10, plus the cross-consistency test.
- **On the board:** **DR-938** (Disaster Recovery / FNOI strategy, Urgent) and **UNI-2437** (the rulings, Urgent).

## The one number that matters

**Zero of six governance mechanisms are live.**

The constitution says what must be true. **Nothing yet enforces any of it.** The Guardian's pause, the autonomy check, the registers — **none exist in code.**

## The honest problem

**Today I produced ~20 decisions that only you can make, and delivered no working mechanism.**

Your own Chapter 10 §10.22 says: *"Nexus must protect the Founder from becoming the permanent operational bottleneck."* **You are the bottleneck, and this session built it.**

Your Chapter 7 §7.46 names it: *"governance overwhelmed by excessive recommendations."*
Your Chapter 4 §4.5 names it: **documents created are Level 4 Activity — not impact.**

## What I recommend

**Pause the constitutional drafting.** Not stop — pause. Chapters 1–2 were genuinely valuable. Chapters 3–10 add rules to a system that can't run any of them.

**Do one of these next, not another chapter:**

| Option | What it gets you |
|---|---|
| **A. The ruling sheet** *(I owe you this)* | One page. Each open decision as a plain question with a recommendation. **Makes the other 19 decidable.** |
| **B. The Constitutional Fingerprint** (Ch3 §3.16) | **The single unlock.** It's the inheritance mechanism. Without it every document you write reaches nobody. |
| **C. Rule the 4 schema breaks** | The database physically refuses four things the constitution requires. Cheap to fix, blocks everything. |

**My recommendation: A, then B.**

## The single sharpest fact

**A fresh machine, a new agent, or Rana inherits *nothing* from today — silently.**

Doctrine lives in gitignored files. `bootstrap.sh` installs 1 of 3 guards and hides its own failure. **47 of 291 skills are uncatalogued — including the two guards that enforce evidence discipline.**

**That's why B is the unlock. Everything else is writing into a system with no delivery mechanism.**

---

# PART 2 — THE DETAIL

## 1. Summary

**State: WIP — PAUSE RECOMMENDED. Not blocked, not finished.**

- **Attempted:** resume from a handoff; produce a strategic architecture review; capture and file ten constitutional chapters.
- **Completed:** EPIC-000 landed; Ch1/Ch2 locked and merged; ARR-001..011 filed; Foundation 0 answered (66 defects walked); DR-938 created; four capability specs; PRs #887–#892 merged.
- **Partial:** PR #893 (Ch3–10 + ARR-011) open.
- **Owed:** the **§9.51 remedy** — a plain-language ruling sheet. **Not built.**
- **Not touched:** any code, any schema, any runtime, any migration.

**Verdict: HOLD on EPIC-001. Zero of six governance mechanisms live.**

**⚠ Everything here is UNCHALLENGED** — one model family authored, orchestrated, and validated it. EPIC-000 §12/§18, Ch2 §3, ARR-006 §4 all forbid self-validation. **Route to a non-Claude reviewer.**

## 2. Where it started

Resumed via `/resume-from-handoff` with no argument. **The skill picked the wrong repo** (RestoreAssist). Corrected mid-turn.

**Then the right repo's handoff proved worse.** `handoff-20260709-150641.md` claimed *"main @ 8585c147, no branches in flight."* Reality: **main was 116 commits ahead**, six MC-P1 tickets In Progress, and the local branch had been squash-merged as PR #763.

**The pause was five days.** That failure is now ARR-008 §5.1's evidence: *a framework promising continuity across time must first survive a working week.* **This handoff is the retest.**

## 3. What shipped

| Artefact | Location | State |
|---|---|---|
| **EPIC-000** | `docs/constitution/EPIC-000-*.md` | **MERGED** (#887). Existed nowhere before. |
| **Ch1 Foundation v0.1** | `docs/constitution/CONSTITUTIONAL-FOUNDATION-v0.1.md` | **MERGED** (#889) |
| **Ch2 Operations v0.1** | `docs/constitution/CONSTITUTIONAL-OPERATIONS-v0.1.md` | **MERGED** (#890), **amended** (#892) |
| **Ch3–Ch10** | `docs/constitution/CHAPTER-{3..10}-*.md` | **PR #893 OPEN** |
| **ARR-001..010** | `docs/decisions/` | **MERGED** (#887, #888, #891) |
| **ARR-011** | `docs/decisions/ARR-011-*.md` | **PR #893 OPEN** |
| **Strategic review** | `.spm/2026-07-17-strategic-architecture-review.md` | **MERGED** |
| **DR-938** | Linear, DR-NRPG / `Disaster Recovery Website` | **Urgent** |
| **UNI-2437** | Linear, Unite-Group | **Urgent — 12 conflicts** |

## 4. Running state

- **Branch:** `docs/chapter3-reasoning-framework` @ `6829984f` — **8 ahead of main, 0 behind. Tree clean.**
- **`main`:** `2a6a83ed`. **Untouched by code.**
- **Processes:** none belonging to this repo.
- **Prod:** untouched. **No migration applied.** Prod head remains `20260714023022`.
- **Safe to stop: YES.** Ch1–10 filed and evidenced. **Nothing is lost by pausing** (Ch10 §10.37).

## 5. Verification

- **Repo:** `git rev-list --left-right --count origin/main...HEAD` → `0 8`. Tree clean.
- **Row counts** (Supabase `lksfwktwtmyznckodsau`): `cc_tools` **0**, `cc_agents` **0**, `cc_evidence_records` **0**. **Positive control: `cc_task_events` 97.**
- **Enforcement absent:** `autonomy_max_level` appears in **exactly one file** (`types/supabase.ts`, generated) with **zero application call sites**. Positive control: the grep returns the type defs.
- **`context_compressor.py` does not exist** — positive control: `find` locates other `.py` files.
- **Live site read:** `disasterrecovery.com.au` — hero *"Policyholder first. Always."*, CTA *"Lodge a claim"*. **Screenshot viewed, not assumed.**
- **⚠ No gate script.** `scripts/handoff-loop.sh` **does not exist in this repo** (it's RestoreAssist's). **This handoff is NOT gate-verified.** Docs-only; check PR #893's own CI.

## 6. The four schema breaks — cheapest high-value work

**The constitution names vocabularies the database refuses. Four times.**

| # | Constitution says | Schema enforces | Consequence |
|---|---|---|---|
| 1 | EPIC-000 §8: **5 dispositions** (adopt/adapt/**trial**/observe/reject) | `cc_decisions.verdict CHECK IN ('APPROVED','HOLD','REJECTED')` — **3** | **Stage 19 unrecordable.** 3 of 5 raise a constraint violation |
| 2 | Ch3 §3.7: **High/Moderate/Low** | `cc_evidence_records.confidence CHECK IN ('high','medium','low')` | **`moderate` violates.** *Recommend: amend the chapter to `medium` — cheaper than a migration* |
| 3 | Ch3 §3.14: **16 decision fields** | `cc_decisions` has **9 columns** | Covers **4 of 16.** No class, materiality, alternatives, dissent, authority, outcome |
| 4 | Ch6 §6.9: **autonomy 0–7**; §6.10 **per-domain** | `CHECK BETWEEN 0 AND 5`, **single INT column** | **L6/L7 violate. And §6.10 is structurally impossible** — one agent, one number |

**⚠ Break 4 overturns my own earlier verdict.** I said *"extend `cc_agents`, don't replace"* in ARR-002 and ARR-009. **Right for a 0–5 cap. Wrong for Ch6.** Per-domain authority is a **relation**, not a column.

**⚠ TIME-CRITICAL: UNI-2409 is In Progress building the tool-call enforcement against the 0–5 model Ch6 supersedes.** **If it ships first, it enforces the wrong ladder.**

## 7. Deferred — ~20 rulings, all founder-gated

**This is the bottleneck. Not the doctrine.**

**In UNI-2437 (12):** dispositions 5/4/3 · scorecard 20/8 · confidence (2 defs) · SPM placement · §16 sequencing · Evidence Registry/Register/Board naming · **three governance models** (can the Guardian pause the Board? EPIC-000 gives the Board *final* authority — both can't be true) · calendar vs *"no calendar timeframes"* · **Margo/Margot** · "Constitution" ambiguous · principle collision · founding claim exempt from Principle 7.

**Added by Ch3–10:** loop stages **3 vs 4 vs 7** (Ch2 and ARR-007 both merged; Ch7 supersedes both) · **14 registers, 2 exist** · **4 level schemes, none stored** · **5 fingerprints, no composition rule** · ARR-010 §4 (does the change standard oblige *you* to supply alternatives for dictated blocks?).

**DR-938 (3):** placement (recommend: DR vertical under `Nexus Concierge OS`, sibling to DR-854) · **RA-7076 evidence-capture boundary** (you opened it 04:55 today; collides with FNOI) · does *"Policyholder first. Always."* change?

## 8. Pick up here

**Start here:**
1. `gh pr view 893` — merged, or still open?
2. **Read Part 1 of this document.** That's the whole decision.
3. `docs/constitution/CHAPTER-10-*.md` **validation annex** — the continuation review. It recommends **pause** and states restart conditions.
4. **Do NOT read all ten chapters to get oriented.** Read Part 1 + ARR-011 + Ch10's annex.

**Do not redo:**
- **Do not re-derive `cc_tools` = 0 rows.** Evidenced, positive-controlled. **Re-derived 3× today — Ch7 §7.13 forbids *"repeated research of settled issues."*** **UNI-2435 is answered and Done.**
- **Do not rebuild what exists:** `Nexus Concierge OS` (Phase 1 **100% done**) · contractor matching (**DR-627, shipped**) · stakeholder portals (**RA-429 family**) · claim lifecycle (**RA-1129**) · the knowledge graph (**`wiki_pages` 681 rows + tested `wiki-graph.ts`**).
- **Do not build a new evidence table.** `cc_evidence_records` exists, append-only, RLS — **and is live code** (`tasks.ts:86-96`, `:349-355`). **0 rows ≠ 0 consumers.**
- **Do not write more doctrine.** Ten chapters exist. **Zero of six mechanisms are live.** Reuse-first was written down **2026-07-12** and ignored. **Ch2 §10: *"Preserve the core. Improve the method. Never confuse the two."***

**First command:**
```bash
cd /d/Authority-Site && git fetch && gh pr view 893 --json state,isDraft && git log origin/main --oneline -3
```

## 9. Risk notes

- **UNCHALLENGED.** One model family throughout. **ARR-006 mandates independent confidence assessment and fails its own §4 at approval — it says so in its own text.** **Highest-priority action in this document.**
- **The ecosystem report (EPIC-000 §16) was NOT delivered.** Needs external retrieval. **Scoped, not fabricated** — a plausible-looking table would have been the highest-risk artefact here.
- **Momentum was 100% human-supplied** (ARR-008 §8.1). The runner is **not armed here**; the docs crons have **never fired on schedule**; `.harness/learning/` has captured nothing in **56 days**.
- **"Done" is not evidence in this estate.** DR's own audits: **183 Done tickets with zero merge evidence, 61 confirmed false.**
- **⚠ Credentials:** a GitHub PAT and API keys sit **plaintext** in `~/.claude.json` — an abandoned rotation. **A subagent printed two keys and a bearer token to its scratch output today.** Self-disclosed. **S5** — already on disk — **but finish the rotation.**
- **⚠ Prompt injection is live in estate content.** Two subagent outputs tripped guards today. Ch5 §5.21's *"malicious instruction"* is not hypothetical.
- **Unrelated:** **two RestoreAssist prod deployments in Error state** this morning (`restoreassist-q4m1mxqnx`, `k3ia58bys`, by `zenithfresh25-1436`). Not my lane; flagged.

### My own errors this session — recorded because they are the pattern

**Ch8's near-miss register (§8.46) holds six. The four that landed or nearly did:**

1. **ARR-007 §5.2 claimed the ARRs were "in-repo, versioned" while they were untracked.** Caught at handoff by checking `git status`. **Had I not, the session's entire doctrine would have died on this machine** — the `~/.hermes` failure, reproduced by the author of the record describing it.
2. **I nearly wrote a duplicate readiness assessment** without checking one existed — **while arguing for reuse-first**. A scan launched for another purpose found `.spm/2026-07-16-break-sweep-readiness-assessment.md` (**62/100, 58 defects**) **by chance**.
3. **I filed EPIC-000 with a dangling reference to ARR-008** before it existed — the exact `cc_command_centre` defect, minutes after landing the rule against it.
4. **Chapter 2 merged incomplete.** ⚠ **Not a near miss — it landed.** Lost `constitutional assessment`, the only alignment gate. **Remediated in #892, now merged.** **Root cause (§8.47), not "agent error": I locked a record before it was whole, and nothing gated it.**

**The pattern: the agent authored, filed, and validated its own work with no gate between intent and permanence.** That's Ch6 §6.32 — separation of duties — absent. **Every catch above was me catching myself, which §8.20 says is not defence in depth.**

## 10. Handoff quality check

- **No faked verification.** No gate script exists in this repo — **stated, not implied.** Every number cites its command; every null cites its positive control.
- **No hidden "still running."** No processes, servers, or jobs belong to this repo.
- **Completed vs deferred is explicit.** Completed = §3. Deferred = §7, ~20 items, **all founder-gated**.
- **Known gaps stated, not buried:** unchallenged (§9) · ecosystem report undelivered · **the §9.51 ruling sheet is owed and unbuilt** · this handoff is not gate-verified · four schema breaks unruled.
- **⚠ Part 1 exists because of a defect I found in myself.** Ch9 §9.15: power arises from *technical complexity*, and *"greater power creates greater responsibility for clarity."* Ten chapters of dense prose **concentrated** that power rather than discharging it. **Part 1 is a partial payment on the §9.51 remedy. The ruling sheet is the rest.**

---

**Handoff complete. Next safe action:** read Part 1, then pick **A (ruling sheet)**, **B (Constitutional Fingerprint)**, or **C (rule the four schema breaks)**. **Not Chapter 11** — Ch10 §10.35's continuation review fails six of eight tests, and §10.62 forbids the agent from protecting its own continued operation.
