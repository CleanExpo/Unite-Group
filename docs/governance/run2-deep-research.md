# UNI-2673 run 2 - deep-research record

**Written:** 2026-09-07 AEST  
**Model:** `perplexity/sonar-deep-research` via OpenRouter  
**Authority:** founder instruction 2026-09-07, $25 OpenRouter credit added and this model nominated. This resolves the run-1 open question *Apply OpenRouter credits?* in the affirmative.  
**Spend:** $2.3197 of the $25.00 credit across two answered queries. Two failed calls were charged nothing.  
**Scope:** the two items the run-1 handoff marked BLOCKING. Nothing else was researched.

---

## Why this file exists

Run 1's headline finding rested on four fetches that never completed. A timeout is not an absence, so the finding was unusable outside the repository. This run re-ran those fetches and settled the second blocking question at the same time.

**The two-reader rule was kept.** `perplexity/sonar-deep-research` LOCATED the sources. It did not verify anything. Every entry promoted to `verified` in this run was reopened by the coordinating context, which downloaded the primary document itself and matched the quote against it. Where only the model read a source, the entry stays `unverified-seed` with `sweep_status: lead` and says so in its note. Three entries are in that state on purpose: `STD-21`, `ASIC-11` and the trade-press dates inside it.

---

## Q1 - Does any mandatory Australian instrument set a numeric limit for mould or bioaerosols in occupied buildings?

**Verdict: the claim SURVIVES on its narrow point, and its second sentence was wrong.**

Run 1 recorded this as `STD-14`, the headline finding, on four failed checks. All four sources loaded this time, first try:

| Source | Bytes | Result |
| --- | --- | --- |
| Safe Work Australia model WHS Regulations, 5 Dec 2025 | 2,466,719 | read |
| Safe Work Australia Workplace Exposure Standards, amended Nov 2025 | 235,143 | read |
| ABCB Indoor Air Quality Verification Methods Handbook, NCC 2022 | 6,595,488 | read |
| ABCB Indoor Air Quality Handbook 2021 | 2,240,570 | read |
| enHealth mould guidance | 230,415 | read |

**What the primary sources actually say**, each quote matched against the document by the coordinating context:

- The law's definition reaches mould. Model WHS Regulations: *airborne contaminant means a contaminant in the form of a fume, mist, gas, vapour or dust, and includes micro-organisms* (`STD-15`).
- The numeric list it points at contains no mould. A positive control ran first so the search was proven able to hit: Benzene 30 hits, Formaldehyde 2, Ammonia 1; mould, fungi, fungal, spore, bioaerosol and bacteria all returned 0 (`STD-16`).
- The building regulator says so in writing. ABCB: *Acceptable limits for many biological contaminants have not been established* (`STD-17`), and biological contaminants *are not covered by the IAQ Verification Methods* (`STD-18`).
- The health authority says so in writing. enHealth: *There is no exposure limit or health guideline value for exposure to mould* (`STD-19`), and *there are no health guideline values for which to compare test results to* (`STD-20`).

**The correction.** `STD-14`'s second sentence claimed the only Australian instruments located were a voluntary standard and non-binding guidance. That overstated the position. Mandatory instruments addressing mould do exist - Queensland's minimum housing standards require rental premises to be free from damp and mould - they simply impose qualitative duties instead of numeric limits (`STD-21`). The narrow claim survives; the sweeping phrasing must not leave this repository.

**`STD-14` is deliberately still `unverified-seed`.** The sweeping form of the claim spans seven bodies and the coordinating context reopened four of them. The proven parts are the six new verified entries. Six state and territory WHS regulators, and every state tenancy instrument other than Queensland, have been checked by nobody in either run.

### Q1 sources

[1] https://www.safeworkaustralia.gov.au/sites/default/files/2025-12/model-whs-regulations-5_december_2025.pdf
[2] https://www.safeworkaustralia.gov.au/doc/workplace-exposure-standards-airborne-contaminants-2025
[3] https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws
[4] https://www.safeworkaustralia.gov.au/taxonomy/term/163
[5] https://www.safeworkaustralia.gov.au/sites/default/files/2023-08/model-whs-regulations-1_august_2023.pdf
[6] https://www.safeworkaustralia.gov.au/doc/workplace-exposure-limits-airborne-contaminants
[7] https://www.abcb.gov.au/sites/default/files/resources/2021/Handbook-Indoor-Air-Quality.pdf
[8] https://www.abcb.gov.au/sites/default/files/resources/2023/Handbook-Indoor-Air-Quality-Verification-Methods-NCC-2022.pdf
[9] https://www.safeworkaustralia.gov.au/doc/model-code-practice-managing-work-environment-and-facilities
[10] https://www.legislation.act.gov.au/DownloadFile/ni/2025-444/current/PDF/2025-444.PDF
[11] https://worksafe.tas.gov.au/topics/laws-and-compliance/codes-of-practice/cop-folder/managing-the-work-environment-and-facilities
[12] https://www.cdc.gov.au/system/files/2025-10/enhealth-guidance-potential-health-effects-of-mould-in-the-environment_0.pdf
[13] https://www.safework.nsw.gov.au/hazards-a-z/mould
[14] https://www.safeworkaustralia.gov.au/sites/default/files/2025-11/workplace-exposure-standards-amended-november2025.docx
[15] https://www.standards.org.au/
[16] https://www.rta.qld.gov.au/sites/default/files/2023-08/Fact-sheet-minimum-housing-standards-rooming-accommodation.pdf
[17] https://www.health.wa.gov.au/~/media/Corp/Documents/Health-for/Mould/Guidelines-for-Managing-Mould-and-Dampness-Related-Public-Health-Risks-in-BuildingsV20.pdf
[18] https://qstars.org.au/site/wp-content/uploads/2025/09/Minimum-Housing-Standards-Factsheet-2025-QSTARS-03.pdf
[19] https://www.climatecontrolnews.com.au/ventilation/moisture-control
[20] https://www.burnet.edu.au/our-work/health-themes/clean-indoor-air/

