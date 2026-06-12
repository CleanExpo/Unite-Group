---
type: wiki
updated: 2026-05-15
---

# Grill Output — Pilot Bot Plan (`2026-05-14-agency-bot-pilot.md`)

First smoke test of `/grill-with-docs` against a real Unite-Group spec. The skill was run in **doc-mode** (treat the plan as a frozen interviewee, surface the questions the skill would ask Phill if the plan didn't exist yet, then score the doc's answers).

**Verdict:** PASS. See §Verdict at the bottom.

## Headline

The plan is operationally tight at the code level — every task ships with TDD tests, file paths, commit messages — but it leaks **domain-language ambiguity** in three high-leverage places: (1) the `fingerprint` term is invented mid-plan with no definition, no collision rule, and no glossary entry; (2) `pillar` is defined twice (11 enum values in `goal_feed.py` Task 11 vs. an implicit Composio-team-key mapping in Task 12 `_TEAM_TO_PILLAR`) — silent drift bait; (3) the `state` enum on `pilot_suggestions` has 6 values but only 4 button paths reach them, leaving `modified` orphaned and `accepted`'s downstream consumer (`_dispatch_downstream`) as an admitted stub. None of these are bugs in code, they're bugs in **shared language** — the exact class `grill-with-docs` is designed to catch. The single biggest gap is the missing definition of `fingerprint`, because every source, the memory layer, the preference store, and the dedupe logic all depend on it being deterministic across cycles, but the plan never says how it's generated.

## Question-by-question grill

