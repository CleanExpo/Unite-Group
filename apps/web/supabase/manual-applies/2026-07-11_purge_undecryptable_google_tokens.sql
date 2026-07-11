-- ============================================================================
-- MANUAL PROD APPLY — purge undecryptable Google credential rows (GATED)
-- Target: prod lksfwktwtmyznckodsau  ·  Date: 11/07/2026  ·  en-AU
--
-- WHY THIS FILE EXISTS
-- Two Google mailboxes fail with "Unsupported state or unable to authenticate
-- data" on every cron run (verified live in the Vercel runtime-error stream,
-- 11/07/2026 — routes /api/cron/coaches/life, /api/cron/import-contacts,
-- /api/cron/email-triage):
--     • phill@connexusm.com
--     • nrpg.team@gmail.com
-- That error is an AES-256-GCM auth-tag mismatch: the stored token in
-- credentials_vault was encrypted under an OLD VAULT_ENCRYPTION_KEY and can no
-- longer be decrypted with the current key. The rows carry NO recoverable value
-- — src/lib/integrations/google-oauth.ts already treats a failed decrypt as
-- needsReauth. Reconnecting on top of them cannot help until the dead rows are
-- gone, because getAccessTokenForEmail() selects by (service,notes) and hits the
-- stale row first.
--
-- SCOPE — DELIBERATELY SURGICAL
-- This DELETES ONLY the two mailboxes above. It does NOT touch the mailboxes that
-- throw "Token refresh failed: 401" (zenithfresh25@gmail.com,
-- disasterrecoverynrp@gmail.com, airestoreassist@gmail.com) — those are merely
-- EXPIRED but still decryptable and only need a re-consent, not deletion.
--
-- AFTER RUNNING
-- Reconnect phill@connexusm.com and nrpg.team@gmail.com via the Google OAuth
-- flow (Settings → Integrations). Fresh tokens are then written under the current
-- VAULT_ENCRYPTION_KEY and the coaches/life, import-contacts and email-triage
-- crons recover for those two accounts.
--
-- HOW TO APPLY — run STEP 1 first, eyeball the rows, THEN run STEP 2.
-- Branch-promote is broken for this project (prod migration history won't
-- replay), so this is a reviewed direct-to-prod apply, same as the other files
-- in this directory. Requires Phill's approval — do not run autonomously.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1 — PREVIEW (read-only). Confirm EXACTLY 2 rows, exactly these mailboxes.
-- ----------------------------------------------------------------------------
SELECT id, founder_id, label, service, notes, created_at, updated_at
FROM   credentials_vault
WHERE  service = 'google'
  AND  notes IN ('phill@connexusm.com', 'nrpg.team@gmail.com')
ORDER  BY notes;

-- ----------------------------------------------------------------------------
-- STEP 2 — DELETE (guarded). Aborts if the WHERE clause matches more than 2
-- rows, so a mistake can never over-delete. Run only after STEP 1 looks right.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  match_count INT;
BEGIN
  SELECT count(*) INTO match_count
  FROM   credentials_vault
  WHERE  service = 'google'
    AND  notes IN ('phill@connexusm.com', 'nrpg.team@gmail.com');

  IF match_count > 2 THEN
    RAISE EXCEPTION 'ABORT: expected at most 2 rows, found % — refusing to delete', match_count;
  END IF;

  DELETE FROM credentials_vault
  WHERE  service = 'google'
    AND  notes IN ('phill@connexusm.com', 'nrpg.team@gmail.com');

  RAISE NOTICE 'Deleted % undecryptable Google credential row(s).', match_count;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 3 — VERIFY. Should return zero rows for the two purged mailboxes.
-- ----------------------------------------------------------------------------
SELECT id, service, notes
FROM   credentials_vault
WHERE  service = 'google'
  AND  notes IN ('phill@connexusm.com', 'nrpg.team@gmail.com');
