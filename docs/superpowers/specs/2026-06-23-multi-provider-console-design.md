# Multi-Provider Console — design

> Status: **DRAFT for review** · 23/06/2026 · Locale en-AU
> Brainstorming output (superpowers). Design only — no implementation until approved.
> Grounds on the existing `apps/web/src/lib/provider-pool/` engine (#380/#382) and
> `apps/spec-board/projects/multi-provider-llm-routing/spec.md`.

## Why

The orchestrator agents (autopilot-runner, Margot overnight, the Hermes swarm) that
run the autonomous find→research→spec→build→production loop need **LLM capacity**.
A single Claude account rate-limits under real load — the advisory 429 storm
(22/06) was exactly this. The Console gives the orchestrators a **pooled,
multi-provider** capacity layer they route through, with usage/health visible and
manageable in one place.

## Goal / non-goals

**Goal:** a Console in Mission Control (`apps/web` command-centre) to register,
enable, and monitor LLM providers, backed by the existing `provider-pool/` routing
engine, so orchestrators get capacity-aware routing across providers with
graceful exhaustion handling.

**Non-goal (hard line — will not build):** pooling/rotating **multiple Claude Max
(consumer subscription) OAuth tokens** to multiply throughput past a single
account's rate limit. That circumvents Anthropic's usage policy and puts every
pooled account at ban risk — a single point of failure for the whole org.

**The compliant way to scale Claude capacity** (and what this design supports):
- exactly **one** Claude **Max** account via OAuth (`claude setup-token`), used
  within its limits — the same pattern the autopilot-runner already uses;
- the **Anthropic API** (`ANTHROPIC_API_KEY`, metered/pay-as-you-go) as the
  legitimate, effectively-uncapped Claude scale lane;
- **MiniMax / OpenRouter / Gemini / OpenAI** for high-volume cheaper work.

## Architecture

Reuse the engine; add persistence, UI, and orchestrator wiring. Three new pieces,
no rewrite of the routing logic.

```
 signal/work  ──▶  decideRoute(kind, accounts, quota)   [router.ts — exists]
                        │
                        ├─ route → executeChat(provider, req)   [execute.ts — exists]
                        │            └─ adapters/* per provider  [exists]
                        └─ queue (all providers exhausted)       [exists]
   accounts + quota events  ◀────────  ProviderPoolStore         [repository.ts — exists]
                                          │
                          NEW: provider_accounts + provider_quota_events tables
                                          │
                          NEW: Console UI (command-centre)  ── add/enable/monitor
```

### 1. Data (new — the "DB phase")
Two founder-scoped tables (RLS, `founder_id = auth.uid()`), matching the engine's
`ProviderAccountRow` / `QuotaEvent`:

- `provider_accounts`: `id, founder_id, provider (claude|openai|minimax|gemini|openrouter),
  label, plan (jsonb: {kind:'windowed',caps} | {kind:'prepaid',purchasedUnits}),
  vault_entry_id, enabled, allow_metered, created_at, updated_at`.
- `provider_quota_events`: `id, founder_id, account_id, kind (work kind), units,
  outcome (ok|error|rate_limited), reset_at, created_at`.

Keys live in the **encrypted vault** (`vault.ts` AES-256-GCM, referenced by
`vault_entry_id`) OR an env var (`PROVIDER_ENV_CANDIDATES`) — never stored plaintext,
never logged. The Console writes the key to the vault and stores only the reference.

### 2. Console UI (new — `apps/web` command-centre)
A "Providers" surface:
- **Provider cards** (claude, openai, minimax, gemini, openrouter) — each shows
  enabled state, plan kind, and live pressure/health from `toRuntimeState`.
- **Add account**: paste an API key (→ vault) OR, for Claude, **connect the one Max
  account** via the OAuth token (`CLAUDE_CODE_OAUTH_TOKEN`); set the plan shape
  (windowed caps for subscriptions, purchased units for prepaid).
- **Claude guard**: at most one `claude` account may be of plan-kind
  `windowed`/Max-OAuth; additional Claude capacity is the metered API account.
  The UI refuses to add a second Max-OAuth Claude account (enforces the non-goal).
- **Usage/health**: per-provider windowed + prepaid pressure, next-reset, recent
  outcomes (ok/error/rate_limited), and which work kinds currently route where.

### 3. Orchestrator wiring (new)
Point the orchestrators' LLM calls at `executeChat` / `decideRoute` instead of a
direct single-account client, so they inherit pooled routing + exhaustion→queue.
Start with the lowest-risk consumer (a Margot/cron lane), prove it, then the
autopilot-runner.

## Routing policy (exists — `PROVIDER_PREFERENCE`)
By work kind: `deep_reasoning`/`coding` → claude → openai → minimax → openrouter;
`bulk_text`/`fast_draft`/`scout` → minimax → gemini → openrouter; `video`/`voice`/
`music` → minimax. On all-exhausted → **queue** (never thrash, never silently drop).
High-stakes kinds stay on Claude/GPT; bulk grunt work goes cheap. Overridable per call.

## How this powers the autonomous loop
This Console is the **capacity substrate** for the bigger find→build→production
loop. With it in place, the orchestrators can run unattended without a single
account stalling them. The loop's human-gate model (agreed: **fully autonomous**,
with the hard carve-out that **financial/tax advice, auth, DB schema/migrations,
money movement, and destructive ops always require one-tap founder approval**)
sits above this layer — the Console just keeps the agents fuelled.

## Security
- Keys: encrypted vault only; Console stores references, never values; never logged
  (the engine is already careful — `credentials.ts` "never logs or returns it").
- Founder-scoped + RLS on both tables (single-tenant rule).
- The one Max OAuth token is treated as a top-tier secret (vault, server-side only).
- Audit: account add/enable/disable writes an `audit_log` row (sensitive-config change).

## Testing
- The engine is already unit-tested (`provider-pool/__tests__`). New: store CRUD
  against the DB tables; the Claude-single-Max guard; the Console add/enable flow;
  an integration test that `decideRoute` picks the right provider as pressure rises
  and queues when all are exhausted.

## Open questions for Phill
1. **Which providers do you have keys for** right now (Anthropic API, OpenAI,
   Google, MiniMax, OpenRouter)? The Console supports all five; you enable the real ones.
2. **Max OAuth**: confirm the single-Max-OAuth + Anthropic-API-for-scale shape is
   acceptable (vs the multi-Max pool I won't build).
3. **First orchestrator** to route through the pool — a Margot/cron lane (low risk)
   or straight to the autopilot-runner?

## Decomposition (build order, each its own plan)
1. **DB + migration** (`provider_accounts`, `provider_quota_events`, RLS) + wire
   `makeSupabaseStore` to them.
2. **Console UI** (Providers surface: cards, add-account, vault write, usage/health,
   Claude-single-Max guard).
3. **Orchestrator wiring** (route one lane through `executeChat`, prove, expand).
