---
ingest_id: 897f1a33cfa90370
title: Mitigating Perceptual Judgment Bias in Multimodal LLM-as-a-Judge via Perceptual Perturbation and Reward Modeling
source_url: https://arxiv.org/abs/2606.02578v1
source_type: peer_reviewed_preprint_or_paper
source_date: 2026-06-01
trust_level: med
product_tags: ['Unite-Group', 'Synthex']
suggested_action: feature
priority_score: 63
product_relevance: 0.0
actionability: 0.3
compliance_risk: 0.0
route: READY_FOR_DRAFT
ingested_at: 2026-06-02T16:21:48.078575+10:00
---

# Mitigating Perceptual Judgment Bias in Multimodal LLM-as-a-Judge via Perceptual Perturbation and Reward Modeling

Source: https://arxiv.org/abs/2606.02578v1  
Source type: peer_reviewed_preprint_or_paper  
Source date: 2026-06-01  
Trust level: med  
Product tags: Unite-Group, Synthex  
Priority score: 63  
Product relevance: 0.0  
Actionability: 0.3  
Compliance risk: 0.0  
Route: READY_FOR_DRAFT

## E-E-A-T relevance note
MED trust peer reviewed preprint or paper; use only with citation to https://arxiv.org/abs/2606.02578v1. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- We identify and systematically analyze this phenomenon, which we term Perceptual Judgment Bias.
- Through controlled visual perturbations, existing multimodal judges frequently anchor on the response text instead of their own visual perception, leading to inconsistent and non-verifiable evaluations.
- To address this issue, we introduce the Perceptually Perturbed Judgment Dataset, which constructs minimally edited counterfactual responses that isolate perceptual errors and enable verifiable supervision.
- Building on this dataset, we develop a unified training framework that combines a structured GRPO-based reward with a batch-ranking objective, achieving coherent global ordering without explicit pairwise labels.

## Suggested Nexus action
- Type: feature
- Recommendation: Convert this cited source into a READY_FOR_DRAFT item for Unite-Group, Synthex; do not publish or ship without human/product review.

## Source summary excerpt
> Recent multimodal large language models have demonstrated strong reasoning ability, yet their reliability as automated evaluators remains limited by a critical weakness: when visual evidence conflicts with textual cues, MLLM judges tend to reward plausible narratives over perceptually correct answers. We identify and systematically analyze this phenomenon, which we term Perceptual Judgment Bias. Through controlled visual perturbations, existing multimodal judges frequently anchor on the response text instead of their own visual perception, leading to inconsistent and non-verifiable evaluations. To address this issue, we introduce the Perceptually Perturbed Judgment Dataset, which constructs minimally edited counterfactual responses that isolate perceptual errors and enable verifiable supervision. Building on this dataset, we develop a unified training framework that combines a structured
