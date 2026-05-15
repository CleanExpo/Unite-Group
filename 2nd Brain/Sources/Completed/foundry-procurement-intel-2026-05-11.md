---
type: source
captured: 2026-05-11
source_kind: web-research
purpose: Procurement intel for Palantir Foundry adoption (Margot Path D recommendation)
---

# Foundry Procurement Intel — 2026-05-11

Research target: operational path to procuring Palantir Foundry as the central ontology / action-gating layer for Pi-CEO's 200-agent swarm, hybrid with Supabase. Web research only, no outreach.

## 1. Palantir AU sales contact

**Bullseye contact for our scope (commercial / mid-market):**
- **Ashwin Rajan — Head of Commercial, Australia (Palantir)**. Quoted in Palantir's Coles announcement as the executive owning the AU commercial business. [^1]
- LinkedIn handle not directly surfaced in WebSearch results — search "Ashwin Rajan Palantir" on LinkedIn to confirm before any outreach.

**Public sector (separate team, not our use case but useful for distinguishing):**
- **Paul Rawlins — Head of Public Sector, AU**. Named spokesperson on the November 2025 IRAP PROTECTED announcement. [^2]

**Other AU presence:**
- **Dr Michael Kelly** (former Labor MP) — appointed President of Palantir Australia, principally a public-policy/relations role. [^3]

**Sales / commercial team split:** Palantir publicly distinguishes Public Sector vs Commercial in AU. There is no separately marketed "mid-market" team — commercial mid-market sits under Rajan's Commercial org. No self-serve enterprise tier; everything routes through sales.

**Sydney office addresses (two recorded — 10 Carrington appears to be the active engineering/sales hub, 66 King is the registered company address):**
- Level 20, 10 Carrington Street, Sydney NSW 2000 [^4]
- Suite 101, Level 4, 66 King Street, Sydney NSW 2000 (Palantir Technologies Australia Pty Ltd registered) [^5]

**Inbound channel for cold outreach:** https://www.palantir.com/contact/get-started/ (this is the form Palantir's AWS Marketplace listing routes to). [^6]

## 2. Foundry-AU region status

- **Available in AWS Sydney (ap-southeast-2) — confirmed.** Palantir Platform Australia (PPA) runs Foundry + AIP on Australian AWS regions. [^2]
- **IRAP PROTECTED achieved 20 November 2025** for Foundry and AIP — assessed by independent IRAP assessor under ASD protocols. Unlocks Australian government workloads at PROTECTED classification. [^2][^7]
- **GA, not limited availability.** Coles (840 supermarkets, 3-year deal signed 2024) and Rio Tinto (renewed enterprise contract Nov 2024 extending to AIP) are running on PPA today. [^8][^9]
- **2026 product announcements relevant to AU:** Feb 2026 — AIP Document Intelligence GA; May 2026 — SQL Studio in beta. No AU-region-specific product news this year beyond the IRAP unlock from late 2025. [^10][^11]

## 3. Pricing intel

**Hard public anchor (AWS Marketplace, 2026):** Palantir Platform listing on AWS Marketplace lists **US$100,000 / month per "Foundry Unit"** with **US$50,000 / unit overage** on the public 1-month contract. The page explicitly states "the public price is a placeholder and actual payment may be different" — real pricing is private offer / direct sales. [^6]

**Implication for Margot's $5–6.5M / 36-month TCO estimate:**
- Floor sanity check: 1 Foundry Unit × 36 months × $100k = $3.6M just on the placeholder rate, before AIP units, overages, professional services, and platform engineers. **Margot's $5–6.5M range is consistent with the public floor + a realistic discount + 1–2 AIP units + FDE engagement.** It is not optimistic.
- Watch-out: a 200-agent swarm hammering Logic functions and Object SDK is compute-heavy. Overage at $50k/unit can spike fast. Insist on a capacity model with predictable cap, not pure consumption.

**Per-seat vs capacity:** Foundry is **capacity-based** (Foundry Units = bundled compute + storage + user allotment), not per-seat. UK G-Cloud document confirms the same model but the PDF was unparseable for line-item extraction. [^12]

**Mid-market / starter pricing:** **No public mid-market or "Foundry Starter" tier exists.** Foundry for Builders (early-stage programme) and the free Developer Tier are the only sub-enterprise on-ramps. [^13]

## 4. Evaluation / sandbox / self-serve path

**Yes — multiple low-friction paths exist before signing an enterprise contract:**

