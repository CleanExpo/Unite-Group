---
ingest_id: 820e96f46b8c0e1f
title: GMOS: Grounding Moving Object Segmentation in 3D Space and Time
source_url: https://arxiv.org/abs/2605.30352v1
source_type: peer_reviewed_preprint_or_paper
source_date: 2026-05-28
trust_level: med
product_tags: ['Unite-Group']
suggested_action: feature
priority_score: 63
product_relevance: 0.0
actionability: 0.3
compliance_risk: 0.0
route: READY_FOR_DRAFT
ingested_at: 2026-05-30T18:55:39.935733+10:00
---

# GMOS: Grounding Moving Object Segmentation in 3D Space and Time

Source: https://arxiv.org/abs/2605.30352v1  
Source type: peer_reviewed_preprint_or_paper  
Source date: 2026-05-28  
Trust level: med  
Product tags: Unite-Group  
Priority score: 63  
Product relevance: 0.0  
Actionability: 0.3  
Compliance risk: 0.0  
Route: READY_FOR_DRAFT

## E-E-A-T relevance note
MED trust peer reviewed preprint or paper; use only with citation to https://arxiv.org/abs/2605.30352v1. Claims should be framed as source-backed, not as uncited product promises.

## Claims extracted
- Moving Object Segmentation (MOS) aims to discover, segment, and track objects that move independently of the camera.
- GMOS achieves state-of-the-art results across MOS, MOS-I, and Unsupervised VOS benchmarks, while running significantly faster than prior multi-object MOS methods and supporting online inference for streaming deployment.

## Suggested Nexus action
- Type: feature
- Recommendation: Convert this cited source into a READY_FOR_DRAFT item for Unite-Group; do not publish or ship without human/product review.

## Source summary excerpt
> Moving Object Segmentation (MOS) aims to discover, segment, and track objects that move independently of the camera. Current MOS methods, however, exhibit two fundamental limitations: they rely on pre-computed 2D auxiliary modalities such as optical flow or point trajectories that lack 3D geometric information, and they treat motion as a sequence-level attribute, overlooking the instantaneous motion state of each object. We address both by grounding MOS in 3D space and time, and propose GMOS, a framework that operates directly on RGB video to produce 3D-aware, temporally fine-grained segmentation of multiple moving objects, alongside a foreground--background variant GMOS-S for faster deployment. To support training and evaluation in this regime, we curate GMOS-2K, a dataset of 2,210 real-world videos with per-object temporal motion annotations drawn from five established Video Object Seg
