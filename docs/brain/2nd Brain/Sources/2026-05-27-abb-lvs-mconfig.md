---
ingest_id: 9db8d332baf2339e
title: ABB LVS MConfig
source_url: https://www.cisa.gov/news-events/ics-advisories/icsa-26-146-06
source_type: official_primary_source
source_date: 2026-05-26
trust_level: high
product_tags: ['RestoreAssist', 'Synthex']
suggested_action: risk
priority_score: 100
route: ESCALATE_REVIEW
ingested_at: 2026-05-27T08:10:34.679438+10:00
---

# ABB LVS MConfig

Source: https://www.cisa.gov/news-events/ics-advisories/icsa-26-146-06  
Source type: official_primary_source  
Source date: 2026-05-26  
Trust level: high  
Product tags: RestoreAssist, Synthex  
Priority score: 100  
Route: ESCALATE_REVIEW

## E-E-A-T relevance note
HIGH trust official primary source; use only with citation to https://www.cisa.gov/news-events/ics-advisories/icsa-26-146-06. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- View CSAF Summary ABB became aware of an internally discovered vulnerability in the MConfig product versions listed as affected in the advisory.
- An attacker with access to local networks who successfully exploits vulnerability could have access to application’s sensitive information.
- ABB strongly advises customers to update MConfig with latest software version.
- If passwords are stored in plain text in memory, they will be included in these dump files.

## Suggested Nexus action
- Type: risk
- Recommendation: Convert this cited source into a ESCALATE_REVIEW item for RestoreAssist, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> View CSAF Summary ABB became aware of an internally discovered vulnerability in the MConfig product versions listed as affected in the advisory. An attacker with access to local networks who successfully exploits vulnerability could have access to application’s sensitive information. ABB strongly advises customers to update MConfig with latest software version. The following versions of ABB LVS MConfig are affected: LVS CVSS Vendor Equipment Vulnerabilities v3 7.4 ABB ABB LVS MConfig Cleartext Storage of Sensitive Information in Memory Background Critical Infrastructure Sectors: Chemical, Critical Manufacturing, Energy, Food and Agriculture, Transportation Systems, Water and Wastewater Countries/Areas Deployed: Worldwide Company Headquarters Location: Switzerland Vulnerabilities Expand All + CVE-2025-9970 During the runtime of the MConfig Software application, an attacker can export the 
