---
ingest_id: af741e667a9a4721
title: STRIDE: Training Data Attribution via Sparse Recovery from Subset Perturbations
source_url: https://arxiv.org/abs/2606.05165v1
source_type: peer_reviewed_preprint_or_paper
source_date: 2026-06-03
trust_level: med
product_tags: ['CARSI', 'Unite-Group', 'Synthex']
suggested_action: risk
priority_score: 75
product_relevance: 0.51
actionability: 0.39
compliance_risk: 0.15
route: READY_FOR_DRAFT
ingested_at: 2026-06-04T15:30:21.658295+10:00
---

# STRIDE: Training Data Attribution via Sparse Recovery from Subset Perturbations

Source: https://arxiv.org/abs/2606.05165v1  
Source type: peer_reviewed_preprint_or_paper  
Source date: 2026-06-03  
Trust level: med  
Product tags: CARSI, Unite-Group, Synthex  
Priority score: 75  
Product relevance: 0.51  
Actionability: 0.39  
Compliance risk: 0.15  
Route: READY_FOR_DRAFT

## E-E-A-T relevance note
MED trust peer reviewed preprint or paper; use only with citation to https://arxiv.org/abs/2606.05165v1. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- Training Data Attribution (TDA) seeks to trace a model's predictions back to its training data.
- The gold standard for TDA relies on causal interventions, observing how a model changes when data is added or removed, but repeated retraining is computationally challenging for Large Language Models (LLMs).
- Consequently, most approaches approximate this effect in the parameter space using gradients.
- However, tracking gradients across billions of parameters is not only prohibitively expensive but relies on local approximations.

## Suggested Nexus action
- Type: risk
- Recommendation: Convert this cited source into a READY_FOR_DRAFT item for CARSI, Unite-Group, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> Training Data Attribution (TDA) seeks to trace a model's predictions back to its training data. The gold standard for TDA relies on causal interventions, observing how a model changes when data is added or removed, but repeated retraining is computationally challenging for Large Language Models (LLMs). Consequently, most approaches approximate this effect in the parameter space using gradients. However, tracking gradients across billions of parameters is not only prohibitively expensive but relies on local approximations. In this work, we propose a shift: rather than estimating parameter changes, we model the functional effect of training data in the activation space. We introduce STRIDE (Steering-based Training Data Influence Decomposition), a framework that formulates TDA as a sparse recovery problem in the spirit of compressive sensing. STRIDE learns lightweight "steering operators" t
