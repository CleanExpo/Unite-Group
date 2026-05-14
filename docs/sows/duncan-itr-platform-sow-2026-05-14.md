# Statement of Work — Dimitri ITR Platform — Build Engagement

**Document version:** v1.0-draft · **Drafted:** 2026-05-14 · **Status:** Awaiting Phill to fill AUD amounts before send.

---

## 1. Parties

| Role | Legal Entity | ABN | ACN | Address |
|---|---|---|---|---|
| **Service Provider** ("Unite-Group") | UNITE-GROUP NEXUS PTY LTD | 95 691 477 844 | 691 477 844 | QLD 4305, Australia |
| **Client** ("Home Loan Essentials") | HOME LOAN ESSENTIALS PTY LTD | 69 075 693 846 | 075 693 846 | QLD 4212, Australia |

Both parties are GST-registered. All amounts in this SOW are AUD and **GST-exclusive** unless stated otherwise; 10% GST will be applied on each invoice and remitted to the ATO by Unite-Group.

**Primary contacts:**
- Unite-Group: Phill McGurk · `contact@unite-group.in`
- Home Loan Essentials: Duncan Perkins · `Duncan@homeloanessentials.com.au`

## 2. Background & Engagement Overview

Home Loan Essentials operates as an established Australian mortgage broker (Active ABN since 2002). It has commissioned Unite-Group to design, build and launch the **Dimitri ITR Platform** — a broker-facing software product that streamlines the Income Tax Return / borrower-financials workflow that mortgage brokers rely on for loan applications.

The product's working name during build is **"Dimitri"**; the final consumer-facing name will be one of five candidates (Otto · Sorted · Beau · Tick · Lodgey), confirmed by the Client during Sprint 1.

This SOW governs Phase 1 (Discovery → MVP launch). Subsequent operating-stage retainers are out of scope and will be addressed in a separate agreement.

## 3. Scope of Work — Milestones & Deliverables

Engagement is structured as **four milestones**. Each milestone has a fixed price, concrete deliverables, and a signed Client acceptance gate before the next milestone begins.

### Milestone 1 — Discovery & Architecture (Sprint 1, Days 0–14)

