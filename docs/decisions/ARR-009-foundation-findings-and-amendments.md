# ARR-009 — Foundation Findings and Amendments to ARR-001..008

**Type:** Architecture Review Record — **amendment record**
**Status:** **FINDINGS RECORDED.** Amendments proposed, **not applied** — each requires a founder ruling.
**Date:** 2026-07-17
**Author:** Claude Opus 4.8, from four parallel read-only specialist scans
**Amends:** [ARR-001](./ARR-001-nexus-engineering-baseline.md) · [ARR-002](./ARR-002-governance-and-engineering-foundations.md) · [ARR-006](./ARR-006-engineering-evidence-framework.md) · [EPIC-000](../constitution/EPIC-000-nexus-engineering-constitution.md)
**Baseline:** `origin/main` @ `d178e809` (the merge of PR #887, which landed EPIC-000 + ARR-001..008)

> Per **ARR-008 §1**: doctrine evolves only through **evidence-backed, versioned proposals**. Silent
> change is prohibited. **This record is that mechanism.** Nothing below edits an existing record in
> place; every correction is proposed here, dated, evidenced, and left for a ruling.

---

## 1. Foundation 0 — ANSWERED. The HOLD survives, but narrower and for a different reason.

**All 66 canonical defects walked against `origin/main`. No cap applied. Each verdict from a direct
file read (`git show <sha>:<path>`) or a Linear lookup — not from a commit message.**

| Verdict | Count |
|---|---|
| **CLOSED** | **9** — D001–D007 (all seven P1s), plus D016, D052 |
| **OPEN** | **57** |
| **UNKNOWN** | **0** |

**⚠ The readiness score was NOT recomputed, deliberately.** `.spm/2026-07-16-break-sweep-readiness-assessment.md`
**states no scoring formula** — 62/100 is a holistic verdict with no per-defect weighting shown.
**Inventing a formula and back-filling 9 closures into it would manufacture false precision.** Recorded
as a refusal, not an omission.

**What can be said on evidence: all seven P1s are closed.** The register named these as *part of* the
binding blocker, not the whole of it.

**⚠ The binding blocker was never the code. It is B1 — the prod credential/identity plane** (founder
allow-list, Google, Linear, Xero). **Founder-gated, untouched by every commit reviewed, and
unverifiable from a git read.** On the source document's own terms, **NOT-READY stands** — now for a
narrower and more honest reason: the code-side trust surfaces are fixed; **the credential plane is the
founder's**.

### 1.1 Live P2s, ranked — and one the P1 fixes made *worse*

1. **D014 — `QueueBoard` hardcodes *"waiting for runner — none connected"*.** Closing D003 and D006
   made the runner **safe to arm** — which turns that hardcoded string into an **active lie the moment
   it claims**. **The P1 fixes created this trap.** It is worse now than when the sweep was written.
2. **D030 — the runner plane's public reachability rests on an accidental `startsWith('/api/agent')`
   prefix collision** in `proxy.ts`. **D016 fixed the rate-limit side of that pairing; the auth side is
   untouched.** A landmine for whoever next tightens the public path.
3. **D013 — the claim route can strand a task in `running`** on an `appendTaskEvent` throw, with no
   recovery. **The identical failure shape D003 just fixed on the *release* side, unaddressed on
   *claim*.**
4. **D027 — UNI-2373 sits Done while both its gating child grills remain Backlog** since 2026-07-15.
   Its **sixth** Done-flip. The clearest live instance of the estate's unreliable-Done pattern.
5. **D042 — the cost-allocation route has zero founder/business scoping.** Mitigated today only by
   single-tenancy.

### 1.2 ⚠ Correction to my own brief — recorded because it is the pattern

I briefed the walk that #883 (cron auth) and #884 (lane lifecycle) were relevant. **They closed none of
the 66** — both touch `apps/workspace/*`, outside the defect surface. **Only UNI-2417 closed one
(D052).** I supplied leads and called them evidence.

### 1.3 ⚠ Correction to the walk's own output

The walk reported `origin/main` was *"60 commits ahead of `52f4ee07`"*. **It is 1.**
`git log --oneline 52f4ee07..origin/main | wc -l` → **1**, and that commit is `d178e809` — PR #887's own
merge. **The agent conflated commits-reviewed with commits-since.** Corrected here rather than
propagated. *This is the fourth time in this session a confident claim about repository state was
wrong.*

---

## 2. Foundation 1 — three corrections to ARR-001/ARR-002

### 2.1 ⚠ The estate already solved this, and chose file-over-database. ARR-002 §3 missed it.

**FACT.** `apps/web/src/lib/command-centre/registry.ts:1-13` documents the **identical problem**
already solved for `cc_projects`: the table exists in
`20260604010000_cc_command_centre_phase2.sql:22-44`, and **nothing in `apps/web/src` inserts into it**.
What shipped instead: `.portfolio/PORTFOLIO.yaml` (SSOT) → `scripts/sync-portfolio-registry.mjs`
(`prebuild`, `package.json:11`) → in-tree copy → typed read-only accessor. No DB, no secrets.

**This is load-bearing precedent, not coincidence.** The team tried "put the registry in the DB table
the spec describes" and **shipped a file**. **ARR-002 §3's framing of registry population as a DB
concern walked past a solved problem in its own repo** — a reuse-before-creating failure inside the
record mandating reuse-before-creating.

### 2.2 ⚠ A constraint that breaks the obvious plan

**FACT.** The SSOT for skills and MCP servers lives in `~/.claude/` **on the founder's machine —
gitignored, non-propagating** (`CLAUDE.md` §0). **A Vercel build sandbox has no access to that path.**

**Therefore a `prebuild` script cannot discover skills the way `sync-portfolio-registry.mjs` discovers
projects — there is nothing at build time to read.** Population requires a **two-stage pipeline**: a
discovery script run **manually on the founder's machine**, committing a snapshot; then the existing
sync pattern.

**Honest tradeoff, recorded not buried:** this makes the registry a **periodically-refreshed snapshot,
not a live feed** — which **EPIC-000 §4 explicitly warns against** (*"not a one-time market scan"*).
Close it with cadence and a visible `discovered_at`, not by pretending. Live discovery would need a
local agent pushing via service-role — real infrastructure, not a 50-line script.

### 2.3 ⚠ The permissive-default landmine

**FACT.** `20260604010000_cc_command_centre_phase2.sql:75,77` — `risk_class TEXT NOT NULL DEFAULT
'read'` and `required_level INT NOT NULL DEFAULT 0`. **The database default is the *least restrictive*
classification.**

**Any seed omitting these columns silently produces a registry that looks populated while having
reconciled no risk at all.** Seeding 291 skills and ~23 servers on column defaults would be the
`PORTFOLIO.yaml` pattern with worse consequences.

**Recommendation:** default everything to `external` / `3` / `approval_required: true`; downgrade
individually. **This is what the existing catalogue already does** — of 14 entries, only three
explicitly-reviewed doc tools (`context7`, `ref`, `exa`) get `read`/unrequired. Never auto-downgrade
by heuristic; only auto-*flag as a downgrade candidate*.

### 2.4 ⚠ Skills do not belong in `cc_tools`. This corrects ARR-002 §1.3's "extend" verdict.

**FACT.** `cc_tools.source` CHECK permits only `hermes|mcp|project|codex|claude-code|local`. **291
skills fit none.** Each permitted value names a **real invocation protocol** with a schema and a
transport; a skill has neither — it is invoked by trigger phrase. `source: 'skill'` would require a
fake `input_schema`.

**And EPIC-000 §5.1/§5.2/§5.3 already define Capability, Skills, and MCP as separate registries in one
family.** Cramming skills into `cc_tools` would contradict a decision already ratified in the document
this Foundation implements.

**Amendment to ARR-002 §1.3:** "EXTEND, do not replace" holds **for tools**. **Skills require a
separate registry** (`cc_skills` — name confirmed unused). The verdict was too broad.

### 2.5 ✅ `founder_id` is NOT a schema mismatch — my concern was wrong

**FACT.** Single-tenant doctrine, verified across 40+ call sites. `apps/web/CLAUDE.md:96` documents
`FOUNDER_USER_ID`; every cron/machine-actor path resolves the actor from it, and
`scripts/seed-brand-identities.ts:7` is an **existing seed script with the identical shape**.
`UNIQUE(founder_id, tool_key)` is trivially satisfied; RLS works unmodified. **No migration needed for
the recommended path.**

Deferred debt, recorded: genuine multi-founder operation would need a nullable `founder_id` + partial
unique index, or a global table with per-founder overrides. **Not signalled anywhere — out of scope.**

### 2.6 The acceptance criterion — targets the real failure

`searchCapability('claude-in-chrome')` must **miss today** and **hit after seeding**; same for
`mobbin`, `stripe`, `vercel`. **Negative control:** `searchCapability('totally-fictional-tool-xyz')`
→ 0 hits before and after, so "search returns everything" cannot pass.

**FACT.** `catalogue.test.ts:9-24` **pins the 14 bare keys as contract**. Renaming breaks it —
**update it deliberately, never silently.**

---

## 3. Foundation 2 — corrections to ARR-006, and the append-only answer

### 3.1 ⚠ `cc_evidence_records` is not a clean slate — it is live code. This corrects ARR-006 §3.1.

**FACT.** `apps/web/src/lib/command-centre/tasks.ts:86-96` defines the `EvidenceRecord` type;
`tasks.ts:150` defines `CC_EVIDENCE_RECORDS_TABLE`; **`tasks.ts:349-355` inserts into it.**

**`kind` and `confidence` are an existing, tested consumer contract (CC-03).** **Add beside them; do
not repurpose or reconstrain.** ARR-006 §3.1's "0 rows, extend it" framing implied a free hand. **It
isn't one** — 0 rows does not mean 0 consumers.

### 3.2 The append-only contradiction — resolved

ARR-006 §6 requires evidence be **refreshed, never silently discarded**. The table is **append-only by
design** (SELECT+INSERT only). **You cannot refresh what you cannot update.**

**Resolution: versioned rows, not mutation.** A `lineage_id` chains versions; a refresh is a **new
INSERT** with the same lineage and a later `observed_at`; a retraction is a **new INSERT** carrying
`retracted = true` and a reason. Read through a plain `VIEW` (`DISTINCT ON (lineage_id) ... ORDER BY
observed_at DESC`).

**Two properties fall out:**
- The superseded row is **never mutated or hidden** — it still returns exactly what was true when
  written. **Immutability survives refresh.**
- **ARR-006 §6's "discard must be an explicit, recorded act with a reason and an owner" becomes
  schema-shaped rather than conventional** — with no DELETE and no UPDATE, a retraction *can only
  exist* as a new, dated, owned row.

**A plain `VIEW`, never `MATERIALIZED`** — a materialized view needs a refresh trigger (a cron, or a
trigger-on-insert): a moving part for a table with 0 rows and no proven scale need.

**One non-additive change required:** `task_id` is `NOT NULL`, but ARR-006 evidence is not always
task-scoped. Relaxing it **requires the INSERT policy move with it** — the existing `EXISTS` check
evaluates *false, not error*, on a NULL `task_id`, which would make every non-task-scoped row
**silently unwritable**.

### 3.3 Staleness and linkage — both already built. Reuse.

**FACT — the staleness pattern is shipped.** `dashboard-health-supabase.ts:27-68` already defines
`DEFAULT_STALE_HOURS = 26`, computes staleness **at read time**, and renders *"stale — last report …"*
rather than silently green. **The estate's own NorthStar honesty rule, already in code.**

Surface it through the **existing** `os-health-rollup` cron (every 15 min, already the sole writer of
`dashboard_health`, already has the per-source `build*Row` pattern). **A fifth source function. Zero
new schedules** — against 40 cron entries already live.

**FACT — doctrine linkage costs nothing.** `cc_evidence_records.wiki_path` already exists.
`wiki-graph.ts` already resolves `[[ARR-006]]` into an edge, and drops unresolved links rather than
fabricating them. **681 rows, pure, tested.** ARR-007 §3's "linked to doctrine" requirement is
satisfied by **no new code**.

Evidence→decision needs one FK to `cc_decisions`. **Many-to-many is not built** — 0 rows, no consumer
requiring it. Correct Phase-2 addition, not now.

### 3.4 ⚠ Independence is schema-shallow, process-deep

`CHECK (confidence_inputs <> '{}')` makes *"a score with no inputs is decoration"* a **database
constraint**. `CHECK (assessed_by <> owner)` rejects the lazy self-score.

**But Postgres cannot know that two names are the same non-independent party.** The whole `cc_*` schema
is single-tenant — every row is written under the **same authenticated principal**. **A CHECK catches
literal string collision, not colluding or synonymous identities.**

**Stated plainly rather than dressed up as solved: the deep guarantee is process-only.** Real
enforcement needs a **separate-identity write path** — the existing independent-OpenRouter review
pattern is the available boundary. **A control not enforced at a genuinely separate boundary is a
note** (ARR-002 §2.1, NIST SP 800-207).

### 3.5 Register vs Registry vs Board — recommendation

**Register (ARR-006) and Registry (EPIC-000 §5.11) are one construct under two names.** Canonical:
**Evidence Register**. **The Engineering Evidence Board (ARR-002 §4) is a distinct downstream layer** —
different cardinality (one row per *observed fact* vs one per *scored capability*) and different shape
(a 20-dimension scorecard **citing** register items). ARR-006 §7.1 inferred this; **it is correct on
structural grounds.** The Board is **not built by the Foundation 2 spec.**

---

## 4. Naming — worse than ARR-002 §4 recorded

| Term | Referents | Correction |
|---|---|---|
| **"control plane"** | **FOUR**, not two — Atlas access · Mission Control automation · OWNEST ownership (superseded) · a July-10 automation plan (superseded) | ARR-002 §4 undercounted |
| **"board"** | **FIVE** — `ceo-board` · Evidence Board · founder kanban · Matrix wall/"the deck" · `spec-board` advisor panel | **Not previously recorded.** A search for "the board" is close to meaningless |
| **"Nexus"** | **THREE** systems — Nexus 2.0 (SaaS) · the July CRM orchestration layer · **Nexus Mesh** (`lib/mesh/read-fleet.ts`) | ARR-002 §4 recorded two |

### 4.1 ⚠ The MCP root cause — not alias drift. Three surfaces flattened into one key space.

**FACT.** `catalogue.ts`'s `linear`, `supabase`, `google`, `slack` keys **were authored against the
claude.ai connector surface** and never reconciled against Claude Code config. **Three different
products** — Claude Code (`~/.claude.json`, `.mcp.json`), Claude Desktop
(`claude_desktop_config.json`), claude.ai connectors — **each carry their own MCP namespace.**

**Only 4 of 10 overlap** between the catalogue and what is actually reachable. **`linear`, `supabase`,
`google`, `slack`, `chrome`, `github` have no corresponding entry in any Claude-Code-reachable config
for this repo.**

**Amendment to ARR-001 §3.2:** I framed this as misnaming. **It is a missing dimension.** The
recommended scheme is `mcp:<surface>:<server-id>` — **a flat key space cannot represent "google has
three connectors on claude.ai and zero servers on Claude Code."** Put the surface in the key or that
fact is unrepresentable.

**`google`'s alias must resolve to NULL — refuse, force disambiguation.** Silently resolving to one of
three unrelated connectors is worse than a miss.

### 4.2 Atlas — rename the epic, not the persona

**FACT.** The persona (Atlas/Forge/Pixel/Grid/Quill) dates to **2026-06-12**, is a **five-name matched
set** across two files. **The epic (UNI-2433) is one day old with no repo artefact.** Renaming it costs
nothing structurally. Suggested: **Warden** or **Ledger**. *(ARR-002 §4 implied the collision without
saying which side moves.)*

### 4.3 ✅ Not inflated — recorded because restraint is evidence

**"Runner" was ruled cosmetic** (each distinctly prefixed). **"Capability", "concierge", "council"
checked and cleared.** A short real list beats a padded one.

---

## 5. Proposed amendment to EPIC-000 — a SEVENTH conflict

### ⚠ Conflict 7 — "Margo" vs "Margot"

**FACT.** EPIC-000 §12 and §14 read **"Margo"** (lines 217, 239). **`grep -c "Margot"` against
EPIC-000 → 0.**

**The entire rest of the estate reads "Margot":** the `margot-deep-research` MCP server,
`apps/empire/docs/margot/MARGOT-COMMAND-CENTER.md`, the CARSI integration, `docs/superpowers/`.

**Not silently corrected. Ruling required:** is "Margo" a **typo**, or a **deliberate rename** the
estate has not yet followed? **Either answer is fine; the ambiguity is not.** Per ARR-008 §1 a
constitution is not edited on an agent's guess.

**⚠ Recorded against its author:** I filed EPIC-000 verbatim and **propagated this drift into the
authoritative artefact**, then cited it across five ARRs. Verbatim filing is correct — but it means the
constitution now carries a naming inconsistency **inside the document meant to resolve them**.

---

## 6. What is buildable, what is blocked

| Foundation | State |
|---|---|
| **0 — 66 defects** | **ANSWERED.** All 7 P1s closed. **B1 (prod credential plane) is the blocker — founder-gated.** NOT-READY stands, narrower. |
| **1 — registry** | **BLOCKED on rulings.** §2.4 (skills need their own registry) and UNI-2437 conflict 1 must be ruled before the shape is knowable. |
| **2 — evidence board** | **BUILDABLE.** Design complete. Needs a **founder-gated migration** (prod head `20260714023022`, behind two already-queued). |
| **Naming** | **`catalogue.ts` is one file and the cheapest real fix on the board.** |

---

## 7. Open items added by this record

| # | Item | Where |
|---|---|---|
| 1 | **"Margo" vs "Margot"** — typo or rename? | §5 |
| 2 | **Skills registry split** — `cc_skills`, or another shape? | §2.4 |
| 3 | **Registry as snapshot, not live feed** — accept the EPIC-000 §4 tension, or fund live discovery? | §2.2 |
| 4 | **Atlas rename** — Warden, Ledger, or other? | §4.2 |
| 5 | **`mcp:<surface>:<server-id>`** — adopt? Breaks `catalogue.test.ts` deliberately | §4.1 |
| 6 | **B1 credential plane** — the actual readiness blocker. **Founder-only.** | §1 |

**UNI-2437's six conflicts remain open and unchanged.**

---

## 8. Revisit conditions

1. Any §7 item ruled → the amended record is superseded, **never silently edited** (ARR-008 §1).
2. B1 dispositioned → the readiness verdict is recomputable — **but only if a scoring formula is
   stated.** Without one it stays a holistic judgement, and this record will not invent one.
3. The supporting scans are independently challenged and their findings do not survive.

**⚠ UNCHALLENGED.** Four Claude subagents, orchestrated by a Claude model, synthesised by the same
model. **Per EPIC-000 §12/§18 and ARR-006 §4 this cannot validate itself** — and the four errors caught
in this session (§1.2, §1.3, §2.1, §5) were all caught **inside** the Claude loop, which is evidence
the loop is *useful*, not that it is *sufficient*. **Route to an independent non-Claude reviewer.**

---

*Filed 2026-07-17 against `origin/main` @ `d178e809`. No code written. No schema changed. No record
silently edited. Every claim cites its evidence or is labelled ASSUMPTION / UNKNOWN / OPEN.*
