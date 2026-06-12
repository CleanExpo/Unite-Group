---
type: wiki
updated: 2026-05-14
researcher: Medical AI
source: Sources/The biggest AI breakthrough in medicine & drug discovery.md
---

# Research — MAMMAL Biology Foundation Model (relevance triage)

## What the source actually describes

**MAMMAL** — a biology foundation model from IBM Research (Nature paper s44386-026-00047-4, May 2026). One unified transformer trained on 2B samples spanning small molecules (SMILES), proteins, antibodies, and gene-expression data via a **modular tokenizer** (sub-dictionaries per domain merged into one shared embedding space).

Results that matter to the field:
- Beats specialist models on 11/11 drug-discovery benchmarks (incl. MoleFormer on BBBP + ClinTox).
- Beats **AlphaFold 3** on antibody-target binding (5/7 targets) — wins on intrinsically disordered regions (30-40% of human proteins that AlphaFold's static-snapshot training cannot model).
- Predicted carfilzomib (an approved blood-cancer drug) as potent against solid tumours — physical lab experiments confirmed the ranking across 95% of 805 cancer cell lines. Genuine drug-repurposing discovery.
- +19% improvement on CDR-H3 antibody finger generation vs. specialists.

## Relevance triage for Phill's portfolio

### 🔴 Direct medical / pharma — SKIP
Phill has zero pharma, biotech, oncology, or drug-discovery clients. ATIA / NRPG / Bulcs / DR / CCW / RA / CARSI / Synthex have no path to monetise drug discovery. Resist over-fitting.

### 🟡 IAQ / building-biology angle (Bulcs Holdings, [[iaq-building-science-initiative]]) — WEAK, do not pursue
MAMMAL operates at **gene → protein → small-molecule** scale. Indoor air quality operates at **VOC concentration → ventilation rates → mould spore counts → occupant symptoms** scale. The two domains share the word "biology" and nothing else. There is no credible bridge from MAMMAL's antibody-CDR generation to Bulcs' ventilation distribution business or Ivi's IICRC/ASTM IAQ work. Writing an IAQ Magazine piece linking the two would be the exact "AI slop" Phill rejects ([[design-preferences]]). **Decline.**

### 🟢 Methodology transfer to Phill's swarm — ONE useful lesson
The MAMMAL result reframes a current swarm-architecture decision: **a multimodal generalist trained across related domains beats a hyper-specialist inside the specialist's own domain**, because the cross-domain relationships are themselves signal. Translated to Pi-CEO:
- Margot + Pi-CEO Board reading across Brain-1 (founder/strategy) + Brain-2 (portfolio ops) + Linear + Supabase + Hermes simultaneously will likely out-perform per-domain agents that only see one slice — even on per-domain tasks.
- Validates the existing three-layer architecture ([[agency-hierarchy]]) and the wiki-first read pattern.
- Argues against fragmenting Margot into per-business specialists.

This is a directional confirmation, not new infra. **No build change required.**

## Proposed wiki updates

1. **`agency-hierarchy.md`** — add one line under the rationale: "Multimodal generalists outperform specialists when domains are causally linked (cf. MAMMAL, Nature 2026)." Cross-link this page.
2. **No update** to [[bulcs-holdings]], [[iaq-building-science-initiative]], [[nrpg]], [[disaster-recovery]], [[master-plan-2b-by-2028-v3]]. The source does not move any of those theses.

## Proposed infra / content / SEO changes

**None.** Specifically:
- No IAQ Magazine blog post — no credible link, would be slop.
- No NRPG positioning shift — drug discovery is outside trades scope.
- No swarm refactor — directional confirmation only.

## One-line verdict

Fascinating paper, genuine scientific breakthrough, **not actionable** for the Unite-Group portfolio beyond a single confirmatory note in [[agency-hierarchy]]. File and move on.

---
*Researcher: Medical AI*