**Deliverables**
- Discovery intake captured against 12 critical questions across Product Vision, Must-Haves, Wish List, Constraints (delivered via Unite-Group's ContextBot conversational intake).
- Brand-mark concepts for all five candidate names with in-portal vote and trademark-clearance result.
- Architecture document covering data model, integration map (NextGen, ApplyOnline, Salestrekker, MyCRM, Equifax as scoped), tech stack, hosting region, security posture.
- Risk register including ASIC/AFSL/AFCA implications, data-residency constraints, PII handling, and known third-party API limitations.
- Compliance pack memo: credit-licence handling, audit trail design, broker-side disclosure obligations.
- Signed SOW Addendum confirming Sprint 2-N scope and final fixed price for Milestone 2.

**Price (GST exclusive):** $`<TBD>` AUD
**Payment trigger:** 30% deposit on SOW signature (gates kickoff). Remaining 70% on Client acceptance of Milestone 1 deliverables.

### Milestone 2 — MVP Build (Sprint 2-4, Days 15–42, ~6 weeks)

**Deliverables**
- Production-grade build of the Dimitri MVP covering the broker happy-path: ITR draft → AI-assisted completion → compliance check → lender submission.
- Authentication, role-based access control, audit logging, encrypted-at-rest PII storage in the agreed AU region.
- Weekly Proof Video each Friday (PR-triggered Remotion + ElevenLabs walkthrough delivered via Resend) plus a staging URL Duncan can demo to test brokers.
- All approvals captured against magic-link portal with cryptographic signed-hash audit trail (compliant with the *Electronic Transactions Act 1999* (Cth)).

**Price (GST exclusive):** $`<TBD>` AUD
**Payment trigger:** Net 7 from Milestone 2 acceptance. Invoiced in two tranches (50% on Sprint-3 acceptance, 50% on Milestone 2 acceptance).

### Milestone 3 — Integrations & Launch Readiness (Sprint 5, Days 43–56, ~2 weeks)

**Deliverables**
- Production-ready integrations with the third-party systems agreed in Milestone 1.
- Security review pack: penetration-test summary, dependency-audit report (`npm audit` clean at high+), Supabase advisor security report green.
- Compliance review pack: ASIC handling memo, AFCA dispute-flow stub, broker disclosure templates, audit-log access for compliance staff.
- Production deployment to `dimitri.homeloanessentials.com.au` (or chosen domain) on Vercel + Supabase production projects co-owned with the Client.
- Trained-Duncan demo: 60-minute walkthrough captured as a permanent reference asset.

**Price (GST exclusive):** $`<TBD>` AUD
**Payment trigger:** Net 7 from launch acceptance.

### Milestone 4 — 30-Day Stabilisation & Handover (Days 57–86)

**Deliverables**
- Bug fixes against any P0/P1 issues raised in production during the 30-day window.
- Operating playbook for Home Loan Essentials staff: how to add brokers, manage permissions, read the audit log.
- 30-day production telemetry report: usage, error rate, cycle time, NPS pulse.
- Renewal SOW draft (optional) covering ongoing operating retainer.

**Price (GST exclusive):** $`<TBD>` AUD
**Payment trigger:** Net 7 from Milestone 4 acceptance (Day 86).

### Total Engagement (GST exclusive)

`Milestone 1 + 2 + 3 + 4 = $<TBD> AUD + 10% GST = $<TBD> AUD total payable`

## 4. Payment Terms

- All invoices are issued in **AUD** via **Stripe Invoicing** with a 7-day payment window (Net 7).
- The **30% deposit on Milestone 1 is non-refundable** and gates the kickoff. No work begins until cleared funds.
- Late payments accrue interest at **the General Interest Charge (GIC) rate published by the ATO**, calculated daily from the due date.
- Unite-Group reserves the right to pause delivery if any invoice is more than 14 days overdue.
- Alternative payment method: EFT to Unite-Group's nominated bank account, BSB and Account included on each invoice. Stripe is preferred.

## 5. Acceptance Process

Each milestone produces deliverables that are presented to the Client through Unite-Group's magic-link approval portal at `unite-group.in/clients/dimitri-itr/approvals/{token}`. The Client clicks **Approve**, **Request changes** or **Reject** within the 7 day acceptance window.

- **Approval** triggers issuance of the next invoice and begins the next milestone.
- **Request changes** opens a single revision round (one round per milestone is included; subsequent rounds are billed at the rates in §6).
- **Silent acceptance** — if no response within the 7-day window and no formal "Request changes" submitted, the milestone is deemed accepted at the end of business on the 7th day.

All approvals are stored in Supabase with `sha256(token + status + timestamp)` signed-hash audit. Hashes are presented in invoice line items as evidence of acceptance.

## 6. Change Requests & Out-of-Scope Work

Scope is locked at the end of Milestone 1 by signed addendum. Subsequent change requests are handled as follows:

| Change size | Process | Rate |
|---|---|---|
| < 4 hours | Absorbed into nearest sprint, communicated in weekly Proof Video | No charge |
| 4–16 hours | Mini-SOW addendum approved via magic-link portal | $`<TBD>` AUD/hour (GST exclusive) |
| > 16 hours | Separate SOW with milestone schedule | Per separate SOW |

**Out-of-scope at this SOW signing:** white-label resale of Dimitri to other broker groups, mobile-app native builds (iOS/Android), training of Home Loan Essentials staff beyond the Milestone 3 walkthrough, ongoing operating retainer (post-launch), marketing or branding of the product to consumers, on-premise hosting.

## 7. Timeline

| Phase | Start | End | Calendar days |
|---|---|---|---|
| Deposit received → Kickoff | T-0 (deposit clears) | T+1 | 1 |
| Milestone 1: Discovery & Architecture | T+1 | T+14 | 14 |
| Milestone 2: MVP Build | T+15 | T+42 | 28 |
| Milestone 3: Launch Readiness | T+43 | T+56 | 14 |
| Milestone 4: Stabilisation & Handover | T+57 | T+86 | 30 |
| **Total** | | | **86 days** |

Calendar days are skipped only for AU national/QLD public holidays. Either party may pause the schedule with 5 days' written notice; paused days extend the timeline by the same number.

## 8. Intellectual Property

- **Client IP — Dimitri product code, brand assets, data models, integration configuration:** owned 100% by Home Loan Essentials. Transferred on payment of the corresponding milestone. The Client receives the full Git history of the product codebase as part of Milestone 3.
- **Unite-Group IP — internal tooling (ContextBot, intake_router, preamble_trainer, Pi-CEO swarm, etc.) used to deliver the engagement:** retained by Unite-Group. The Client receives a perpetual, royalty-free, non-exclusive licence to use the running deployed copy of Dimitri for its own internal mortgage-broking business; no licence to resell, white-label, or operate Unite-Group's internal tooling.
- **Third-party software:** any open-source dependencies are subject to their respective licences; commercial third-party APIs (e.g. Recall.ai for meeting capture) are billed at cost to Home Loan Essentials and require Home Loan Essentials' own paying account where the volume warrants.

## 9. Confidentiality

Each party agrees to keep the other's commercial-in-confidence information confidential for 5 years from the date of this SOW. Specifically:

- Customer PII handled by Dimitri is the Client's confidential information; Unite-Group will not access, copy, or export it except where strictly required for delivery and only with the Client's documented approval.
- Unite-Group's swarm architecture, agent prompts, and internal playbooks are Unite-Group's confidential information.
- Either party may disclose to its professional advisers under equivalent confidentiality obligations.

## 10. Compliance & Regulatory

- Home Loan Essentials operates under its Australian Credit Licence (ACL `<Duncan to confirm>`) and is responsible for all consumer credit obligations under the *National Consumer Credit Protection Act 2009* (Cth).
- Unite-Group is **not** a credit licensee and provides software only. Unite-Group does not perform credit assistance, broking, or any activity regulated under the NCCP.
- All AI-generated content (e.g. AI-drafted ITR sections) is clearly marked as draft and must be reviewed by a licensed broker before submission to a lender. Final accountability for any document submitted to a lender remains with Home Loan Essentials.
- Data handling: customer PII stored in Supabase AU-region. Encrypted at rest (Supabase-managed AES-256). Access via RLS scoped to the Client's tenant only.

## 11. Termination

- Either party may terminate this SOW with **14 days' written notice**.
- On termination: completed milestones are billed in full; in-progress milestone is billed pro-rata to elapsed calendar days; the 30% deposit on Milestone 1 is non-refundable.
- On termination, Unite-Group transfers the production codebase and all Client data to a Client-nominated repository / Supabase project within 7 days.

## 12. Liability

Each party's total liability under this SOW (whether in contract, tort, statute, or otherwise) is capped at **the total fees paid under this SOW in the 6 months preceding the claim**. Neither party is liable for indirect or consequential loss (loss of profit, loss of opportunity, loss of goodwill). This cap does not apply to wilful breach of confidentiality, infringement of IP, or fraud.

## 13. Dispute Resolution

- Disputes are first escalated to a 30-minute call between Phill McGurk and Duncan Perkins.
- If unresolved within 14 days, parties refer the dispute to mediation under the Resolution Institute's Mediation Rules, mediator's seat **Brisbane, QLD**.
- If mediation fails within 30 days, either party may commence proceedings in the courts of **Queensland, Australia**.

## 14. Governing Law

This SOW is governed by the laws of **Queensland, Australia**. Both parties submit to the non-exclusive jurisdiction of the Queensland courts.

## 15. Entire Agreement

This document and any signed addenda constitute the entire agreement between the parties for the work described. It supersedes all prior discussions, quotes, or proposals.

---

## Signatures

| Party | Name & Title | Signature | Date |
|---|---|---|---|
| **Unite-Group Nexus Pty Ltd** | Phill McGurk, Director | ________________________ | _______________ |
| **Home Loan Essentials Pty Ltd** | Duncan Perkins, Director | ________________________ | _______________ |

---

## Pre-send Phill checklist

Before sending this SOW to Duncan, fill in:

1. [ ] Milestone 1 fee in §3 (suggested range based on past Unite-Group proposals: pre-fill from current rate card)
2. [ ] Milestone 2 fee in §3
3. [ ] Milestone 3 fee in §3
4. [ ] Milestone 4 fee in §3
5. [ ] Total + GST roll-up at the bottom of §3
6. [ ] Hourly rate for change requests in §6 (suggested: $250-350/hr AUD GST excl. for Unite-Group senior-engineer-supervised work)
7. [ ] **One human eyeball pass** — read it like Duncan would. Anything that sounds defensive (e.g. silent acceptance) — keep it if Phill agrees it's net beneficial.
8. [ ] Optional: ACL number in §10 left as `<Duncan to confirm>` — Duncan supplies during Kickoff.

Once filled, this gets converted to PDF and attached to the Stripe Invoice for the 30% deposit.
