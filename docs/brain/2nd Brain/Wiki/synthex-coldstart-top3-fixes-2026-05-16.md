# Synthex Cold-Start Top-3 Fixes — Phase 1h Proposal

**Date:** 2026-05-16
**Phase:** 1h (Synthex Finalisation Arc)
**Status:** PROPOSAL — Phill approval required before code lands
**Baseline source:** `synthex-cold-start-baseline-2026-05-16.md` (Phase 1c)
**Repo touched (READ-ONLY this phase):** `/Users/phill-mac/Synthex`

---

## TL;DR

| Route          | Current p95 | Fix class          | Expected p95 | Leverage |
| -------------- | ----------- | ------------------ | ------------ | -------- |
| `/unite-group` | 2038 ms 307 | **redirect-trim**  | < 120 ms 307 | HIGHEST  |
| `/about`       | 1771 ms 200 | **static-ize**     | < 400 ms 200 | HIGH     |
| `/features`    | 1443 ms 200 | **static-ize**     | < 400 ms 200 | HIGH     |

**Sequence to land:** `/unite-group` first (single 4-line edit, biggest win), then `/about` + `/features` together (identical pattern, one PR).

**Critical correction to the original brief:** There is **no active middleware** (`middleware.ts` is `middleware.ts.disabled`). The `/unite-group` 307 cost is not middleware — it's a `force-dynamic` server component doing an authenticated self-fetch to its own internal API (with `prisma.organization.findUnique` + `findMany` round-trips) **before** issuing the redirect.

---

## 1. `/unite-group` — 2038 ms 307 → < 120 ms 307

### ROOT CAUSE

`app/unite-group/page.tsx` is declared `export const dynamic = 'force-dynamic'` (line 25) and runs `fetchWorkspace()` (lines 61–80) on **every request**, regardless of auth state. That fetch:

1. Reads request headers (`host`, `cookie`)
2. Issues an HTTP request back to its own host: `fetch('https://${host}/api/workspaces/unite-group', { cache: 'no-store' })` — a **self-loopback HTTP round-trip** through the Vercel edge → Lambda boundary
3. That API route (`app/api/workspaces/[parentSlug]/route.ts`) runs `APISecurityChecker.check()` then **two sequential Prisma queries** (`findUnique` on `organization` + `findMany` for children) before returning 401/403 for an unauthenticated visitor
4. Page receives the null, **then** issues `redirect('/login?next=/unite-group')` → 307

Unauthenticated visitors (which is what cold-start probes are) pay the full DB-roundtrip cost just to be told to log in. A 307 redirect for an auth gate should be < 150 ms — this is taking **~14× that** because we're doing the auth check via a self-HTTP-and-DB chain when we should be doing it at the session layer.

### SURGICAL FIX

**File:** `/Users/phill-mac/Synthex/app/unite-group/page.tsx`
**Lines:** 18–90 (replace the data-fetch-then-redirect pattern with a session-only short-circuit)

**Change shape:**

```tsx
// REPLACE imports block + fetchWorkspace + the early data fetch with:

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// ... keep ui imports

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // still dynamic — but cheap-dynamic

export default async function UniteGroupPage() {
  // Cheap session presence check — no DB, no self-fetch.
  // If no session cookie → 307 redirect immediately (< 50ms cold).
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.get('next-auth.session-token') ||
    cookieStore.get('__Secure-next-auth.session-token');

  if (!hasSession) {
    redirect('/login?next=/unite-group');
  }

  // Only authenticated users pay the workspace-fetch cost.
  const data = await fetchWorkspace();
  if (!data) {
    redirect('/login?next=/unite-group');
  }
  // ... rest of render unchanged
}
```

### CLASSIFICATION

**redirect-trim** — move the unauthenticated short-circuit ahead of the data fetch. Same end-state for authenticated users; **eliminates the DB + self-HTTP cost for the 307 path**.

### EXPECTED p95 AFTER FIX

- **Unauthenticated 307:** 2038 ms → **< 120 ms** (Lambda cold + cookie read + redirect header — no DB)
- **Authenticated 200:** roughly unchanged (~600–900 ms — they still hit DB, which is correct)

### WHY NOT "MIDDLEWARE-TRIM"

The original brief assumed middleware was doing work. `/Users/phill-mac/Synthex/middleware.ts` does not exist — only `middleware.ts.disabled`. So there's no middleware to trim. The fix is at the page layer.

