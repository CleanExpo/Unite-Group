# Spec — Multi-Provider LLM Pool + Autonomous Router (Mission Control)

> Method: `fable-engine`. Evidence Standard tags throughout. **Stops at the human gate — nothing builds without Phill's approval.**
> Author: autopilot session, 21/06/2026.

```
[STATUS] finish-line: locked — see §1
[STATUS] channel:source: done — repo surveyed (provider cockpit, vault, autopilot seam, AI router)
[STATUS] channel:prior-work: done — UNI-2135/2146 provider cockpit; vault; autopilot runner #374–#379
[STATUS] channel:web: done — Anthropic, OpenAI/Codex, MiniMax auth + limits + ToS verified with URLs
[STATUS] synthesis: done
[STATUS] gate: awaiting approval
```

---

## 0. Provider reality table (the verified ground truth)

| Provider | Auth for headless | Billing model | Best-use lane | Rate envelope | ToS for automated backend use |
|---|---|---|---|---|---|
| **Claude Max** ×N | `claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN` (1-yr token) `[VERIFIED]` | Subscription (flat, no per-token) | Deep reasoning, premium coding | 5-hr rolling **+** weekly caps (all-model + Sonnet); shared with web/app `[VERIFIED]` | Single own-account headless = blessed by Claude Code docs; **pooling/rotating accounts to dodge limits = violates Consumer Terms §2/§3/§3(7)** `[VERIFIED]` |
| **OpenAI / ChatGPT Pro** | `codex login` (browser OAuth; device-auth beta) → `codex exec` `[VERIFIED]` | Subscription (Pro $100 Codex-focused / $200) | Coding (Codex) | 5-hr **+** weekly windows `[VERIFIED]` | Own coding = supported; **backend/high-volume or cap-dodging = prohibited; OpenAI steers automation → API keys** `[VERIFIED]` |
| **MiniMax** | `MINIMAX_API_KEY` (+ `GroupId` for media) `[VERIFIED]` | **Prepaid credits** (your "year") — drawdown, overage opt-in only `[VERIFIED]` | Cheap long-context text (M-series), **video (Hailuo), voice/TTS (Speech-02), music** | 200 RPM / 10M TPM (M3); dynamic at peak `[VERIFIED]` | API-key + prepaid = **fully compliant, no surprise spend** `[VERIFIED]` |
| Gemini / OpenRouter | API key (already modelled in cockpit) `[VERIFIED]` | API / credits | Fast drafting / fallback aggregator | per-provider | Compliant (API) |

**The decisive split:** MiniMax (prepaid API) is the spend-safe, ToS-clean workhorse. Claude/OpenAI subscriptions are legitimate **per single account**; the *multi-account pooling to beat rate limits* is the one piece that's against ToS.

---

## 0a. Decisions locked (21/06/2026 — Phill)

- **Q1 → compliant single-account router** (my recommendation). No multi-account rotation. Context: this is Phill's **own internal CRM, single-user, not an external product** — which further lowers ToS exposure, but we still use one account per provider (Claude headless via the Claude-Code-blessed `setup-token`).
- **OpenAI** = **ChatGPT Pro $200/mo** (confirmed). Codex coding lane included (Phase 4b, headless caveats noted).
- **MiniMax** = **$500 prepaid yearly API credits** (confirmed prepaid drawdown — spend-safe).
- **Q2 volume** = high + broad: videos, social posts, emails, promotions, course-building, app enhancements, cron jobs. → MiniMax (prepaid) carries bulk + all media; Claude/OpenAI for premium reasoning/coding within their flat envelopes.
- **Q3 failover** = **MiniMax → OpenRouter**, and **both also power "scout agents"** (light research/exploration lanes). OpenRouter = final fallback + cheap scout aggregator.

## 1. Finish line

> **Done when** Mission Control can route any unit of agent/coding/media work to the best **provider + model** for that lane, automatically **fails over** when a provider hits its rate/quota envelope, draws on **MiniMax prepaid credits + single-account subscriptions** so no per-use API key is charged by surprise, and shows the founder a **live quota/routing board** — all founder-scoped, with credentials in the existing vault, and **without** building a multi-account ToS-circumvention rotator (that path is offered as an explicit, separately-gated decision, not the default).

