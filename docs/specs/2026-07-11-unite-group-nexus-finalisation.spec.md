# Unite-Group Nexus — Finalisation Spec

> **Goal:** drive the Unite-Group **Nexus CRM** (`apps/web`) from "pages render, integrations half-wired" to **every founder surface backed by a real, authenticated connection** — closing the open Linear finalisation cluster.
> **Author:** Nexus agent · **Date:** 11/07/2026 · **Locale:** en-AU
> **Evidence standard:** every state claim tagged `[VERIFIED]` (this-session tool result / file / URL), `[INFERENCE]`, or `[UNCONFIRMED]`. Only `[VERIFIED]` is acted on as fact. Companion: `.claude/rules/fabel-evidence-standard.md`.

---

## 1. Context & intent

The Nexus CRM renders cleanly and CI is green, but the No-Invaders "honest empty state" rule masks a layer of **silent degradation**: pages and crons that are wired to integrations which never authenticate in prod. This session proved and repaired four such faults; the remaining work is a coherent **credential + integration + automation-hygiene** cluster tracked across ~10 open Linear issues in the **Unite-Group** team/project.

This spec sequences that cluster to a single definition of done: **no founder surface silently serves empty/mock data because a connection was never made.** It splits cleanly into **agent-actionable** work (code, env var names, redeploys, verification) and **founder-only unlocks** (OAuth consent clicks, platform app secrets) — the latter cannot be done by any agent and are called out as an explicit checklist.

---

## 2. Scope

### In scope — the Unite-Group Nexus finalisation cluster
| Issue | Pri | State | Title (short) |
|---|---|---|---|
| UNI-2344 | High | In Progress | Cron credential rot + Anthropic 429s (Google re-auth + cron fixes) |
| UNI-2329 | High | Todo | Connect Google via the CRM's own Connect flow (founder click) |
| UNI-2332 | High | In Progress | Nexus prod env fixes: APIFY name mismatch + missing operational keys |
| UNI-2328 | High | In Progress | Wire Stripe into prod — Part 2 remaining |
| UNI-2331 | Med | Todo | Social posting — connectors built, missing platform app secrets |
| UNI-2330 | Med | Todo | Xero: connect Unite-Group tenant (founder OAuth) |
| UNI-2310 | High | In Progress | Gated 1Password authorization lane |
| UNI-2293 | Med | In Progress | Add HeyGen/Telegram/Outlook to integrations status panel |
| UNI-2351 | High | In Progress | Remove idle polling + repair false-green automation controls |

### Out of scope (separate owners / epics — do **not** fold in)
- **CCW-CRM** client work (UNI-2104/2108/2109/2110/2118/2259/2337/2342) — assigned to Rana, separate `ccw-crm` repo/project.
- **Synthex** marketing (UNI-2181 CARSI×CCW roadshow) — SYN team.
- **AI Websites** engine (UNI-2354) — new build phase, its own worktree.
- **Nexus Mesh / Max-plan** infra epics (UNI-2246/2247/2208) — 3-machine fleet, tracked separately; this spec touches only the cron-layer symptoms that surface in the CRM.

---

## 3. Current verified state (this session)

