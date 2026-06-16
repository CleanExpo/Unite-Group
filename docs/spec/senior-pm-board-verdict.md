# Senior PM Multi-Eyes Review — Board Verdict

> **Companion artifact to [`/spec.md`](../../spec.md) §16.** This is the authoritative board verdict and per-discipline sign-off record for the Authority-Site in-house CRM build specification. It is identical to spec.md §16.
>
> **Cross-links:** [spec.md](../../spec.md) · [feature-coverage-matrix.md](./feature-coverage-matrix.md) · [data-model-erd.md](./data-model-erd.md) · [phase-plan.md](./phase-plan.md)

---

## 16. Senior PM Multi-Eyes Review — Board Verdict

**Board verdict: REVISE (APPROVE-WITH-CONDITIONS, with four hard blocks before build).**
**Sign-off date: 2026-06-16. Chair: Chief Reviewer.**

Until the four BLOCK items below are resolved in the spec text and this section's sign-offs are countersigned, the spec remains **DRAFT — not approved for build.** None of the blocks are structural; every one is a reconcile-the-numbers or close-the-open-decision fix. The board is unanimous that the underlying design is sound and the evidence discipline is exceptional — this is a spec that earns trust and then leaves four load-bearing decisions un-made.

> **Revision status (this pass):** the four blockers (B1–B4) and every MAJOR have been applied to the spec text and the three companion artifacts. B1 → §4/§6.1/§6.2 + `data-model-erd.md` §1 (prod-state downgraded to `[UNCONFIRMED]`, mandatory M1.0 regen step). B2 → new §3.1 credential trust boundary. B3 → §7.8.1 approval reconciliation. B4 → §13.0/§13.1 arithmetic corrected to 44/34 ed. This section records the board's verdict and sign-offs as the authoritative gate.

---

### What the board reviewed

Five lenses reviewed `spec.md`, `docs/spec/feature-coverage-matrix.md`, `docs/spec/data-model-erd.md`, and `docs/spec/phase-plan.md` against the live repository. The chair independently re-verified every blocker and major finding against real files before adjudicating.

| Lens | Verdict | Headline finding |
|---|---|---|
| Senior PM / Completeness | Approve with changes | V1 milestones sum to **44 ed**, headline said ~40 — the single most-cited number was internally inconsistent |
| Data Architecture | Approve with changes | **BLOCKER**: "LIVE [VERIFIED]" prod claims are unconfirmed against the only machine-readable prod artifact |
| Security & Privacy | Approve with changes | **BLOCKER**: recommendation-only is enforced by route topology, not by credential — one shared god-key is the whole trust boundary |
| API & Source-of-Truth | Approve with changes | **BLOCKER**: two parallel, unreconciled approval mechanisms (engine vocabulary ≠ live route enum) |
| UX & Accessibility | Approve with changes | Nested CRM pages do **not** inherit the admin gate (layout is metadata-only) — an auth-bypass on PII read surfaces |
| Evidence Integrity | Approve with changes | ~95 cited paths spot-checked; all existing paths confirmed; only nits — independently corroborated all three blockers |

---

### The three blockers (all independently re-verified by the chair)

**B1 — Prod-state evidence integrity (Data Architecture).** The spec tagged `crm_leads`, `agent_actions`, `nexus_clients` and friends as "LIVE / prod-applied [VERIFIED]." The chair confirmed: `types/supabase.ts` — the only machine-readable prod-schema artifact in the repo — contains **no `public.Tables` definition** for `crm_leads`, `agent_actions`, or `nexus_clients` (only `client_agent_actions`, an unrelated table). The spec verified that migration *files* exist and conflated that with prod-*applied* state. This is load-bearing: M1.1's promote transaction references these tables as FK targets; if they are not actually in prod, the promotion fails. (Note: the data-arch review dated the artifact 2026-05-10; it is actually 2026-05-22 — the conclusion is unchanged.) **Fix: downgrade to [UNCONFIRMED], regenerate types from prod as the §17 baseline, and make M1.1 verify each FK target before promoting.**

