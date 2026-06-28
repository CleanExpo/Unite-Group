# E2E (Playwright) — enabling the gate

The E2E suite (`apps/web/e2e/*.spec.ts`) exists but the CI job is **opt-in and OFF by
default**: `.github/workflows/ci.yml` runs it only when `vars.E2E_ENABLED == 'true'`.
Until enabled it never gates a PR. This is the B2/B3 readiness item.

## What runs without setup
Specs that don't need a backend run anywhere. Specs that provision users + write data
(`email-import.spec.ts`, `rls-isolation.spec.ts`, dashboard/campaign provisioning specs)
**skip cleanly** unless `E2E_ALLOW_PROVISIONING` is set against a real non-prod backend —
they never silently pass and never hit prod.

## Founder steps to make E2E gate PRs (B2)
These are repo-owner actions (GitHub settings + a non-prod Supabase backend); an agent cannot do them.

1. **Provision a dedicated non-prod Supabase branch with the FULL schema** (not the partial
   e2e-gate branch — the provisioning specs need `crm_contacts`, `contacts`, auth, and RLS present).
2. **Add GitHub Actions secrets** (Settings → Secrets and variables → Actions → Secrets):
   `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY` (the non-prod branch),
   and a test user: `PLAYWRIGHT_TEST_EMAIL`, `PLAYWRIGHT_TEST_PASSWORD`.
3. **Add repo variables** (Settings → … → Variables): `E2E_ENABLED=true`, and
   `E2E_ALLOW_PROVISIONING=true` (only ever with the non-prod backend above — never prod).
4. **Make it gate**: Settings → Branches → branch protection for `main` → add
   **"apps/web — Playwright E2E"** as a **required** status check. Without this the job runs but does not block merges.

The job falls back to prod secrets *loudly* (fails) if `E2E_SUPABASE_*` are unset, so a
misconfiguration is visible, not silent.

## RLS isolation test (B3)
`rls-isolation.spec.ts` proves `crm_contacts.founder_id = auth.uid()` at the **database (RLS)
layer**: a row owned by founder A is invisible to founder B and to an anonymous client, while
A can still read it (positive control — keeps the zero-row assertions non-vacuous). It uses the
**anon key + the user's JWT** for the reads (never the service-role key, which bypasses RLS).
Complements the app-API isolation already covered in `email-import.spec.ts`.

Run locally against a non-prod branch:
```bash
E2E_ALLOW_PROVISIONING=1 \
E2E_SUPABASE_URL=… E2E_SUPABASE_ANON_KEY=… E2E_SUPABASE_SERVICE_ROLE_KEY=… \
pnpm exec playwright test rls-isolation
```
Without those env vars it skips (by design). To confirm the test isn't vacuous, temporarily swap
the user-B read to the service-role client — it must then FAIL (service role bypasses RLS).