Rejected finish lines: (a) "pool all 5 accounts and rotate to maximise throughput" — rejected as the *default* on ToS grounds (offered as a flagged option in §8/§9); (b) "replace the autopilot's Claude worker entirely" — rejected, Claude stays a first-class lane.

---

## 2. Decision up front (recommended path)

Build a **provider-router layer** with four new modules behind the seams the codebase already exposes, and make **MiniMax the high-volume primary** with **Claude Max (one account) and OpenAI Codex (one account) as premium lanes**, plus Gemini/OpenRouter as fallbacks. The router picks `(provider, model)` per task from: lane/capability needed → current quota headroom → provider status → founder preference; on a `near_limit`/`blocked` signal it walks the fallback chain. Credentials live in the existing `credentials_vault` (AES-256-GCM, founder-scoped); usage is logged to a new `provider_quota_events` table so the cockpit shows *real* numbers instead of env-presence guesses. This honours "don't pay per-use API" because the prepaid MiniMax balance + flat subscriptions absorb the bulk, and the router **queues/defers** a lane that's exhausted rather than silently overflowing to a metered API. **Multi-account pooling is deliberately out of the default**; if Phill accepts the ToS risk, it's a small, isolated add-on (§9 Q1).

---

## 3. Goals & non-goals

**Goals**
- One router that selects `(provider, account, model)` per task by lane + live quota + preference. `[INFERENCE]`
- Real per-provider quota tracking surfaced in the existing Provider Cockpit.
- Spend-safe by construction: prepaid MiniMax + flat subscriptions; **no automatic overflow to metered API** — exhaustion → queue/defer/notify.
- Plug into the **autopilot author seam** (`buildCommand`) and the **AI router** without rewrites.
- Media lanes (video/voice/music) routed to MiniMax — capability Claude/OpenAI don't have.

**Non-goals**
- ❌ Multi-account rotation to circumvent rate limits (default-off; ToS-gated decision only).
- ❌ Storing or surfacing secret values anywhere new (vault only; cockpit shows metadata).
- ❌ Replacing the Claude worker or the existing Anthropic AI router; this wraps/extends them.
- ❌ Any prod DB change applied directly to prod (branch-first rule, §6).
- ❌ Real-time scraping of provider dashboards for usage (use local accounting + documented reset windows).

---

## 4. Approach (plain language)

1. **Catalogue your plans as "provider accounts."** Each account = one row: provider, label, the vault entry holding its token/key, its plan's limits (5-hr + weekly for subs; prepaid balance for MiniMax). Today the cockpit only checks "is an env key present"; this gives it real accounts. `[VERIFIED gap]`
2. **Track usage locally.** Every call/run logs tokens (or a run-unit) to `provider_quota_events`. The router sums recent usage against each plan's window to know headroom — because subscription APIs don't hand you a clean quota number, but they *do* expose a "limit reached, resets at <time>" signal we parse as the hard stop. `[VERIFIED]`
3. **Route by lane.** Task classified (existing `task-packet-router`) → lane → ordered provider preference → first account with headroom wins. Media → MiniMax always.
4. **Fail over, don't overspend.** Provider returns/limit-signals "blocked until reset" → mark cooling, try next in chain → if all premium lanes cool, fall to MiniMax (prepaid) → if even that's out, **queue the task and notify**, never silently hit a metered key.
5. **Execute through existing seams.** Sync AI calls → a small client factory keyed by provider. Autopilot coding tasks → an **author-factory** that emits the right CLI command (`claude …`, `codex exec …`, or a MiniMax API call) into the runner's existing `buildCommand` override.
6. **Show it.** Extend the cockpit with a live "Provider Accounts + Quota" panel (metadata only).

---

## 5. Phased plan (smallest first; each gates the next)

**Phase 1 — Accounting spine (no routing yet).** `[DoD: provider_accounts + provider_quota_events on a Supabase branch; vault holds each token; cockpit reads REAL signals]`
- DB (branch-first): `provider_accounts`, `provider_quota_events` (§6). Seed accounts from vault.
- `account-manager.ts`: resolve a credential from vault on demand (decrypt, founder-scoped, cache).
- Replace `readProviderSignalsFromEnv` with real account+usage signals.
- DoD met when the cockpit shows your actual plans with live (even if estimated) headroom.

