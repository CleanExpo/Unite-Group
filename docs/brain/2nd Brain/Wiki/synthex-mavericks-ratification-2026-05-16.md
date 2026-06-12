---
type: wiki
updated: 2026-05-16
---

# Synthex × Mavericks — Pi-CEO Board Ratification (2026-05-16)

> Binding decision memo on the 5 open Mavericks ruling questions from `Wiki/synthex-agency-mavericks-strategy-2026-05-13.md` lines 117-123. Ran the full 9-persona Pi-CEO Board (`ceo-board` skill, Stages 1-6) against the forensic implementation audit in `Wiki/synthex-evidence-brief-2026-05-13.md`. **The strategy doc as written is superseded by this ratification.** This memo lives in the wiki only — no `Synthex/CONSTITUTION.md` edit until Phill ratifies.

## Board roster + date

| Persona | Role |
|---|---|
| CEO | Synthesis + memo author |
| Revenue | Unit economics, payback, pricing |
| Product Strategist | Product framing, scope discipline |
| Technical Architect | Feasibility, dependencies, timelines |
| Market Strategist | Positioning, market perception |
| Compounder | 5-year asset accumulation |
| Moonshot | Asymmetric upside, speed |
| Custom Oracle | Marketing-automation domain veteran (15 yr) |
| Contrarian | Steelmans NO on every Q (mandatory) |

**Date:** 2026-05-16 · **Quorum:** 9/9 · **Founder seat:** Phill (ratifies via sign-off line below)

**Pre-flight reading:** `synthex.md` · `synthex-agency-mavericks-strategy-2026-05-13.md` · `pathway-to-2b-2026-2028.md` · `synthex-evidence-brief-2026-05-13.md`

---

## Decisive context (Stage 1.4 — Wiki Grounding)

The Mavericks strategy doc (2026-05-13) and the forensic evidence brief (also 2026-05-13) were written the same day. The evidence brief was written **after** the strategy doc and audits whether the strategy doc's premises hold in current code. **Four findings from the evidence brief reshape these 5 questions:**

1. **Q3 reality:** brand-guardian is binary today (`brand-guardian-lint.ts:92` — `process.exit(errors.length > 0 ? 1 : 0)`). No rate, no score. The "85%" number is borrowed from Troy Dean's video with zero implementation.
2. **Q4 reality:** The `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` schema is purely aspirational — zero SKILL.md files implement it. Refit is a 10-skill refactor, not a rename. Canonical Wave 5.3 is **Honcho memory promotion → Margot's primary user model** (`wave-roadmap.md:35`). Bumping it defers the founder's video-first status surface.
3. **Q5 reality:** Zero real-code GHL references anywhere in the Synthex repo. Reaffirm-current-state vote, not a new decision.
4. **Q2 reality:** CCW pays $2,750/mo today (not $5K). Exit-thesis math needs ~$4M/yr per vetted client for $200M ARR via 50 clients. The $5K/mo floor is both above CCW comp AND 60× too low against exit-thesis math.

---

## The 5 questions — per-Q 9-persona deliberation + binding decision

### Q1. Approve `synthex-skill-library/` as a separate repo?

| Persona | Position |
|---|---|
| Revenue | NO — generates $0 this fiscal year; defer. |
| Product Strategist | NO — infrastructure decision, belongs in Pi-Dev-Ops plan doc not constitution. |
| Technical Architect | NO — symlink-shared-substrate is working; forking introduces dependency-resolution complexity. Revisit Q3 2026. |
| Market Strategist | NO — internal infrastructure choice, doesn't change market position. |
| Compounder | DEFER — only compounds if telemetry exists first (Q3 substrate is prerequisite). |
| Moonshot | DEFER with a date — tie to Association launch timing. |
| Custom Oracle | DEFER — acquirers value deployment data, not repo structure. Revisit when telemetry exists AND ≥3 external clients running the skill library. |
| Contrarian | NO — "skill library as sellable IP" is cosplay as a $2B company; agencies sell outcomes, not skills. |

**CEO synthesis:** Eight of nine personas land NO/DEFER. The shared-substrate symlink model at `~/.claude/skills/marketing-*` works. Splitting introduces overhead with benefit ≥18 months out (Association launch Wave 1, per `association-launch-plan-2026`).

**BINDING DECISION: DEFER** — revisit Q3 2026, gated on (a) telemetry substrate existing AND (b) ≥3 external vetted clients running the skill library.

---

### Q2. Set the $5K/mo floor as constitutional for external clients?

| Persona | Position |
|---|---|
| Revenue | NO as constitutional — $5K is $2,250/mo above CCW comp AND 60× too low for exit-thesis math. After cross-ex: YES as marketing-copy floor. |
| Product Strategist | NO as constitutional — pricing belongs in `operational-priorities` not constitution. |
| Technical Architect | Out of dimension. |
| Market Strategist | YES as marketing-copy floor; NO as contractual floor. Differentiate. |
| Compounder | YES as marketing anchor (outcome of brand position, not cause). |
| Moonshot | YES with reframe — minimum *published* price; bespoke deals honor existing relationships. |
| Custom Oracle | Specifically: do NOT constitutionalise the Mavericks-relative anchor ("above Troy's $3K") — that imports Troy's frame into our constitution permanently. |
| Contrarian | NO — $5K is "above-Troy" theatre; anchor is wrong against both real anchors (CCW $2,750 / exit-thesis $4M/yr). |

