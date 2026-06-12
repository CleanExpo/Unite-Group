---
type: wiki
updated: 2026-05-14
---

# DeepSec Scan — 2026-05-14 — 4 production routes

Adversarial SAST pass on 4 routes merged to `unite-group.in` today. All paths under `/Users/phill-mac/pi-seo-workspace/unite-group/src/app/api/`.

## Per-route findings

### `webhooks/stripe/route.ts` (197 lines)

**🔴 P0:**

- **L57–75 — Idempotency TOCTOU race.** "Select then insert" is not atomic. Stripe retries deliver duplicates within ms; two handlers both pass the `existing` check, both insert, both call `activateClientByStripeCustomer` → double Hour-1 provisioning, duplicate emails, duplicate Linear projects. **Fix:** UNIQUE constraint on `stripe_event_id`; `.insert(...)` then treat `23505` as duplicate, return 200. Dispatch only AFTER insert succeeds.

**🟠 P1:**

- **L156–195 — Activation race on concurrent first payments.** `isFirstPayment` check + status update are separate ops. Parallel `checkout.session.completed` + `payment_intent.succeeded` both observe `onboarding` and both enqueue. **Fix:** conditional update `.update({status:'active'}).eq('stripe_customer_id', id).eq('status','onboarding').select()` — enqueue only if 1 row returned.
- **L103 — Error detail leak via `detail: err.message`.** Stripe SDK errors can include keys, emails, schema. Drop `detail`; log server-side only.
- **L34 — `'2026-04-22.dahlia' as any`** defeats SDK type guard. Drop the cast.

**🟡 P2:**

- **L1 `@ts-nocheck`** masks regressions. Remove.
- **L69 — raw event persisted as `payload`** can hold buyer PII (billing address). Verify `stripe_events` is RLS-locked to service role.

**🟢 GOOD:**

- L51 `stripe.webhooks.constructEvent` — constant-time HMAC before side effects.
- L47 `await request.text()` BEFORE parse — raw-body invariant preserved.
- L173 onboarding gate prevents milestone payments re-triggering provisioning (logic correct, race aside).
- L22 `runtime = 'nodejs'` explicit for `crypto`.

---

### `admin/approvals/create/route.ts` (106 lines)

**🔴 P0:**

- **L36 — Service-role bearer comparison NOT constant-time.** `bearer === process.env.SUPABASE_SERVICE_ROLE_KEY` short-circuits → timing oracle on the keys-to-the-kingdom credential. **Fix:**
  ```ts
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const isServiceRole = !!bearer && bearer.length === k.length &&
    crypto.timingSafeEqual(Buffer.from(bearer), Buffer.from(k));
  ```
- **No rate limiting.** Admin endpoint, brute-forceable, especially with timing oracle. **Fix:** `@upstash/ratelimit` 10 req/min/IP at L32; reject 429.

**🟠 P1:**

- **L104 — `detail` leaks Supabase errors** (schema, constraint names, RLS hints). Return generic `{ error: 'unexpected' }`; log server-side.
- **L94 — `magic_link_url` returned in JSON.** Logged responses → live tokens in Vercel logs. Return `id + expires_at` only; callers reconstruct.
- **L93 — fallback to hardcoded `'https://unite-group.in'`** mints production links from preview deploys → tokens never resolve. Fail closed: throw if `NEXT_PUBLIC_APP_URL` missing.

**🟡 P2:**

- **No CSRF protection.** Cookie-auth + same-origin POST. Require `Origin` header validation or fetch-only `content-type: application/json`.
- **L58–62 — no input length cap.** 100KB `deliverable_title` bloats DB / breaks UI. Cap per-string ≤500, body ≤50KB.

**🟢 GOOD:**

- L68 `crypto.randomBytes(48).toString('base64url')` — 384 bits, exceeds the 256-bit floor.
- L42 admin allowlist via `Set.has()` — O(1), exact match.
- L63–65 `expires_in_days` bounded 1–60.
- L41 `supabase.auth.getUser()` re-validates JWT server-side.