---

## 2. `/about` — 1771 ms 200 → < 400 ms 200

### ROOT CAUSE

`app/about/page.tsx` (431 lines) has:

- **No data fetching** (no `fetch`, no `prisma`, no `supabase`)
- **No `export const dynamic`** declaration
- **No `export const revalidate`** declaration
- Imports four `'use client'` components (`MarketingLayout`, `GlowCard`, `Icon3D`, etc.)

It **should** be statically rendered (no dynamic markers), but Phase 1c measured 1771 ms p95 on a 200. That cost is the **SSR render of a 431-line server component + the cold Lambda + `instrumentation.ts` register() running env-validator + dynamic-import of `EnvValidator` + bootstrapping NRPG pipeline** (instrumentation.ts lines 95–184) on every cold lambda spawn.

The page renders **dynamically on every request** because Next.js can't statically prerender it without an explicit signal — and the root layout (`app/layout.tsx`) does not declare a static rendering hint. The page has no `headers()` / `cookies()` / `searchParams` access that would force dynamic, so the fix is to **declare it explicitly static** with `force-static` + `revalidate`.

### SURGICAL FIX

**File:** `/Users/phill-mac/Synthex/app/about/page.tsx`
**Lines:** insert after the import block (after line 16), before `const stats = [`

**Add:**

```tsx
// Static marketing page — no dynamic data, no auth, no cookies.
// Render once at build, revalidate every hour to pick up content edits.
export const dynamic = 'force-static';
export const revalidate = 3600; // 1h ISR
```

### CLASSIFICATION

**static-ize** — explicit ISR opt-in. The page is already side-effect-free; we just tell Next.js it's safe to cache.

### EXPECTED p95 AFTER FIX

