# Tier-0 Model Routing — Free & Open-Weight Models on OpenRouter (+ Kimi)

**2026-06-30 · the gathering lane that protects the Claude Max plans**

> Companion to [openshell-agentic-blueprint.md](./openshell-agentic-blueprint.md) §7 (model-cost strategy)
> and the local-harness assessment. Feeds Linear **UNI-2212**.

## Model-Stack Doctrine (the operating frame — IndyDevDan, distilled + STORM-cross-checked 2026-06-30)
Source: 2nd Brain `Wiki/authority-intelligence/model-stack-doctrine-indydevdan-2026-06-30.md`.

**Don't pick a model — pick a model STACK.** Route each job to *the cheapest tier that clears its bar*, on three capability tiers:

| Tier | Models | Role |
|---|---|---|
| **State-of-the-art** | Opus 4.8 (Fable 5 UNREACHABLE) | long-horizon **shipping**, high-stakes synthesis |
| **Workhorse** | GLM-5.2 (A), MiniMax-M3 (B, our OWNED plan), DeepSeek V4-flash | **gathering**, daily-driver, product agents |
| **Lightweight/local** | Ornith-9B / Qwen-class (24GB M4) | private/on-device, unlimited overflow, confidential |

Four rules that enhance our routing:
1. **Trade-off triangle — pick TWO of {performance, speed, cost}.** Opus=perf; MiniMax=cost; Qwen=speed+cost; GLM=speed+perf.
2. **5x cost cliff:** each tier down ≈ 5x cheaper for ~5–10 index points less capability. Cross-checked: GLM-5.2 ~$0.94 → MiniMax-M3 ~$0.30 pay-go → DeepSeek V4-flash ~$0.054.
3. **"Workhorses call tools like Opus but don't SHIP like Opus."** Hard rule: **workhorses GATHER; SOTA SHIPS.** Long-horizon shipping never routes to a workhorse — this is *why* Anthropic-first + Tier-0-gathering-only is correct.
4. **Substitutability = resiliency.** Closed models can be rug-pulled (Fable). **Run 2–3 providers per workhorse model**, never one. Local GLM-class ownership isn't realistic until ~mid-2027; lightweight (Qwen3.6-35B/Gemma 4) is ownable now.

Plus: **engineering agents** (loose token spend, experimentation) vs **product agents** (tokenomics make/break → cheapest model that clears the user bar); and a **B-tier + great prompt/context/harness engineering ≈ an A-tier** — the harness is leverage.

## Bottom line

Free OpenRouter tier is real but capacity-constrained and privacy-unsafe by default. Highest-leverage single move: a **one-time $10 OpenRouter credit purchase**, which raises the free daily cap from 50 → **1,000 requests/day permanently**. Then: a small set of tool-capable free models for the bulk of gathering, **Kimi K2.6 on credits** for hard/long-context multi-step gathering, and **local Ornith-9B** for unlimited overflow and any confidential data. This removes essentially all Tier-0 volume from the Max plans.

## Two corrections to earlier assumptions (both verified)

