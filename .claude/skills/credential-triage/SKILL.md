---
name: credential-triage
description: Diagnose and fix failing integrations across the Unite-Group empire. Use whenever crons error, an integration stops producing data, logs show 401/403/404/429/timeout errors, tokens expire, a provider "randomly stopped working", email triage or coaches go quiet, or the user asks to check Nexus/empire health — including routine weekly health checks when nothing seems broken. Wraps the Vercel MCP tools with the exact classification and fix path per provider.
---

# Credential triage

Silent credential rot is the Nexus's number-one failure mode. In July 2026 a
single expired Linear key generated 866 errors in seven days across four
crons; seven Google mailboxes sat dead for weeks; the marketing coach failed
for four months. Nothing paged anyone. This runbook turns log archaeology
into a repeatable fifteen-minute procedure.

## Step 1 — pull the evidence

Use the Vercel MCP against the `unite-group` project:

- `get_runtime_errors` with `since: "7d"` — pre-aggregated error clusters.
- `get_runtime_logs` filtered `level: error` for detail on a specific
  cluster, or `group_by: route` to see blast radius.

Group findings by **error class**, not by route — one dead credential
usually poisons several routes, and fixing the credential clears them all.

## Step 2 — classify

Before blaming credentials, spend sixty seconds ruling out a provider-side
incident: check the provider's status page live (Exa or web search —
"linear status", "google workspace status"). A 5xx storm can be their
outage; a 401/403 is yours. Mixed 401-and-502 clusters usually mean a dead
credential *and* provider wobble — fix the 401, then re-check.

| Signature in logs | What it means | Fix path |
|---|---|---|
| `401` / `unauthorized_client` on an API key (e.g. "Linear API error: 401") | Key revoked or expired | Rotate the key in the provider dashboard → update the Vercel env var for production → redeploy → verify |
| `400 invalid_grant` "Token has been expired or revoked" (Google) | OAuth refresh token dead | Re-run the OAuth consent flow for that specific account; no code change |
| "Unsupported state or unable to authenticate data" | AES-GCM decryption failure in the token vault (`vault.ts`) | Encryption-key mismatch, NOT a token problem. Re-consenting alone will not fix it: first confirm the vault encryption key env var matches the key that encrypted the stored row, then re-encrypt or re-onboard the account |
| `403` "OAuth token does not meet scope requirement" (Anthropic) | Wrong credential type for the API | Replace the OAuth token with a properly scoped API key in env |
| `404` "model: <id>" | Pinned model ID no longer exists | Verify the current model list against live official docs (live-verify skill) before choosing the replacement, then route every model ID through a single env var / alias so it updates in one place; never hardcode model strings in route code |
| `429 rate_limit_error` | Cron fan-out collision (all businesses firing in the same window) | Stagger the per-business schedules at least 10 minutes apart; add retry with backoff |
| "Task timed out after Ns" | Job exceeds the function budget | Page through the data, split the job, or move it to the runner |
| "PKCE code verifier not found" on auth callback | SSR cookie storage gap | Use `@supabase/ssr` on both server and client so the verifier lives in cookies |
| "column ... does not exist" / CHECK violation | Not credentials — schema drift | Switch to the `supabase-schema-gate` skill |

## Step 3 — fix, then verify

A fix is not done at deploy. Re-run `get_runtime_errors` scoped `since` the
deploy time and confirm the cluster's `last` timestamp has stopped
advancing. Where possible, trigger the affected cron once manually and watch
it complete clean.

## Step 4 — prevent recurrence

- Integration failures must be **witnessed**, never swallowed: a failed
  external call in a cron should land an honest failure row (`agent_actions`
  or equivalent) that surfaces on /empire — log-and-continue is how the
  four-month outages happened.
- Run Step 1 weekly even when nothing seems broken. Rot is silent by
  definition; the check costs two tool calls.
- Keep the inventory below current — stale inventory makes triage slower.

## Integration inventory (snapshot 2026-07-10 — update on change)

Google-connected accounts (Gmail/Calendar via the vault):
`phill.mcgurk@gmail.com`, `zenithfresh25@gmail.com`,
`disasterrecoverynrp@gmail.com`, `airestoreassist@gmail.com`,
`nrpg.team@gmail.com`, `phill@connexusm.com`, `contact@unite-group.in`.

Providers in active use: Linear, Google, Anthropic, SendGrid, Apify,
Supabase, Vercel. Pending founder-gated secret additions (UNI-2332):
Perplexity, HuggingFace, WhatsApp, Slack, Microsoft, Reddit, Telegram
signing key, Xero webhook key.

Business org slugs for event routing: `dr`, `nrpg` (aliases → dr-nrpg),
`ccw` (→ ccw-crm), `carsi`, `ato`, `restore`, `synthex`.
