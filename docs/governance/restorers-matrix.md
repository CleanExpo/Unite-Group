# The Restorer's Matrix

What the RestoreAssist spine captures, and why — for the business owner and the policyholder.

Status: **founder-authored spec, received 2026-09-07.** Recorded here verbatim as the
product side of UNI-2673's regulatory-hook matrix (deliverable D3). Section 8 audits its
factual claims against the evidence ledger. Nothing here has left `docs/governance/`.

---

**Allegiance, stated once:** every metric here serves the restoration business owner and the
policyholder. Insurers and TPAs already score restorers all day through SLA-embedded KPIs
that decide who gets work. Nobody scores the other direction from field data. This matrix
is the other direction.

**Capture laws (non-negotiable):**

1. **Passive capture only.** Every metric derives from events already flowing through the
   one-CRM spine — state changes, timestamps, receipts. A metric that needs extra typing
   dies in the field.
2. **One tap of attribution.** Every state change records *who we're waiting on*:
   Us · Insurer/Adjuster · TPA · Builder/Trade · Assessor · Client · Access/Weather.
3. **Every number carries a receipt** — timestamp, actor, source event. Same architecture
   as report grounding.
4. **The restorer owns their data.** National aggregation is opt-in and anonymised.
   Publication of any payer-facing aggregate is a founder + legal decision, never automatic.

---

## Family 1 — Timeline & Delay Attribution (the crown jewel)

The event chain, timestamped end to end:
`FNOL → first contact → on-site → make-safe complete → mitigation start → dry standard met
→ scope submitted → scope approved → works start → works complete → invoice sent → paid`

| Metric | Derived from | What it proves |
| --- | --- | --- |
| Response time | FNOL → on-site | The 24–48h promise, and the ≤4-business-hour work-start threshold, measured not asserted |
| Company Time | Sum of restorer-attributed hours | What we controlled, we did fast |
| Third-Party Wait Time | Sum of externally-attributed elapsed time, per party | Where the claim actually stalled, and on whom |
| Scope-approval lag | Scope submitted → approved | The delay the restorer is usually blamed for |
| Info re-request count | Adjuster/TPA requests for material already supplied | The single biggest delay source in residential water claims — counted, dated, attributed |
| Cycle split | Restorer-controlled days vs external days vs access/weather days | The honest anatomy of every job's duration |
| Invoice-to-paid days | Invoice sent → paid, per payer | The ≤7-day contractor-payment promise, and every payer's real behaviour |

**Used for:** AFCA evidence packs, invoice defence, per-payer turnaround truth.

## Family 2 — Cost & Rate Justification

| Metric | Derived from | What it proves |
| --- | --- | --- |
| Labour hours by role | Time entries per job stage | The people cost, staged |
| Equipment-days by unit | Deployment events (dehu/air mover/AFD × days) | Every unit-day justified by the S500:2025 equipment planner's own maths |
| Line-item vs rate schedule | Job costs vs the published 27-line schedule ($2,750 min callout) | Charges trace to a published number |
| Cost per claim | Full job cost | Position vs the ~$16,471 average claim figure |
| Quote-to-actual variance | Estimate vs final | Scoping discipline |
| Unpaid variations/supplements | Approved-work deltas not yet paid | Money owed, evidenced |

**Used for:** the day a business owner must justify costs — every dollar traces to a
standard's requirement or a published schedule line.

## Family 3 — Compliance & Quality Evidence

Daily psychrometric/moisture logs to dry standard · S500:2025 section citations per
decision (grounding receipts) · photo/evidence counts with timestamps · WHS/PPE events ·
licensed-trade dispatch records (AS/NZS 3000).

**Derived:** drying days vs class expectation · callback/rework rate · **documentation
completeness score** — the adjuster-ready percentage that kills info re-requests at the
source.

## Family 4 — Third-Party Interaction Ledger (the inversion)

Every payer touchpoint as a fact: requests received · re-requests · scope bounce count ·
approval turnaround per insurer/TPA · payment days per payer · dispute/denial events with
stated grounds · cash-settlement pressure events (recorded neutrally, as events).

**Derived:** per-payer scorecards built from the field side — the mirror image of the
scorecards payers keep on restorers. Aggregated opt-in and anonymised across the NRPG
network, this becomes a field-sourced payer-performance dataset: the field-agent input the
national process currently lacks. **Publication founder/legal-gated.**

## Family 5 — Owner Performance

Lead→job conversion by source · job mix (water/fire/mould/bio) · average job size ·
revenue per technician · technician utilisation % · equipment deployment % · WIP aging ·
DSO split by payer type · gross margin by service type · cost per lead.