**B2 — Recommendation-only is a convention, not a control (Security).** The chair confirmed `require-admin.ts:79-81`: the bearer branch compares `Authorization` against `SUPABASE_SERVICE_ROLE_KEY`, the one key that authorizes **every** mutating CRM route. The approval engine only governs the (not-yet-built) execute route. Margot is granted CRM read access; if Margot holds that bearer to read, it can write CRM truth directly, bypassing `approval-lifecycle.ts` entirely. Clause C1 ("no AI capability holds a service-role CRM write") is therefore an org convention presented as an enforced invariant. **Fix: give Margot a distinct read-only credential, declare bearer = full write authority, pull actor attribution into V1, and add the AC that no agent credential can satisfy `requireAdmin` on a mutating route.**

**B3 — Two unreconciled approval mechanisms (API).** The chair confirmed the engine speaks `{requested,approved,rejected,cancelled,executed,expired}` and requires `approvedBy`+`approvalReference` for `may_execute`, while the live opportunities route enum (`route.ts:28`) is `['not_required','requested','approved','rejected','expired']` — no `cancelled`, no `executed` — and gates on a free-text `boardApprovalId` that captures no `approvedBy`; the convert route never calls the engine at all. The spec said "wire the handler onto the engine" without specifying how `approval_status` reaches `executed` or how `boardApprovalId` maps to an engine id. **Fix: declare the engine the single authority, align the CHECK vocabulary, require `approvedBy` capture, and define the id mapping (sub-question of OQ-5).**

**Plus one major elevated to BLOCK by the chair: the arithmetic (B4).** V1 milestones sum to **44 ed** (full) and **34 ed** (fallback), but the headline said ~40/~30 and quoted AUD $48,000/$36,000 against an implied $52,800/$40,800 at the stated $1,200/ed. (The PM review computed the fallback as 33; it is 34 — same direction, slightly larger understatement.) This is the single most load-bearing number in the document and it disagreed with the sum of its own parts before the rate assumption was even applied. It blocks because OQ-1 already names the rate "the highest-leverage answer" — the spec must not understate the quantity it multiplies.

---

### The convergence — where all five lenses agree

The spec is **unusually trustworthy**. Three independent lenses (PM, Data, Evidence) each spot-checked dozens of line-anchored claims and found them accurate: the contacts/opportunities migration has no UNIQUE constraint; the contacts route populates only `dedupe_email_key`/`dedupe_domain_key` (phone/name_company permanently null); the convert route links to `nexus_clients` and never materializes a contact; `safeToAutoExecute` is type-pinned false; the daily-digest env check precedes `requireAdmin` (config-state oracle); the empire pipeline reads `agent_actions` not `crm_opportunities`; `ignoreBuildErrors:true`. The chair re-verified all of these. The spec even **corrects an error in its own locked context** (the convert route is not "missing") with a code citation — a strong integrity signal. All 15 pillars are covered with no blank phase cells, the email/calendar long-pole is honestly called out as the critical path with a mandatory independently-shippable fallback, and the recommendation-only safety contract is preserved in prose throughout. The disagreement is never about *whether* the design is right — it is about four decisions the spec deferred and a number it rounded the wrong way.

---

### The real tensions and trade-offs

1. **"Atomic conversion" vs the platform.** Three lenses (PM, Data, API) independently flagged that the supabase-js client has no multi-statement transaction, so the §6.3 "atomically or with compensating cleanup" acceptance is unmeetable as chained SDK calls and will ship orphaned-contact bugs. The board mandates a single SECURITY DEFINER Postgres RPC promoted sandbox-first. This is the clearest example of the spec's pattern: a correct *requirement* with an unspecified *mechanism*.