---

### `approvals/[token]/route.ts` (132 lines)

**🔴 P0:**

- **L21–25 — Token lookup NOT constant-time.** `.eq('token', token)` on a B-tree index leaks timing on prefix-match vs miss. Combined with verbose 404s at L49, token-space is probable. **Fix:** store + look up `token_hash = sha256(token)`, not the raw token. URL is the only raw-token copy.
- **No rate limiting on public route.** Even with 384-bit entropy, the absence of any limiter is the audit failure. **Fix:** Upstash 30/min GET, 10/min POST per IP.

**🟠 P1:**

- **L34–38 — `x-forwarded-for` trust without proxy validation.** Client can prepend arbitrary IP. **Fix:** on Vercel use `x-vercel-forwarded-for` (Vercel-signed) or `x-real-ip`. Document `approver_ip` as best-effort.
- **L101–104 — `signature_hash` is not tamper-evident.** `sha256(token + status + responded_at)` includes the token, which the responder already has → anyone with the token can recompute. It's a fingerprint, not a signature. **Fix:** HMAC keyed by `APPROVAL_SIGNING_SECRET`:
  ```ts
  crypto.createHmac('sha256', process.env.APPROVAL_SIGNING_SECRET!)
    .update(`${row.id}|${status}|${respondedAt}|${row.deliverable_id}`)
    .digest('hex')
  ```
  Do not include the raw token in the signed payload (separation of capability and receipt).
- **L88–95 — Status transition not atomic with update.** Two concurrent POSTs both see `pending`, both write; the audit records the LAST hash. **Fix:** conditional `.update({...}).eq('id', row.id).eq('status', 'pending').select()` — return 409 on 0 rows.

**🟡 P2:**

- **L78–84 — `changes_requested_body` unbounded length.** Storage XSS risk if rendered as HTML in admin portal. Cap 10KB; document text-only rendering.
- **L129 — `detail` leakage** as other routes.
- **L46/L73 — length bounds 32–128** vs minted 64-char tokens — fine now, future rotation could silently break. Tie to a single constant.

**🟢 GOOD:**

- L17 `TERMINAL_STATUSES` whitelist — no status injection.
- L96 expiry checked server-side.
- L50 token NOT returned in GET response.
- L88 already-responded returns 409 with hash — supports receipt-on-revisit UX.

---

### `webhooks/github/route.ts` (240 lines)

**🟠 P1:**

- **L53 — `crypto.timingSafeEqual` length-mismatch caught silently.** Wrap is correct semantically but swallows shape errors. Add explicit length pre-check.
- **L66–86 — outbound fetch BEFORE queue insert, no `delivery_id` dedupe.** Slow GitHub API → 30s `maxDuration` consumed → 5xx → retry → duplicate enqueue. **Fix:** UNIQUE constraint on `video_production_queue(metadata->>'github_delivery_id')` OR pre-check `delivery_id` before fetch.
- **L77 — `c.user?.login?.includes('vercel')` is a substring match.** Username `vercel-hater` can seed a malicious preview URL into the brief. **Fix:** strict equality on `'vercel[bot]'`.

**🟡 P2:**

- **L46 — silent 401 when secret unset.** Per [[curator-deployment-unknown]], throw at startup if `GITHUB_WEBHOOK_SECRET` empty in production.
- **L110 — `job_id`** uses `pr_url.split('/').pop()` (empty if URL trailing-slash). Use `pr.number` directly.
- **L228 — Supabase error leak** as other routes.

**🟢 GOOD:**

- L45–57 HMAC verified BEFORE `JSON.parse` at L160 — body-handling order correct.
- L154 event-type filter returns 200 on skip (avoids GitHub auto-disable on 4xx).
- L173 `client-visible` label gate prevents arbitrary PRs triggering video cost.
- L179 repo allowlist closed-world.
- L53 constant-time HMAC compare.