## Family 6 — Policyholder Outcome & Advocacy

Time-to-safe for the family · displacement days · promises-kept record (the receipts) ·
supplements/variations recovered vs left unclaimed · satisfaction · **one-click AFCA
evidence pack**: timeline + attribution + moisture logs + photos + citations, exportable.
"We fight for our customer" made tangible — the pack is the weapon we hand them.

---

**Build path (data-first):** all six families are additive Prisma models + events on the
spine — no new data entry surfaces. Schema lands in RA-7493's migrations lane; the
attribution tap joins the job state-change UI; the AFCA pack is a Docs-runner export.

**The national line:** Families 1 and 4, aggregated across the network, are the dataset
that walks into UNI-2673's rooms.

---

## 8. Claims audit against the evidence ledger

Run 1, 2026-09-07. Every factual assertion above that points outward at the industry or
the law, checked against `evidence-ledger.jsonl`. Internal product decisions are not
audited — they are the founder's to make.

| Assertion in the matrix | Ledger | State | What this means for the build |
| --- | --- | --- | --- |
| Average claim figure of $16,471 | LOSS-05 | Number correct, **scope narrower than stated** | ICA's $16,471 is the 2025 average for *declared extreme-weather event* claims, not all claims. Label the benchmark precisely or it will be challenged. |
| AFCA evidence packs matter because delay now carries remedies | AFCA-03 unverified, AFCA-12 conflict, AFCA-01 conflict | **UNPROVEN** | The finalised AFCA Approach PDF could not be read (Cloudflare 403 on every attempt). AFCA's own page still says "Late 2025". The premise is trade-press only. Build the pack anyway; do not state the remedy claim externally yet. |
| Expert-report quality is what a payer is judged on | ICA-04, AFCA-04 unverified, AFCA-05 unverified, AFCA-08 unverified | Strongly supported, not yet verified | ICA-04 is the strongest hook in the whole program: the redrafted Code binds **External Experts**, not just insurers. That is the restorer, directly. |
| Nobody scores payers from the field side | ICA-08 | **Needs correction** | The field-agent voice is not absent from the ICA Code submissions. RIA Australasia, AIBEC and AICLA all appear on the published list. What is absent is the *individual practitioner* and any *field-sourced dataset*. Family 4 answers the second gap, not the first. |
| S500:2025 equipment-planner maths as cost justification | STD-01 unverified, STD-02 unverified, STD-03 unverified | Voluntary standard, not law | AS-IICRC S500:2025 binds nobody by statute. Its force is contractual — insurers and AFCA use it as the reasonableness benchmark. Cite it as the benchmark, never as a legal requirement. |
| AS/NZS 3000 for licensed-trade dispatch | STD-08 unverified | Edition confirmed, mechanism pending | AS/NZS 3000:2018 with Amendment 3 (2025) is current. How it becomes mandatory (state electrical safety regulations calling it up) is still being confirmed. |
| WHS/PPE events as compliance evidence | STD-04 unverified, STD-05, STD-06 unverified, STD-07 unverified | Mandatory, and the strongest legal hook | The PCBU primary duty is real law in every jurisdiction. Asbestos-licensing and silica-exposure limits bind restoration work directly. This family has the firmest legal ground of the six. |
| Published 27-line rate schedule, $2,750 minimum callout | none | Estate-internal | Not an industry figure and not audited here. It is a published RestoreAssist number, which is exactly what makes it defensible. |

### Two corrections the matrix should absorb

**C1 — the average-claim benchmark.** Say "the 2025 average cost per declared
extreme-weather event claim ($16,471, ICA)". The unqualified phrase "industry average
claim" is a different and unsourced number.

**C2 — the inversion claim.** "Nobody scores the other direction" is right about
*datasets* and wrong about *voices*. Three field-adjacent associations submitted on the
Code. The accurate line is: the field has representation, and no evidence. Family 4
supplies the evidence. That is a stronger claim, and it survives contact with anyone who
has read the submission list.

### Where this plugs into UNI-2673

- Families 1 and 4 are the D3 hook-matrix answer to ICA-04 (Expert Report Best Practice
  Standard) and to the AFCA expert-evidence line once AFCA-12 conflict is read.
- Family 3 is the D3 answer to STD-04 unverified through STD-07 unverified (WHS, asbestos, silica).
- Family 4's aggregate is the asset behind the D7 RIA partnership brief. It is also the
  thing that must never be published without a founder and legal decision.
