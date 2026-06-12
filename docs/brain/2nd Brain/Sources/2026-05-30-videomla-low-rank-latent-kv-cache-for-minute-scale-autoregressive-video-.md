---
ingest_id: c4992a06cc7865ad
title: VideoMLA: Low-Rank Latent KV Cache for Minute-Scale Autoregressive Video Diffusion
source_url: https://arxiv.org/abs/2605.30351v1
source_type: peer_reviewed_preprint_or_paper
source_date: 2026-05-28
trust_level: med
product_tags: ['Unite-Group']
suggested_action: content
priority_score: 65
product_relevance: 0.0
actionability: 0.42
compliance_risk: 0.0
route: READY_FOR_DRAFT
ingested_at: 2026-05-30T14:54:54.683077+10:00
---

# VideoMLA: Low-Rank Latent KV Cache for Minute-Scale Autoregressive Video Diffusion

Source: https://arxiv.org/abs/2605.30351v1  
Source type: peer_reviewed_preprint_or_paper  
Source date: 2026-05-28  
Trust level: med  
Product tags: Unite-Group  
Priority score: 65  
Product relevance: 0.0  
Actionability: 0.42  
Compliance risk: 0.0  
Route: READY_FOR_DRAFT

## E-E-A-T relevance note
MED trust peer reviewed preprint or paper; use only with citation to https://arxiv.org/abs/2605.30351v1. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- Long-rollout causal video diffusion has converged on a fixed-size sliding-window KV cache, with recent progress innovating within this layout by changing which tokens occupy the window or how their positions are encoded.
- The per-head KV layout itself, a dominant contributor to streaming memory and latency, has been mostly left unchanged.
- In this paper, we present the first study of Multi-Head Latent Attention (MLA) in video diffusion.
- VideoMLA replaces per-head keys and values with a shared low-rank content latent and a shared decoupled 3D-RoPE positional key, reducing per-token KV memory by 92.7% at every cached layer.

## Suggested Nexus action
- Type: content
- Recommendation: Convert this cited source into a READY_FOR_DRAFT item for Unite-Group; do not publish or ship without human/product review.

## Source summary excerpt
> Long-rollout causal video diffusion has converged on a fixed-size sliding-window KV cache, with recent progress innovating within this layout by changing which tokens occupy the window or how their positions are encoded. The per-head KV layout itself, a dominant contributor to streaming memory and latency, has been mostly left unchanged. In this paper, we present the first study of Multi-Head Latent Attention (MLA) in video diffusion. VideoMLA replaces per-head keys and values with a shared low-rank content latent and a shared decoupled 3D-RoPE positional key, reducing per-token KV memory by 92.7% at every cached layer. We further investigate why MLA succeeds in video diffusion even though the spectral assumption often used to motivate it in language models does not hold: pretrained video attention is not low-rank, with 99%-energy effective rank far above any practical latent dimension. 
