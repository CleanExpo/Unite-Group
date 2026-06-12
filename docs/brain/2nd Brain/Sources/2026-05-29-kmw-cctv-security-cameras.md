---
ingest_id: 35ad4d0ac9d1bb21
title: KMW CCTV Security Cameras
source_url: https://www.cisa.gov/news-events/ics-advisories/icsa-26-148-06
source_type: official_primary_source
source_date: 2026-05-28
trust_level: high
product_tags: ['Unite-Group', 'Synthex']
suggested_action: risk
priority_score: 78
product_relevance: 0.0
actionability: 0.25
compliance_risk: 0.8
route: ESCALATE_REVIEW
ingested_at: 2026-05-29T05:43:23.726490+10:00
---

# KMW CCTV Security Cameras

Source: https://www.cisa.gov/news-events/ics-advisories/icsa-26-148-06  
Source type: official_primary_source  
Source date: 2026-05-28  
Trust level: high  
Product tags: Unite-Group, Synthex  
Priority score: 78  
Product relevance: 0.0  
Actionability: 0.25  
Compliance risk: 0.8  
Route: ESCALATE_REVIEW

## E-E-A-T relevance note
HIGH trust official primary source; use only with citation to https://www.cisa.gov/news-events/ics-advisories/icsa-26-148-06. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- View CSAF Summary Successful exploitation of this vulnerability may grant full unauthorized access to camera feeds and settings.
- This flaw allows an attacker to remotely reset the administrator password to a known value without authentication, granting full access to the camera feeds and settings.
- The firmware update can be found at https://main.kmw.ro/pub/Firmware/521_421.zip.
- https://main.kmw.ro/pub/Firmware/521_421.zip Vendor fix KM-IP421 - will lose the cloud authorization after this update so users will need

## Suggested Nexus action
- Type: risk
- Recommendation: Convert this cited source into a ESCALATE_REVIEW item for Unite-Group, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> View CSAF Summary Successful exploitation of this vulnerability may grant full unauthorized access to camera feeds and settings. The following versions of KMW CCTV Security Cameras are affected: KM-IP521 IPCAM_V4.04.91.230307 KM-IP421 IPCAM_V4.04.53.210416 CVSS Vendor Equipment Vulnerabilities v3 9.1 KMW KMW CCTV Security Cameras Unverified Password Change Background Critical Infrastructure Sectors: Commercial Facilities, Government Services and Facilities, Critical Manufacturing, Financial Services, Transportation Systems Countries/Areas Deployed: Worldwide Company Headquarters Location: Romania Vulnerabilities Expand All + CVE-2026-5386 The affected product is vulnerable to a critical unauthenticated password reset. This flaw allows an attacker to remotely reset the administrator password to a known value without authentication, granting full access to the camera feeds and settings. Vi
