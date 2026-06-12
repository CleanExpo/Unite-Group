# Research Routing Tune Report — 2026-05-27 08:33 AEST

Goal: increase CONTENT_CANDIDATE ratio for CARSI/RestoreAssist/CCW while preserving E-E-A-T quality.
Guardrails: no publishing, no merges/deploys, no production writes; public source fetches and local 2nd-brain report only.

## Changes applied
- Safety-critical NIST/CISA sources retained and capped at max 25% of each scan selection.
- Added product-relevant commercial/industry feeds for RestoreAssist, CARSI, and CCW.
- Added product_relevance, actionability, and compliance_risk metrics to per-ingest notes/queue records.
- Routing validation uses two read-only candidate-selection cycles over live RSS/product + official feeds; scheduled scans still also retain the arXiv lane.
- Routing thresholds now use: high trust + product_relevance>=0.7 + actionability>=0.6 -> CONTENT_CANDIDATE; high trust + compliance_risk>=0.7 -> ESCALATE_REVIEW.

## Before distribution (existing research queue)
- CONTENT_CANDIDATE: 1 (8.3%)
- ESCALATE_REVIEW: 11 (91.7%)

## After distribution (2 tuned scan cycles, limit 8 each; RSS/product + official feeds)
- CONTENT_CANDIDATE: 6 (37.5%)
- ESCALATE_REVIEW: 4 (25.0%)
- READY_FOR_DRAFT: 6 (37.5%)
- RESEARCH_HOLD: 0 (0.0%)
- UNKNOWN: 0 (0.0%)

## Target route mix check
- CONTENT_CANDIDATE target 35-50%: PASS (37.5%)
- ESCALATE_REVIEW target 20-35%: PASS (25.0%)

## Safety-source cap check
- Cycle 1: NIST/CISA safety-critical items 2/8 = 25.0% (PASS)
- Cycle 2: NIST/CISA safety-critical items 2/8 = 25.0% (PASS)

