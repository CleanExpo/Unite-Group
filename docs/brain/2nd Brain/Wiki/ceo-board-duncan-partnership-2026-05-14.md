---
type: wiki
updated: 2026-05-14
---

# CEO-Board Deliberation — Duncan Perkins Founders Partnership

**Decision:** Reshape the Duncan Perkins (Home Loan Essentials) engagement from a milestone service contract for the Dimitri/Lodgey ITR Platform into a founders-level partnership covering BOTH Lodgey (mortgage-broker ITR SaaS) AND ATO-APP (forensic-accounting SaaS, already in production at Supabase project `xwqymjisxmtcmaebcehw`).

**Decision date:** 2026-05-14
**Jurisdiction:** Queensland, Australia
**Existing artifact:** `docs/sows/duncan-itr-platform-sow-2026-05-14.md` (v1, 4 milestones, 86 days, $ amounts pending)

---

## Q1 — Commercial structure

**Revenue Officer.** Pure equity is wrong here. Duncan is bringing distribution, not capital. A hybrid is the right shape: small minority equity (10–15%) in the combined NewCo for genuine alignment, plus a tapered revenue share on Duncan-sourced accounts (20% net rev, sunset over 5 years to 5% in years 6+). Equity vests over 36 months on distribution KPIs — referred-broker activations, accountant signups, $ARR sourced. The revenue share is the engine; the equity is the handcuff. Avoid 50/50 — it kills the cap table and blocks any future raise. Phill retains majority and operational control; Duncan retains genuine upside without veto rights on the operating company.

**Product Strategist.** Whatever structure you pick, lock it to KPIs that survive contact with reality. Equity vesting on "founder duties" is unenforceable; vest it against unambiguous numbers — number of brokers onboarded, number of accountants who pay, $ARR sourced through Duncan's pipeline. If Duncan delivers, he earns; if he doesn't, equity reverts to treasury.

## Q2 — Legal structure

**Technical Architect.** Use Unite-Group Nexus Pty Ltd as the parent. Spin a single NewCo — "Lodgey Group Pty Ltd" or similar — that holds both products as internal brands. Two-cos doubles the admin (two ASIC filings, two BAS, two PI insurances) for zero benefit while the products share 70% of their data model and 100% of their platform layer. The shared `packages/ato-integration/` lives at NewCo level under a perpetual royalty-free licence back to Unite-Group Nexus for use across the wider portfolio (RestoreAssist, CCW, DR, NRPG). Duncan holds his minority directly in NewCo with a single-class ordinary share structure (no preferred, no options pool yet — keep it simple). Phill remains 85% / Duncan 15% pre-vest. Board: 2 Phill seats, 1 Duncan seat, deadlock-broken by Phill (majority controls).

## Q3 — IP allocation

**Custom Oracle.** This is the clause that will haunt you in 2027 if you get it wrong. The clean split:

- **Lodgey codebase** — owned by NewCo (built post-partnership, joint product).
- **ATO-APP codebase** — owned by Unite-Group Nexus, licensed exclusively-and-perpetually to NewCo for the accountant-and-SMB vertical. Phill predates Duncan on this and the licence preserves that — Duncan gets economic upside via his NewCo equity but no underlying claim to the code if the partnership dissolves.
- **Shared `packages/ato-integration/`** — owned by Unite-Group Nexus, licensed royalty-free perpetually to NewCo AND to every other Unite-Group entity. This is the moat; it cannot live downstream of Duncan.
- **Brand marks** — "Lodgey" owned by NewCo; future ATO-APP mark owned by Unite-Group Nexus, licensed to NewCo.
- **Customer data** — owned by NewCo per product; if partnership dissolves, the accountant tenants stay with the ATO-APP vehicle (Phill), broker tenants stay with Lodgey vehicle (joint).

## Q4 — What changes in the existing SOW

**Compounder.** The current SOW is structured as a build-for-hire contract. To reflect partnership, six clauses must change:

1. **Pricing** — Replace milestone fees with a smaller "build co-investment" from Duncan (his contribution = distribution + domain expertise + a $25–50k cash co-investment that gives him skin-in-the-game and funds platform infra for 6 months). No more milestone-fee schedule.
2. **IP transfer** — Delete "IP transfers per milestone." Replace with the IP allocation in Q3.
3. **Termination** — Add founders' lock-in (24 months) and good-leaver / bad-leaver provisions. Termination for cause forfeits unvested equity; termination without cause accelerates 12 months of vesting.
4. **Buyout** — Add a put/call at fair-market-value (independent valuation) after year 3, with right-of-first-refusal to the other founder.
5. **Non-compete** — 24 months post-exit within AU mortgage-broker + accountant SaaS. Reasonable and enforceable in QLD.
6. **Reporting** — Monthly P&L + KPI dashboard, quarterly board meeting, annual strategy offsite.

## Q5 — Risks Phill must not close his eyes to

**Contrarian.** Three real risks, ranked:

1. **Exit friction.** A service contract terminates with 30 days' notice. A partnership is a marriage — divorce takes 12+ months of valuation disputes and potentially court. If Duncan turns out wrong-fit at month 9, Phill cannot simply send a termination letter; he must trigger the bad-leaver clause and survive a likely dispute.
2. **Regulatory cross-contamination.** AFSL (Lodgey) and TPB (ATO-APP) are different regulators with different fit-and-proper tests. If Duncan ever has a compliance issue on the broker side, it can taint the accountant-trust side via the shared parent. Solution: keep the products as separate brands at the customer-facing layer and isolate AFSL liability in a sub-entity if scale demands.
3. **ATIA tie-in.** The Australian Trade Industry Association play sits ABOVE both products as the distribution moat. Duncan partnering at the product layer is fine; just ensure his agreement contains an explicit acknowledgment that ATIA is owned 100% by Phill / Unite-Group Nexus and that Duncan's share is in NewCo only, not in the association vehicle. Mixing them dilutes the $2B thesis.