---

## Q2 - Is the redrafted General Insurance Code of Practice ASIC-approved yet?

**Verdict: NOT APPROVED.** As at September 2026 the redrafted Code has not been approved by ASIC under s1101A of the Corporations Act 2001.

The settling document is an AFCA submission to ASIC's RG 183 consultation, hosted on asic.gov.au, downloaded at 242,730 bytes and read directly. A positive control returned 87 hits for the word *code* before the specific search was trusted. It says:

> Only one code, the Banking Code of Practice currently has ASIC approval. We welcome signals from other sectors, such as the Insurance Council of Australia, of their intention to seek ASIC approval for the updated General Insurance Code of Practice.

Recorded as `ASIC-09` and `ASIC-10`, both verified.

**Why this matters more than it looks.** Two different things were being blurred. A code can be *contractually binding on ICA members* while not being *ASIC-approved under s1101A*. Only the second brings enforceable code provisions, financial-services-law status and civil penalties. Every enforceability claim in the positioning pack rests on which of those is true, and today it is the first.

**The ledger conflict is NOT resolved here, on purpose.** `ASIC-03` and `ICA-01` are marked as conflicting. Rule D6 says a conflict is settled by a person and never by a verifier, and `promote.py` enforces it. The evidence to settle it now exists and is cited in `ASIC-03`'s note.

**For Phill, a one-line decision:** on this evidence `ASIC-03` should be promoted to `verified` and its conflict with `ICA-01` discharged as not a real contradiction - `ICA-01` is phrased conditionally, *once ASIC approves it*, and a conditional claim does not contradict a statement that the condition has not been met.

**Timing, lead-grade only.** Trade press reports lodgement delayed to late October 2026 and an effective date expected in 2028 (`ASIC-11`). One reader, trade journalism, no primary source. If those dates are right, the enforceability window the positioning pack assumes is years away rather than months, so run 3 must confirm both against an ICA or ASIC document before either number appears in founder-facing material.

### Q2 sources