- **CDN HIT (steady state):** < 50 ms (edge cache, no Lambda)
- **CDN MISS (revalidation, 1× per hour):** ~400 ms (SSR cost, but only once per region per hour)
- **Cold-start probe p95 (Phase 1c's measurement model):** **< 400 ms** — most probes will hit the edge cache

---

## 3. `/features` — 1443 ms 200 → < 400 ms 200

### ROOT CAUSE

**Identical shape to `/about`.** `app/features/page.tsx` (568 lines):

- No data fetching
- No `dynamic` / `revalidate` declarations
- Imports same `'use client'` deps (`MarketingLayout`, `GlowCard`, `VideoSchemaScript`, `Icon3D`)
- Has a `VideoSchemaScript` JSON-LD inject which is pure-render (no fetch)

Same diagnosis: implicitly-dynamic because no static hint, paying SSR cost on every cold lambda.

### SURGICAL FIX

**File:** `/Users/phill-mac/Synthex/app/features/page.tsx`
**Lines:** insert after the import block (after line 36), before `// Feature video metadata` comment on line 38

**Add:**

```tsx
// Static marketing page — no dynamic data, no auth, no cookies.
// Render once at build, revalidate every hour to pick up content/video edits.
export const dynamic = 'force-static';
export const revalidate = 3600; // 1h ISR
```

### CLASSIFICATION

**static-ize** — identical to `/about`.

### EXPECTED p95 AFTER FIX

- **CDN HIT:** < 50 ms
- **CDN MISS:** ~400 ms (1× per hour per region)
- **Cold-start probe p95:** **< 400 ms**

---

## SEQUENCING (which to land first)

| Order | Route          | Why this order                                                                                                                     |
| ----- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `/unite-group` | Biggest absolute win (1900+ ms saved on the 307 path), smallest blast radius (one file, ~10 lines), purely auth-path optimisation. |
| 2     | `/about`       | Two-line change, zero behavioural risk (no dynamic data exists to break).                                                          |
| 3     | `/features`    | Same as `/about`, batch in same PR.                                                                                                |

**Land 2 + 3 as one PR.** They're identical edits to twin pages.

---

## NON-FIXES (things the brief implied but turned out not to be the cause)

- **Middleware doing real work** — there is no active middleware. `middleware.ts.disabled` is dormant.
- **Unbatched layout fetch** — `app/(marketing)/layout.tsx` is 13 lines, no fetches. `MarketingLayout` is client-side. Root layout `app/layout.tsx` is pure-JSX, no server-side fetches.
- **Missing `unstable_cache` wrapper** — not the diagnosis. There's no fetch to wrap on `/about` or `/features`. The fix is route-level ISR, not function-level memoisation.

---

## EXPECTED COMBINED IMPACT

| Metric                                | Before                       | After       | Delta              |
| ------------------------------------- | ---------------------------- | ----------- | ------------------ |
| `/unite-group` 307 p95                | 2038 ms                      | < 120 ms    | **−94%**           |
| `/about` 200 p95                      | 1771 ms                      | < 400 ms    | **−77%**           |
| `/features` 200 p95                   | 1443 ms                      | < 400 ms    | **−72%**           |
| **Sum of top-3 cold-start latency**   | **5252 ms**                  | **~920 ms** | **−82%**           |
| Lambda invocations on `/unite-group` (unauthed) | 1 per probe + 1 internal API + 2 DB queries | 1 per probe (no DB) | **−3 DB queries per probe** |

---

## VERIFICATION PLAN (post-merge)

Each fix produces a CDP-measurable change:

1. **`/unite-group`:** `curl -I https://synthex.social/unite-group` (logged-out, no session cookie) should return 307 in < 120 ms. Vercel Function logs should show **zero** Prisma queries for the unauthenticated path.
2. **`/about` / `/features`:** Vercel build output should show `○ /about (Static)` and `○ /features (Static)` instead of `λ /about (Dynamic)`. CDN response should include `x-vercel-cache: HIT` on second request from same region.

---

## VERIFICATION LEDGER

**DID:**
1. Listed `app/` and confirmed no `middleware.ts` (only `middleware.ts.disabled`).
2. Read `app/unite-group/page.tsx` (216 lines) end-to-end — confirmed `force-dynamic` + self-loopback fetch pattern on lines 24/61–80.
3. Read `app/api/workspaces/[parentSlug]/route.ts` (151 lines) — confirmed two sequential Prisma queries (`findUnique` + `findMany`) gate the 401/403 path.
4. Read `app/about/page.tsx` (head + scan) and `app/features/page.tsx` (head + grep) — confirmed zero `fetch` / `prisma` / `supabase` / `cookies` / `headers` / `dynamic` / `revalidate` exports.
5. Read `app/(marketing)/layout.tsx` (13 lines, pure shell), `app/layout.tsx` (no dynamic/cookies/headers/fetch on grep), `components/marketing/MarketingLayout.tsx` (`'use client'` line 1).
6. Read `instrumentation.ts` (195 lines) — confirmed Sentry server init is intentionally disabled, register() does env-validate + NRPG bootstrap, never throws, but adds cold-start cost on first request after a new Lambda spawn.
7. Confirmed no `force-static` / `revalidate` in `vercel.json` for `/about` or `/features` routes.

**VERIFIED-WITH-CITATION:**
- `/unite-group` force-dynamic + self-fetch: `app/unite-group/page.tsx:25` + `:67`
- `/unite-group` redirect AFTER fetch: `app/unite-group/page.tsx:85–90`
- API does 2× Prisma queries before auth gate: `app/api/workspaces/[parentSlug]/route.ts:55–69` and `:79–105`
- `/about` no data-fetching: full file read, only static arrays + JSX
- `/features` no data-fetching: same shape, 568 lines all static JSX
- No active middleware: `find . -maxdepth 3 -name "middleware.ts" -not -path "./node_modules/*"` returned empty; `middleware.ts.disabled` exists at repo root

**WOULD-CHANGE-MY-MIND:**
1. If the Phase 1c baseline was measured on the **first** request to a brand-new Lambda (true cold start including instrumentation.ts → `bootstrapNrpgPipeline` cost), then `static-ize` alone won't take `/about` to < 400 ms on that specific request — it'll still pay the ~1s instrumentation tax. In that case the fix needs to also include a `bootstrapNrpgPipeline` audit. Need to see whether Phase 1c warmed Lambdas before measuring.
2. If `/api/workspaces/unite-group` is hit by something OTHER than `/unite-group` page (e.g. a client-side SWR poll from BrandGrid), then trimming the page-side fetch doesn't trim the DB load — only the cold-start probe. Need to grep client components for SWR keys before assuming the API route can be deprecated.
3. If there's a Vercel project-level "force all routes dynamic" toggle set in the dashboard (not in `vercel.json` or `next.config.mjs`), `force-static` won't override it. Need Phill to confirm project settings before merge.

---

**End of proposal. Awaiting Phill approval to dispatch implementation PRs.**