## Q6 — The Contrarian's case for staying service-contract

**Contrarian.** Three strongest arguments AGAINST going partners:

1. **Optionality preservation.** A service contract leaves Phill free to sell Lodgey to a different distribution partner in 18 months at a higher valuation. Partnership locks the door.
2. **Speed of build.** Partnerships add governance overhead — board meetings, KPI dashboards, shareholder agreement negotiations — that delays the actual product ship by weeks. A milestone contract ships faster.
3. **Personal-risk concentration.** Duncan is a single point of failure on the distribution side. If he leaves the broker industry, retires, or has a health event, partnership leaves Phill carrying dead equity. Contract = pay-for-performance, partnership = pay-for-presence.

## Q7 — The Moonshot

**Moonshot.** May 2028, AFR headline: *"Unite-Group reaches $40M ARR on the back of a quiet broker-accountant SaaS bundle few saw coming."* Lodgey owns the AU mortgage-broker ITR rails (8,000+ brokers, 60% market penetration). ATO-APP owns the AU forensic-accounting SaaS category at scale (1,500 accounting firms, $25M ARR). The shared `ato-integration` platform powers a third product nobody's predicted yet — an SMB tax-compliance copilot launched in late 2027. ATIA has 12,000 members across cleaning, restoration, broking, accounting — and is the de-facto AU SMB industry voice. Duncan is on the ATIA board as the broker-channel representative. Phill is the chair. Acquisition interest from Xero or MYOB hits at $200M valuation — Phill says no, because the trajectory is steeper than the offer.

## Q8 — CEO synthesis

**CEO.** The right structure is a **hybrid 85/15 NewCo + tapered revenue share**. Specifically:

**Equity.** Duncan receives **15% ordinary shares in Lodgey Group Pty Ltd** (the NewCo holding Lodgey + the exclusive ATO-APP licence). Vesting: 4-year vest, 12-month cliff, monthly thereafter. Vesting triggers are KPI-gated — 50% time-based, 50% milestone-based (broker activations, accountant signups, $ARR-sourced). Bad-leaver (cause / breach) forfeits unvested; good-leaver (mutual / health / no-cause) accelerates 12 months. Phill holds 85%, board 2-Phill / 1-Duncan, Phill controls majority and operating decisions.

**Revenue share.** On accounts directly sourced by Duncan's network: 20% of net revenue years 1–2, 15% year 3, 10% year 4, 5% year 5+, sunset to 0 at year 7. This sits ALONGSIDE the equity, not instead of it — it rewards activity, while equity rewards outcome.

**Cash.** Duncan contributes **AUD $30k co-investment** at signing (subscribed into NewCo at the 15% pre-money valuation). This funds 6 months of platform infrastructure (Supabase scale, ATO integration certifications, AFSL legal opinion) and gives him real skin-in-the-game beyond promises.

**IP.** Per Q3 — ATO-APP code stays with Unite-Group Nexus and is exclusively licensed in. Lodgey code lives in NewCo. Shared platform layer stays with Unite-Group Nexus and is licensed royalty-free perpetually back. ATIA is explicitly carved out and remains 100% Phill.

**Exit.** Year-3 mutual put/call at independent FMV; 24-month founders' lock-in; 24-month post-exit non-compete; ROFR on either party's transfer.

**The 5 things to communicate to Duncan in writing this week:**

1. We're upgrading the engagement from milestone-build to founders-partnership covering BOTH Lodgey AND ATO-APP — one combined platform play with two products on top.
2. Structure: 85/15 NewCo (Lodgey Group Pty Ltd), 4-year vest with 12-month cliff, KPI-gated. $30k co-investment from you at signing.
3. Plus 20% revenue share on Duncan-sourced accounts, tapering to 0 over 7 years.
4. ATO-APP stays Phill-owned and is exclusively licensed into NewCo — protects what's already built while giving you full economic upside via your equity.
5. Next move: replace the milestone schedule in the current SOW v1 with a partnership-shaped addendum (drafted as the companion artifact) — execute term sheet within 14 days, shareholders' agreement within 60 days.

## Q9 — The Custom Oracle (the unsaid question)

**Custom Oracle.** The question Phill hasn't asked: **what happens to Duncan's equity and revenue share if Phill is the one who exits — through illness, sale of Unite-Group Nexus, or a strategic acquisition of Lodgey Group?** The current line of thinking is all about Duncan-exit scenarios. But if Phill sells the parent in 2027 to an acquirer who wants 100% of Lodgey, Duncan has drag-along/tag-along rights questions that need answering NOW.

Solve it in the shareholders' agreement: (a) **drag-along** — Phill can drag Duncan into a sale above an agreed valuation threshold (e.g. $20M); (b) **tag-along** — Duncan can tag onto any Phill transfer at the same per-share price; (c) **key-person insurance** — both founders insured for $2M each, with the proceeds funding a buyout of the affected founder's stake by the survivor at FMV; (d) **change-of-control acceleration** — Duncan's unvested equity accelerates 24 months on a Phill-side exit, protecting him from being squeezed out by a new owner. Get these clauses in the term sheet, not the SHA — that signals seriousness and prevents a 2027 dispute.

---

*CEO-Board Deliberation 2026-05-14*