| # | Grill question (cardinality / status enum / collision / naming) | What the doc says | Gap / assumption |
|---|---|---|---|
| 1 | **Define `fingerprint`.** Is it a hash of headline? source+id? something else? Must it be stable across cycles? | Used in `RawCandidate.fingerprint` (L298), `pilot_suggestions.fingerprint` (L188), `pilot_preferences.fingerprint_pattern` (L207), and `is_blocked()` (L413). Example values: `linear:stale_epic:{id}` (L939), `github:stale_pr:{repo}:{number}` (L984), `margot:research:{id}` (L1049), `pilot:smoke:test` (L1224). | **GAP.** No definition, no collision rule, no shape contract. The colon-delimited convention is implied by example only. `fingerprint_pattern` in preferences is named like a glob but used as an equality match (L414 `.eq("fingerprint_pattern", fingerprint)`). |
| 2 | **Cardinality: one `pilot_suggestion` → many `pilot_preferences`?** Or is it the other way? | Tables are independent — no FK between them (L186-218). `is_blocked()` queries preferences by `fingerprint_pattern == fingerprint`. | **GAP.** Relationship is implicit. If two suggestions share a fingerprint prefix (e.g. `linear:stale_epic:RA-2947` and `linear:stale_epic:RA-3001`) and the user clicks "Never" on the first, does it block all `linear:stale_epic:*` or only the exact one? Code says exact (L414). Wiki design §3 likely says class-level. Unresolved. |
| 3 | **`state` enum has 6 values; map each to its triggering action.** | enum: `pending`, `accepted`, `deferred`, `rejected`, `blocked`, `modified` (L198). Buttons: `do_it→accepted`, `never→blocked`, `not_now→deferred`, `modify→modified` (Tasks 10). `why_this` and `more_context` return text, no state change. | **GAP.** `rejected` is in the enum but no button writes it. Where does it come from? Halt-gate? Saturday LINT? Phantom value. |
| 4 | **Define `pillar`.** Is it the 11-value enum from `goal_feed.pillars()` or the 8-key Linear-team map in `_TEAM_TO_PILLAR`? | `goal_feed._PILLARS` lists 11 (L823). `linear_source._TEAM_TO_PILLAR` maps 8 keys to 6 of those 11 (L913). `margot_source._VALID_PILLARS` is a different 8-value subset (L1033). | **GAP — silent drift.** Three sources of truth, all inconsistent. `Plumbing`, `HVAC`, `Pressure-Washing`, `Margot`, `Wiki` exist in `goal_feed` but no source produces them. `IEP` is in `goal_feed` + `margot_source` but absent from `linear_source` — KR7 (IEP NIEPA charter) cannot fingerprint via Linear. |
| 5 | **Halt-gate at 3 pending — what counts as "pending"?** Only sent-but-unanswered? Or also queued-but-unsent? | `pending_count()` selects `where state='pending'` (L411). State `pending` is the default on insert. | **CLEAR — but ambiguity adjacent.** What about suggestions that hit `off_hours` or `no_suggestion` returns? They never enter the table. Fine — confirmed implicitly by the `dispatcher.send → record_suggestion` flow (L668-682). |
| 6 | **What's the dedupe rule across cycles?** If Linear returns the same stale epic 14 cycles in a row, do we send 14 messages or 1? | Suggester ranks per cycle, picks top (L515-521). No fingerprint lookup against existing `pending` rows in the suggester. `is_blocked()` only checks `pilot_preferences`, not `pilot_suggestions`. | **GAP — operational hazard.** Same fingerprint will be re-sent every cycle until halt-gate trips at 3. Phill receives 3 duplicate "RA-2947 stale 7d" messages before silence — violates `[[feedback-no-repeating-alerts]]` ("single-shot or escalating cadence — never every-cycle pings"). |
| 7 | **What's "stale"?** Linear says `>7 days` (L911). GitHub says `green ≥48h, no merge` (L955). Are these the same concept? | Different windows, different domains, both labelled "stale" in commits + comments. | **NAMING COLLISION.** Two definitions of stale. Should be `stale-in-flight` (Linear) vs `stale-green` (GitHub) to prevent future skill agents conflating them. |
| 8 | **Cardinality: one `RawCandidate` → one Telegram message?** Or can a candidate bundle? | `composer.format(c)` returns one `{text, reply_markup}` per candidate (L602). Scheduler picks ONE top per cycle (L342). | **CLEAR.** 1:1. Good. |
| 9 | **`effort` enum is `XS/S/M/L`. What does each map to in human time?** Hours? Story points? | Used as a scoring weight (`_EFFORT_W` L505), no definition of what the human should infer. | **GAP — minor.** Suggester math works regardless, but when Phill sees "Effort: M" in Telegram he needs to know if that's 1h or 1 week. Wiki design probably says. Plan doesn't. |
| 10 | **What is `agent-derived` as a Source?** It's in the Literal at L292 but no source file produces it. | Used only in the Task 16 smoke test synthetic candidate (L1226). | **DEAD ENUM VALUE.** Either remove from the Literal or document the path (e.g. Margot or Pilot itself generates first-party suggestions). |
| 11 | **`_dispatch_downstream(suggestion)` is a stub (L771-778). What's the contract for downstream consumers?** | Comment says "downstream bots poll the `accepted` queue in their own loops". Pillar→bot mapping "wired in Task 12 alongside Linear source" — but Task 12 doesn't actually wire this. | **GAP — admitted scope deferral, but no follow-up issue cited.** Self-review L1255 confirms it's intentional, but there's no Linear ticket reference, no ADR, no separate plan. This is the kind of decision that survives because nobody notices it's missing until Phase 5 doesn't exist. |
| 12 | **Why store `body_json` as `jsonb` rather than typed columns?** Trade-off: schema flexibility vs queryability of `impact_reasoning` and `provenance` (the only two fields actually read later, L764, L767). | Schema declares `body_json jsonb not null` (L195). Feedback handler reads `s.get("body_json", {}).get("impact_reasoning")` and `.get("provenance")`. | **HARD-TO-REVERSE — candidate for ADR.** Once data lands in `body_json`, promoting to typed columns is a migration. Two named fields are queried; could be columns. Decision not surfaced anywhere. |
| 13 | **Tenancy boundary:** all `pilot_*` tables live in Supabase `lksfwktwtmyznckodsau`, but RLS is `service_role` only (L216). What stops a future portfolio brand portal from reading them? | Service-role lockdown is correct for an internal-only bot. Plan doesn't explicitly call out: this is NOT multi-tenant; do not promote to shared schema. | **HARD-TO-REVERSE — candidate for ADR.** Internal-only vs portfolio-shared is a hard-to-undo decision. Plan implies internal but doesn't name it. |
| 14 | **`PILOT_DISABLED=0` — what's the off-ramp?** If Phill wants to silence Pilot during a high-focus session, does he edit `~/.hermes/.env` and reload the LaunchAgent? Or is there a `/stop` Telegram command? | Greeting template (L150) says "Reply STOP to pause" — but no STOP handler exists in `feedback.py`. | **CONTRACT BREACH.** Spec promises a feature (STOP command) that the code doesn't implement. Either remove the greeting line or add the handler. |
| 15 | **Time zones:** scheduler uses `AEST = timezone(timedelta(hours=10))` (L319). What about AEDT (UTC+11)? | Hard-coded `+10`, no DST handling (L319). | **GAP — date-sensitive.** Australia has AEDT (Oct–Apr). The plan will silently drift 1h between Oct 2026 and Apr 2027. Active window will be effectively 07:00–21:00 local during summer. |
| 16 | **What's a `provenance` value?** | Read at L767 from `body_json["provenance"]`. Never set by any source. | **GAP — dead read.** No source writes `provenance` into `body_json`. The `More context` button will always return `"(no provenance cached)"`. |

## Top 5 ranked spec changes (highest-impact first)

