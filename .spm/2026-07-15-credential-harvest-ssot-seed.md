# SPM Spec — Credential Harvest + SSOT Seed (Nexus connect-everything lane)

Date: 15/07/2026 (afternoon) · Author: SPM session (Fable 5) · Status: FOR FOUNDER APPROVAL
Repo: `CleanExpo/Unite-Group` apps/web @ `cccce00c`+ · Ticket home: UNI-2373 (register Class F) · Companion: `.spm/2026-07-15-ship-readiness-register.md`

## 1. Task

Founder directive 15/07: credentials already provided — Google OAuth, Semrush, Stripe,
socials, "everything required" — keep being re-entered across the estate and never land in
the Nexus's own plane. Harvest every credential the estate already holds, seed it into the
Nexus (Vercel prod env + the encrypted stores the code already resolves), so founder
sign-in makes every BUILT Connect surface work — and where refresh tokens already exist,
**no re-consent**.

## 2. Problem (evidence)

- **Two planes, no propagation** [VERIFIED memory 28/06 + names-only sweep this session]:
  hermes local (`~/.hermes/.env`, 107 vars) holds `GOOGLE_OAUTH_REFRESH_TOKEN` (+ client
  pair), full Stripe trio, `SEMRUSH_API_KEY`, `LINEAR_API_KEY`, Xero client pair,
  ElevenLabs, Composio, Perplexity. Vercel prod (`unite-group`,
  `prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0`, 65 vars) lacks Stripe entirely, holds no static
  Google refresh token, and metering/identity flips are unset (register F1/F4).
- **Re-entry with no landing** [VERIFIED names-only]: `SEMRUSH_API_KEY` exists on BOTH
  local planes yet **zero** `apps/web` code reads it (no Semrush integration exists);
  `X_CONSUMER_KEY`/`X_SECRET_KEY` sit in `.env.local` with no X surface. Entered ≠ landed.
- **The hard boundary** [VERIFIED 15/07, Synthex lesson]: Vercel Sensitive vars are
  write-only — `VAULT_ENCRYPTION_KEY` cannot be read back, so **no local script can
  encrypt rows prod can decrypt**. Seeding must happen server-side, inside the app.
- **Seeding is architecturally sanctioned** [VERIFIED code map this session]: OAuth
  readers (`google-oauth.ts:118-137`, `xero/client.ts:179`, `social/channels.ts`) resolve
  tokens from `credentials_vault` / `social_channels` and refresh with env client
  id/secret — a directly-seeded encrypted refresh-token row bypasses the consent screen
  by construction. `/api/integrations/status` already reports per-provider truth.

## 3. Desired outcome

1. Every credential the estate holds that a BUILT Nexus surface needs is present on the
   Nexus plane (Vercel env or encrypted row) — entered once, never again.
2. Google/Gmail/Calendar/Drive/YouTube work headlessly with **no consent click** (refresh
   token seeded from the hermes plane).
3. `/api/integrations/status` `connected` count is the honest scoreboard, before/after.
4. What CANNOT be harvested is named honestly (no invention): social API tokens that
   don't exist anywhere (email/password ≠ API), and surfaces not built (Semrush, Bing, X).

## 4. Scope

**Lane A — Build: founder-gated seeding endpoint (the only new code).**
`POST /api/founder/credentials/seed` — founder session + private-access gate + arming flag
`CREDENTIAL_SEED_ENABLED` (unset ⇒ 404; dormant by default, "merging arms nothing").
Zod-validated `{ target: 'vault'|'social', service/platform, label, payload }` → encrypts
server-side with prod `VAULT_ENCRYPTION_KEY` → upserts `credentials_vault`
(`founder_id,service,label`) or `social_channels` (`founder_id,platform,channel_id`) →
write-then-confirm read-back → returns status-route echo. Never logs payloads. Plus a
small CLI feeder `scripts/credential-seed.mjs` (reads local plane names, POSTs over HTTPS
with founder cookie/secret — plaintext transits once, TLS, never written to disk/git).

**Lane B — Founder runbook: env atoms into Vercel prod** (write-only `vercel env add`,
founder-executed or founder-typed-approved, then redeploy WITHOUT build cache
[[feedback_vercel_env_redeploy]]): F1 `FOUNDER_ALLOWED_USER_IDS`/`FOUNDER_ALLOWED_EMAILS`
(+ confirm `FOUNDER_USER_ID`) · F4 `COST_METERING_ENABLED` + `METERING_FX_USD_AUD` ·
Stripe trio `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`/`STRIPE_WEBHOOK_SECRET` (hermes
plane has them) · confirm `LINEAR_API_KEY` (F5) · Xero client pair (F3 env half; tenant
Connect stays interactive) · social APP client ids/secrets where held (F6 env half).