**Phase 2 — Router + fallback (read-only decisions).** `[DoD: router returns a (provider, account, model, reason) for a given lane and is unit-tested incl. all-cooling fallback]`
- `provider-pool/router.ts`: decision logic (lane → preference → headroom → status). Pure + tested.
- Wire the existing `recommendForLane` fallback chain into real headroom checks.
- DoD: tests cover happy path, near-limit skip, all-premium-cooling → MiniMax, all-out → queue.

**Phase 3 — Execution wiring (sync first).** `[DoD: one real AI call routed end-to-end via the router; usage logged; cockpit updates]`
- Client factory for the AI router (`ai/router.ts`) keyed by provider; log usage post-call.
- Start with MiniMax (OpenAI-compatible — near-zero adapter) + Claude (existing).

**Phase 4 — Autopilot author-factory.** `[DoD: the runner authors a task on a router-selected provider; verified on a smoke issue like UNI-2176]`
- `author-factory.ts` emits the provider-specific worker command into the runner's `buildCommand` seam; inject the right token via env for the child process.
- Headless caveats handled: Claude via `CLAUDE_CODE_OAUTH_TOKEN`+`--safe-mode` (proven, #377/#379); OpenAI Codex headless is awkward (browser OAuth) → Phase 4b/optional; MiniMax via API.

**Phase 5 — Mission Control panel + media lanes.** `[DoD: founder sees live quota board + can set per-lane preference; MiniMax media lane (video/TTS) callable]`
- New `/api/command-center/provider-quotas` + "Provider Accounts" panel (metadata only).
- MiniMax async media wrapper (create-task → poll → store) for the Synthex/video/voice lanes.

---

## 6. Data model (branch-first — never applied to prod directly)

Prove on a **Supabase database branch** off prod (`lksfwktwtmyznckodsau`); run `npm run check:schema-drift` after. Prod is the shared 1728-table mega-DB — additive + founder-scoped only.

- **`provider_accounts`** — `id uuid pk`, `founder_id uuid` (RLS), `provider text` (claude|openai|minimax|gemini|openrouter), `label text`, `vault_entry_id uuid` (FK → credentials_vault; the secret stays in the vault), `plan_type text`, `limit_window jsonb` (e.g. `{five_hour, weekly_all, weekly_sonnet}` or `{prepaid_balance}`), `enabled bool`, `created_at`. RLS: `founder_id = auth.uid()`.
- **`provider_quota_events`** — `id uuid pk`, `founder_id uuid` (RLS), `account_id uuid` (FK), `at timestamptz`, `model text`, `input_tokens int`, `output_tokens int`, `run_unit numeric`, `lane text`, `outcome text` (ok|rate_limited|error), `reset_at timestamptz null`. Append-only; the router sums recent rows per window.
- **Vault**: no schema change needed — `credentials_vault` already supports multiple entries per service `[VERIFIED]`; one entry per account, referenced by `provider_accounts.vault_entry_id`.

`[VERIFIED]` vault is AES-256-GCM + PBKDF2, founder-scoped, secrets never returned by its API. `[UNCONFIRMED]` exact prod migration history alignment — confirm on the branch before promote.

---

## 7. Security & cost guardrails (structural)

- **Secrets**: only in `credentials_vault` (encrypted). `provider_accounts` stores a *reference*, never the token. Cockpit/API surface metadata only. New routes run `npm run security:routes-check`.
- **Founder scoping**: every new table + route `.eq('founder_id', …)` + RLS (single-tenant rule).
- **Spend ceiling by design**: the router has **no code path that overflows to a metered API key** without an explicit per-account `allow_metered` flag (default false). Exhaustion → queue + notify. This is the structural answer to "don't burn API credits."
- **MiniMax prepaid**: overage is opt-in on their side too `[VERIFIED]` — double safety.
- **ToS guardrail**: the default build uses **one account per provider**. Multi-account rotation is gated behind an explicit config + Phill's written acceptance of the documented ToS risk (§8).

---

## 8. Risk & assumption register

| # | Item | Tag | Severity | Mitigation |
|---|---|---|---|---|
| R1 | **Pooling 3 Claude Max accounts + rotating to beat rate limits violates Anthropic Consumer Terms** (§2 sharing, §3 circumvention, §3(7) automation-via-API-key-only); weekly caps were added to stop exactly this | `[VERIFIED]` | **High** (account suspension) | Default design uses ONE Claude account headless (Claude-Code-blessed). Pooling is an opt-in, written-consent decision (Q1). Compliant scale path = Anthropic API keys. |
| R2 | OpenAI Codex headless via subscription is awkward (browser OAuth; device-auth beta) + repurposing a seat as backend is ToS-grey | `[VERIFIED]` | Med | Treat OpenAI Codex as an optional premium coding lane (Phase 4b), not the spine. Compliant automation = OpenAI API. |
| R3 | Subscription rate-limit signal under `claude -p`/`codex exec` may be only a TUI string, not a clean 429/JSON | `[UNCONFIRMED]` | Med | Phase 1 spike: capture the real error shape from a live limited run before hard-coding the parser; fall back to "cool until next documented reset window." |
| R4 | MiniMax pricing/RPM/TPM are volatile; "year of credits" exact form unconfirmed | `[VERIFIED volatile]` / `[INFERENCE]` | Low | Re-check `platform.minimax.io` before wiring hard limits; treat balance as prepaid drawdown (safe either way). |
| R5 | Subscription usage is shared with Claude web/app — runner can't isolate its slice | `[VERIFIED]` | Low-Med | Quota tracker accounts conservatively; leave headroom buffer per account. |
| R6 | Prod is the shared mega-DB; migration could collide | `[VERIFIED]` | Med | Branch-first + `check:schema-drift` + additive-only (§6). |
| R7 | MiniMax standalone image-gen capability | `[UNCONFIRMED]` | Low | Confirm before routing image tasks there; default image lane elsewhere. |

---

## 9. Open questions (≤5 — for Phill)

1. **The big one — multi-account Claude rotation.** The compliant default uses **one** Claude Max account headless. Do you want me to (a) build only the compliant single-account-per-provider router [recommended], or (b) also include the 3-account rotation despite the documented Anthropic ToS / suspension risk? (b) needs your explicit "I accept the risk."
2. **OpenAI**: include the Codex lane now (awkward headless auth, ToS-grey) or defer it and lean on Claude + MiniMax first?
3. **"Enough credits for all work"** — roughly what monthly *volume* are you expecting (issues/day, media clips/day)? Determines whether MiniMax prepaid + one Claude sub genuinely covers it or whether a compliant API key is eventually needed for overflow.
4. **Confirm the MiniMax plan**: is it prepaid **credits** or an annual **Token Plan subscription**? (Changes the headroom maths, not the design.)
5. **Failover preference**: when a premium lane is exhausted, prefer **queue-and-wait** (zero spend, slower) or **fall to MiniMax prepaid** (keeps moving, draws your balance)?

---

## 10. Verification plan (how "done" is proven per phase)

- **Every phase**: `npm run verify:web` (build + type-check + lint + unit) green; new routes pass `npm run security:routes-check`.
- **Phase 1**: migration applied on a **Supabase branch**; `npm run check:schema-drift` clean; cockpit renders real accounts.
- **Phase 2**: `npm test` covers router decisions incl. all-cooling → queue (no metered-key path reachable in tests).
- **Phase 3/4**: one live MiniMax call + one autopilot run routed via the router, usage row written, cockpit updates; smoke issue (UNI-2176-style) authored on a router-selected provider.
- **Phase 5**: founder panel shows live quota; one MiniMax media artefact (e.g. TTS clip) produced end-to-end.
- **Global**: no secret values in logs/responses; no prod DDL applied directly; PRs target `main`.

---

### Appendix — verified sources
Anthropic: setup-token + headless + auth precedence (code.claude.com/docs/en/authentication); Max limits (support.claude.com/.../11049741); weekly limits (techcrunch 28/07/2025); Consumer Terms (anthropic.com/legal/consumer-terms). OpenAI: Codex auth/non-interactive/pricing (developers.openai.com/codex/*); Pro tiers (help.openai.com/.../9793128). MiniMax: quickstart + token-plan FAQ (platform.minimax.io/docs/*). Repo: provider-usage.ts:1–203, vault.ts, author.ts:36–88 seam, ai/router.ts, task-packet-router.ts.
```
[STATUS] gate: awaiting approval — no build until Phill decides Q1–Q5
```