1. **Daily cap is NOT "200/day."** It is **50/day** (under $10 lifetime credit) and **1,000/day** (with $10+ lifetime credit). [klymentiev](https://klymentiev.com/blog/openrouter-free-tier), [flo2](https://flo2.com/blog/openrouter-free-tier-limits)
2. **Multi-key capacity does NOT stack.** OpenRouter governs capacity *per-account, globally*: *"Making additional accounts or API keys will not affect your rate limits."* Our two keys (Hermes local + Margot prod) on one account share **one** 1,000/day pool — not 2,000. [openrouter limits doc](https://openrouter.ai/docs/api/reference/limits)

## 1. Best FREE models right now (June 2026)

| Model (`:free`) | Context | Tools/JSON | Strength for gathering | Catch |
|---|---|---|---|---|
| `openai/gpt-oss-120b:free` | 131K | Yes | Strongest free all-rounder; clean JSON, reliable tool calls | Contended at peak |
| `openai/gpt-oss-20b:free` | 131K | Yes | Best free *small* — fast classify/route/dedup at low latency | Weak on long synthesis |
| `meta-llama/llama-3.3-70b-instruct:free` | 131K | Yes | Battle-tested summarisation/extraction | Older; weaker long-context recall |
| `qwen/qwen3-coder:free` | **1M** | Yes | SOTA free code/file triage; whole-repo context | Coding-tuned, verbose on prose |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 262K | Yes | Best free long-context general extraction/synthesis | Occasional tool-arg drift |
| `google/gemma-4-31b-it:free` | 262K | Yes (vision) | Screenshot/PDF-image reading, OCR-style extraction | Not for deep reasoning |
| `nvidia/nemotron-3-super-120b-a12b:free` | 1M | Yes | US-built, very long context, agentic tool use | Heavier latency on free pool |

Sources: [free collection](https://openrouter.ai/collections/free-models), [costgoat Jun-2026](https://costgoat.com/pricing/openrouter-free-models). **Universal catch:** 20 RPM hard ceiling, contended capacity, no uptime guarantee, free slugs churn in/out — always build a fallback chain, never pin one slug. [OpenRouter: agents when models disappear](https://openrouter.ai/blog/tutorials/keep-your-agent-running-when-models-disappear/)

## 2. Best LOW-COST paid open-weight fallback (per-M-token)

| Model | Context | In / Out $/M | Tools+JSON | Use for |
|---|---|---|---|---|
| `deepseek/deepseek-v3.2` | 131K | **$0.23 / $0.34** | Yes | **Best price/quality workhorse** + most reliable cheap JSON+tools |
| `meta-llama/llama-3.3-70b-instruct` (paid) | 131K | $0.10 / $0.32 | Yes | Cheapest reliable bulk summarisation |
| `nvidia/nemotron-3-super-120b-a12b` (paid) | 1M | $0.09 / $0.45 | Yes | Cheapest long-context |
| `deepseek/deepseek-v4-flash` | **1M** | **$0.054 / $0.242** | Yes | Frontier agentic (79% SWE-bench) at rock-bottom — use Western host (first-party trains on data) |
| `google/gemma-4-31b-it` (paid) | 262K | $0.20 / $0.20 | Yes (vision) | Cheap multimodal extraction |

Sources: [betonai Jun-2026](https://betonai.net/openrouter-pricing-2026-complete-guide-to-every-model-tier-and-hidden-cost/), [DeepSeek V3.2 page](https://openrouter.ai/deepseek/deepseek-v3.2), [OpenRouter insights Jun-2026](https://openrouter.ai/blog/insights/the-open-weight-models-that-matter-june-2026/).

## 3. Kimi — the SANCTIONED paid tier (founder-approved credits)

`moonshotai/kimi-k2.6` — **262K context**, **~$0.55 in / $3.20 out per M** (third-party refs $0.66/$3.41; prompt caching can cut 60–80%). Long-horizon agentic coding model built for sustained multi-step tool work, with a parallel sub-agent architecture. Tool/JSON implied by design but **not printed on the spec card — live-test before wiring.** [kimi-k2.6 page](https://openrouter.ai/moonshotai/kimi-k2.6), [Moonshot announce](https://x.com/Kimi_Moonshot/status/2046279631482093807). Older `kimi-k2` (0711): 131K, $0.57 / $2.30.

**Kimi over a free model when:** long-horizon multi-step tool loops (5–15 chained calls where free-tier drift/contention would break the chain); large multi-doc synthesis (262K + caching beats stitching free calls); structured extraction from big messy inputs where free JSON is marginal.

**Free model is good enough for:** single-doc summarisation, classification, dedup, intent routing, short JSON, light file triage.

**Privacy:** Moonshot (Chinese-lab) — same data-class gate as free models: public sources only unless on a verified no-train endpoint.

## 4. Routing table (free → paid fallback → local)

| Gathering work type | Primary (FREE) | Paid fallback | Local overflow |
|---|---|---|---|
| Web research fan-out (public) | `gpt-oss-120b:free` | **Kimi K2.6** (long chains) | Ornith-9B |
| Source reading & summarisation | `qwen3-next-80b:free` | `deepseek-v3.2` | Ornith-9B |
| Large multi-doc synthesis | — (too big for reliable free) | **Kimi K2.6** | Ornith-9B (if confidential) |
| Classification / labelling | `gpt-oss-20b:free` | `llama-3.3-70b` paid | Ornith-9B |
| Dedup / near-dup | `gpt-oss-20b:free` | `llama-3.3-70b` paid | **Ornith-9B (default)** |
| Intent routing | `gpt-oss-20b:free` | `deepseek-v3.2` | Ornith-9B |
| Structured extraction (JSON) | `qwen3-next-80b:free` | **`deepseek-v3.2`** | Ornith-9B |
| Light code/file triage | `qwen3-coder:free` (1M) | `deepseek-v4-flash` (1M) | Ornith-9B |
| Multimodal (screenshots/PDF-image) | `gemma-4-31b-it:free` | `minimax-m3` | — |
| Embeddings / retrieval | — | `nemotron-embed` (cheap) | **local (default)** |
| **Confidential / client data** | **NONE** | ZDR no-train endpoint only | **Ornith-9B (default)** |

## 5. Capacity math

Verified caps: **20 RPM; 50 RPD (no credit) → 1,000 RPD with one-time $10 credit, per-account globally.** [klymentiev](https://klymentiev.com/blog/openrouter-free-tier), [limits doc](https://openrouter.ai/docs/api/reference/limits)

- Two keys on one account = **one** 1,000 RPD pool. Two separate accounts *might* give 2× but OpenRouter's "global capacity governance" language says not, and multi-accounting risks enforcement — **do not architect on 2,000 RPD.**
- Realistic: **~1,000 free gathering requests/day** + 20 RPM burst ceiling. At ~1 call/task-step that covers a large share of Tier-0 fan-out. Spillover → Kimi credits (hard/long) and Ornith-9B local (unlimited).
- **Max-plan load removed:** essentially all low-stakes gathering. Binding constraint becomes the 20 RPM burst + Kimi spend, not the daily cap.
- **BYOK lever:** bringing your own provider key grants 1M free BYOK requests/month.

## 6. Privacy / safety (hard rules)

- OpenRouter doesn't train/log by default, **but the effective policy is the UNION of OpenRouter's + the downstream provider's.** [privacy docs](https://openrouter.ai/docs/guides/privacy/data-collection)
- **Many FREE providers require training/logging opt-in to use the free endpoint** → free models are NOT safe for client/proprietary data by default.
- Controls: account has **separate free-vs-paid training toggles**; turn OFF "allow providers that may train" for free models, and use the **ZDR filter** (zero-retention + no-train) for anything sensitive. [ZDR](https://openrouter.ai/docs/guides/features/zdr)
- **Hard rule:** confidential/client/proprietary data NEVER goes to a `:free` endpoint or to Kimi unless on a verified ZDR no-train endpoint — route it to **local Ornith-9B**. Public-web gathering on free/Kimi is fine.

## 7. Top 3 free models to wire THIS WEEK

1. **`openai/gpt-oss-120b:free`** — default gathering brain; reliable tools+JSON, 131K, strong reasoning for tier.
2. **`qwen/qwen3-next-80b-a3b-instruct:free`** — 262K + strong structured output; long-context source-reading workhorse.
3. **`openai/gpt-oss-20b:free`** — fast small model for classify/dedup/route at volume; protects the RPM budget.

Plus the one operational action that beats any model choice: **buy $10 of OpenRouter credit once** to unlock 1,000 RPD. And **smoke-test tool-calling + JSON on each free slug before trusting it** — free variants can lag the paid endpoint.

## Flagged unverified
- Exact tool/JSON support on some free variants (Nemotron Nano, Hermes-3-405b, some Qwen free) — live-test first.
- Whether `moonshotai/kimi-k2.6:free` is a live usable endpoint — appeared in listings, model page didn't confirm.
- Kimi K2.6 exact price ($0.55/$3.20 vs $0.66/$3.41) — confirm on live page at spend time.
- Whether two separate accounts truly stack to 2,000 RPD — OpenRouter language suggests not.
- The limits doc renders numbers as placeholders to logged-out fetches; 20 RPM / 50 / 1,000 / $10 corroborated by multiple dated 2026 third-party sources.