**Lane C — Seed list for Lane A once armed**: Google refresh token (hermes
`GOOGLE_OAUTH_REFRESH_TOKEN` + account email) into `credentials_vault service='google'` —
unblocks Gmail/Calendar/Drive; same grant into `social_channels platform='youtube'` if
scopes cover YouTube (verify scope string first; else it stays a one-click Connect).
1Password: targeted per-item lookups ONLY (named items, founder OK) — no vault
enumeration (classifier-gated by design).

**Out of scope (named honestly, filed as atoms):** Semrush/Bing/X integrations (no code
exists — creds without surfaces; new-build tickets, not harvest) · social platform API
tokens that exist nowhere (Meta/LinkedIn/TikTok need app registrations + founder OAuth —
the estate holds only email/passwords, a browser-automation plane, not API) · Xero tenant
Connect click (inherently interactive) · Google/Xero consent for accounts with no stored
refresh token.

## 5. Existing capability (do not rebuild)

`src/lib/vault.ts` AES-256-GCM + PBKDF2 · vault upsert patterns in every OAuth callback ·
`social/channels.ts upsertChannel` · `/api/integrations/status` provider truth table ·
`private-access.ts` founder gate · env-var-canon skill (canonical names; no synonyms).

## 6. Specialist board (15+ yr lenses)

- **Architect**: the seed endpoint is the ONLY correct crypto boundary (prod holds the
  key, agents hold none — RA-7061 lesson). Reuse the callbacks' upsert code paths, do not
  fork encryption.
- **Security**: arming flag default-off; founder session AND allow-list; payload zod-caps;
  no payload in logs/errors; seeded rows carry `metadata.seeded_at/source` for audit;
  flag turned OFF after the seeding session (runbook step); secrets never in git — spec
  and PRs carry names only; gitleaks stays green.
- **Product**: the win is F1+Stripe+Google-refresh — CRM visible, invoices transact,
  email/calendar/drive live, zero consent screens. Semrush/Bing/X honestly deferred beats
  a fake "connected".
- **QA**: unit-test gate (flag off ⇒ 404; wrong founder ⇒ 401/403; bad payload ⇒ 400);
  seeded-row read-back test via status route; post-seed live walk of Settings →
  Integrations; `pnpm` gates standard five.
- **Devil's advocate**: "endpoint = standing credential-injection hole" — bounded: flag
  default-off, founder-only, and the runbook's last step disarms it. "Local key might
  equal prod key, skip the endpoint" — UNCONFIRMED and unverifiable (Sensitive
  write-only); the endpoint works regardless; do not gamble on key equality.

## 7. Judge

Lane A (endpoint + feeder + tests, dark): **100/100 APPROVE BUILD** — bounded, dormant,
evidence-complete. Lane B/C execution: founder-owned atoms (Class F), gated on typed
approval per prod-env doctrine — the spec ships the exact runbook, never self-executes.
Semrush/Bing/X: REDUCE SCOPE to named backlog atoms (creds exist, surfaces don't).

## 8. Verification

Before/after `GET /api/integrations/status` connected counts (target: gmail, calendar,
drive, stripe, linear, xero-env connected=true after Lanes B+C) · seeded Google row
refreshes a real access token (settings page lists the account) · metering cron first
honest run · gates green on the PR · flag confirmed unset in prod after seeding.

## 9. /goal command

```
/goal Build Lane A of .spm/2026-07-15-credential-harvest-ssot-seed.md: founder-gated
POST /api/founder/credentials/seed (arming flag CREDENTIAL_SEED_ENABLED default-off,
founder session + private-access, zod-validated, server-side encrypt, write-then-confirm,
payloads never logged) + scripts/credential-seed.mjs feeder + unit tests; gates green,
merge-gate, lane-merge. Then output the Lane B/C founder runbook verbatim and STOP —
prod env writes and the seeding run are founder-typed-approval atoms, never autonomous.
```

## 10. Session-handoff seed

Resume: this spec + the credential-resolution map (agent report, this session) + planes
inventory (names-only, this session). First command: `git checkout -b feat/credential-seed-lane origin/main`.

SPM spec complete. Next safe action: on founder approval, run the §9 /goal to build Lane A dark, then hand the Lane B/C runbook to Phill.
