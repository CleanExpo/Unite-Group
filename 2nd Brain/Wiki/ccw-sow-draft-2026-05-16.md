---
type: wiki
updated: 2026-05-16
status: abr-verified-ready-for-phill-sign
---

# Statement of Work — CCW Synthex Marketing Retainer — 2026-05-16

**Document version:** v1.1-ABR-verified · **Drafted:** 2026-05-16 · **Status:** ABR-verified both parties · Ready for Phill signature + Toby send.
**Phase:** 3b of Synthex Finalisation Arc — first paid external Synthex pilot.

> **ABR verification — completed 2026-05-16.** Both parties verified active + GST-registered via the Australian Business Register. "Carpet Cleaners Warehouse" is a registered business name (since 09 Jan 2001) of the underlying legal entity **ABERFORD HOLDINGS PTY LTD** (ACN 086 503 317). All invoicing and signature must be against the legal entity, not the business name.

---

## 1. Parties

| Role | Legal Entity | ABN | ACN | GST registered | Address |
|---|---|---|---|---|---|
| **Service Provider** ("Unite-Group" / "Synthex") | UNITE-GROUP NEXUS PTY LTD | 95 691 477 844 | 691 477 844 | from 01 Oct 2025 | QLD 4305, Australia |
| **Client** ("CCW") | ABERFORD HOLDINGS PTY LTD trading as CARPET CLEANERS WAREHOUSE | 94 086 503 317 | 086 503 317 | from 01 Jul 2000 | QLD 4034, Australia |

Both parties are GST-registered Australian Private Companies. All amounts in this SOW are AUD and **GST-exclusive**; 10% GST applied on each invoice and remitted to the ATO by Unite-Group.

> Client trades under multiple registered business names — the relevant one for this engagement is **CARPET CLEANERS WAREHOUSE** (registered as a business name since 09 Jan 2001; trading name effective 05 Apr 2000). Other ABERFORD HOLDINGS business names (Restoration Express, The Moisture Meter Company, Power Clean Industries Australia, Revolution Cleaning Products) are outside this SOW's scope unless added by signed addendum.

**Primary contacts:**
- Unite-Group: Phill McGurk · `contact@unite-group.in`
- CCW: Toby Bredhauer · `tobyb@ccwarehouse.com.au`

---

## 2. Background & Engagement Overview

CCW is an established Australian wholesaler of carpet-cleaning and restoration-trade equipment (`ccwonline.com.au`), operating on a Shopify e-commerce + WordPress stack. CCW is the **first paying client** of the Unite-Group `ccw-crm` SaaS product (live since 2026-05-03; `[[ccw]]`).

This SOW governs a **separate, additional engagement**: a **productised monthly marketing retainer** delivered through the Synthex skill substrate (`Synthex/packages/brand-config/src/brands/ccw.ts` codifies the voice + visual tokens that govern every asset produced under this SOW). The retainer covers content production, channel publication, performance reporting, and brand-aligned QA.

This retainer does NOT cover: the existing `ccw-crm` SaaS subscription (governed under separate agreement), paid-ad spend (Client funds directly), or development of new Synthex platform features.

---

## 3. Scope of Work — Monthly Deliverables

This is a **monthly recurring retainer**, not a milestone build. Per the Mavericks productised cadence ratified in `[[synthex-mavericks-ratification-2026-05-16]]`, Unite-Group delivers the following per calendar month:

### 3.1 Content production (per week, ~4 weeks/month)

| Deliverable | Frequency | Channel | QA gate |
|---|---|---|---|
| 1 × long-form blog/article (700-1,500 words) | Weekly | `ccwonline.com.au` blog | brand-guardian + manual editorial review |
| 4 × short-form social posts | Weekly | LinkedIn primary; X / Instagram Reels / Threads as `marketing-channel-strategist` directs | brand-guardian + manual editorial review |
| 1 × newsletter / email broadcast | Weekly | CCW's existing email list (Shopify / external provider) | brand-guardian + manual editorial review |

All content is generated against the canonical CCW BrandConfig (`Synthex/packages/brand-config/src/brands/ccw.ts`): voice tones `warm` + `urgent`, cadence `short`, forbidden words enforced (no `cheap`, `discounted`, no second-person pronouns from `FORBIDDEN_PRONOUNS`), brand palette `#D62828` / `#003049` / `#F77F00`, Outfit + Inter typography.

### 3.2 Performance scorecard (monthly)

Delivered by the 7th business day of the following month. Includes:
- Channel-level reach, engagement, click-through, conversion (where tracked)
- Blog SEO performance (keyword movement via the Synthex `seo` skill substrate against tracked CCW keyword set)
- Newsletter delivery + open + click rates
- Brand-guardian autonomous pass-rate for the month (see §3.3)
- One-page commentary + recommended next-month focus

### 3.3 Brand-guardian autonomous QA — phased ramp (per `[[synthex-mavericks-ratification-2026-05-16]]` Q3)

The brand-guardian autonomous pass-rate ramps in phases. The "85%" figure from public marketing copy is **NOT a constitutional gate today** — the underlying telemetry substrate ships in Synthex Wave 5.5. Operating phases:

