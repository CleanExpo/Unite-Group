---
title: "E2E Playwright tests: dedicated non-prod Supabase branch backend"
category: integration-issues
date: 2026-06-23
tags: [e2e, playwright, supabase, branching, ci, github-actions, secrets]
component: ci-cd
severity: medium
status: resolved
---

# E2E Playwright tests run against a dedicated non-prod Supabase branch

## Problem

The `apps/web — Playwright E2E` job (CI, `.github/workflows/ci.yml`) was red on
every PR. The authenticated/write specs failed with
`createUser: Database error creating new user`, and `gh secret list` *appeared*
empty (it was querying the wrong repo — always pass `--repo CleanExpo/Unite-Group`).

## Root cause

A Supabase **branch** of the Unite-Group prod project
(`lksfwktwtmyznckodsau`) named `e2e-gate` (branch ref `jhqjxomxlvvmjslgzqhd`)
was created on 2026-06-22 and `E2E_SUPABASE_SERVICE_ROLE_KEY` was set — but
**`E2E_SUPABASE_URL` was never pointed at the branch.** So the job used the
*branch's* service-role key against the *prod* URL (via the
`NEXT_PUBLIC_SUPABASE_URL` fallback) → mismatch → "Database error creating new
user." The branch's auth schema is healthy: `public.handle_new_user` fires on
`auth.users` insert and creates a `public.user_profiles` row (FK to
`auth.users`), and that works on the branch.

## The wiring (what makes E2E green)

GitHub Actions **secrets** (`--repo CleanExpo/Unite-Group`):

| Secret | Value |
|---|---|
| `E2E_SUPABASE_URL` | `https://jhqjxomxlvvmjslgzqhd.supabase.co` (the **branch**) |
| `E2E_SUPABASE_ANON_KEY` | the branch's legacy anon key |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | the branch's service-role key |
| `PLAYWRIGHT_TEST_EMAIL` | `support@synthex.social` (must be on the app's auth allowlist) |
| `PLAYWRIGHT_TEST_PASSWORD` | the test user's password |

GitHub Actions **variables**:

| Variable | Value | Effect |
|---|---|---|
| `E2E_ENABLED` | `true` | runs the E2E job |
| `E2E_ALLOW_PROVISIONING` | `true` only when `E2E_SUPABASE_*` is a non-prod branch | un-skips the createUser/write specs |

## Test gate tiers (see `apps/web/e2e/*.spec.ts`)

- **Unauthenticated** (`auth.spec.ts`): always run — assert requests are
  rejected (401 or redirect) with `maxRedirects: 0`.
- **Authenticated read / page-load** (advisory, approvals, campaigns, dashboard,
  settings, vault, sidebar, idea-capture): gated on `PLAYWRIGHT_TEST_EMAIL` —
  log in as the test user; no writes.
- **Destructive / provisioning** (contact-crud, core-journeys, drip-campaign,
  email-import, file-upload, lead-scoring, transcription): gated on
  `E2E_ALLOW_PROVISIONING` — createUser + DB writes; only ever against the
  non-prod branch.

## Seeding / refreshing the test user (on the BRANCH only — never prod)

Run via the Supabase MCP / SQL editor against `jhqjxomxlvvmjslgzqhd`:

```sql
DO $$
DECLARE uid uuid := gen_random_uuid();
        em  text := 'support@synthex.social';
        pw  text := '<password — must equal PLAYWRIGHT_TEST_PASSWORD>';
BEGIN
  DELETE FROM public.user_profiles WHERE email = em;
  DELETE FROM auth.identities WHERE identity_data->>'email' = em;
  DELETE FROM auth.users WHERE email = em;
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    em, extensions.crypt(pw, extensions.gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Synthex Support (E2E)"}'::jsonb,
    '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true),
    'email', now(), now(), now());
END $$;
```

## Prevention / gotchas

- **Never point `E2E_SUPABASE_URL` at prod.** The whole design is to keep
  createUser + writes off the prod financial DB. If `E2E_ALLOW_PROVISIONING`
  is `true`, the `E2E_SUPABASE_*` secrets MUST be the branch.
- The `e2e-gate` branch is `persistent: false` — Supabase may reap it. Make it
  persistent (small ongoing cost) for a stable CI backend, or re-create + re-seed.
- The branch carries a subset of prod's schema (migrations partially applied).
  If a page-load test errors on a missing table, add that table to the branch.
- `gh secret list` needs `--repo CleanExpo/Unite-Group` — bare invocation can
  resolve to the wrong repo and look empty.

## Cross-references

- `apps/web/e2e/` gate tiers (PR #454).
- `apps/web/e2e/support/supabase-admin-config.ts` — the prod-host assertion the
  `E2E_SUPABASE_URL` override bypasses for the branch.