[1] https://www.asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-183-codes-of-conduct-for-the-financial-services-and-credit-sectors
[2] https://www5.austlii.edu.au/au/legis/cth/consol_act/ca2001172/s1101a.html
[3] https://treasury.gov.au/sites/default/files/2020-01/c2020-48919f-explanatory_memorandum.docx
[4] https://download.asic.gov.au/media/1339640/ir00-026.pdf
[5] https://treasury.gov.au/sites/default/files/2020-01/c2020-48919f-explanatory_memorandum.pdf
[6] https://www.ato.gov.au/law/view/print?DocID=PAC/20010122/Sch1-Cl1-68&PiT=99991231235958
[7] https://disasterrecovery.com.au/guides/insurance/general-insurance-code-of-practice
[8] https://download.asic.gov.au/media/zuhdoj3r/insurance-council-of-australia-ica-_redacted.pdf
[9] https://insurancecouncil.com.au/code-of-practice/code-submissions/
[10] https://insurancecouncil.com.au/cop/
[11] https://www.asic.gov.au/about-asic/news-centre/news-items/asic-issues-updated-guidance-for-industry-codes-of-conduct
[12] https://www.ato.gov.au/law/view/print?DocID=PAC/20200135/Sch1-Cl1&PiT=99991231235958
[13] https://download.asic.gov.au/media/merbhesn/asic-code-of-conduct-7-may-2024.pdf
[14] https://www.asic.gov.au/about-asic/news-centre/news-items/asic-proposes-updates-to-guidance-for-industry-codes-of-conduct
[15] https://treasury.gov.au/sites/default/files/2019-03/ch9.rtf
[16] https://download.asic.gov.au/media/dujfdaec/australian-financial-complaints-authority-afca-_redacted.pdf
[17] https://treasury.gov.au/sites/default/files/2019-03/cp-c2019-t368566.pdf
[18] https://codeofpracticereview.com.au/wp-content/uploads/2024/09/240905_FINAL-GICOP-Review-Initial-Report.pdf
[19] https://www.legislation.gov.au/F2024L00783/asmade/2024-06-27/text/original/epub/OEBPS/document_1/document_1.html
[20] https://classic.austlii.edu.au/au/legis/cth/num_act/fsrrcra2020560/sch1.html
[21] https://www5.austlii.edu.au/au/legis/cth/consol_act/ca2001172/s1672.html
[22] https://codeofpracticereview.com.au/wp-content/uploads/2024/04/041824-FINAL-Review-Panel-Initial-Consultation-Paper.pdf
[23] https://codeofpracticereview.com.au/wp-content/uploads/2024/09/240906-General-Insurance-Code-of-Practice-Review-Initial-Report-Released-Media-Release-Report.pdf
[24] https://www.afca.org.au/media/1868/download
[25] https://download.asic.gov.au/media/1241015/rg183-published-1-march-2013.pdf
[26] https://www.asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-183-codes-of-conduct-for-the-financial-services-and-credit-sectors/
[27] https://download.asic.gov.au/media/ximngnq2/attachment-2-to-cs26-published-24-july-2025.pdf
[28] https://www.asic.gov.au/regulatory-resources/find-a-document/consultations/cs-26-proposed-update-to-rg-183
[29] https://download.asic.gov.au/media/1334924/cp191-published-23-October-2012.pdf
[30] https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2018-releases/18-223mr-asic-approves-the-banking-code-of-practice/
[31] https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2024-releases/24-136mr-asic-approves-enhanced-banking-code-of-practice/
[32] https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2016-releases/16-404mr-asic-approves-the-fpa-professional-ongoing-fees-code/
[33] https://insurancecode.org.au/resources/general-insurance-code-of-practice-2020/
[34] https://www.insurancebusinessmag.com/au/news/breaking-news/ica-delays-code-lodgement-as-industryconsumer-divide-deepens-584518.aspx
[35] https://www.codeofpractice.com.au/
[36] https://www.insurancebusinessmag.com/au/news/breaking-news/general-insurance-code-consultation-closes-as-reform-pressure-builds-583644.aspx
[37] https://www.insurancebusinessmag.com/au/news/breaking-news/code-redraft-delay-exposes-rift-over-smallbusiness-protections-587844.aspx
[38] https://www.insurancebusinessmag.com/au/news/breaking-news/anziif-sends-a-briefing-tour-around-australia-as-the-general-insurance-code-falls-behind-587408.aspx
[39] https://www.insurancebusinessmag.com/au/news/breaking-news/the-general-insurance-code-is-changing--have-your-say-580128.aspx
[40] https://in-magazine.com.au/are-insurers-ready-to-crack-the-code/
[41] https://download.asic.gov.au/media/s1lb4v0n/attachment-1-to-cs26-published-24-july-2025.pdf
[42] https://download.asic.gov.au/media/wj1jwrjj/rg183-published_02-december_2025.pdf
[43] https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2024-releases/24-136mr-asic-approves-enhanced-banking-code-of-practice
[44] https://www.ausbanking.org.au/wp-content/uploads/2021/06/Banking-Code-of-Practice-28.02.25.pdf
[45] https://www.brightlaw.com.au/review-of-financial-sector-industry-codes/
[46] http://classic.austlii.edu.au/au/journals/GriffLawRw/2006/17.pdf
[47] https://www.insurancenews.com.au/daily/mulino-hopes-for-material-progress-on-code
[48] https://insurancecode.org.au/app/uploads/2019/10/GI-Code-2006.pdf
[49] https://insurancecode.org.au/app/uploads/2019/04/GI-Code-2014-AFCA-update_201218V.pdf
[50] https://download.asic.gov.au/media/xnnlnces/australian-financial-complaints-authority-afca-_redacted.pdf

---

## Method notes for run 3

**A heavy prompt fails; a narrow one succeeds.** The first Q2 prompt asked for five bodies with strict per-body reporting and returned HTTP 504, *Provider timed out after 300686ms*. Re-running it with streaming produced the identical 301-second failure, which falsified the gateway-idle-timeout theory. A narrowed five-question prompt then ran 514 seconds and returned 50 citations. Prompt weight was the cause. Neither failure was charged.

**Cost, measured not estimated.** Q1 $1.2222; Q2 narrow $1.0975; total $2.3197. Both failed calls returned empty `usage` and cost nothing. At roughly $1.15 a query the $25 credit is about 21 more queries.

**The model earns its place as a locator, not as a witness.** Both answers pointed at real primary documents that direct fetching then confirmed word for word. No fabricated quote was found in either. That is one clean run against a standard set by run 1, where two Sonnet sweeps fabricated quotes and self-certified them, so it is not yet a reason to trust the model unverified.

**What run 3 still has to do.** 66 of 102 entries remain `unverified-seed`, and 9 remain in `conflict`. The four D4 to D7 memos are untouched. Nothing in this file changes that.
