---
ingest_id: 50bd6756ec7266ac
title: Stateful Online Monitoring Catches Distributed Agent Attacks
source_url: https://arxiv.org/abs/2605.31593v1
source_type: peer_reviewed_preprint_or_paper
source_date: 2026-05-29
trust_level: med
product_tags: ['Unite-Group', 'Synthex']
suggested_action: risk
priority_score: 62
product_relevance: 0.0
actionability: 0.4
compliance_risk: 0.15
route: READY_FOR_DRAFT
ingested_at: 2026-06-01T16:09:07.297613+10:00
---

# Stateful Online Monitoring Catches Distributed Agent Attacks

Source: https://arxiv.org/abs/2605.31593v1  
Source type: peer_reviewed_preprint_or_paper  
Source date: 2026-05-29  
Trust level: med  
Product tags: Unite-Group, Synthex  
Priority score: 62  
Product relevance: 0.0  
Actionability: 0.4  
Compliance risk: 0.15  
Route: READY_FOR_DRAFT

## E-E-A-T relevance note
MED trust peer reviewed preprint or paper; use only with citation to https://arxiv.org/abs/2605.31593v1. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- Language models can find thousands of severe software vulnerabilities, and agents are increasingly being misused for cyberattacks.
- To avoid detection, attackers frequently distribute their misuse, splitting a harmful task across many user accounts so each individual transcript looks benign.
- Because safety monitors score only one agent context at a time, they are structurally blind to misuse that is only visible in aggregate, across many accounts.
- Towards a defense, we develop an online stateful monitor that uses real-time clustering to collect weak suspiciousness signals across many agent transcripts, and escalates only rarely to a language model that flags misuse across user accounts.

## Suggested Nexus action
- Type: risk
- Recommendation: Convert this cited source into a READY_FOR_DRAFT item for Unite-Group, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> Language models can find thousands of severe software vulnerabilities, and agents are increasingly being misused for cyberattacks. To avoid detection, attackers frequently distribute their misuse, splitting a harmful task across many user accounts so each individual transcript looks benign. Because safety monitors score only one agent context at a time, they are structurally blind to misuse that is only visible in aggregate, across many accounts. We show this gap is real by building, to our knowledge, the first distributed agent attack, a multi-agent scaffold that completes hard cybersecurity tasks while hiding the harmful objective across subagents with limited contexts, evading a standard monitor that catches it only a fifth as often as prior agent attacks. Towards a defense, we develop an online stateful monitor that uses real-time clustering to collect weak suspiciousness signals acr