- `[VERIFIED]` **Bookkeeper 300s timeout — fixed & merged.** PR #756 (merge commit `0f6d6c20`) window-bounds the nightly Xero sync to 100 days; full history stays on the manual backfill. Deployed to prod. (Addresses UNI-2344's "bookkeeper 300s timeout — watch" note and part of UNI-2351.)
- `[VERIFIED]` **Anthropic 429 retry hardened — fixed & merged.** PR #757 (merge commit `a0b65fef`) raises `createWithRetry` to 6 attempts / 3s base with a 90s cumulative cap. Complements the earlier UNI-2344 pass (PRs #716/#718). Deployed. (Closes UNI-2344 stream 2.)
- `[VERIFIED]` **`LINEAR_API_KEY` rotated.** Founder generated a fresh personal API key; installed to prod env (old removed, new added, redeploy `unite-group-pxgsy1za1` Ready). Validated against Linear API: `HTTP 200`, `viewer: Phill McGurk`, `org: Unite-Group`. Clears the ~1,700-hit Linear 401 cluster on next cron run.
- `[VERIFIED]` **`NEXT_PUBLIC_SITE_URL=https://unite-group.in`** set in prod (PR #664 era) — wiki self-fetch repaired.
- `[VERIFIED]` **`bookkeeper_transactions` is empty in prod** (0 rows, 0 runs — direct SQL count). The nightly bookkeeper has never written data because Xero is not configured in prod (`isXeroConfigured()` false — only `GOOGLE_CLIENT_*` present). ⇒ the per-run-snapshot duplication risk has **zero live impact** today and is de-prioritised until Xero is connected. (Bears on UNI-2330.)
- `[VERIFIED]` **Google OAuth is the largest live failure class** — ~150 hits across 6 mailboxes, last seen 10/07. Two mailboxes (`phill@connexusm.com`, `nrpg.team@gmail.com`) are **undecryptable** (old `VAULT_ENCRYPTION_KEY`); a gated purge SQL is staged (`supabase/manual-applies/2026-07-11_purge_undecryptable_google_tokens.sql`, merged inert in #756). The other four are expired and need re-consent only. (UNI-2344 stream 1 + UNI-2329.)

---

## 4. Classification — who can do each unit

| Issue | Agent-actionable (code/env/verify) | Founder-only unlock |
|---|---|---|
| UNI-2344 | ✅ 429 fix (done), scope-403 routing investigate | 🔑 Re-consent 6 Google mailboxes; run staged purge SQL; possible Anthropic token swap |
| UNI-2329 | ✅ verify Connect-flow routes work end-to-end | 🔑 Click "Connect" per Google account in `/founder/settings` |
| UNI-2332 | ✅ **APIFY var-name fix in code/env** (pure agent) | 🔑 Supply Perplexity/HF/WhatsApp/Slack/Microsoft/Reddit secrets |
| UNI-2328 | ✅ verify Stripe surfaces read live (Part 1 done) | 🔑 Part-2 secrets if any remain |
| UNI-2331 | ✅ reconcile `META_*`/`FACEBOOK_*` code naming | 🔑 `FACEBOOK_APP_SECRET`, `LINKEDIN_*`, `TIKTOK_*` app secrets |
| UNI-2330 | ✅ add a Unite-Group entity row to `/founder/xero` if in scope | 🔑 `XERO_CLIENT_ID/SECRET` + OAuth connect click |
| UNI-2310 | ✅ wire the Approve action + service-account read path | 🔑 1Password service-account token (already created) |
| UNI-2293 | ✅ **add HeyGen/Telegram/Outlook to status panel** (pure agent) | — |
| UNI-2351 | ✅ **idle-poll removal + false-green repair** (pure agent) | — |

**Three issues are pure agent work with no founder dependency: UNI-2332 (APIFY name fix), UNI-2293 (status-panel honesty), UNI-2351 (automation hygiene).** These are Wave 1.

---

## 5. Execution waves

### Wave 1 — Pure agent work (no founder dependency, ship now)
1. **UNI-2332 (APIFY)** — code reads `APIFY_API_TOKEN`; prod defines `APIFY_API_KEY`. Fix: read both names (`process.env.APIFY_API_TOKEN ?? process.env.APIFY_API_KEY`) so it authenticates without a founder env change. The other missing keys (Perplexity/HF/etc.) are founder-supplied and stay in Wave 3.
2. **UNI-2293 (status panel)** — extend `api/integrations/status/route.ts` to report HeyGen, Telegram, Microsoft/Outlook (currently omitted). Honest "connected / not_connected" per the No-Invaders rule; no new deps.
3. **UNI-2351 (automation hygiene)** — convert idle-polling GitHub workflows / operator sweeps to event-triggered; make the bookkeeper route return a non-200 on an orchestrator `failed` result; clean the 24 stale `running` rows. (Bookkeeper timeout itself already fixed in #756.)

Each ships as its own branch → PR → merge-gate → green. Acceptance in §6.

### Wave 2 — Agent verification of founder-gated surfaces
For UNI-2329 / 2330 / 2328 / 2310: confirm the Connect/OAuth code paths work end-to-end (routes exist, callbacks store to `credentials_vault`, status flips) so the moment the founder clicks/supplies a secret, the surface goes green with no further code. Produce a per-issue "ready for founder" checklist.

### Wave 3 — Founder unlocks (checklist in §7)
The credential clicks and platform secrets only the founder can provide. Agent stands by to verify each surface goes green immediately after.

---

## 6. Per-issue acceptance criteria & verification

**UNI-2332 (APIFY name fix)** — *Acceptance:* an Apify-backed call authenticates in prod using the existing `APIFY_API_KEY` value. *Verify:* `grep` shows the fallback read; targeted unit test; after deploy, the Apify surface returns real data (or honest not_connected for the still-missing keys), no auth error in runtime logs.

**UNI-2293 (status panel)** — *Acceptance:* `/founder/settings` (or the integrations panel) lists HeyGen, Telegram, Microsoft/Outlook with a truthful connected/not_connected state sourced from `credentials_vault`/env. *Verify:* unit test on the status route; visual check the three rows render.

**UNI-2351 (automation hygiene)** — *Acceptance:* (a) no GitHub workflow runs on a fixed short interval against an empty table; (b) `/api/cron/bookkeeper` returns a 5xx (not 200) when the orchestrator status is `failed`; (c) zero stale `running` rows older than one run interval. *Verify:* workflow YAML diff; a test asserting the non-200 path; SQL count of stale rows = 0.

**UNI-2344 (remaining)** — *Acceptance:* strategy-daily/ceo-board show no `rate_limit_error` exhaustion for 3 consecutive nights (429 fix already shipped); email-triage scope-403 either routed through the API-key path or documented as founder token-swap. *Verify:* Vercel runtime-error window clean for those routes.

**UNI-2329 / 2330 / 2328 / 2310 (Wave 2 verification)** — *Acceptance per issue:* the Connect/OAuth flow, when exercised, writes a decryptable token to `credentials_vault` and the integrations status flips to connected. *Verify:* code trace of route→callback→vault write; a "ready for founder" note on each Linear issue.

---

## 7. Founder-action checklist (the unlocks — only you can do these)

- [ ] **Google (biggest win):** run the staged purge SQL (`supabase/manual-applies/2026-07-11_purge_undecryptable_google_tokens.sql`, Step 1 preview → Step 2), then reconnect all 6 mailboxes at `/founder/settings` / `/founder/email` — clears the ~150-hit Google cluster (email/calendar/triage/contacts/coach). *(UNI-2344 s1, UNI-2329)*
- [ ] **Anthropic scope-403:** confirm whether `contact@unite-group.in` triage should use the API-key path or a properly-provisioned long-lived token. *(UNI-2344 s3)*
- [ ] **Social app secrets:** `FACEBOOK_APP_SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET` (connectors already built). *(UNI-2331)*
- [ ] **Xero:** `XERO_CLIENT_ID/SECRET` (+ `DR_CLIENT_ID/SECRET`) then the OAuth connect click — unblocks the bookkeeper writing real data. *(UNI-2330)*
- [ ] **Operational keys:** Perplexity, HuggingFace, WhatsApp, Slack, Microsoft, Reddit API keys (each silently disables its surface until present). *(UNI-2332)*
- [ ] **1Password:** confirm the `nexus-audit` service-account token is loaded for the CRM Approve lane. *(UNI-2310)*

Each item is ~1–10 minutes. The agent verifies the surface goes green immediately after each.

---

## 8. Risks & guards

- **Prod DB:** the branch-promote workflow is broken for this project (migration history won't replay), so any data/DDL change goes via a reviewed `supabase/manual-applies/` file — never `db push` to prod, never autonomous. The token purge already follows this.
- **Env-driven redeploys:** uncheck build cache (or CLI fresh deploy) so module-level `process.env` reads don't serve stale — per the Vercel-env-redeploy lesson.
- **merge-gate:** opening a PR here ≈ merging it (auto-ready + squash on green). Every Wave-1 PR must be whole, green, and harmless-if-auto-merged before it opens; all three Wave-1 items are behaviour-additive or config, safe by that test.
- **No fake-as-real:** every surface must show `source` / honest not_connected, never mock-as-live.

---

## 9. Definition of done

Nexus finalisation is **GREEN** when: Wave-1 PRs merged and deployed; every integration in the status panel reports a truthful state; and each founder unlock in §7 either completed (surface verified green) or explicitly deferred with the reason recorded on its Linear issue. UNI-2344, 2332, 2293, 2351 close on Wave-1 + verification; 2329/2330/2328/2331/2310 close as their founder unlock lands.