| Phase | Window | Brand-guardian role | Manual review |
|---|---|---|---|
| Phase A — Manual baseline | Month 1 (Days 0-30) | Lint-only (binary pass/fail per `brand-guardian-lint.ts`) | 100% manual editorial review before publish |
| Phase B — Telemetry capture | Months 2-3 | Lint + per-skill telemetry written to `synthex_skill_runs` Supabase table | 100% manual editorial review before publish |
| Phase C — Threshold derivation | Month 4 onward | Empirical pass-rate threshold derived from first 90 days of telemetry; that threshold (NOT a borrowed 85%) becomes the gate | Manual review only on assets below the derived threshold |

Phase advancement is communicated in the monthly scorecard. The Client is not charged differently per phase — the cadence and price are flat.

---

## 4. Pricing

> **Grandfathered pricing — not a constitutional floor.** This contract carries CCW at AUD $2,750/month. The public Synthex marketing-copy floor is AUD $5,000/month, ratified as the **minimum published external price** (not a contractual floor) in `[[synthex-mavericks-ratification-2026-05-16]]` Q2. CCW is grandfathered against that floor by virtue of being the first paying external pilot. Future price changes to this contract are negotiated bilaterally and do NOT automatically inherit any uplift in the public marketing floor. This footnote is contractually binding so future raises do not accidentally upgrade CCW to $5K.

| Item | Amount (GST exclusive) |
|---|---|
| Monthly retainer fee | **AUD $2,750.00** |
| GST (10%) | AUD $275.00 |
| **Total monthly invoice** | **AUD $3,025.00** |

### 4.1 Deposit at signing

| Item | Amount (GST exclusive) | GST | Total |
|---|---|---|---|
| Month 1 (current month) | AUD $2,750.00 | $275.00 | $3,025.00 |
| Month 2 (paid one month in advance) | AUD $2,750.00 | $275.00 | $3,025.00 |
| **Signing deposit total** | **AUD $5,500.00** | **$550.00** | **AUD $6,050.00** |

The Month-2-in-advance balance is held as a rolling forward deposit. On termination, the unused portion is credited pro-rata against any outstanding final invoice; any remainder is refunded within 14 days of the final invoice clearing.

### 4.2 Invoicing rhythm post-deposit

From Month 3 onward, the monthly invoice (AUD $2,750 + $275 GST = $3,025) is issued on the 1st of each calendar month with **Net 7** payment terms, via **Stripe Invoicing**.

---

## 5. Contract Length & Termination

- **Initial term:** 6 months from the signing date. The Client commits to the 6 monthly invoices for the initial term.
- **After the initial term:** the contract automatically continues **month-to-month** until cancelled.
- **Cancellation notice:** either party may cancel with **30 days' written notice** at any time after the end of the initial term. Notice given during the initial term takes effect at the earlier of (a) end of the 30-day notice period OR (b) the end of Month 6, whichever is later.
- On termination, deliverables produced and paid for are owned by the Client per §8.
- The signing deposit is reconciled per §4.1.

---

## 6. Acceptance Process

Each weekly batch of deliverables (blog + 4 social + newsletter) is delivered via Unite-Group's magic-link approval portal at `unite-group.in/clients/ccw/approvals/{token}`. The Client clicks **Approve**, **Request changes**, or **Reject** within a **3-day acceptance window per asset**.

- **Approval** triggers publication on the agreed channels.
- **Request changes** opens **one revision round** per asset at no extra charge. Subsequent rounds are billed at the change-request rate in §7.
- **Silent acceptance** — if no response within the 3-day window and no formal "Request changes" submitted, the asset is deemed accepted at the end of business on the 3rd day.

The monthly scorecard (§3.2) is delivered via the same portal and has a **7-day acceptance window** before being deemed accepted.

All approvals stored in Supabase with `sha256(token + status + timestamp)` signed-hash audit.

---

## 7. Change Requests & Out-of-Scope Work

The cadence in §3 is the contracted volume. Additional asks are handled as follows:

| Change size | Process | Rate |
|---|---|---|
| < 2 hours | Absorbed into the current week, communicated in the next scorecard | No charge |
| 2-8 hours | Mini-SOW addendum approved via magic-link portal | $`<TBD>` AUD/hour (GST exclusive) |
| > 8 hours | Separate SOW | Per separate SOW |

**Out-of-scope at signing:** paid-ad creative for media buys >AUD $500/month spend, video production beyond short-form social formats, photography, podcast production, public-relations / journalist outreach, custom integrations to CCW systems beyond the existing `ccw-crm` data flow, white-label resale of Synthex outputs.

---

## 8. Intellectual Property