2. **The crisp No-Go rule vs the High-risk register.** The §15.3 four-condition No-Go rule read cleanly, but it sat beside four "High" risks the same spec calls launch risks (PITR-before-real-data, public-intake redaction, founder MFA, audit-trail world-read) while OQ-12 left their gating status undecided. The board will not accept a clean rule next to undecided gates: either promote the data-safety items into No-Go, or record them as accepted-risk fast-follows with Phill's signature. The board's instinct is that **PITR-before-real-PII, public-intake redaction, audit read-tightening, and MFA enforcement belong in the No-Go list** — they protect real customer PII at go-live, not punch-list polish. (Resolved in §15.3.)

3. **The single-operator cockpit vs production posture.** Security correctly observes that a 2-email allow-list with optional MFA and a shared service-role key is acceptable for a solo build but not once real contact PII lands in prod. The board sides with promoting MFA, the Margot credential split, and the `agent_actions` read-tightening into V1 — the cost is small and the failure mode (one phished password or one leaked key = full read+write) is catastrophic for a CRM.

4. **Granularity of the coverage matrix.** Defensible but not audit-clean: Pillar 15 carries many infra rows while billing carries 1, and comms collapses four features into one row. A one-sentence "indicative row-counts, not feature-counts" disclaimer resolves it without re-authoring. (Added to §5 and the matrix.)

---

### Board verdict (one paragraph)

This is a strong, evidence-disciplined specification that the board is confident can ship a safe, professional in-house CRM on the locked Vercel + Supabase platform — and it is **not yet approved for build.** The work is genuinely impressive: every current-state claim the board spot-checked against the repo held, all 15 pillars are phase-tagged with no gaps, the email/calendar long-pole is honestly contained with a mandatory fallback, and the recommendation-only AI safety contract is preserved in the prose. But four load-bearing items must be closed first: (B1) the "LIVE/VERIFIED" prod-schema claims are unconfirmed against the only machine-readable prod artifact and must be downgraded with a mandatory regenerate-types-first step; (B2) the recommendation-only contract is enforced by which routes happen to call the engine rather than by the credential boundary, so Margot needs a distinct read-only credential and the spec must stop presenting a convention as a control; (B3) two parallel approval mechanisms with incompatible status vocabularies must be reconciled onto the engine as the single authority; and (B4) the V1 effort headline understates its own milestone sum (44 ed, not ~40) on the most-cited number in the document. Alongside these, the board requires the conversion-atomicity RPC, the single-currency forecast constraint, the CRM-page admin-gate hoist, consent provenance, public-intake redaction, the audit-read tightening, and the No-Go/risk reconciliation — all spec-text or one-migration fixes, none structural. **Resolve the four blocks and record sign-off in this section, and the spec is clear to build.**

---

### Sign-offs

- **Senior PM / Completeness** — APPROVE WITH CHANGES (P4 arithmetic, P13 binary day-8 gate, P15 No-Go reconciliation, P18–P20 clarifications).
- **Data Architecture** — APPROVE WITH CHANGES, **BLOCKING on P1** (prod-state evidence integrity); plus P5 RPC, P6 currency, P16 R6 FK, P21 dedupe stability.
- **Security & Privacy** — APPROVE WITH CHANGES, **BLOCKING on P2** (shared service-role credential); plus P8 audit-read, P9 consent, P10 public-intake redaction, P17 MFA.
- **API & Source-of-Truth** — APPROVE WITH CHANGES, **BLOCKING on P3** (approval-mechanism reconciliation); plus P5 atomicity, P11 firewall asymmetry, P12 idempotency, P24–P25 contracts.
- **UX Feasibility & Accessibility** — APPROVE WITH CHANGES (P7 gate-inheritance, P14 WCAG contrast; responsive/chart-theming scope corrections; mutating-surface state coverage).
- **Evidence Integrity** — APPROVE WITH CHANGES (nits only; independently corroborated all three blockers in the live repo).
- **Chief Reviewer (board chair)** — **REVISE: BLOCK on P1–P4; clear to build immediately on their resolution.**

---

*This verdict is mirrored in [`/spec.md`](../../spec.md) §16. The four blockers (B1–B4) and every MAJOR have been applied in the revision pass; the spec is clear to build on Phill's countersignature.*