1. **Define `fingerprint` as a first-class glossary entry** (addresses Q1, Q2, Q4, Q6). One paragraph: `<source>:<kind>:<stable_id>`, must be stable across cycles, equality match in preferences (no glob), unique-per-suggestion across all-time. Then add an index on `pilot_suggestions(fingerprint)` already present (L203) — but add the dedupe rule: **suggester MUST skip candidates whose fingerprint already has a `pending` or `deferred<24h` row**. Closes the every-cycle duplicate hazard at Q6 + the `[[feedback-no-repeating-alerts]]` violation.
2. **Reconcile `pillar` to a single source of truth** (Q4). Move the 11-value enum into `swarm/pilot/types.py` as a `Literal`. Make `_TEAM_TO_PILLAR` and `_VALID_PILLARS` import from it. Fail loud (assert) on unknown values rather than silently coercing to `"Tier-2 Infra"` or `"Margot"`.
3. **Write ADR `001-pilot-suggestions-as-jsonb.md`** documenting the `body_json jsonb` choice + the tenancy/RLS boundary (Q12, Q13). Both are hard-to-reverse. SKILL.md §ADR rules flags exactly this class.
4. **Either implement `STOP` handler or remove the greeting promise** (Q14). Five lines in `feedback.py` to handle `text == "STOP"` → set `PILOT_DISABLED=1` via a sidecar file. Or delete `Reply STOP to pause` from the greeting template.
5. **Replace AEST hard-code with `ZoneInfo("Australia/Sydney")`** (Q15). One-line fix; closes a silent-drift bug that surfaces in 5 months.

## Anti-findings (what the doc gets RIGHT)

- **TDD scaffolding is exemplary.** Every task ships with a failing-test step, run-and-verify-fail step, implement step, run-and-verify-pass step, commit step. Tight contract throughout.
- **Sequencing gate is explicit.** Phase 2 doesn't start until autonomy-gap items #1–3 close (L170). Honours `[[board-deliberation-browser-harness-2026-05-14]]`.
- **Halt-gate is well-specified** (Q5). State is `pending`, count is 3, defaults are explicit, tested in `test_halt_gate_blocks_at_3`.
- **BotFather rate-limit guard is in-plan** (Task 1, L48-66). Honours `[[incident-botfather-rate-limit-2026-05-14]]`.
- **Secrets handling matches memory** (L70, L86-96). Never asks Phill to paste tokens; writes directly to `~/.hermes/.env`. Honours `[[feedback-secrets-handling]]`.
- **Composer caps are tested.** ≤80-char headline, ≤500-char body, six-button shape — all under test (L551-577).
- **Self-review section explicitly tracks the 11 Magnus patterns** from `agency-bot-design-2026-05-14.md` §2 against tasks (L1254). Good provenance discipline.

## Cross-refs

- Skill under test: `~/.claude/skills/grill-with-docs/SKILL.md`
- Skill research extraction: `[[research-grill-with-docs-2026-05-15]]`
- Target doc: `pi-seo-workspace/unite-group/docs/superpowers/plans/2026-05-14-agency-bot-pilot.md`
- Design spec the plan derives from: `[[agency-bot-design-2026-05-14]]`
- Productization sibling: `[[agency-tinder-game-design-2026-05-15]]`
- Memory triggers honoured: `[[project-contextbot-platform]]`, `[[feedback-no-slack]]`, `[[feedback-no-repeating-alerts]]`, `[[feedback-secrets-handling]]`, `[[incident-botfather-rate-limit-2026-05-14]]`
- Gating wiki: `[[board-deliberation-browser-harness-2026-05-14]]`
- Audit discipline: `[[feedback-audit-verification]]`

## Verdict — did the skill PASS its first real test?

**PASS.**

Against the criteria from the smoke-test brief:

- **≥10 substantive grill questions?** YES — 16 questions, all keyed to specific lines or sections.
- **≥3 questions surface a real gap (not nitpicks)?** YES — Q1 (fingerprint undefined), Q4 (3-way pillar drift), Q6 (every-cycle duplicate hazard violating no-repeating-alerts), Q11 (downstream dispatch stub), Q14 (STOP greeting contract breach), Q15 (AEST hard-code DST bug), Q16 (provenance dead read). Seven real gaps; floor was three.
- **Output is decisionable?** YES — Top-5 spec changes are ranked, each closes a specific question, four of them are <10 lines of code or one ADR file.

Cardinality + status-enum + naming-collision discipline from the SKILL.md (rule 3) all fired correctly:
- Cardinality fork at Q2 (suggestion↔preference).
- Status enum hunt at Q3 (`rejected` orphan value).
- Naming collision at Q7 (two definitions of "stale").

**Skill is production-ready as-is.** No changes recommended to `SKILL.md` from this smoke test. One refinement worth considering after a 2nd–3rd real run: add an explicit instruction that in **doc-mode** (grilling an existing spec rather than interviewing a human), the skill should surface dead-read / dead-write / orphan-enum patterns (Q3, Q10, Q16) — these are uniquely visible when the whole spec is on the page, and the interview format wouldn't naturally produce them. But this is an enhancement, not a fix.

## Hand-off

> Glossary not locked (no human in this smoke test) — but the questions are surfaced. Suggested next step: Phill answers Q1, Q4, Q12, Q13 by hand or in a 4-question live `/grill-with-docs` session, the answers land in `~/Pi-CEO/Pi-Dev-Ops/context.md` + `adrs/001-pilot-suggestions-as-jsonb.md`, then `superpowers:writing-plans` produces a v2 of the pilot plan with Q1/Q6 dedupe rule baked in.