---

## Cross-cutting findings

1. **No rate limiting anywhere.** Webhook routes partially HMAC-protected; approval routes wide open. Single shared `src/lib/ratelimit.ts` (Upstash) called from every public route.
2. **Error leakage via `detail: err.message`** in 4/4 routes. Standardise a `safeError()` helper — log full error, return `{ error, request_id }`.
3. **`@ts-nocheck` on all 4 files.** Disables compile-time guarantees. Drop on each; fix the type errors. ~30 min cost; catches regressions on every PR.
4. **Idempotency inconsistent.** Stripe attempts it (with TOCTOU bug); GitHub omits it. Standardise via UNIQUE-constraint-driven dedupe.
5. **Service role bearer is the highest-blast-radius surface.** Add bearer-rotation runbook + timing-safe compare.

## Triage summary

| Route | P0 | P1 | P2 |
|---|---|---|---|
| webhooks/stripe | 1 | 3 | 2 |
| admin/approvals/create | 2 | 3 | 2 |
| approvals/[token] | 2 | 3 | 3 |
| webhooks/github | 0 | 3 | 3 |
| **Total** | **5** | **12** | **10** |

## Top 5 fix priorities

1. **Stripe idempotency UNIQUE + atomic insert** (`webhooks/stripe` L57–75). `ALTER TABLE stripe_events ADD CONSTRAINT stripe_events_event_id_unique UNIQUE (stripe_event_id);` then `.insert(...)`, treat PG `23505` as duplicate. Prevents double-billed clients getting double portals.
2. **Constant-time service-role bearer compare** (`admin/approvals/create` L36). `crypto.timingSafeEqual` with length-equality pre-check. Highest-blast-radius fix — service role key = full DB.
3. **Atomic status transition on approval POST** (`approvals/[token]` L88–117). Conditional update `.eq('status','pending')`; 409 on 0 rows. Lost-update on concurrent submission = contested legal receipt.
4. **Rate-limit public approval routes** (`approvals/[token]` GET+POST). Upstash 30/min GET, 10/min POST per IP.
5. **HMAC-keyed signature receipt** (`approvals/[token]` L101–104). Replace `sha256(token+status+responded_at)` with `HMAC(APPROVAL_SIGNING_SECRET, id|status|respondedAt|deliverable_id)`. Current receipt isn't legally tamper-evident.

## Things deliberately ruled out

- **SQL injection** — all calls `.from().eq()/.insert()/.update()` → parameterised PostgREST. No `.rpc()` with raw SQL. Clean.
- **Command injection** — no `child_process`/`exec`/`spawn`/shell. Clean.
- **NEXT_PUBLIC_ secret leak** — only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_APP_URL` referenced; neither is a secret. Clean.
- **CORS `*`** — no manual CORS set; Next.js same-origin default. Clean.
- **NoSQL/JSONB injection** — `production_brief` + `payload` written as object literals via parameterised client; built from validated fields + repo allowlist. Clean.
- **Stripe API version pinning** — pinned at L34. Acceptable (flagged the `as any` cast as P1).
- **Magic-link token entropy** — 384 bits, well above 256-bit floor. Clean.
- **Token TTL server-side** — confirmed at L96. Clean.

## Verdict

Routes are **NOT production-safe as-is.** The five P0 findings must land within 7 days. GitHub webhook is the cleanest (no P0). The approval routes carry the most concentrated risk (legally-binding sign-off); the Stripe webhook carries the highest financial blast-radius (double-provisioning).

**Recommendation:** ship a single PR `security: P0 fixes from deepsec-2026-05-14` containing the Top 5 + `src/lib/ratelimit.ts`. Tag `@phill-mac` for merge; do not auto-merge.

— *DeepSec Scan 2026-05-14*