**CEO synthesis:** The original framing collapsed in cross-examination. $5K serves as a marketing-perception signal (vetted-not-volume) but not as a contractual floor (would break CCW grandfathering). The Custom Oracle's point on anchor-source is decisive — don't constitutionalise an anchor whose justification is "above Troy's $3K".

**BINDING DECISION: YES with reframe** — $5K/mo is the **minimum published external price** in Synthex marketing copy. NOT a contractual floor. CCW ($2,750/mo) grandfathered with no public-page change. **NOT constitutional** — lives in marketing-copy and `operational-priorities-q2-2026` only.

---

### Q3. Accept 85% brand-guardian autonomous pass-rate as the gate?

| Persona | Position |
|---|---|
| Revenue | NO until measurement exists — "policy theatre". |
| Product Strategist | Genuinely constitutional in nature BUT needs working aggregator first. |
| Technical Architect | DECISIVE NO on the number — `brand-guardian-lint.ts:92` is binary (`process.exit(N>0?1:0)`). The 85% rate does not exist as code. Cannot ratify a metric with no aggregator. |
| Market Strategist | YES on the principle (gate to autonomous production); number derived empirically. |
| Compounder | YES on the principle — per-skill pass-rate telemetry stored over time IS the compounding asset. |
| Moonshot | Reframe — build pass-rate aggregator in Wave 5.5; once it exists, 85% becomes the gate; until then, manual review. |
| Custom Oracle | YES on principle; the specific number must come from first 30 days of telemetry, NOT from Troy's video. |
| Contrarian | NO — 85% is borrowed from a YouTube transcript. Biggest unstated assumption: that 85% is even the right *shape* of metric (maybe "zero forbidden-words/artifact" is). |

**CEO synthesis:** The principle is sound; the number is borrowed. Architect's veto is binding — you cannot ratify a metric whose substrate doesn't exist. Compounder's reframe (telemetry-first, threshold-derived-empirically) is the correct sequence.

**BINDING DECISION: SPLIT** — **YES on the principle** "no brand goes hands-off (autonomous production) without a measured pass-rate threshold". **DEFER the specific number** until 30 days of empirical pass-rate telemetry exist via the new `synthex_skill_runs` Supabase table (see Q4 reframe). NOT constitutional today; revisit after telemetry.

---

### Q4. Refit `marketing-*` skills to `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` schema in Wave 5.3?

| Persona | Position |
|---|---|
| Revenue | NO until measurement exists. |
| Product Strategist | Belongs in Pi-Dev-Ops plan doc; refit is 3-5 day refactor. |
| Technical Architect | DECISIVE NO as proposed — bumping Honcho out of Wave 5.3 defers Margot's primary user model (founder's video-first surface). That trade is wrong. |
| Market Strategist | Internal, no market position effect. |
| Compounder | KEY REFRAME — the compounding asset is per-skill telemetry, not the schema. Schema is a vehicle. Reframe to "instrument existing marketing-orchestrator gates with per-skill telemetry" — 1-2 day patch, doesn't bump Honcho. |
| Moonshot | Accept Compounder's reframe — Wave 5.5 patch not Wave 5.3 refit. |
| Custom Oracle | Confirmed — acquirers value telemetry, not schema. Compounder sequence (Q3 → Q4 → Q1) is right from DD perspective. |
| Contrarian | NO — engineering vanity that degrades Margot's user model. Schema-refit value does not exceed cost of degrading founder's primary interface. |

**CEO synthesis:** The Compounder's cross-examination reframe is the centerpiece of this deliberation. marketing-orchestrator already has two of the moves the new schema is reaching for (discovery brief gate at lines 12-36, 5-D critique gate at lines 159-174 per the evidence brief). The compounding asset is *per-skill pass-rate telemetry over time*, not the schema. Schema becomes a *consequence* of having data, not a prerequisite.

**BINDING DECISION: NO as originally proposed; YES to the reframe** — **Wave 5.5 patch:** instrument existing marketing-orchestrator gates with per-skill telemetry to a new `synthex_skill_runs` Supabase table. Honcho memory promotion **KEEPS its Wave 5.3 slot**. Schema refit revisited only if telemetry surfaces that existing gates fire at the wrong granularity.

---

### Q5. Reject GoHighLevel substrate definitively?