- **Free Developer Tier at https://build.palantir.com** — Palantir confirms in community thread: *"Developer Tier is a free tier of Foundry / AIP and you won't be charged… these limitations are baked in, so you won't be able to accidentally exceed them."* Includes Object SDK (Python / Java / TypeScript) and AIP Logic (no-code function builder over the Ontology). Capacity caps shown in Control Panel → "Your Plan". [^14][^15]
- **Foundry for Builders** — Palantir's programme for early-stage companies; gives access to enterprise platform features. Application-based. [^13]
- **AIP Bootcamps** — Palantir runs in-person AIP Bootcamps where teams build a working AIP solution against their own data in a few days. Worth applying for one in APAC if available — fastest path to FDE-shaped help without a contract.
- **AWS Marketplace** — Listed but private-offer only; useful primarily for procurement burndown of AWS commit, not for evaluation. [^6]

**Recommendation:** Start on Developer Tier this week to prove the Object SDK + AIP Logic workflow against the 5 entities from the Google audit. Run for 4–6 weeks before any sales conversation — strengthens negotiating position and de-risks the architecture.

## 5. AU customer references (2026)

**Confirmed AU enterprises live on Foundry / AIP:**
- **Rio Tinto** — flagship; renewed enterprise contract Nov 2024, extended to AIP. Multi-year ontology built in Foundry. [^9]
- **Coles** — 3-year deal signed 2024, deploying Foundry + AIP across 840 supermarkets, 120,000 workforce. [^1][^8]
- **WesTrac** — Cat-dealer, deployment in Perth servicing/rebuild operations. [^16]
- **Westpac** — listed in 2026 reporting on Palantir's AU customer set. [^17]
- **Australian Department of Defence** — ~$7.15M Foundry contract, plus Australian Signals Directorate contract. [^17][^3]
- **Victorian Department of Justice** — listed AU customer. [^17]

**Mid-market AU adopters (sub-$100M revenue):** **None publicly disclosed.** Every named AU customer is enterprise-scale ($1B+ revenue or government). This is a gap for sizing comparison and a negotiating signal — Unite-Group would be a relatively small commercial logo for them, which cuts both ways (less leverage on price, more leverage on attention from FDE team hungry for SMB proof points).

## 6. Red flags to surface

1. **No sub-enterprise pricing tier.** The minimum unit of consumption is one Foundry Unit. Even with discounting, sub-$1M ARR commits are unusual. Expect 36-month minimums.
2. **NHS Federated Data Platform exit risk (UK, 2026).** UK government evaluating early exit from £330M Palantir contract; senior MP cited "vendor lock-in, value for money, data security." Palantir's counter: open APIs, raw-format data export. Confirm export tooling depth in any AU contract — write export rights into the MSA. [^18][^19]
3. **Reputational drag on AU side.** Palantir is being attacked in AU press as "spy firm" / "surveillance" (Honi Soit, Michael West, Sydney Criminal Lawyers, Digital Rights Watch, all Q1 2026). Probably not material to a B2B SaaS adopter, but worth knowing if Unite-Group ever surfaces the Foundry dependency externally — keep it inside the wall like the DR / CORE positioning. [^3][^17]
4. **Capacity overage economics.** $50k/unit overage on the public price means a runaway agent loop is a six-figure mistake. Insist on hard caps + alerts in any contract.
5. **No mid-market AU reference customer.** We would be a pioneer logo at our scale in AU commercial. Negotiate aggressively for FDE hours and a logo/case-study clause as concessions on price. Do not accept "enterprise pricing for mid-market scale" without a quid pro quo.

**Would any of this change Margot's Path D?** No — IRAP PROTECTED on AWS Sydney closes the data-sovereignty argument she leaned on, the public pricing floor confirms her TCO range, and the free Developer Tier de-risks the build-now / contract-later sequencing. The added discipline: prove the architecture on Developer Tier for 4–6 weeks before engaging Rajan's team, and write strong export + capacity-cap clauses into the MSA.

---

## Sources

