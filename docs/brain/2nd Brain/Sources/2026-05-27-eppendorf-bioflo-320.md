---
ingest_id: 89b4f0018102a3f6
title: Eppendorf BioFlo 320
source_url: https://www.cisa.gov/news-events/ics-medical-advisories/icsma-26-146-01
source_type: official_primary_source
source_date: 2026-05-26
trust_level: high
product_tags: ['RestoreAssist', 'CARSI', 'Synthex']
suggested_action: risk
priority_score: 100
route: ESCALATE_REVIEW
ingested_at: 2026-05-27T08:10:34.677595+10:00
---

# Eppendorf BioFlo 320

Source: https://www.cisa.gov/news-events/ics-medical-advisories/icsma-26-146-01  
Source type: official_primary_source  
Source date: 2026-05-26  
Trust level: high  
Product tags: RestoreAssist, CARSI, Synthex  
Priority score: 100  
Route: ESCALATE_REVIEW

## E-E-A-T relevance note
HIGH trust official primary source; use only with citation to https://www.cisa.gov/news-events/ics-medical-advisories/icsma-26-146-01. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- View CSAF Summary Successful exploitation of this vulnerability could allow an attacker to gain full access to functionality and data with the bioreactor.
- If a remote attacker knows the network address of any BioFlo 320 model with remote access enabled, they can gain full control of the user interface by using this password.
- Once connected, the attacker would have full access to all control panel features for the BioFlo 320.
- Users should download and apply this update from: https://www.eppendorf.com/software-downloads.

## Suggested Nexus action
- Type: risk
- Recommendation: Convert this cited source into a ESCALATE_REVIEW item for RestoreAssist, CARSI, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> View CSAF Summary Successful exploitation of this vulnerability could allow an attacker to gain full access to functionality and data with the bioreactor. The following versions of Eppendorf BioFlo 320 are affected: BioFlo 320 Bioreactor vers:all/* CVSS Vendor Equipment Vulnerabilities v3 9.8 Eppendorf Eppendorf BioFlo 320 Use of Hard-coded Password Background Critical Infrastructure Sectors: Healthcare and Public Health Countries/Areas Deployed: Worldwide Company Headquarters Location: Germany Vulnerabilities Expand All + CVE-2026-7251 The affected product is vulnerable to due to VNC server using a hard-coded password. If a remote attacker knows the network address of any BioFlo 320 model with remote access enabled, they can gain full control of the user interface by using this password. Once connected, the attacker would have full access to all control panel features for the BioFlo 320