| Persona | Position |
|---|---|
| Revenue | YES — zero cost. |
| Product Strategist | YES as documented principle; constitutional level is overkill. |
| Technical Architect | NO change needed — zero LOC reference GHL; vote is a no-op. |
| Market Strategist | Market position defended by substrate existence, not by constitutional bans on alternatives. Documented principle is enough. |
| Compounder | YES as principle, not constitutional. |
| Moonshot | YES as documented principle (downgraded from constitutional after Contrarian's challenge). |
| Custom Oracle | Reaffirm-current-state. |
| Contrarian | NO — performative vote on something we never adopted; "constitutional" line is clutter. The strongest dissent of the deliberation. |

**CEO synthesis:** Six personas accept Q5 as a documented principle for cultural-signal value (team and future hires reading the wiki). The Contrarian argues even this is clutter. I rule in favor of the majority because the strategy doc already states the position and removing it creates ambiguity for new contributors — but the Contrarian's challenge is the weakest-link ruling of the five, easily revisited.

**BINDING DECISION: YES as documented principle in `synthex-agency-mavericks-strategy-2026-05-13.md`; NO as constitutional line.** Zero LOC reference GHL — no constitutional clutter. The principle stays in the strategy doc and this ratification.

---

## Cross-cutting observations

1. **Constitutional bar is "true and locked, not aspirational."** Three of five questions describe systems that don't yet exist (separate repo, 85% metric, new schema). Constitutionalising aspirations conflates intent with reality. **Net result: zero `Synthex/CONSTITUTION.md` edits today.**

2. **Cross-dependency chain (Compounder's sequence):** Q3 (telemetry substrate) is a **prerequisite** for Q4 (instrumented gates), which is a **prerequisite** for re-evaluating Q1 (separate repo as IP). Q2 (pricing) is independent. Q5 (GHL) is a no-op. Ordering: **Q3 substrate → Q4 instrumentation → Q1 IP question**. Phill must not pre-commit to Q1 or Q4-as-originally-proposed before Q3 telemetry exists.

3. **The strategy doc as written is superseded.** Each ruling diverges from the strategy doc's framing. This is not a board failure — it is the strategy doc colliding with the evidence brief that was written *after* it. The strategy doc should be annotated with a "Ratified-with-amendments 2026-05-16 — see `synthex-mavericks-ratification-2026-05-16`" header (next-action item).

4. **Contrarian round shifted three rulings.** Q5 downgraded (constitutional → principle). Q2 reframed (contractual → marketing-copy). Q3 split (principle yes / number deferred). The Contrarian's mandatory NO-steelman produced material changes, not just challenge for its own sake.

5. **Margot's memory model (Honcho, Wave 5.3) is protected.** The single biggest implicit cost of approving Q4 as originally proposed was deferring the founder's primary status surface. The Architect's veto on this was decisive.

---

## Persona dissent worth Phill's attention

**Contrarian on Q5:** Six personas accepted Q5 as a documented principle. The Contrarian argues it's constitutional clutter — we shouldn't even document a ban on a substrate we never adopted. I ruled in favor of the majority but flag this as the **weakest ruling of the five** and the one Phill is most likely to revisit. If Phill agrees with the Contrarian, simply delete the Q5 line from the strategy doc — no other consequence.

**Architect on Q4:** The veto was decisive but it rests on the premise that marketing-orchestrator's existing discovery-brief-gate and 5-D-critique-gate fire at the **right granularity** for per-skill telemetry. The evidence brief asserts they do. If instrumentation surfaces they fire at wrong granularity (per-wave instead of per-skill), the Q4 reframe collapses and the full schema-refit debate re-opens. This is captured in the memo's "Risk to Watch."

---

## Open follow-ups

1. **Annotate the strategy doc** — `synthex-agency-mavericks-strategy-2026-05-13.md` needs a header noting "Ratified-with-amendments 2026-05-16, see [[synthex-mavericks-ratification-2026-05-16]]". Owner: Margot. Within 1 day of Phill's ratification.

2. **Resolve `verify-pricing-truth`** — the evidence brief TODO that asks whether the current synthex.social pricing page shows public Pro/Growth/Scale tiers or invite-only copy. MUST resolve before Q2's $5K marketing-floor copy lands on the pricing page. Owner: PM-Synthex. Within 3 days.

3. **Author Wave 5.5 plan doc** at `unite-group/docs/superpowers/plans/2026-05-16-synthex-skill-telemetry.md` covering: (a) `synthex_skill_runs` Supabase table schema, (b) instrumentation of marketing-orchestrator discovery-brief-gate + 5-D critique-gate to write per-skill rows, (c) pass-rate aggregator stub on top of `brand-guardian-lint.ts`. Owner: PM-Synthex. Within 7 days of Phill's ratification.

4. **Empirical 85% threshold derivation** — after 30 days of `synthex_skill_runs` telemetry, derive the actual pass-rate threshold from first-month data. Owner: CMO bot. Trigger: telemetry table existing + 30 days elapsed.

---

## Sign-off — Phill ratifies

To make this memo binding and trigger the next-actions:

> **Phill approves this memo by replying "ratify mavericks-2026-05-16" to Margot**

Until ratified, this is a Board recommendation — no code changes, no constitution edits, no marketing-copy changes. After ratification, the four open follow-ups dispatch automatically (Margot → PM-Synthex → CMO bot).

---

## Cross-refs

[[synthex]] · [[synthex-agency-mavericks-strategy-2026-05-13]] · [[synthex-evidence-brief-2026-05-13]] · [[pathway-to-2b-2026-2028]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]] · [[ccw]] · [[brand-guardian]] · [[founder]]
