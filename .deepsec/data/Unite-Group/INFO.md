# Unite-Group

> Unite-Group is the operating platform for the Unite-Group empire — a CRM, client portal, AI content pipeline, and command centre for service-business operations (restoration, cleaning, ITR). Built on Next.js 16 + React 19 + TypeScript + Supabase + Stripe.

## What this codebase does

Unite-Group is a full-stack SaaS/ops platform serving Phill McGurk's portfolio businesses (CCW, Bulcs Holdings, Dimitri ITR, and the Synthex AI content machine). It runs lead capture, CRM/opportunity tracking, Stripe billing, self-service auth, AI content generation, SEO tooling, and a CEO command centre — all from a single Next.js 16 app with Supabase as the backing store.

## Auth shape

- `supabase.auth` (Supabase Auth with PKCE, MFA/TOTP supported)
- `profiles` table (RLS-guarded, role: 'user' | 'admin')
- `getAdminClient()` (service-role client for server routes, bypasses RLS)
- `createClient()` (SSR client with cookie-based session)
- Admin-token dual-auth pattern in `src/components/auth/MFASetup.tsx`

## Threat model

1. **Credential stuffing on auth routes** — public register/login with rate limiting (in-memory, per-instance) → high impact, mitigated by `authRegister: 5/60s` + Turnstile planned.
2. **SSRF via logo/image fetch** — outbound HTTP requests to arbitrary URLs, mitigated by allow-list + `new URL()` validation.
3. **Stripe webhook spoofing** — forged `Stripe-Signature` headers → high impact, mitigated by `stripe.webhooks.constructEvent()` with secret.
4. **AI cost amplification** — unauthenticated or low-auth routes hitting OpenAI/Claude/ElevenLabs APIs → medium impact, mitigated by per-route rate limits and admin gating.

## Project-specific patterns to flag

- `src/app/api/cron/**` — cron triggers, should never be exposed to public Internet (Vercel cron only).
- `src/app/api/empire/**` — empire/admin surfaces, require `role === 'admin'` checks; any missing `isAdmin()` call is a bug.
- `src/lib/email/**` — SendGrid templates; any raw HTML injection into JSX email templates is XSS risk.
- `src/app/api/webhooks/**` — external vendor callbacks (Stripe, Telegram, Vercel); validate signature before processing.
- `src/app/api/content-generation` — OpenAI token burn; rate limit + admin gate required.

## Known false-positives

- `/api/cron/**` — accessed only by Vercel cron, no auth header expected.
- `/api/webhooks/stripe` — raw body parsing required before signature verification; generic "missing auth" rules flag this.
- `src/lib/email/__tests__/**` — test fixtures with fake emails/addresses, no PII.
- `/clients/[slug]/page.tsx` — public client portals, intentionally unauthenticated (marketing pages).
- `docs/plans/*.md` — planning docs with placeholder metrics, not runtime code.
