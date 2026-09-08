# Memo 03 — Regulatory-hook matrix

Deliverable D3. Run 1, 2026-09-07. Every row carries a ledger ID. The ledger is
`evidence-ledger.jsonl`; this memo is synthesis only.

**Citation grades.** A bare `[ID]` cites a `verified` ledger entry - a second, independent context reopened the primary source. `[ID unverified]` cites an entry whose source has not been reopened, and `[ID conflict]` cites one a second source contradicts. Neither is established fact. Run `python citations.py check` - it fails if any grade here disagrees with the ledger.

A **hook** is an obligation someone can be held to. Each row says what it obliges, who it
binds, how hard it binds, and which estate product answers it. "Answers it" means the
product produces the evidence the hook demands.

Force levels: **MANDATORY** (law), **CALLED-UP** (law points at a standard), **CONTRACTUAL**
(binds through a code or a panel agreement), **VOLUNTARY** (guidance only).

## Tier 1 — Mandatory law

These bind a restoration business today, everywhere, with no argument.

| Hook | Obliges | Binds | Ledger | Estate product that answers it |
| --- | --- | --- | --- | --- |
| WHS primary duty of care | Ensure worker health and safety so far as reasonably practicable | Every PCBU, including every restoration business | STD-05, STD-04 unverified | RestoreAssist Family 3: WHS/PPE events with timestamps. CARSI: WHS module. |
| Asbestos removal licensing | Use a licensed removalist above minor-disturbance thresholds | PCBU commissioning or doing removal | STD-06 unverified | RestoreAssist Family 3: licensed-trade dispatch records. NRPG gate: licence held before dispatch. |
| Silica exposure limit | Keep respirable crystalline silica at or under 0.05 mg per cubic metre, 8-hour TWA | PCBUs generating silica dust | STD-07 unverified | RestoreAssist Family 3: PPE and control events on cutting/demolition tasks. |
| Breach reporting | Notify ASIC of reportable situations within statutory deadlines | AFS licensees, which includes insurers | ASIC-06 unverified | Not a restorer obligation. It is the **lever**: documented claims failure becomes a notification the insurer must make. |
| Internal dispute resolution | Run a compliant IDR system and meet response timeframes | AFS licensees including insurers | ASIC-05 unverified | RestoreAssist Family 1: the timeline that shows who caused the delay. |
| Claims handling as a financial service | Hold AFS licence authorisation to assess, settle or assist in claims | Insurers, claims managers, claimant intermediaries | ASIC-04 unverified | Scope boundary. Tells the estate where a restorer stops and a regulated intermediary starts. **Quote not yet obtained** [ASIC-04 unverified]. |

## Tier 2 — Called-up standards

Law points at a document. The document then binds.

| Hook | Obliges | Binds | Ledger | Estate product |
| --- | --- | --- | --- | --- |
| AS/NZS 3000 Wiring Rules | Electrical installation safety | Licensed electricians and installers | STD-08 unverified, STD-09 unverified | RestoreAssist Family 3: licensed-trade dispatch. **The calling-up clause is unverified** [STD-09 unverified] — no state register was read. |
| NCC adequate air quality performance requirement | Achieve adequate air quality | Building designers and certifiers, not restorers directly | STD-10 | None yet. This is the nearest thing to an outcome standard, and it does not reach the restorer. |

## Tier 3 — Contractual, and this is where the money is

These do not come from Parliament. They come from the Code, the panel agreement, and the
ombudsman. They decide who gets work and who gets paid.

| Hook | Obliges | Binds | Ledger | Estate product |
| --- | --- | --- | --- | --- |
| **Expert Report Best Practice Standard** | Comply with the ICA Standard | **Insurers AND External Experts** | ICA-04 | **The single highest-value hook in the program.** The obligation reaches the restorer directly. RestoreAssist Families 1, 3 and 6: the receipted, cited, timestamped report. CARSI: the credential that proves the expert is qualified. |
| Expert qualification requirement | Ensure the expert has relevant expertise and qualifications | ICA-member insurers, flowing to the experts they engage | AFCA-04 unverified | CARSI credential ledger. This is a credentialing hook with no credential register behind it. |
| Insurer's onus on an exclusion | Establish the exclusion; a defective expert report fails that onus | The respondent insurer | AFCA-05 unverified | RestoreAssist Family 6: the one-click AFCA evidence pack. Worked precedent that report quality decides outcomes. |
| Report-weighting criteria | Independence, qualifications, physical inspection over desktop review, scope of instructions | Nobody formally; AFCA applies it | AFCA-06 unverified, AFCA-07 unverified, AFCA-08 unverified | RestoreAssist report structure. This is effectively the product spec, sourced from trade press [AFCA-06 unverified, AFCA-07 unverified, AFCA-08 unverified]. |
| S500 as reasonableness benchmark | Restoration scope judged against S500 | Nobody by statute; insurers, ICA and AFCA use it | STD-01 unverified, STD-02 unverified, STD-03 unverified | RestoreAssist Family 2: equipment-days justified by the S500 planner. Cite it as the benchmark, never as law. |
| Code enforceability | Code terms become contract terms | Subscriber insurers, once ASIC approves | ICA-01, ASIC-03 conflict | **Pending.** Approval unconfirmed [ASIC-03 conflict, ICA-03 unverified]. Every Tier 3 hook above hardens the day approval lands. |

## Tier 4 — The vacuum

| The gap | Ledger | Who owns it today |
| --- | --- | --- |
| No binding numeric limit for mould or bioaerosols in occupied buildings | STD-14 unverified, STD-13 unverified | **Nobody.** Safe Work Australia has a silica number [STD-07 unverified] and no mould number [STD-13 unverified]. The NCC asks for adequate air quality and verifies it with a non-binding handbook [STD-10]. enHealth is advisory [STD-11]. S520 governs the remediation **process** and sets no threshold for the **result** [STD-12 unverified]. |

**Australia regulates how you do a mould job. It does not regulate whether the job worked.**

That is the sentence the whole program turns on, and it is the weakest-evidenced claim in
the ledger. Three of the four checks behind it were fetch timeouts [STD-14 unverified, STD-13 unverified]. It must
not be said outside this repository until every timed-out fetch is re-run.

## What the matrix shows

1. **The restorer's legal exposure is WHS.** Tier 1 is real, mandatory and unambiguous
   [STD-05, STD-06 unverified, STD-07 unverified]. Nothing in Tier 1 governs restoration quality.
2. **The restorer's commercial exposure is contractual.** Tier 3 decides work and payment,
   and one Tier 3 hook names the External Expert directly [ICA-04].
3. **Quality of outcome is governed by nobody** [STD-14 unverified]. Between mandatory safety law and
   contractual report standards there is an unowned space: did the building end up dry and
   safe.
4. **Every hook demands evidence, and none of them supply it.** Each row's answer is a
   record: a timestamp, a citation, a licence, a reading. That is the estate's position.

## What run 2 takes first

1. Read one state's electrical safety regulation to close STD-09 unverified.
2. Re-run every timed-out Safe Work Australia fetch to harden or break STD-13 unverified and STD-14 unverified.
3. Open INFO 253 for the ASIC-04 unverified quote.
4. Read the ICA Expert Report Best Practice Standard itself, not the fact sheet [AFCA-04 unverified].

## Fence

This maps hooks to products. It selects no strategy and proposes no approach to any body.
The options pack (D6) presents; the founder chooses.
