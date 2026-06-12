---
type: wiki
updated: 2026-05-14
researcher: HF Agent Trains
status: 🟡 EVALUATE (narrow tasks only)
---

# Research — HuggingFace "Agent Trains Models" (Merve Noyan)

Source: `Sources/Your Agent Can Now Train Models — Merve Noyan, Hugging Face.md` (AI Engineer talk, 2026-05-14).

## What was shown

**Merve Noyan** — HF open-source team. Demo: tells Claude Code "train Qwen2-VL on llava-instruct-mix"; agent calculates VRAM, picks an instance, kicks the job, returns a checkpoint on the Hub. Mechanism = installable **HF Skills**:

- **LLM trainer skill** — fine-tune LLMs/VLMs by name (TRL/PEFT under the hood, runs on HF Jobs OR local).
- **HF CLI / Dataset / Gradio / Vision skills** — repos, dataset viewer, demo spaces, object-detection/segmentation finetune.
- **Traces dataset type** — push Claude Code / Codex / Pi traces to Hub, parsed viewer, optionally train on them.
- **Benchmark datasets** — filter models by SWE-bench / AIME / OCRBench directly on Hub.
- **Inference Providers + Jobs + Buckets** — routed multi-provider inference, one-off GPU jobs, cheap S3.

Headline OSS model: **GLM-5.1** (top of Artificial Analysis index, beating closed). She uses GLM-5.1 inside **Hermes Agent** — same Hermes Phill is already running.

## Scoring vs Phill's stack

| Capability | Verdict | Why |
|---|---|---|
| Fine-tune VLM/LLM via agent prompt | 🟡 EVALUATE | Useful, but HF Jobs = paid GPU rental. Phill prefers to own. |
| Train on `preamble_trainer.py` corpus | 🔴 SKIP for ≥6 months | Daily preambles started landing recently. <1k examples ≠ training signal. `[[simplicity-first]]` says wait. |
| Train traces / Linear-ticket classifier | 🟢 ADOPT (Q3 2026) | Once Hermes Kanban ships and we have 10k+ ticket→outcome pairs, a narrow classifier (priority, agent-routing, dup-detection) is a clean small-model job. |
| Benchmark datasets for picking next OSS model | 🟢 ADOPT NOW | Free, zero infra. Already useful for [[gemma4-cost-strategy]] selection. |
| HF Traces dataset type for Pi-CEO swarm | 🟢 ADOPT NOW | Push agent traces → Hub private repo → free, parsed viewer → corpus we own. Foundation for the future fine-tune. |
| Inference Providers as fallback router | 🟡 EVALUATE | Composio + Vercel AI Gateway already cover routing — duplicative. |
| Train a *frontier-replacement* swarm model | 🔴 SKIP | `[[quality-over-quantity]]` — fine-tune ≠ Claude/Gemini for reasoning. Narrow tasks only. |

## "Phill's data → Phill's model" thesis (when ripe)

Pi-CEO emits high-signal corpus: **preambles** (compressed worldview), Linear ticket→PR→outcome tuples, wiki edits, swarm trace JSONs. A 7B base (Qwen-2.5-7B / Gemma-3-9B) fine-tuned on this would NOT replace Claude for reasoning — it dominates on three narrow tasks where latency/cost matter:

1. **Preamble compression** — raw session → 200-token preamble. Today: Gemini-3.1-Flash ~$0.001/call × thousands. Local 7B = $0 marginal, sub-second.
2. **Ticket triage** — Linear ticket → {agent_owner, priority, est_effort, dup_id?}. Pure classification.
3. **Trace summarisation** — agent run → 1-paragraph outcome + tags. Volume-heavy batch.

## Cheapest first experiment (defer to Q3 2026)

When trace corpus ≥ 5k labelled examples:

1. Export 30 days of preambles + tickets via HF Traces skill → private Hub dataset.
2. `accelerate` + PEFT LoRA on Qwen-2.5-7B on Mac mini (M-series unified memory 16–64 GB; LoRA 7B fits ~12 GB at 4-bit). ~4–8 hr.
3. Eval vs Gemini-3.1-Flash on held-out preamble task. Pass = ≥ 90% quality at < 5% cost.
4. If pass, route preamble_trainer to local; keep frontier for reasoning.

**Cost: $0 (own hardware).** Failure mode = Mac mini I/O thrash; mitigation = overnight cron.

## Failure modes — when this does NOT pay off

- Corpus < 5k examples → fine-tune underfits noise, ships worse than zero-shot frontier.
- Task is reasoning-heavy (board deliberation, code synthesis) → small model worse on EVERY axis. Never fine-tune for these.
- Frontier price drops faster than fine-tune dev time → economics flip. Re-evaluate quarterly.
- Hermes Kanban migration question (open from [[hermes-v0.13.0-survey-2026-05-14]]) — if Pi-CEO moves to Hermes Kanban, trace schema changes; don't train before that lands.

## Wiki updates

- [[pi-ceo-architecture]] — append "Future: narrow-task local model for preamble/triage/trace-summary (Q3 2026, needs 5k corpus)".
- [[gemma4-cost-strategy]] — add GLM-5.1 as benchmark-leading OSS alternative.
- [[hermes-agent]] — Merve confirmed Hermes Agent is mainstream OSS recommendation; validates Phill's bet.
- [[tech-drops-q2-2026]] — add HF Traces dataset type, HF Skills, benchmark datasets.
- [[index.md]] — add this page under Research.

## Linear tickets to propose

1. **PI-CEO: enable HF Traces push** — write swarm trace → private HF dataset nightly. ~1 day. Foundation for future fine-tune. Cost: $0.
2. **PI-CEO: trace-corpus growth dashboard** — count labelled examples by task type; alert at 5k threshold. Triggers fine-tune experiment.
3. **Margot: ingest HF Benchmark Datasets into model-selection** — when comparing OSS models, query OCRBench / SWE-bench filtered list directly.

DEFER (do not file yet): preamble-trainer fine-tune ticket. Re-raise Q3 2026.

— Researcher: HF Agent Trains