[^1]: Palantir investor relations — "Palantir Partners with One of Australia's Leading Retailers" (Coles announcement, Feb 2024, with Ashwin Rajan quote). https://investors.palantir.com/news-details/2024/Palantir-Partners-with-One-of-Australias-Leading-Retailers
[^2]: StockTitan — "Palantir Achieves IRAP PROTECTED Level… Australia" (20 Nov 2025; Paul Rawlins quote; AWS AU regions confirmed for Foundry + AIP). https://www.stocktitan.net/news/PLTR/palantir-achieves-information-security-registered-assessors-program-oivqlj86efjm.html
[^3]: Honi Soit — "Australia's $100 million investment in Palantir" (Feb 2026; Defence ~$7.15M Foundry contract; Michael Kelly President AU). https://honisoit.com/2026/02/australias-100-million-investment-in-palantir-technology-giant-and-partner-of-us-and-israeli-defence-forces/
[^4]: Highperformr — Palantir global office locations (10 Carrington St Sydney). https://www.highperformr.ai/company/1325227
[^5]: Dun & Bradstreet — Palantir Technologies Australia Pty Ltd company profile (66 King St Sydney registered address). https://www.dnb.com/business-directory/company-profiles.palantir_technologies_australia_pty_ltd.8eaadc6baec4f29002abda9909b24757.html
[^6]: AWS Marketplace — Palantir Platform listing ($100k/Foundry Unit/month placeholder, $50k overage, private offer). https://aws.amazon.com/marketplace/pp/prodview-a5m5xespbqyci
[^7]: Palantir investor relations — IRAP PROTECTED announcement. https://investors.palantir.com/news-details/2025/Palantir-Achieves-Information-Security-Registered-Assessors-Program-IRAP-PROTECTED-Level-Unlocking-New-Opportunities-in-Australia/
[^8]: iTnews — "Coles to run Palantir analytics suite across its supermarkets". https://www.itnews.com.au/news/coles-to-run-palantir-analytics-suite-across-its-supermarkets-604698
[^9]: BusinessWire — "Palantir and Rio Tinto Renew Enterprise Contract and Extend Access to Palantir's AI Platform" (Nov 2024). https://www.businesswire.com/news/home/20241112799701/en/Palantir-and-Rio-Tinto-Renew-Enterprise-Contract-and-Extend-Access-to-Palantirs-AI-Platform
[^10]: Palantir docs — February 2026 announcements (AIP Document Intelligence GA). https://www.palantir.com/docs/foundry/announcements/2026-02
[^11]: Palantir docs — May 2026 announcements (SQL Studio beta). https://www.palantir.com/docs/foundry/announcements/2026-05
[^12]: UK G-Cloud 14 — Palantir Platform Foundry & AIP service listing. https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/804537709233305
[^13]: Palantir for Developers — programme overview. https://www.palantir.com/developers/
[^14]: Palantir Build with AIP — developer entry point. https://build.palantir.com/
[^15]: Palantir Developer Community — "Developer Tier Billing and Usage" (free tier confirmed, baked-in caps, no accidental charges). https://community.palantir.com/t/developer-tier-billing-and-usage/1074
[^16]: PRNewswire — "Palantir Continues Expansion in Australia with WesTrac Partnership". https://www.prnewswire.com/news-releases/palantir-continues-expansion-in-australia-with-westrac-partnership-301670972.html
[^17]: Digital Rights Watch — "Palantir in Australia" (Feb 2026; lists Westpac, Vic DoJ, Defence as AU customers). https://digitalrightswatch.org.au/2026/02/01/palantir-in-australia/
[^18]: mlq.ai — "UK Government Signals Potential Early Exit from Palantir NHS Data Platform Contract" (2026). https://mlq.ai/news/uk-government-signals-potential-early-exit-from-palantir-nhs-data-platform-contract/
[^19]: TechRadar — "NHS users report that it is awful to use… Palantir could be forced to exit NHS" (2026). https://www.techradar.com/pro/security/nhs-users-report-that-it-is-awful-to-use-palantir-could-be-forced-to-exit-nhs-after-pushback-from-staff-mps-unions-and-pressure-groups-over-federated-data-platform

## Gaps / things I could not verify

- **LinkedIn handles for Ashwin Rajan / Paul Rawlins** — names confirmed in primary sources but the WebSearch result set did not return their LinkedIn URLs directly. Manual lookup needed before any outreach.
- **Palantir Foundry official pricing PDF** (UK G-Cloud) returned as binary/corrupted via WebFetch — line-item Foundry Unit definition not extracted. Would benefit from a direct PDF fetch via a different tool.
- **AWS Marketplace explicit ap-southeast-2 deployment confirmation** — listing page does not enumerate regions in the WebFetch extract. Confirmed indirectly via the IRAP PROTECTED announcement which states PPA runs on Australian AWS.
- **AIP Bootcamp APAC schedule** — programme exists, but no public 2026 AU date surfaced in WebSearch results.
