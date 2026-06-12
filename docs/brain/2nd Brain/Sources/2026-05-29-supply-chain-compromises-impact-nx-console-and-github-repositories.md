---
ingest_id: 48d82e220e383c3d
title: Supply Chain Compromises Impact Nx Console and GitHub Repositories
source_url: https://www.cisa.gov/news-events/alerts/2026/05/28/supply-chain-compromises-impact-nx-console-and-github-repositories
source_type: official_primary_source
source_date: 2026-05-28
trust_level: high
product_tags: ['Unite-Group', 'Synthex']
suggested_action: risk
priority_score: 81
product_relevance: 0.0
actionability: 0.39
compliance_risk: 0.95
route: ESCALATE_REVIEW
ingested_at: 2026-05-29T05:43:23.725310+10:00
---

# Supply Chain Compromises Impact Nx Console and GitHub Repositories

Source: https://www.cisa.gov/news-events/alerts/2026/05/28/supply-chain-compromises-impact-nx-console-and-github-repositories  
Source type: official_primary_source  
Source date: 2026-05-28  
Trust level: high  
Product tags: Unite-Group, Synthex  
Priority score: 81  
Product relevance: 0.0  
Actionability: 0.39  
Compliance risk: 0.95  
Route: ESCALATE_REVIEW

## E-E-A-T relevance note
HIGH trust official primary source; use only with citation to https://www.cisa.gov/news-events/alerts/2026/05/28/supply-chain-compromises-impact-nx-console-and-github-repositories. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- CISA is prioritizing the response to multiple emerging software supply chain intrusion campaigns targeting developer ecosystems Continuous Integration/Continuous Development (CI/CD) pipelines.
- Threat actors leveraged a prior compromise of Nx developer systems to compromise a GitHub employee’s device through a poisoned third-party VS Code extension, resulting in unauthorized access and exfiltration of internal GitHub repositories.
- The malicious extension version (18.95.0) was distributed through VS Code’s automatic update mechanism, meaning systems with Nx Console previously installed may have received the malicious build without developers taking any manual installation action.
- GitHub released a security advisory on this activity, and CVE-2026-48027 has been assigned to the malicious version of Nx Console and added to CISA’s Known Exploited Vulnerabilities (KEV) Catalog .

## Suggested Nexus action
- Type: risk
- Recommendation: Convert this cited source into a ESCALATE_REVIEW item for Unite-Group, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> CISA is prioritizing the response to multiple emerging software supply chain intrusion campaigns targeting developer ecosystems Continuous Integration/Continuous Development (CI/CD) pipelines. These recent incidents, including the GitHub compromise via a malicious Nx Console Visual Studio Code (VS Code) extension and the “Megalodon” supply chain intrusion campaign, demonstrate how cyber threat actors are abusing tools and processes that support enterprise, cloud, and DevOps environments—specifically CI/CD pipelines, code extensions and workflows. Threat actors leveraged a prior compromise of Nx developer systems to compromise a GitHub employee’s device through a poisoned third-party VS Code extension, resulting in unauthorized access and exfiltration of internal GitHub repositories. The malicious extension version (18.95.0) was distributed through VS Code’s automatic update mechanism, me
