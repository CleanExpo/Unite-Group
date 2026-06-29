# Local Agentic-Harness Assessment — Mac mini M4 (10-core, 24 GB)

**2026-06-30 · coexisting with the RestoreAssist workload**
**Usable RAM budget assumed: ~12–16 GB** (macOS + RestoreAssist consume the rest of the 24 GB; the local model + its KV cache must live inside this).

> Companion to [openshell-agentic-blueprint.md](./openshell-agentic-blueprint.md): the local
> harness is the Tier-0 / local-Ollama overflow lane in that blueprint's model-cost strategy.

## 1. One-line verdicts

- **Ornith-1.0 9B:** RUN IT — verified real, MIT-licensed, tool-calling agentic coding model; the only Ornith variant that comfortably fits the budget. Use the **MLX 4-bit** quant.
- **Ornith-1.0 31B-dense:** DON'T — physically tight and far too slow (dense, all 31B active/token); worst fit of the three.
- **Ornith-1.0 35B-MoE:** DON'T (on this box, while RestoreAssist runs) — best quality/speed-per-token of the family, but its full weight set (~21 GB at Q4) must stay resident and blows the coexistence budget.
- **LM Studio:** USE IT — current, OpenAI-compatible local server with first-class tool/function calling, JSON-schema structured output, an `lms` headless CLI, and llama.cpp + MLX engines.

## 2. Ornith-1.0 family — existence check & findings

**Existence: CONFIRMED.** Released **25 June 2026** by **DeepReinforce AI** — MIT-licensed, open-source "self-scaffolding" agentic-coding LLMs in four sizes: **9B dense, 31B dense, 35B MoE, 397B MoE**.
- Model card: https://huggingface.co/deepreinforce-ai/Ornith-1.0-9B
- Collection: https://huggingface.co/collections/deepreinforce-ai/ornith-10
- Vendor blog: https://deep-reinforce.com/ornith_1_0.html
- Coverage: https://www.marktechpost.com/2026/06/25/deepreinforce-releases-ornith-1-0-an-open-source-coding-model-family-that-learns-its-own-rl-scaffolds/

### Ornith-1.0 9B (dense)
| Property | Value |
|---|---|
| Params | ~9B dense (~19 GB bf16) |
| Context | 262,144 (256K) |
| Instruction-tuned | Yes; reasoning model — emits `<think>…</think>` before answer |
| Tool calling | Yes — OpenAI-style `tool_calls`; reasoning surfaced in `reasoning_content` |
| Structured output | Reasoning-block separation; works with OpenAI-compatible JSON tooling |
| License | MIT, no regional limits |
| Base arch | **Discrepancy:** HF GGUF card says "post-trained on Qwen 3.5"; MarkTechPost says Gemma 4. Unverified. |
| SWE-bench Verified | **69.4** |
| Terminal-Bench 2.1 | 43.1 (Terminus-2) / 40.6 (Claude Code harness) |

**Quantizations (official GGUF):** Q4_K_M 5.63 GB · Q5_K_M 6.47 GB · Q6_K 7.36 GB · Q8_0 9.53 GB · BF16 17.9 GB.
**MLX builds:** 4-bit (`pavantippannagari/Ornith-1.0-9B-mlx-4Bit`), 8-bit, bf16 (mlx-community).

**Fit:** Q4 weights ~5.6 GB (MLX ~6.3 GB) leave 6–10 GB for KV cache + headroom — comfortable. **Do NOT use the full 256K context** — cap to ~16–32K so KV cache stays inside budget.

**Speed (base M4, ~120 GB/s, bandwidth-bound):** comparable 8–9B models run ~28–35 tok/s via MLX on M4 24 GB; realistic for Ornith 9B Q4/MLX **~20–30 tok/s** (Q8 ~10–15). Caveat: reasoning `<think>` blocks burn tokens before the answer, so effective per-step latency is higher than raw tok/s implies.

**Verdict:** Worth running as the local agentic harness — sweet-spot fit, right capabilities, strong 69.4 SWE-bench for a 9B. Bench against **Qwen3.5-Coder 7–14B** if you want a non-reasoning / better-documented-tool-use option.

### Ornith-1.0 31B-dense — does NOT fit
- Card: https://huggingface.co/deepreinforce-ai/Ornith-1.0-31B
- Memory: Q4 ≈ 18–20 GB weights alone — does not fit at Q4 on 24 GB with RestoreAssist; Q3 (~14–15 GB) nears budget but leaves nothing for KV cache and degrades a coding model.
- Speed: dense → all 31B read per token → ~3–6 tok/s. Too slow for autonomous loops.
- **Verdict:** Worst fit — same footprint as the 35B MoE but ~an order of magnitude slower per token. Avoid.