- **Client IP — all blog posts, social posts, newsletter copy, scorecard data:** owned 100% by Carpet Cleaners Warehouse, transferred on payment of the monthly invoice in which they were delivered. The Client receives the source files (Markdown, image assets, video source where applicable) via the approval portal.
- **Unite-Group IP — the Synthex skill substrate, brand-config schema, brand-guardian lint, marketing-orchestrator, sub-skills, telemetry pipeline:** retained by Unite-Group. The Client receives a perpetual, royalty-free, non-exclusive licence to use the delivered assets for its own commercial purposes; no licence to resell, white-label, or operate Unite-Group's internal Synthex tooling.
- **Brand assets — CCW logo, palette, typography licences:** remain the Client's property. The BrandConfig codification at `Synthex/packages/brand-config/src/brands/ccw.ts` is Unite-Group's machine-readable representation of those assets for production purposes.

---

## 9. Confidentiality

Each party agrees to keep the other's commercial-in-confidence information confidential for 5 years from the signing date. Specifically:

- CCW customer data, mailing-list contacts, and commercial pricing data are the Client's confidential information. Unite-Group accesses only what is required for delivery and only with documented Client approval.
- Unite-Group's Synthex skill prompts, brand-guardian aggregator logic, and the per-skill telemetry methodology are Unite-Group's confidential information.
- Either party may disclose to its professional advisers under equivalent confidentiality obligations.

---

## 10. Compliance & Regulatory

- All content produced is subject to the *Australian Consumer Law* (ACL) — no misleading or deceptive conduct, no false price claims. The "trade pricing" framing in the CCW brand-config is the contractually-approved phrasing; Unite-Group will not use "cheapest" or "discounted" per the BrandConfig `forbiddenWords` list.
- Marketing emails comply with the *Spam Act 2003* (Cth): every newsletter carries a functional unsubscribe link, sender identification, and is sent only to addresses on CCW's existing opted-in list.
- Privacy: any personal data handled in newsletter delivery is governed by the *Privacy Act 1988* (Cth); Unite-Group does NOT export CCW customer data outside the agreed marketing platforms.

---

## 11. Liability

Each party's total liability under this SOW (whether in contract, tort, statute, or otherwise) is capped at **the total fees paid under this SOW in the 6 months preceding the claim**. Neither party is liable for indirect or consequential loss (loss of profit, loss of opportunity, loss of goodwill). This cap does not apply to wilful breach of confidentiality, infringement of IP, or fraud.

---

## 12. Dispute Resolution

- Disputes are first escalated to a 30-minute call between Phill McGurk and Toby Bredhauer.
- If unresolved within 14 days, parties refer the dispute to mediation under the Resolution Institute's Mediation Rules, mediator's seat **Brisbane, QLD**.
- If mediation fails within 30 days, either party may commence proceedings in the courts of **Queensland, Australia**.

---

## 13. Governing Law

This SOW is governed by the laws of **Queensland, Australia**. Both parties submit to the non-exclusive jurisdiction of the Queensland courts.

---

## 14. Entire Agreement

This document and any signed addenda constitute the entire agreement between the parties for the work described. It supersedes all prior discussions, quotes, or proposals. The existing `ccw-crm` SaaS subscription is a **separate agreement** and is unaffected by this SOW.

---

## Signatures

| Party | Name & Title | Signature | Date |
|---|---|---|---|
| **Unite-Group Nexus Pty Ltd** (ABN 95 691 477 844) | Phill McGurk, Director | ________________________ | _______________ |
| **Aberford Holdings Pty Ltd** trading as Carpet Cleaners Warehouse (ABN 94 086 503 317) | Toby Bredhauer, `<title to confirm>` | ________________________ | _______________ |

---

## Pre-send Phill checklist

Before sending this SOW to Toby, fill / verify:

1. [x] **Name reconciliation** — confirmed via Phill 2026-05-16: Carpet Cleaners Warehouse is correct.
2. [x] **Client legal entity name** — ABERFORD HOLDINGS PTY LTD trading as CARPET CLEANERS WAREHOUSE (ABR-verified 2026-05-16).
3. [x] **Client ABN** — 94 086 503 317 (ABR-verified active from 05 Apr 2000).
4. [x] **Client GST registration date** — Registered from 01 Jul 2000 (ABR-verified).
5. [x] **Client registered address** — Main business location QLD 4034 (ABR — full street address not disclosed by ABR; capture on signing).
6. [ ] **Toby's title** for §1 + signatures (Director / CEO / etc.) — Phill confirm before send.
7. [ ] **Change-request hourly rate** in §7 (suggested $250-350/hr AUD GST excl., matching Duncan template).
8. [x] **Superseding relationship confirmed** — per Phill 2026-05-16 ceo-board memo, this SOW SUPERSEDES the existing $2,750/mo arrangement. Phill must cancel the prior subscription once the new Stripe subscription is active. **No double-billing.**
9. [ ] **One human eyeball pass** — read it like Toby would. Anything that sounds defensive (e.g. silent acceptance, automatic month-to-month roll) — keep only if net beneficial.
10. [x] **Phase 3b authorised** — proceeding to Stripe customer + payment link in same workflow.

Once filled, this gets converted to PDF and attached to the Stripe Invoice for the AUD $6,050 signing deposit.

---

## Cross-refs

[[ccw]] · [[synthex]] · [[synthex-mavericks-ratification-2026-05-16]] · [[unite-crm]] · [[duncan-itr-platform-sow-2026-05-14]] (template reference)