## Cycle detail
### Cycle 1
- ESCALATE_REVIEW: CISA Adds Two Known Exploited Vulnerabilities to Catalog — CISA Alerts — tags=RestoreAssist, Unite-Group, Synthex; relevance=0.51; actionability=0.54; compliance_risk=0.8; source=https://www.cisa.gov/news-events/alerts/2026/05/21/cisa-adds-two-known-exploited-vulnerabilities-catalog
- ESCALATE_REVIEW: CISA Adds One Known Exploited Vulnerability to Catalog — CISA Alerts — tags=RestoreAssist, Unite-Group, Synthex; relevance=0.51; actionability=0.25; compliance_risk=0.8; source=https://www.cisa.gov/news-events/alerts/2026/05/26/cisa-adds-one-known-exploited-vulnerability-catalog
- CONTENT_CANDIDATE: Insurance Firm Safepoint, Backers Seek $283.3 Million in IPO — Insurance Journal — tags=Synthex, CARSI, RestoreAssist; relevance=0.9; actionability=0.62; compliance_risk=0.0; source=https://www.insurancejournal.com/news/southeast/2026/05/26/871332.htm
- CONTENT_CANDIDATE: Rivian receives American Iron and Steel Automotive Excellence Award — Repairer Driven News — tags=CARSI; relevance=0.86; actionability=0.69; compliance_risk=0.0; source=https://www.repairerdrivennews.com/2026/05/26/rivian-receives-american-iron-and-steel-automotive-excellence-award/
- CONTENT_CANDIDATE: Stellantis and JLR sign MOU for product development in the U.S. — Repairer Driven News — tags=CARSI; relevance=0.8; actionability=0.69; compliance_risk=0.0; source=https://www.repairerdrivennews.com/2026/05/22/stellantis-and-jlr-sign-mou-for-product-development-in-the-u-s/
- READY_FOR_DRAFT: AASP/NJ Plans June 24 Shop Owner Seminar on Appraisal Rights, Claim Strategies — CollisionWeek — tags=CARSI; relevance=0.92; actionability=0.57; compliance_risk=0.0; source=https://collisionweek.com/2026/05/26/aasp-nj-plans-june-24-shop-owner-seminar-appraisal-rights-claim-strategies/?utm_source=rss&utm_medium=rss&utm_campaign=aasp-nj-plans-june-24-shop-owner-seminar-appraisal-rights-claim-strategies
- READY_FOR_DRAFT: Rytech Restoration Expands to Full-Service Restoration — Cleanfax Restoration — tags=RestoreAssist; relevance=1.0; actionability=0.4; compliance_risk=0.0; source=https://cleanfax.com/rytech-restoration-expands-to-full-service-restoration/
- READY_FOR_DRAFT: Register: Risky Future AI Tools for Embedded Platforms ‘Demo Day’ on May 27 — Insurance Journal — tags=CARSI, RestoreAssist; relevance=0.9; actionability=0.54; compliance_risk=0.0; source=https://www.insurancejournal.com/news/national/2026/05/26/871340.htm
### Cycle 2
- ESCALATE_REVIEW: CISA Adds Two Known Exploited Vulnerabilities to Catalog — CISA Alerts — tags=RestoreAssist, Unite-Group, Synthex; relevance=0.51; actionability=0.54; compliance_risk=0.8; source=https://www.cisa.gov/news-events/alerts/2026/05/21/cisa-adds-two-known-exploited-vulnerabilities-catalog
- ESCALATE_REVIEW: CISA Adds One Known Exploited Vulnerability to Catalog — CISA Alerts — tags=RestoreAssist, Unite-Group, Synthex; relevance=0.51; actionability=0.25; compliance_risk=0.8; source=https://www.cisa.gov/news-events/alerts/2026/05/26/cisa-adds-one-known-exploited-vulnerability-catalog
- CONTENT_CANDIDATE: Insurance Firm Safepoint, Backers Seek $283.3 Million in IPO — Insurance Journal — tags=Synthex, CARSI, RestoreAssist; relevance=0.9; actionability=0.62; compliance_risk=0.0; source=https://www.insurancejournal.com/news/southeast/2026/05/26/871332.htm
- CONTENT_CANDIDATE: Rivian receives American Iron and Steel Automotive Excellence Award — Repairer Driven News — tags=CARSI; relevance=0.86; actionability=0.69; compliance_risk=0.0; source=https://www.repairerdrivennews.com/2026/05/26/rivian-receives-american-iron-and-steel-automotive-excellence-award/
- CONTENT_CANDIDATE: Stellantis and JLR sign MOU for product development in the U.S. — Repairer Driven News — tags=CARSI; relevance=0.8; actionability=0.69; compliance_risk=0.0; source=https://www.repairerdrivennews.com/2026/05/22/stellantis-and-jlr-sign-mou-for-product-development-in-the-u-s/
- READY_FOR_DRAFT: AASP/NJ Plans June 24 Shop Owner Seminar on Appraisal Rights, Claim Strategies — CollisionWeek — tags=CARSI; relevance=0.92; actionability=0.57; compliance_risk=0.0; source=https://collisionweek.com/2026/05/26/aasp-nj-plans-june-24-shop-owner-seminar-appraisal-rights-claim-strategies/?utm_source=rss&utm_medium=rss&utm_campaign=aasp-nj-plans-june-24-shop-owner-seminar-appraisal-rights-claim-strategies
- READY_FOR_DRAFT: Rytech Restoration Expands to Full-Service Restoration — Cleanfax Restoration — tags=RestoreAssist; relevance=1.0; actionability=0.4; compliance_risk=0.0; source=https://cleanfax.com/rytech-restoration-expands-to-full-service-restoration/
- READY_FOR_DRAFT: Register: Risky Future AI Tools for Embedded Platforms ‘Demo Day’ on May 27 — Insurance Journal — tags=CARSI, RestoreAssist; relevance=0.9; actionability=0.54; compliance_risk=0.0; source=https://www.insurancejournal.com/news/national/2026/05/26/871340.htm
