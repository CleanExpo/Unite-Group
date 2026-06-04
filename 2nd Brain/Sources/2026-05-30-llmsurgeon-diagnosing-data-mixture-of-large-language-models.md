---
ingest_id: af267e92efbe3f7a
title: LLMSurgeon: Diagnosing Data Mixture of Large Language Models
source_url: https://arxiv.org/abs/2605.30348v1
source_type: peer_reviewed_preprint_or_paper
source_date: 2026-05-28
trust_level: med
product_tags: ['Unite-Group', 'Synthex']
suggested_action: feature
priority_score: 63
product_relevance: 0.0
actionability: 0.3
compliance_risk: 0.0
route: READY_FOR_DRAFT
ingested_at: 2026-05-30T22:56:21.666045+10:00
---

# LLMSurgeon: Diagnosing Data Mixture of Large Language Models

Source: https://arxiv.org/abs/2605.30348v1  
Source type: peer_reviewed_preprint_or_paper  
Source date: 2026-05-28  
Trust level: med  
Product tags: Unite-Group, Synthex  
Priority score: 63  
Product relevance: 0.0  
Actionability: 0.3  
Compliance risk: 0.0  
Route: READY_FOR_DRAFT

## E-E-A-T relevance note
MED trust peer reviewed preprint or paper; use only with citation to https://arxiv.org/abs/2605.30348v1. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- The pretraining data mixture of Large Language Models (LLMs) constitutes their "digital DNA", shaping model behaviors, capabilities, and failure modes.
- Yet this composition is rarely disclosed, making post-hoc auditing of data combination or provenance difficult.
- In this work, we formalize $\textbf{Data Mixture Surgery (DMS)}$: given only generated text from a target LLM, estimate the domain-level distribution of its pretraining corpus under a predefined taxonomy.
- We propose $\textbf{LLMSurgeon}$, a strong framework that casts DMS as an inverse problem under the label-shift assumption.

## Suggested Nexus action
- Type: feature
- Recommendation: Convert this cited source into a READY_FOR_DRAFT item for Unite-Group, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> The pretraining data mixture of Large Language Models (LLMs) constitutes their "digital DNA", shaping model behaviors, capabilities, and failure modes. Yet this composition is rarely disclosed, making post-hoc auditing of data combination or provenance difficult. In this work, we formalize $\textbf{Data Mixture Surgery (DMS)}$: given only generated text from a target LLM, estimate the domain-level distribution of its pretraining corpus under a predefined taxonomy. We propose $\textbf{LLMSurgeon}$, a strong framework that casts DMS as an inverse problem under the label-shift assumption. Rather than directly aggregating classifier outputs, LLMSurgeon estimates a calibrated $\textit{soft}$ confusion matrix and solves a constrained inverse problem to correct systematic domain confusion and recover the latent mixture prior. To evaluate, we introduce $\textbf{LLMScan}$, a recipe-verifiable eva
