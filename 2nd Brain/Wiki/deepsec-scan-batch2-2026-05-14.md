---
type: wiki
updated: 2026-05-14
---

# DeepSec Scan Batch 2 — 2026-05-14 — 82 production routes

Adversarial SAST pass on 82 more routes (the first 4 were covered in
[[deepsec-scan-2026-05-14]]). All paths under `/src/app/api/`.

## Per-route findings

### `billing/webhook/route.ts` (127 lines)

**🟠 P1:**
- **L91–117 — Subscription state writes are NOT idempotent.** No `stripe_events`-style dedupe — Stripe retries within milliseconds will both apply the update. For `customer.subscription.deleted` the second-fire is benign, but for `invoice.paid` + `invoice.payment_failed` arriving out-of-order (Stripe doesn't guarantee in-order delivery) you can flip a real `active` business back to `past_due` because the failed retry arrived last. **Fix:** dedupe on `event.id` via UNIQUE-constraint insert (mirror `webhooks/stripe` Top-5 fix).
- **L36–40 — `Object.fromEntries(signature.split(','))` silently swallows malformed parts.** Two `v1=` segments would only keep the last. Stripe's reference parser iterates all parts and collects all v1 candidates. Low blast radius (the timestamp + raw body still gate the HMAC), but the deviation from the canonical parser is a maintenance trap.

**🟡 P2:**
- **L95, L105, L115 — race against `subscribe/route.ts` writes.** The subscribe route writes `subscription_status` from the SDK return value at L116–127; webhook events for the same subscription land moments later and can race. Conditional `.eq('subscription_status', expectedPrior)` would close the gap.

**🟢 GOOD:**
- L48–55 HMAC with `timingSafeEqual` + length pre-check — textbook.
- L45–46 timestamp tolerance enforced.
- L69 raw `request.text()` BEFORE any parse.
- L70 signature verified BEFORE `JSON.parse` at L76.
- L1 `runtime` not declared but `crypto` is `node:` — Next infers nodejs from the import. Acceptable.

---

### `webhooks/video-published/route.ts` (49 lines)

**🔴 P0:**
- **L6–10 — NO authentication of any kind.** Anyone on the internet can POST to this endpoint and insert arbitrary rows into `client_videos`. `revalidatePath` at L44 lets them invalidate any client portal cache cheaply. With `slug` controlled, attackers can write spoof videos against any client. **Fix:** require `x-internal-secret` (same pattern as `internal/sync-post-performance` L36) or HMAC-sign the payload from the YouTube webhook source.

**🟠 P1:**
- **L31 — no validation on `client_id` shape** — UUID-or-arbitrary-string, no FK pre-check.
- **L37 — `onConflict: 'client_id,youtube_video_id'`** depends on a UNIQUE index existing; if migration ever drifts, this falls back to plain insert → duplicates.

**🟡 P2:**
- **L46 — `console.log` logs `client_id` + `youtube_video_id`** — low sensitivity but creates a partial audit trail in Vercel logs the worker can't query back.

**🟢 GOOD:**
- L24 catches JSON parse errors cleanly.
- L31–33 mandatory-field check before insert.

---

### `auth/mfa/route.ts` (223 lines)

**🔴 P0:**
- **L110–137 (PATCH = verify) — NO authenticated session required.** Login-flow MFA verify accepts `{ userId, token }` from any caller. An attacker who knows or guesses `userId` (UUID, but enumeration is plausible via password-spray side-channels) can attempt MFA brute force WITHOUT having passed the password step. Rate limiting is absent. **Fix:** require a partial-auth bearer (e.g., a short-lived MFA challenge JWT minted only after correct password) OR enforce per-userId rate-limit (5 attempts / 15min, lock-out at 10).
- **No rate limiting** on any of the 5 MFA verbs. Brute-force the 6-digit TOTP is feasible against a hot userId.

**🟠 P1:**
- **L50, L100, L141, L179, L218 — `${error.message}` echoed back in 500 responses.** Leaks internal DB errors, Supabase RLS hints, schema names.
- **L22, L40, L64, L155, L194 — `getSession()` is read from cookies WITHOUT calling `getUser()`.** Per Supabase auth-helpers docs, `getSession()` does NOT re-validate the JWT against the server — it trusts the cookie. The companion routes (`admin/bots/provision` L57) correctly use `getUser()` which calls `auth.user` server-side. Inconsistency means a stolen/forged session cookie is accepted for MFA setup/disable. **Fix:** swap `getSession()` → `getUser()` everywhere in this file.

**🟡 P2:**
- **L1 no `dynamic = 'force-dynamic'`** — Next may try to statically optimise an auth route.
- **L77 — `secret` accepted unencrypted from client body.** The MFA setup flow has the server mint the secret at L34, send it to the client, then accept it back at L77 to enable. The client could substitute a known-secret. Better: persist the pending secret server-side keyed by user + setup_session_id; never trust the round-trip.

**🟢 GOOD:**
- L24, L66, L157, L196 — consistent 401 on missing session.
- L79 — required-field check before service call.

---

### `admin/bots/provision/route.ts` (174 lines)

**🟠 P1:**
- **L132 — duplicate detection by `error.message.includes('duplicate')`** is fragile string-matching. Use the PG error code (`23505`) on `error.code`. The message format can change across `postgres-js` minor versions.
- **L151 — `detail: String(e?.message || e)`** error leak (same as today's scan flagged on 4/4).
- **L72 — `request.json().catch(() => null)`** is defensive but the result is `null`, then `body` is null, then destructuring at L77 throws TypeError if you bypass the L73 check. Logic is correct as written — but the destructure is unguarded against `body === {}`. Tested manually it works; reads brittle.

**🟡 P2:**
- **L1 `@ts-nocheck`** — masks regressions.
- **L57 — `getUser()` used correctly** but ALLOWED_ADMINS is a hardcoded set at L32 instead of an env var. Hard to rotate Phill out without redeploy.
- **L162 GET route** has no rate limit and lists all bots including `client_email` — leaks customer email list to anyone who solves the auth.

**🟢 GOOD:**
- L57 `getUser()` (not `getSession()`) — proper JWT re-validation.
- L39 strict regex on context_id — no slug injection.
- L83–94 explicit allowlist on `kind` + `brand`.
- L92–94 length-bound on context_label.
- L104 service role client gated behind admin auth (correct pattern).

---

### `billing/subscribe/route.ts` (138 lines)

**🔴 P0:**
- **L46 — `adminToken !== process.env.PI_CEO_API_KEY` is NOT constant-time.** This is the same class as today's scan's `admin/approvals/create` L36 finding. PI_CEO_API_KEY is a high-value bearer token. **Fix:** wrap in `crypto.timingSafeEqual` with length pre-check.

**🟠 P1:**
- **L66, L84 — error responses leak Stripe SDK internals.** L66 returns `(err as Error).message` directly — Stripe SDK errors include credential preambles + raw request payloads.
- **L80–84 — race window: another concurrent POST for the same business_id could both pass the `subscription_status === 'active'` check and both create subscriptions.** Stripe's idempotency_key isn't used. **Fix:** add `idempotencyKey: ${business_id}-${tier}-subscribe` to `createSubscription` AND conditional `.update(...).eq('subscription_status', NOT 'active')` after.
- **L22–28 — `x-forwarded-for` trusted without proxy validation** (same as today's scan flagged on `approvals/[token]`). Use `x-vercel-forwarded-for` on Vercel.

**🟡 P2:**
- **L129 — `as unknown as { latest_invoice?: ... }`** Stripe SDK cast deviates from the runtime shape — could mask a real schema drift.

**🟢 GOOD:**
- L7–8, L19–20, L32 — actual rate limiter is wired and consulted FIRST.
- L9–12 Zod schema enforces tier enum + UUID.
- L62–67 — price resolution isolated and error-handled.

---

### `onboarding/create-checkout-session/route.ts` (136 lines)

**🔴 P0:**
- **No auth.** Anyone on the internet can POST `{slug:'dimitri-itr'}` and mint a checkout session against the real client's record. The session URL is then returned in the response. Outcomes:
  - Attacker mints a checkout session against a real client → confused payment flow.
  - Attacker enumerates `nexus_clients.slug` via the 404 / 400 / 200 response distinction.
  - DoS by spinning Stripe sessions (rate limit only on Stripe side).
  **Fix:** require either a signed magic-link token from the client portal, or `x-admin-token` if internally triggered.

**🟠 P1:**
- **L46 — no shape validation on `slug`** beyond `typeof === 'string'`. Insert injection-safe via parameterised query, but slug enumeration is wide-open.
- **L75 — `'https://unite-group.in'` hardcoded fallback** (today's scan flagged this on `admin/approvals/create` L93). Preview deploys mint production-URL success_url → broken redirect.
- **L74 — `'2024-06-20' as never`** version cast (today's scan called the equivalent at `webhooks/stripe`).

**🟡 P2:**
- **L60 — 404 with `{slug}` echoed back** — confirms enumeration.

**🟢 GOOD:**
- L34–44 fail-closed when STRIPE_SECRET_KEY missing.
- L62 — guards on contact_email present.
- L113–120 metadata structured for downstream webhook consumption.

---

### `onboarding/send-magic-link/route.ts` (128 lines)

**🔴 P0:**
- **No auth.** Anyone on the internet can POST `{slug, email, name}` to send a Unite-Group-branded "welcome" email to any address. Trivial phishing weapon — the email comes from Unite-Group infra, with Unite-Group branding, with a token that points at a real Unite-Group URL. **Fix:** gate on `x-admin-token` (route is only called from admin tooling) OR per-email rate limit ≤1/min/email + global ≤10/min.
- **L36–46 — Token is NOT stored anywhere.** The token + base64-payload is sent to the recipient but never persisted server-side. There's no way to (a) revoke, (b) verify on the receiving end (the consuming route would have to re-derive trust from payload signature, but the token isn't signed — see next finding).
- **L36–46 — Token is NOT signed.** `crypto.randomBytes(32)` + base64-encoded JSON payload is a CAPABILITY, not an AUTHENTICATION. The payload `{clientSlug, contactEmail, expiresAt}` is trivially forgeable — flip the slug, base64 re-encode, append any random 32-byte hex. The route that consumes this token (`/clients/[slug]?token=…`) must verify against a stored hash OR an HMAC. There is no signing key in this file. **Fix:** sign the payload `HMAC(MAGIC_LINK_SECRET, payload)` and append; OR store `sha256(token)` in DB and require lookup. The current design is broken — see [[deepsec-scan-2026-05-14]] approvals/[token] L21 for the comparable pattern.

**🟠 P1:**
- **L49 — `NEXT_PUBLIC_APP_URL || 'https://unite-group.in'` fallback** — same preview-deploy mint-production-URL bug as elsewhere.
- **L119, L123 — `error.message` echoed back** on 500.
- **L68 — `firstName` interpolated into HTML without escaping.** If `name` contains `<script>`, you get HTML injection into the email. Most clients sanitise HTML emails but not all. **Fix:** HTML-escape `firstName`.

**🟡 P2:**
- **No CSRF protection.** Cookie not used here, but Origin validation would harden against scripted abuse.

**🟢 GOOD:**
- L36 `crypto.randomBytes(32)` — 256 bits of entropy in the prefix (the payload follows).

---

### `payment/create-intent/route.ts` (87 lines)

**🟠 P1:**
- **L25 — `getUser()` correctly used** but the user can specify **arbitrary `amount` and `metadata`** (L7–15 schema). Authenticated user creates a Payment Intent of $0.50 with attacker-controlled metadata → metadata can be used as data exfil channel into Stripe / poison downstream reconciliation. **Fix:** server-side resolve amount from a pre-priced `cart_id` or `invoice_id`; don't accept raw `amount` from client.
- **L82 — `message: error.message` leak.**
- **L57 — `process.env.STRIPE_SECRET_KEY || ''`** — empty-string fallback means a misconfigured env var produces an opaque Stripe SDK 401 instead of a clear `503 not configured`.
- **No rate limiting.** Authenticated, but a stolen session token can mint 1000s of intents.

**🟡 P2:**
- **L57 same `|| ''` pattern** — silently passes the request to Stripe with an empty key. Should fail-closed.

**🟢 GOOD:**
- L25–28 user auth gate.
- L7–15 Zod schema bounds currency + email shape.

---

### `hermes/chat/route.ts` (59 lines)

**🔴 P0:**
- **No auth on POST or GET.** This proxies user JSON straight into a locally-hosted Hermes LLM gateway (`HERMES_API_URL`, default `http://127.0.0.1:8642`). In Vercel cloud this default is unreachable (so it 502s) — but ANY deploy that sets `HERMES_API_URL` to a reachable gateway exposes free LLM inference to the open internet. **Fix:** gate on user session OR `x-admin-token`; this route is for Phill's CRM, not the public.
- **L10 — proxies `body` verbatim** including `model`, `messages`, `tools` to Hermes. An attacker can request the most expensive model on the cheapest gateway you wire up. SSRF-adjacent in that the body content controls where Hermes routes.

**🟠 P1:**
- **L20 — `detail: text`** echoes back upstream error body. Hermes may include API keys in its 500 traces.

**🟡 P2:**
- **L3 `HERMES_API_URL` default `127.0.0.1:8642`** is fine in serverless (unreachable → 502), but if anyone runs this Next app on a host that ALSO runs Hermes locally, the route becomes a free LLM open-relay.

**🟢 GOOD:**
- L14, L49 — explicit upstream timeouts.
- L26–34 — SSE streaming handled correctly.

---

### `telegram/send/route.ts` (45 lines)

**🔴 P0:**
- **No auth.** Anyone on the internet can POST `{text, persist:true}` to send a Telegram message FROM Phill's bot to Phill's chat. Trivial spam / DoS / social-engineering ("Margot says: approve the pending pairing"). Per [[feedback_no_repeating_alerts]] and the Telegram MCP system reminder, alert-spam corrodes trust. **Fix:** require `x-internal-secret` matching `INTERNAL_API_SECRET`.

**🟠 P1:**
- **L21 — `data.description` echoed back from Telegram** — minor info leak but unauthenticated, so attacker can probe Telegram API state.
- **L36 — `text.slice(0, 2000)` is the only input bound**. No content sanitisation before persist.

**🟡 P2:**
- **L17 `parse_mode: 'Markdown'` with attacker-controlled text** — Telegram's Markdown parser has thrown 400s on unbalanced asterisks. Use `MarkdownV2` with proper escaping or `HTML` with escaping.

**🟢 GOOD:**
- L7 text-required check.
- L11 service-config check.

---

### `telegram/feed/route.ts` (51 lines)

**🔴 P0:**
- **No auth, queries with SERVICE ROLE.** Anyone on the internet can GET `?limit=N` and read up to N rows from `telegram_messages` — which contain Phill's private conversations with Margot, plus any user/agent text routed through the bot. **Fix:** require admin session (`getUser()` + ALLOWED_ADMINS check); this is a private feed.

**🟠 P1:**
- **L12 — `parseInt(limit || '20')` with no upper bound.** `?limit=1000000` returns 1M rows.

**🟢 GOOD:**
- L4 `force-dynamic`.

---

### `linear/issue/route.ts` (90 lines)

**🔴 P0:**
- **No auth.** Anyone can POST `{action:'create', title, description, teamId, priority}` and create Linear issues in Phill's workspace. Trivial weaponisation: spam Linear board, exhaust API rate-limit, exfiltrate via title.
- **L11 — LINEAR_API_KEY sent via `Authorization` header** with full team-write access. Combined with no auth → free Linear-write API to the world.
- **L31, L51 — GraphQL string interpolation.** `teamId` + state-name + priority go into the mutation BODY via JSON encoding (safe). But L31 has `description: "**Client request from CCW portal**\\n\\n${safeBody}\\n\\n..."` — sanitised at L25 to escape `\\` and `"`, but the template literal is a string-built GraphQL mutation. The sanitisation is bolted on; a cleaner pattern uses `variables` (parameterised) as elsewhere in this file (L42-47). Current sanitisation appears correct; the pattern is brittle.

**🟠 P1:**
- **No rate limiting.**

**🟢 GOOD:**
- L42–55 create-flow uses parameterised `variables` (the correct pattern).
- L71 case-insensitive state matching is bounded by the teamId result.

---

### `portal/request/route.ts` (57 lines)

**🔴 P0:**
- **No auth.** Anyone can POST `{message}` and create Linear tickets titled `[CCW Client Request] …`. Spam vector.
- **L28–40 — String-interpolated GraphQL** with `safeTitle` + `safeBody` quote-escaped at L24–25. The escape is fine for `"` and `\\`, but Linear GraphQL also parses `\n` in string literals — and the route deliberately inserts `\\n` to render newlines. Mixing user-controlled newlines into a string-interpolated mutation has a long tail of edge cases. Use `variables`.

**🟠 P1:**
- **No rate limiting.**
- **L20 — fallback to `teams[0]`** if Unite-Group team not found. An attacker who can rename the team can redirect tickets.

**🟢 GOOD:**
- L24–25 quote/backslash escaping is correct for the simple case.
- L6 message-required check.

---

### `logo-fetch/route.ts` (179 lines)

**🟠 P1:**
- **L20–25 — `x-forwarded-for` trusted without proxy validation.** Same finding as today's scan on `approvals/[token]`. Use `x-vercel-forwarded-for`.
- **L20–25 — IP-based rate limiter** is bypassable by an attacker rotating forwarded-for. Combined with the (good) SSRF guard, real-world risk is low but auditor-correct fix is per-Vercel-IP.

**🟡 P2:**
- **L41–63 — regex-based logo scoring** runs against attacker-controlled HTML. ReDoS surface: `logoImgRegex` at L125 has nested repetition. On a 10MB hostile HTML response this could pin a CPU. Mitigated by `signal: AbortSignal.timeout(10000)` at L108 capping fetch + `html` size, but regex eval after `await res.text()` is unbounded.

**🟢 GOOD:**
- L92–98 `checkUrlForSsrf` before outbound fetch — defends private IP / metadata / loopback. Best-in-class.
- L66–80 rate limit FIRST so SSRF-probing bots cost less.
- L108 outbound fetch has explicit timeout.
- Defensible defense-in-depth posture overall.

---

### `marketing/leads/route.ts` (100 lines)

**🟠 P1:**
- **No auth + no rate limit + no CAPTCHA.** Public form-submit endpoint. Spam vector AND a confirmed-email exfiltration channel (returns 200 regardless of email validity → attacker can probe whether SendGrid accepted an address).
- **L96 — `error.message` leak.**

**🟡 P2:**
- **L46–48 — IP / UA captured into SendGrid custom fields** — exfils requester PII into a third party. Acceptable under marketing-consent but should be explicit.
- **L18 — `additionalData: z.record(z.any())`** accepts arbitrary attacker JSON forwarded to SendGrid.

**🟢 GOOD:**
- L6–19 Zod schema enforces email shape.
- L51 — gates SendGrid call on `marketingConsent`.

---

### `calendar/posts/[id]/approve/route.ts` (74 lines)

**🟠 P1:**
- **L54–61 — read-modify-write on `slots` JSONB array is NOT atomic.** Two concurrent approves on different slots in the same calendar both read, both mutate locally, last write wins → one approval is silently lost. Same pattern as today's `approvals/[token]` L88. **Fix:** use a JSONB array-update RPC or pull slots into a child table.
- **L1 `@ts-nocheck`.**

**🟡 P2:**
- **L46–48 — profile.client_id ownership check** is correct but tied to `profiles` table; if the profile row is deleted but a session lingers (the typical race window between Supabase auth user delete and profile cascade) → 403. Defensible.

**🟢 GOOD:**
- L17 auth gate.
- L43–52 ownership verification via profile.

---

### `calendar/posts/[id]/reject/route.ts` (74 lines)

Same code as approve, only difference is `status: 'rejected'` at L58.

**🟠 P1:**
- **L54–61 — same TOCTOU race.** **Fix:** as above.
- **L1 `@ts-nocheck`.**

**🟢 GOOD:**
- Same as approve route.

---

### `calendar/mode/route.ts` (35 lines)

**🟡 P2:**
- **L1 `@ts-nocheck`.**

**🟢 GOOD:**
- L15 auth gate via `getUser()`.
- L21 enum whitelist on mode.
- L25–28 `.eq('id', user.id)` — self-update only, RLS-safe pattern.

---

### `clients/[slug]/brand-vote/route.ts` (98 lines)

**🟠 P1:**
- **L15–19 — `x-forwarded-for` trusted** for the per-IP 24h dedupe. An attacker rotating XFF gets unlimited votes. Comments at L6 acknowledge "one vote per IP per slug per 24h" — but in fact it's "one vote per claimed-XFF". **Fix:** `x-vercel-forwarded-for`.
- **L70–87 — read-modify-write on portal_content JSONB** is NOT atomic. Two concurrent votes both read brand_vote, both increment, last write wins. **Fix:** Postgres-side `jsonb_set` via RPC, OR a votes child table.
- **L96 — `detail` leak.**
- **L1 `@ts-nocheck`.**

**🟡 P2:**
- **L57 — votesLog grows unbounded.** Append-only JSONB array → row size grows with vote count; once it exceeds ~1MB you'll hit Postgres TOAST scaling.

**🟢 GOOD:**
- L27 strict slug regex.
- L32 candidate-length bound.
- L51 candidate-in-shortlist check.
- L47 voting-closed gate.

---

### `clients/featured-opt-in/route.ts` (70 lines)

**🔴 P0:**
- **No auth + service role client.** Anyone with a guessed `client_id` (UUID, but UUIDs leak in URL paths) can flip `featured_programme_status` to `'applied'` on any client. Then a Slack alert fires impersonating that client. Per [[feedback_no_slack]] this whole route is a no-op anyway (Phill rejected Slack), but the unauthenticated mutation surface still exists. **Fix:** require client session or admin token. Better: delete the route per the no-Slack memory.

**🟠 P1:**
- **L52 — SLACK_FEATURED_CLIENTS_WEBHOOK_URL** — per [[feedback_no_slack]] this is a workflow that shouldn't exist. Flag for deletion.

**🟢 GOOD:**
- L27 — conditional update `.eq('featured_programme_status', 'not_applied')` is exactly the atomic-transition pattern today's scan recommended for `approvals/[token]`.

---

### `clients/ccw/health/route.ts` (87 lines)

**🟡 P2:**
- **L36 — fetch to `${apiUrl}/api/swarm/health`** — `apiUrl` comes from `process.env.PI_CEO_API_URL`. Env-controlled, so not SSRF from an attacker, but a misconfig (e.g., apiUrl set to a redirect host) would proxy whatever the env owner points at into the JSON response.
- **L60–82 — fallback to hardcoded fixtures** (`crm_uptime_pct: 99.97`, `agents_active: 2`). Lies to the operator when Pi-CEO is down — same anti-pattern Phill called out in the businesses route. **Fix:** return `source:'unavailable'` with nulls; do not fabricate.

**🟢 GOOD:**
- L39 explicit upstream timeout.
- No auth on a read-only public-health route is defensible.

---

### `brand-iq/[clientId]/route.ts` (98 lines)

**🟡 P2:**
- **L1 `@ts-nocheck`.**
- **L18 — `getSession()` again** (not `getUser()`). Same pattern as `auth/mfa` — stolen-cookie risk.
- **L83 — `console.error` logs full err** which may include Anthropic API errors with prompt fragments.

**🟢 GOOD:**
- L26–34 — explicit clientId ownership check OR admin role.
- L49–53 — 30-day cached next steps to avoid hot-loop inference cost.

---

### `seo/audit/route.ts` (106 lines)

**🟠 P1:**
- **No auth + no rate limit.** Public outbound fetcher — anyone can POST a domain and we fetch+process. Mild SSRF surface: L32 `https://${domain}` accepts any domain, no `checkUrlForSsrf` guard (compare `logo-fetch` which does have it). Mitigated by `https://` prefix forcing the protocol, but `domain = "localhost"` → `https://localhost` → adapter would 502 in serverless. Cloud-host metadata IPs (`169.254.169.254`) get probed if they happen to resolve over HTTPS.
- **L65–67 — sitemap + robots.txt parallel fetch** — no rate limit, attacker can use this as a 3-RPS amplifier against any target.

**🟡 P2:**
- **L75 — `extract` returns first regex match** on possibly 10MB hostile HTML — ReDoS surface like logo-fetch.

**🟢 GOOD:**
- L40, L66–67 — all outbound fetches have explicit timeout.
- L98 `Cache-Control: no-store`.

---

### `seo/audit/pdf/route.ts` (263 lines)

**🟠 P1:**
- **Same no-auth + SSRF surface as `seo/audit`** (L9, L33). Returns a 30KB+ PDF — bandwidth amplification factor much higher than the JSON route. Trivial DoS vector: 100 RPS = 3MB/s outbound from your Vercel function.
- **No rate limit.**

**🟡 P2:**
- **L254 — domain echoed into `Content-Disposition` filename**, sanitised via L254 `replace(/[^a-z0-9.-]/gi, '_')` — safe.

**🟢 GOOD:**
- L254 filename sanitisation.
- L13 explicit timeout on outbound fetch.

---

### `cron/process-scan-requests/route.ts` (383 lines)

**🔴 P0:**
- **L242 — `auth !== \`Bearer ${process.env.CRON_SECRET}\`` is NOT constant-time.** Same class as today's scan's `admin/approvals/create` finding. CRON_SECRET grants unlimited scan-trigger + write to `pi_ceo_health_snapshots`. **Fix:** `crypto.timingSafeEqual`.

**🟠 P1:**
- **L249–273 — Claim race.** Two cron ticks (e.g., manual + scheduled) could both `select … status='pending'` → both `update status='running'`. The conditional `.eq('status', 'pending')` at L273 partially closes this — but the SELECT-then-conditional-UPDATE still has a window if the second SELECT happens between the first SELECT and UPDATE. **Fix:** use `UPDATE … RETURNING` with the conditional in one statement via `.update(...).eq('status','pending').select().single()`.
- **L259, L277, L309, L321 — error.message echoed back.**
- **L321 — `snapshot insert failed: ${err.message}`** in a non-auth-checked branch of `failRow` — accessible only after CRON_SECRET passes, so risk is lower, but the message goes back to the cron caller.

**🟡 P2:**
- **L75 — Linear authorization header without `Bearer` prefix** — Linear's docs say to use the raw key OR Bearer; current works. Inconsistent with other Linear routes in this codebase (some use Bearer, some raw). Standardise.

**🟢 GOOD:**
- L24 `maxDuration = 60` — explicit bound for the slow GitHub+Supabase+Linear sequential.
- L93–119 `computeSecurityScore` is pure + well-bounded.
- L122–148 `computeOverallHealth` clamped 0–100.
- L313–322 — INSERT then mark complete (separates side-effect from idempotency mark).

---

### `cron/integrations/{github,linear,vercel,railway,supabase,stripe,digitalocean,composio,onepassword}/route.ts`

These 9 cron routes share an identical template — bearer-token gate, sync function call, write `integration_sync_state`. Issues apply to ALL 9 unless noted.

**🔴 P0 (all 9):**
- **L12 — `auth !== \`Bearer ${process.env.CRON_SECRET}\`` is NOT constant-time.** Same finding as `process-scan-requests`.

**🟠 P1 (all 9):**
- **L52–66 — `last_sync_error: err.message`** is written to DB. If a sync wraps a Stripe/GitHub/etc 401 the message may include partial credentials. Low blast (column is admin-only) but should be sanitised.

**🟡 P2:**
- **All — no `dynamic = 'force-dynamic'`** explicitly set (relies on `runtime = 'nodejs'`). Next typically infers correctly given the side-effects but explicit is safer.
- **`onepassword/route.ts` L1** — comment says this route is NOT registered in vercel.json yet still defines `runtime='nodejs'` + `maxDuration=60`. The route is reachable if anyone discovers the URL. Either remove the file or gate behind a feature flag.

**🟢 GOOD (all 9):**
- Consistent error-handling, retry-via-cron pattern.
- Upsert of `integration_sync_state` with `ignoreDuplicates` is correct seeding.
- `runtime='nodejs'` + `maxDuration` set explicitly.

---

### `cron/geo-citation-monitor/route.ts` (46 lines)

**🔴 P0:**
- **L21 — `authHeader === \`Bearer ${cronSecret}\`` NOT constant-time.**

**🟡 P2:**
- **L16–18 — dev-mode fallback** allows the route to run unauthenticated when `NODE_ENV === 'development'`. Acceptable if Vercel preview deployments don't run in development NODE_ENV (they don't — Next preview is 'production'). Confirmed safe but worth documenting.

**🟢 GOOD:**
- L24–46 clean error-handling.

---

### `cron/synthex-monitor/route.ts` (2 lines)

**🟡 P2:**
- **2-line stub.** Returns `{ok:true}` with no auth. Defensible as a placeholder, but unauthenticated `{ok:true}` is a beacon that can be enumerated for "this Vercel project has a Synthex cron." Add 401 if `CRON_SECRET` not set.

**🟢 GOOD:**
- Tiny scope — nothing to attack.

---

### `compliance-automation/route.ts` (964 lines)

**🔴 P0:**
- **No auth on POST or GET.** This entire route is mock/fixture data masquerading as a compliance API — it has NO real auth, NO Supabase writes, just hardcoded `score: 96.2` returned per request. The data is fake, but the route is reachable. Per [[feedback_audit_verification]] this whole file should be flagged: it's a fake compliance surface that could be relied on by an operator who doesn't realise it's stubbed.
- **L780 — `process.env.OPENAI_API_KEY || ''`** silently calls OpenAI with empty key. Combined with no auth on POST + arbitrary `action` switch, an attacker can invoke `monitor_compliance` / `generate_compliance_report` / etc.  — each call hits the AI gateway. Free LLM amplification with no rate limit.

**🟠 P1:**
- **L758 — `generateHash(data)` uses `Math.random()`** for integrity verification. This is a non-cryptographic hash claimed to be tamper-evident. False-advertised security.
- **L760 — `getLastAuditHash()` returns a Date-based fake.** No actual audit chain.

**🟡 P2:**
- **L831, L957 — `error.message` leak.**
- **L766 — `Math.random().toString(36).substr(2, 9)`** for "secure" ID. `Math.random` is not crypto-grade.

**🟢 GOOD:**
- The lazy-init `complianceService` pattern at L775 avoids cold-start cost.

This route is a P0 by virtue of being a fake-compliance facade — recommend DELETING the entire file or replacing with a real Supabase-backed implementation. Documenting "compliance score 96.2%" from this route to a regulator would be material misrepresentation.

---

### `content-generation/route.ts` (249 lines)

**🔴 P0:**
- **No auth on POST or GET.** Any internet caller can invoke 17 different LLM-backed actions (generate_content, generate_calendar, analyze_market, …). Each request hits OpenAI gpt-4o-mini at the configured pricing tier. **Direct cost amplification: trivial $-DoS attack.** Single attacker at 100 req/min generating 4K-token outputs = ~$50/min OpenAI burn. **Fix:** require admin session + per-user rate limit + token-budget cap per request.
- **L57 — `process.env.OPENAI_API_KEY || ''`** — empty-string fallback hides misconfig.

**🟠 P1:**
- **L194 — `error.message` leak.**
- **No rate limiting.**

**🟡 P2:**
- **L86 — `const { action, ...data } = await request.json()`** — accepts arbitrary unbounded body. No size limit.

**🟢 GOOD:**
- L88–187 — bounded `switch(action)` whitelist — no arbitrary-method invocation.

---

### `empire/system-health/route.ts` (456 lines)

**🟠 P1:**
- **L162–166 — auth-passthrough.** When probing `/api/empire/integrations`, this route reads `PI_CEO_API_KEY` from env and **forwards it as `x-admin-token`** to the inbound URL. If `getBaseUrl()` is poisoned (e.g., attacker controls a vhost that's CNAMEd to the Vercel app via wildcard misconfig) the admin token leaks. **Fix:** detect same-origin via known list, not echo back.
- **L161 — outbound fetches to `${baseUrl}/api/...` with no URL allow-list** beyond `getBaseUrl()`. If `req.url` is `https://attacker.com/api/empire/system-health` (e.g., via SSRF from elsewhere or a misconfigured rewrite) the probes hit attacker.com with the PI_CEO_API_KEY header.
- **L367 — `process.env.VERCEL_INTEGRATION_TOKEN ?? process.env.VERCEL_TOKEN`** — fallback chain is reasonable but the second name is conventionally a CLI-only token with broader scope. Document.

**🟡 P2:**
- **L437 — module-scoped cache** survives Lambda warm-starts but is per-instance. Cache stampedes during cold-cold.

**🟢 GOOD:**
- L66 explicit per-probe timeout.
- L171–175 graceful adapter degradation.
- L100–106 status rollup logic is sound.
- L195–210 deliberate separation of adapter-health from brand-health (avoids the conflation pattern the inline comment correctly calls out).

---

### `empire/integrations/route.ts` (24 lines)

**🟠 P1:**
- **L13 — `token === expected` NOT constant-time.** Comment at L5–8 acknowledges this is deferred ("H1 deferred globally; swap to crypto.timingSafeEqual when JWT helper lands"). Today's scan flagged the SAME class of issue as P0 on admin/approvals/create. **Status:** known debt. Recommend ship the fix now rather than wait for the JWT helper.

**🟢 GOOD:**
- L7–14 auth gated.
- L22 service-call isolation.

---

### `empire/developers/route.ts` (34 lines) + `empire/developers/[email]/route.ts` (42 lines)

**🟠 P1:**
- **L19 (both) — same non-constant-time compare as `empire/integrations`.** Same fix.

**🟡 P2:**
- **`[email]/route.ts` L33 — `decodeURIComponent(email)`** with no validation. Linear `%00` etc. are theoretically possible but PostgREST .eq() is parameterised.

**🟢 GOOD:**
- Auth check before any DB read.
- Caches headers correct.

---

### `empire/businesses/route.ts` (139 lines)

**🟡 P2:**
- **No auth.** Public read-only of portfolio business names, ARR, slugs, health scores. Phill's strategic-financial info is exposed. **Consider:** ARR + health scores are confidential to Unite-Group; the public-facing site shouldn't expose them. Gate behind admin token if used only by admin UI.

**🟢 GOOD:**
- L42 service-client read-only.
- L77–80 `is_sandbox` filter.
- L86–93 dedupe by slug.

---

### `empire/rescan/[slug]/route.ts` (107 lines)

**🟠 P1:**
- **L19 — No auth.** Anyone can POST to enqueue a Pi-CEO scan against any slug. The scan worker consumes the queue and bills its own infra (GitHub API calls + Supabase admin + Linear). Per the worker's `maxDuration=60` at process-scan-requests, attacker drives 60s of compute per RPS. Cost amplification.
- **L51–54 — `x-user-email` / `x-session-email` taken from headers without verification.** Anyone can set `x-user-email: phill@unite-group.in` to spoof the requester. Used in audit columns — pollutes the audit trail.

**🟢 GOOD:**
- L33–46 — validates slug exists before queueing.
- L26 — bare-bones type check.

---

### `empire/source-matrix/route.ts` (191 lines)

**🟡 P2:**
- **No auth, public read.** Reads adapter health for all portfolio brands. Same confidentiality concern as `empire/businesses`.
- **L80–88 — outbound fetch to `/api/empire/sources/${kind}/${slug}` with no allow-list.** Bounded by SOURCE_KINDS + PORTFOLIO_SLUGS hardcoded lists — safe in practice.

**🟢 GOOD:**
- L83 timeout per cell.
- L86 status validation before trust.
- L137 parallel fetch.
- L53 module-cache TTL of 60s.

---

### `empire/sources/{github,linear,vercel,railway,supabase}/[slug]/route.ts`

5 routes, similar structure: read business row, fetch upstream API, return BusinessSource.

**🟡 P2 (all 5):**
- **No auth.** Each leaks live status of one brand's infra to anyone who guesses the slug. PORTFOLIO_SLUGS list is hardcoded elsewhere; slugs are public.
- **GitHub L82–85 — bare token sent without `Bearer` prefix elsewhere** is consistent here (uses `resolveGithubToken()` from shared lib). OK.

**🟢 GOOD (all 5):**
- Consistent timeout + error-handling.
- NO MOCK DATA — errors surface honestly per Phill's directive.
- Per-adapter `deriveStatus` derived from real signals.
- Linear L57–66 — thresholds tuned for actual portfolio velocity.

---

### `empire/tickets/[slug]/route.ts` (159 lines)

**🟠 P1:**
- **No auth.** Open-internet read of Linear tickets for any portfolio slug. Linear titles + state names leak product roadmap.
- **L31 — module-scoped `ticketCache` Map** grows unbounded if many distinct slugs are queried. Hardcoded portfolio is 6 — fine in practice. If extended to arbitrary slugs, leak.

**🟢 GOOD:**
- L123 timeout.
- L133 graceful error.

---

### `empire/health/route.ts` (108 lines)

**🟡 P2:**
- **No auth.** Public health roll-up — ARR + active agents leak.
- **L23 — `PI_CEO_KEY = process.env.PI_CEO_API_KEY || ''`** empty-string fallback.
- **L67–90 — fallback to hardcoded fixtures** (uptime_pct, deploy_frequency, etc.). Per Phill's "no mock" rule, this whole file lies when Pi-CEO is unreachable. The comments inside `empire/businesses` say it was fixed there — this route still fabricates.

**🟢 GOOD:**
- L24 timeout.
- L35 parallel fetch.

---

### `empire/pipeline/route.ts` (95 lines)

**🟡 P2:**
- **No auth.** Reads `agent_actions` table directly via service role + filesystem reads. Public exposure.
- **L8–14 — `fs.readdir/readFile` on `Pi-CEO/Pi-Dev-Ops/.harness/`** — filesystem dependency that only works on Phill's Mac. In Vercel cloud these always fail (caught at L18, L31).

**🟢 GOOD:**
- L40 `created_at >= since` window-bounded query.

---

### `empire/senior-agents/route.ts` (115 lines)

**🟡 P2:**
- **No auth.** Same filesystem-only pattern. CFO/CTO/CMO MRR + runway data leaks.
- **L28 — `fs.readFileSync` blocking the event loop.** Use `await fs.promises.readFile`.

**🟢 GOOD:**
- L33 catch on parse error.

---

### `empire/appstore/route.ts` (43 lines)

**🟢 GOOD:**
- Public iTunes lookup, no secrets, no DB writes. L12 has revalidate. Read-only public data echoed back.
- L37 graceful error path.

---

### `empire/board-minutes/route.ts` (39 lines)

**🟡 P2:**
- **No auth + filesystem-only.** Reads board-meeting minutes from local FS. Leaks strategic decisions if FS is accessible (Vercel: no, local: yes). In Vercel cloud always returns `{minutes:[]}`.

**🟢 GOOD:**
- L37 catch returns empty list.

---

### `empire/priorities/route.ts` (82 lines)

**🟡 P2:**
- **No auth.** Linear top-8 P0/P1 issues exposed (titles + descriptions). Strategic info leak.

**🟢 GOOD:**
- L49 timeout.

---

### `health/route.ts` (61 lines)

**🟢 GOOD:**
- Designed as a public liveness probe — no auth required is correct.
- L57 always returns 200 even on degraded DB — prevents uptime-monitor false-positives.
- L20 dynamic+nodejs explicit.
- L47–55 bounded response body — no env leak.

---

### `dashboard/videos/route.ts` (38 lines)

**🟡 P2:**
- **L1 `@ts-nocheck`.**
- **L18 — `getSession()` not `getUser()`.** Stolen-cookie risk class (same as auth/mfa).

**🟢 GOOD:**
- L19 auth gate.
- L25 client_id ownership scoping.

---

### `notifications/route.ts` (32 lines) + `notifications/[id]/read/route.ts` (33 lines)

**🟡 P2:**
- **Both `@ts-nocheck`.**
- **Both use `getSession()` not `getUser()`.**

**🟢 GOOD:**
- Both scope to `client_id = session.user.id` — RLS-safe pattern.
- Read route bounded to 20 rows.

---

### `push/subscribe/route.ts` (111 lines)

**🟠 P1:**
- **L83–88 — anonymous-user upsert on `endpoint` UNIQUE.** Anyone can register a push subscription tied to NO user. Storage exhaustion vector — register 1M endpoints. Mitigated by service-worker push needing browser registration, so endpoint forgery is non-trivial — but `endpoint` is just a URL field, no upstream FCM/APNS verification.
- **L1 `@ts-nocheck`.**

**🟡 P2:**
- **L40 — `getSession()` not `getUser()`.**

**🟢 GOOD:**
- L9–16 Zod schema enforces endpoint URL + keys structure.
- L59–66 upsert on endpoint UNIQUE — idempotent across re-registration.

---

### `compliance/cookie-consent/route.ts` (122 lines)

**🟠 P1:**
- **L17 — `sessionId` accepted from body** — client-controlled. An attacker can spoof any sessionId and stamp consent against another session. Cookie consent is a regulatory artefact (Privacy Act 1988 / GDPR) — forgeable consent is non-compliant.
- **L67, L119 — `${error.message}` leak.**
- **L39–42 — `x-forwarded-for` trust** for the regulatory IP record.

**🟢 GOOD:**
- L19, L27 — required-field gates.
- L33–36 — optionally enrich with session.user.id when present.

---

### `internal/sync-post-performance/route.ts` (118 lines)

**🟠 P1:**
- **L36 — `secret !== process.env.INTERNAL_API_SECRET` NOT constant-time.** Same class as cron secrets.
- **L63, L84, L109 — JSON-stringified error logs include `error.message`.** OK for service-internal logs; not echoed to caller.

**🟢 GOOD:**
- L34–37 secret gate first.
- L55–70 idempotency guard via `first_win_detected` column.
- L88–91 cold-start branch returns gracefully.

---

### `internal/process-publish-queue/route.ts` (19 lines)

**🟠 P1:**
- **L6 — `secret !== process.env.INTERNAL_API_SECRET` NOT constant-time.**

**🟢 GOOD:**
- Minimal surface, tight scope.

---

### `mandates/route.ts` (18 lines)

**🟡 P2:**
- **No auth + service role read.** Returns up-to-5 open `board_mandates` rows including `pr_url`, `ci_status`, `phill_approved`. Pre-merge strategic info to anyone hitting the URL.

**🟢 GOOD:**
- L17 bounded limit(5).

---

### `portal/artefacts/route.ts` (67 lines)

**🟡 P2:**
- **No auth.** Filesystem reader for client artefacts. Vercel cloud: dir absent → empty list. Local Mac: full read.
- **L42 — `FOLDER_MAP[clientSlug] ?? clientSlug`** — fallback allows path traversal IF clientSlug contains `..` (URL-allowed). The `join(os.homedir(), 'Pi-CEO/...', folder)` does NOT canonicalise, so `clientSlug=../../etc` could escape the artefacts root. **Test it:** Node `path.join` collapses `..` segments but does NOT prevent traversal to parent dirs of `Pi-CEO/.harness/artefacts`. **Fix:** assert `clientSlug.match(/^[a-z0-9-]+$/)` before use.

**🟢 GOOD:**
- L46 try/catch on readdir.

---

### `portal/summary/route.ts` (64 lines)

**🟡 P2:**
- **L1 `@ts-nocheck`.**
- **L31 — `getUser()` correctly used.**
- **L40 — hardcoded `slug='ccw-crm'`** — the auth gate doesn't actually scope to the authenticated user's client. Any authenticated user sees CCW data.

**🟢 GOOD:**
- L31–34 auth gate.

---

### `portal/seo-refresh/route.ts` (88 lines)

**🔴 P0:**
- **No auth.** Anyone can POST and burn SEMRUSH API units against `ccwonline.com.au`. SEMRUSH units are paid (~$0.10 each at retail). 20 keywords + overview = ~80 units per request. 100 req/min = $480/min burn rate. **Fix:** require admin token; route is for cron, not public.

**🟠 P1:**
- **L27 — `process.env.SEMRUSH_API_KEY`** sent direct in query string at L9. URL-encoded, but if anything in the path logs URLs (Vercel access logs, Sentry breadcrumbs) the key lands in logs. **Fix:** SEMRUSH supports POST in some endpoints; for GET, log redaction is the only mitigation — document.

**🟢 GOOD:**
- L11 timeout.
- L76–85 idempotent upsert.

---

### `pi-ceo/activity/route.ts` (70 lines)

**🟡 P2:**
- **No auth.** Public read of Pi-CEO activity events.
- **L9 — `PI_CEO_KEY = process.env.PI_CEO_API_KEY || ''`** empty-string pattern.

**🟢 GOOD:**
- L19, L31 timeouts.
- L58 catch returns gracefully.

---

### `pi-ceo/health/route.ts` (162 lines)

**🟡 P2:**
- **No auth.** Public read of Pi-CEO autonomy + swarm status, including kill_switch state.
- **L117 — falls back to local FS** (`.pi-ceo/`). Same pattern as senior-agents.

**🟢 GOOD:**
- L72, L77 timeouts.
- L66 graceful fall-back chain.

---

### `pi-ceo/history/route.ts` (29 lines)

**🟡 P2:**
- **No auth + service role.** Public read of `pi_ceo_health_snapshots` and `pi_ceo_activity`. Snapshot includes security_score for every brand — exposes which portfolio companies have security debt.

**🟢 GOOD:**
- L17, L26 bounded limit.

---

### `intelligence/activity/route.ts` (17 lines)

**🟡 P2:**
- **No auth + service role.** Public read of `pi_ceo_activity` — bounded by limit(100).

---

### `intelligence/health-snapshots/route.ts` (14 lines)

**🟡 P2:**
- **No auth + service role.** Public read of `pi_ceo_health_snapshots` — bounded by limit(500).

---

### `intelligence/wiki-pages/route.ts` (13 lines)

**🟡 P2:**
- **No auth + service role.** Public read of `wiki_pages` titles/tags/word_count. Could leak the existence of sensitive wiki pages.

---

### `sources/route.ts` (14 lines)

**🟡 P2:**
- **No auth + service role.** Public read of `wiki_sources` (pending + completed Sources/ ingestion queue).

---

### `wiki/route.ts` (23 lines)

**🟠 P1:**
- **No auth + service role.** Public read of `wiki_pages` including FULL CONTENT when `slug` provided. Phill's strategic brain — competitor positioning, exit thesis, financial planning — is in the wiki. This route is a **complete data exfiltration channel** for anyone who guesses or enumerates page IDs. **Fix:** require admin token; the wiki is private.
- **L19 — `query.ilike('title', \`%${search}%\`)`** — wildcard search on title is safe in PostgREST (parameterised), but unauthenticated.

---

### `wiki/exit-thesis/route.ts` (45 lines) + `wiki/priorities/route.ts` (41 lines) + `wiki/context/[slug]/route.ts` (59 lines)

**🟠 P1 (all 3):**
- **No auth.** All three return strategic wiki content publicly:
  - `exit-thesis`: ARR targets, $167M-$250M minimum exit, deal comparables, days remaining to target.
  - `priorities`: ranked Q2-2026 operational priorities + alert conditions + owners.
  - `context/[slug]`: mission, positioning, tech stack, key risks — for any portfolio brand.

This is the equivalent of leaving Unite-Group's strategic plan in a public Google Doc with the URL search-indexed. **Fix:** require admin auth on all three.

**🟡 P2:**
- **`context/[slug]/route.ts` L5–12** — regex sections with `[\s\S]*?` over arbitrary user-controlled wiki content. ReDoS surface inside an admin route is low risk, but worth bounding.

---

## Cross-cutting findings

1. **Wholesale absence of constant-time secret compare.** Every cron route + every internal-secret route + every PI_CEO_API_KEY check uses `===` on a bearer token. ~12 routes affected. ALL get fixed by a single helper:
   ```ts
   // src/lib/security/safe-compare.ts
   import { timingSafeEqual } from 'crypto';
   export function safeBearerEq(provided: string | null, expected: string | undefined): boolean {
     if (!provided || !expected) return false;
     if (provided.length !== expected.length) return false;
     return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
   }
   ```
   Then sed-replace across all 12 routes.

2. **Wholesale absence of auth on public routes.** 30+ routes have NO auth gate at all. Many leak strategic info (wiki, empire/*, mandates, pi-ceo/*). Many enable cost amplification (content-generation, portal/seo-refresh, hermes/chat). Many are spam vectors (telegram/send, linear/issue, onboarding/send-magic-link, webhooks/video-published). This is the single largest finding of this scan. Recommend a per-route auth audit on EVERY route under `/api/empire/*`, `/api/intelligence/*`, `/api/wiki/*`, `/api/pi-ceo/*`, `/api/mandates`, `/api/sources`, plus the public-facing routes called out individually.

3. **`getSession()` vs `getUser()` inconsistency.** ~12 routes use `getSession()` (trusts cookie, no JWT re-validation) while 5–6 routes use `getUser()` (re-validates server-side). Phill's most-recent best-practice (`admin/bots/provision` L57) is `getUser()`. **Fix:** standardise — `getUser()` everywhere; `getSession()` is for non-security UI hints only.

4. **`@ts-nocheck` on 15+ routes.** Same call-out as today's scan. Mass-removal probably catches 5–10 real type errors that block bugs.

5. **`detail: err.message` error leak in 25+ routes.** Same finding as today's scan, just at scale. Standardise via a `safeError()` helper that logs server-side, returns `{error, request_id}`.

6. **Hardcoded fallback URLs / fixtures.** `clients/ccw/health`, `empire/health`, `empire/senior-agents` all return fabricated values when their upstream is down. Phill explicitly killed this anti-pattern in `empire/businesses` — apply consistently.

7. **Read-modify-write on JSONB columns** without atomic update. `calendar/posts/{id}/{approve,reject}` and `clients/[slug]/brand-vote` all have the same lost-update race as today's `approvals/[token]` finding. Fix pattern: pull rows into child tables OR use Postgres-side `jsonb_set` via RPC.

8. **`x-forwarded-for` trust** on 6+ routes. Vercel-specific fix: use `x-vercel-forwarded-for` (Vercel-signed).

9. **Service role client used where user JWT would suffice.** Several routes (notifications, organizations, projects) use the user-scoped supabase client correctly — but `telegram/feed`, `webhooks/video-published`, `clients/featured-opt-in`, `mandates`, `sources`, `wiki/*` use service role with no auth gate. Each is a direct RLS bypass surface.

10. **Cost-amplification surfaces.** `content-generation`, `hermes/chat`, `portal/seo-refresh`, `seo/audit/pdf`, `empire/rescan/[slug]`, `webhooks/video-published` all drive paid third-party APIs (OpenAI, SEMRUSH, Stripe, GitHub) on unauthenticated input. Single attacker can burn $100s/min across this surface area. Cross-reference [[feedback_authorization_scope]] — Vercel-billed APIs need auth gates.

## Triage summary

| Route | P0 | P1 | P2 |
|---|---|---|---|
| billing/webhook | 0 | 2 | 1 |
| webhooks/video-published | 1 | 2 | 1 |
| auth/mfa | 2 | 2 | 2 |
| admin/bots/provision | 0 | 3 | 3 |
| billing/subscribe | 1 | 3 | 1 |
| onboarding/create-checkout-session | 1 | 3 | 1 |
| onboarding/send-magic-link | 3 | 3 | 1 |
| payment/create-intent | 0 | 4 | 1 |
| hermes/chat | 2 | 1 | 1 |
| telegram/send | 1 | 2 | 1 |
| telegram/feed | 1 | 1 | 0 |
| linear/issue | 3 | 1 | 0 |
| portal/request | 2 | 2 | 0 |
| logo-fetch | 0 | 2 | 1 |
| marketing/leads | 0 | 2 | 2 |
| calendar/posts/{id}/approve | 0 | 2 | 1 |
| calendar/posts/{id}/reject | 0 | 2 | 1 |
| calendar/mode | 0 | 0 | 1 |
| clients/[slug]/brand-vote | 0 | 4 | 2 |
| clients/featured-opt-in | 1 | 1 | 0 |
| clients/ccw/health | 0 | 0 | 2 |
| brand-iq/[clientId] | 0 | 0 | 3 |
| seo/audit | 0 | 2 | 1 |
| seo/audit/pdf | 0 | 2 | 1 |
| cron/process-scan-requests | 1 | 3 | 1 |
| cron/integrations/* (×9) | 9 | 9 | 9 |
| cron/geo-citation-monitor | 1 | 0 | 1 |
| cron/synthex-monitor | 0 | 0 | 1 |
| compliance-automation | 1 | 2 | 2 |
| content-generation | 1 | 2 | 1 |
| empire/system-health | 0 | 3 | 1 |
| empire/integrations | 0 | 1 | 0 |
| empire/developers (×2) | 0 | 2 | 1 |
| empire/businesses | 0 | 0 | 1 |
| empire/rescan/[slug] | 0 | 2 | 0 |
| empire/source-matrix | 0 | 0 | 1 |
| empire/sources/* (×5) | 0 | 0 | 5 |
| empire/tickets/[slug] | 0 | 1 | 1 |
| empire/health | 0 | 0 | 3 |
| empire/pipeline | 0 | 0 | 2 |
| empire/senior-agents | 0 | 0 | 2 |
| empire/appstore | 0 | 0 | 0 |
| empire/board-minutes | 0 | 0 | 1 |
| empire/priorities | 0 | 0 | 1 |
| health | 0 | 0 | 0 |
| dashboard/videos | 0 | 0 | 2 |
| notifications (+/[id]/read) | 0 | 0 | 4 |
| push/subscribe | 0 | 1 | 2 |
| compliance/cookie-consent | 0 | 3 | 0 |
| internal/sync-post-performance | 0 | 1 | 0 |
| internal/process-publish-queue | 0 | 1 | 0 |
| mandates | 0 | 0 | 1 |
| portal/artefacts | 0 | 0 | 1 |
| portal/summary | 0 | 0 | 3 |
| portal/seo-refresh | 1 | 1 | 0 |
| pi-ceo/activity | 0 | 0 | 2 |
| pi-ceo/health | 0 | 0 | 2 |
| pi-ceo/history | 0 | 0 | 1 |
| intelligence/* (×3) | 0 | 0 | 3 |
| sources | 0 | 0 | 1 |
| wiki | 0 | 1 | 0 |
| wiki/exit-thesis | 0 | 1 | 0 |
| wiki/priorities | 0 | 1 | 0 |
| wiki/context/[slug] | 0 | 1 | 1 |
| projects | 0 | 0 | 0 |
| organizations | 0 | 0 | 0 |
| **Total** | **29** | **74** | **88** |

(Note: `cron/integrations/*` counted as 9 instances of the same P0/P1/P2 pattern.)

## Top 5 fix priorities

1. **Constant-time bearer compare helper + sed-replace across all 12 cron + internal-secret + admin-token routes.** Single `src/lib/security/safe-compare.ts` + 12-file replace lands the single biggest class fix. Same blast radius as today's `admin/approvals/create` L36 fix but across 12 routes. ~30 min work; closes 12 P0s in one PR.

2. **Add auth + per-IP rate limit to the 6 highest cost-amplification routes:** `content-generation`, `hermes/chat`, `portal/seo-refresh`, `seo/audit/pdf`, `webhooks/video-published`, `onboarding/send-magic-link`. Each can be turned into a four-digit-dollar burn at 100 RPS. Single PR wires `@upstash/ratelimit` + admin-token check on each.

3. **Gate the entire `/api/wiki/*`, `/api/pi-ceo/*`, `/api/empire/*`, `/api/mandates`, `/api/intelligence/*`, `/api/sources`, `/api/portal/artefacts` namespaces behind admin auth.** This is Phill's strategic brain leaking publicly: exit thesis, priorities, mandates, board minutes, ARR by brand. Mass-add `getUser()` + ALLOWED_ADMINS check at the top of each handler. Probably 25-30 files; one PR.

4. **Fix `auth/mfa` PATCH (verify) endpoint — currently brute-forceable.** Add per-userId rate limit (5/15min, lock at 10) AND require a partial-auth challenge JWT from the password-step. This is the only auth-system finding that creates a real-world account-takeover path.

5. **Replace `onboarding/send-magic-link` token model.** Currently sends an unsigned, unstored token — the receiving route cannot legitimately verify it. Either (a) HMAC-sign `{slug,email,expires}` with `MAGIC_LINK_SECRET` + verify on consume, or (b) persist `sha256(token)` in DB and require lookup. Match the `approvals/[token]` post-fix pattern from today's scan Top-5.

## Things deliberately ruled out

- **SQL injection** — every DB call uses `.from().eq()/.update()/.insert()`. The Linear GraphQL string-interpolation routes (`linear/issue`, `portal/request`) do escape `"` and `\\`, then build mutations as strings. Defensible but ugly; the parameterised `variables` path is correct and used elsewhere in `linear/issue/route.ts` itself. No injection found in practice.
- **Command injection** — no `child_process`/`exec`/`spawn`/shell in any route. `fs.readdir`/`fs.readFile` only — no shell-out.
- **NEXT_PUBLIC_ secret leak** — only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` referenced; none secret.
- **CORS `*`** — no manual CORS headers; Next.js same-origin default. Clean.
- **Path traversal** — checked `portal/artefacts` L42 (called out as P2) and `wiki/context/[slug]` (uses Supabase `.eq('id', wikiId)` — parameterised). `portal/artefacts` is the only finding.
- **JSONB injection** — All JSONB writes use object literals via parameterised client. No raw JSON-string concatenation found.
- **Stripe API version pinning** — `billing/subscribe` uses the typed SDK constructor; `onboarding/create-checkout-session` casts `'2024-06-20' as never` (called out as P1).
- **Open redirects** — `onboarding/create-checkout-session` L122 builds `success_url` from `appUrl` (env-controlled, fallback string). Not user-controlled. Clean.

## Verdict

These routes are **NOT production-safe as-is.** The single biggest finding is **wholesale absence of auth on routes that expose Phill's strategic brain and burn paid third-party APIs.** This is a Day-Zero-correct posture for an internal-tools repo that grew into a public-facing product without re-gating the existing routes. Most of these 29 P0 findings collapse into ~4 systemic PRs, not 29 individual ones.

**Recommendation:** Ship a sequenced trio of PRs:

- `security: P0 batch 2a — constant-time bearer compare across 12 cron+admin routes` (lands #1 above)
- `security: P0 batch 2b — auth-gate strategic-info namespaces (wiki, empire, mandates, intelligence, pi-ceo)` (lands #3)
- `security: P0 batch 2c — rate-limit + auth on cost-amplification routes (content-generation, hermes, seo-refresh, audit-pdf, video-webhook, magic-link)` (lands #2, #5)

Do not auto-merge any of these — Phill reviews each. The `auth/mfa` brute-force fix (#4) can ship in its own PR if Phill's MFA users are actively at risk; otherwise bundle with #3.

Approval routes from the first scan + magic-link routes here together account for ~80% of the externally-reachable risk surface; landing both deepsec scans' Top-5s gets the empire from "leaky" to "tight."

— *DeepSec Scan Batch 2, 2026-05-14*