### Ornith-1.0 35B-MoE — best quality, but does NOT fit alongside RestoreAssist
- Card: https://huggingface.co/deepreinforce-ai/Ornith-1.0-35B
- Architecture: 35B total, **~3B active per token** (256 routed experts, 8 active + 1 shared, 40 layers). Base: Qwen 3.5.
- **MoE distinction:** memory = total resident weights (all experts loaded); speed = active params (~3B). So it would be *fast* if it fit — but it must hold the full weight set.
- Memory: Q4_K_M ≈ **21.2 GB resident** — exceeds 24 GB once macOS + RestoreAssist + KV cache are added. Q3 (~16–17 GB) borderline only with RestoreAssist off and tiny context.
- Quality: Terminal-Bench 2.1 **64.2** vs the 9B's 43.1 — a large jump.
- **Verdict:** Best quality-and-speed-per-token of the family, but the resident-weight footprint makes it unviable on 24 GB while RestoreAssist runs. Revisit on a 32–64 GB Mac, or if RestoreAssist moves off-box.

### Cross-variant ranking (THIS 24 GB Mac mini, coexisting with RestoreAssist)
| Rank | Variant | Fit (≤12–16 GB usable) | Speed on M4 | Tool/agentic quality | Net |
|---|---|---|---|---|---|
| **1** | **9B dense** | ✅ ~5.6 GB Q4, room for context | ✅ ~20–30 tok/s | Good (SWE-V 69.4, tool calls) | **Recommended** |
| 2 | 35B MoE | ❌ ~21 GB resident at Q4 | (would be fast, ~3B active) | Best (TB 64.2) | Only on a bigger Mac |
| 3 | 31B dense | ❌ ~18–20 GB at Q4 | ❌ ~3–6 tok/s | High but unusable speed | Avoid |

**Plainly: neither larger variant realistically fits 24 GB with RestoreAssist resident. Run the 9B.**

## 3. LM Studio — tool calling & server story (the make-or-break)

- **Tool/function calling: YES** — since 0.3.6, via OpenAI-compatible `/v1/chat/completions` + `/v1/responses`, same schema as OpenAI Function Calling (https://lmstudio.ai/docs/developer/openai-compat/tools, https://lmstudio.ai/blog/lmstudio-v0.3.6, https://lmstudio.ai/blog/lmstudio-v0.3.29).
- **Structured output: YES** — JSON-schema-constrained (https://lmstudio.ai/docs/developer). Also exposes Anthropic-compatible Messages flows.
- **Engine:** llama.cpp **and** Apple MLX (https://github.com/lmstudio-ai/mlx-engine). Use MLX here for max single-stream speed.
- **Headless:** `lms` CLI — daemon mgmt, `lms get <model>`, programmatic load, server start; no GUI needed.
- **Concurrency caveat:** continuous batching (default Max Concurrent Predictions = 4) is **llama.cpp-only; MLX "coming soon"** (https://lmstudio.ai/docs/app/advanced/parallel-requests). So MLX = fastest single stream / no parallelism yet; llama.cpp = parallel but slower per token. Single agent loop → MLX; multiple concurrent agents → llama.cpp engine.
- **Slots in cleanly:** point any OpenAI-compatible client / OpenRouter-style local route at `http://localhost:1234/v1` with a dummy key.
- **vs alternatives:** Ollama (simplest headless, weaker tooling polish); llama.cpp server (most control/concurrency, no MLX); MLX directly (fastest, but build your own server). Choose **LM Studio** for MLX speed **plus** turnkey OpenAI/Anthropic-compatible server + tool calling + JSON schema + `lms` headless in one package.

## 4. Recommended setup

- **Model:** Ornith-1.0 **9B**
- **Quant:** **MLX 4-bit** (`pavantippannagari/Ornith-1.0-9B-mlx-4Bit`, ~6.3 GB); fall back to **GGUF Q4_K_M** (5.63 GB) if you need llama.cpp parallelism. Q8 only if Q4 quality regresses and RAM allows.
- **Runtime:** LM Studio + MLX engine, headless via `lms server start`, exposing `http://localhost:1234/v1` (run under a LaunchAgent to survive reboots).
- **Config:** context ~16–32K (not 256K); temp 0.6 / top_p 0.95 / top_k 20 per the card; limit `<think>` on low-stakes steps. Single agent → MLX; multi-agent → llama.cpp (Max Concurrent 2–4).

## 5. Cost / offload angle

Targets **high-volume, low-stakes** agent work — file edits, scaffolding, lint/test triage, structured extraction, routine tool-call loops. ~20–30 tok/s is fine for bulk grunt steps, too slow for hard reasoning. Can offload the majority of routine agent turns that today hit a paid cloud API for trivial work, with electricity as the only marginal cost. Keep cloud (Claude Max / API) for high-stakes reasoning and final-mile. **Flag:** no published $-per-token offload figure for Ornith; size it by metering your current low-stakes API spend.

## Flags / unverified
- 9B base-architecture conflict (Gemma 4 vs Qwen 3.5) — unresolved.
- No BFCL/tool-use benchmark published for any Ornith variant — format documented, quality not; validate empirically before unattended loops.
- Base-M4 (non-Pro) Ornith-9B tok/s is estimated from comparable 8–9B models + bandwidth math, not a direct benchmark.
- LM Studio MLX continuous batching not yet shipped (llama.cpp only) as of mid-2026 docs.
