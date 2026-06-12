---
ingest_id: 7ba3d390f6e29737
title: Fourth Frontier Frontier X Mobile Application, Frontier X2
source_url: https://www.cisa.gov/news-events/ics-medical-advisories/icsma-26-148-01
source_type: official_primary_source
source_date: 2026-05-28
trust_level: high
product_tags: ['Unite-Group', 'Synthex']
suggested_action: risk
priority_score: 70
product_relevance: 0.0
actionability: 0.34
compliance_risk: 0.65
route: READY_FOR_DRAFT
ingested_at: 2026-05-30T22:56:21.665388+10:00
---

# Fourth Frontier Frontier X Mobile Application, Frontier X2

Source: https://www.cisa.gov/news-events/ics-medical-advisories/icsma-26-148-01  
Source type: official_primary_source  
Source date: 2026-05-28  
Trust level: high  
Product tags: Unite-Group, Synthex  
Priority score: 70  
Product relevance: 0.0  
Actionability: 0.34  
Compliance risk: 0.65  
Route: READY_FOR_DRAFT

## E-E-A-T relevance note
HIGH trust official primary source; use only with citation to https://www.cisa.gov/news-events/ics-medical-advisories/icsma-26-148-01. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- View CSAF Summary Successful exploitation of this vulnerability could allow an attacker to read and write arbitrary handle values and change clinical readings, which could result in taking control of the device and lead to patient harm.
- This allows attackers within BLE range to perform unauthorized control of device functions, including starting/stopping activities, triggering vibrations, causing denial-of-service conditions, and fuzzing characteristic values to induce unexpected behavior.
- Additionally, the Frontier X mobile application lacks proper BLE device authentication, allowing attackers to impersonate a legitimate Frontier X2 device and connect to the application.

## Suggested Nexus action
- Type: risk
- Recommendation: Convert this cited source into a READY_FOR_DRAFT item for Unite-Group, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> View CSAF Summary Successful exploitation of this vulnerability could allow an attacker to read and write arbitrary handle values and change clinical readings, which could result in taking control of the device and lead to patient harm. The following versions of Fourth Frontier Frontier X Mobile Application, Frontier X2 are affected: Frontier X Android application vers Frontier X IOS application vers Frontier X2 vers:all/* CVSS Vendor Equipment Vulnerabilities v3 8.8 Fourth Frontier Fourth Frontier Frontier X Mobile Application, Frontier X2 Missing Authentication for Critical Function Background Critical Infrastructure Sectors: Healthcare and Public Health Countries/Areas Deployed: Worldwide Company Headquarters Location: United States Vulnerabilities Expand All + CVE-2026-5768 The Frontier X2 device allows unauthenticated BLE read/write access to critical GATT characteristics without en
