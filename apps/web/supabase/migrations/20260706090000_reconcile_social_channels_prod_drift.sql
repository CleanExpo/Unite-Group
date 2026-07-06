-- Reconcile social_channels prod drift (06/07/2026)
--
-- Prod's social_channels predates 20260309000000_nexus_schema.sql; that migration's
-- CREATE TABLE IF NOT EXISTS silently no-opped, leaving prod with the legacy shape
-- (owner_id, connected) while code queries the canonical shape (founder_id,
-- is_connected, token columns). Evidence: Vercel runtime errors since 14/03/2026 —
--   "column social_channels.founder_id does not exist"   (/api/cron/coaches/marketing)
--   "column social_channels.is_connected does not exist" (/api/cron/analytics-sync)
--
-- Additive + idempotent: adds canonical columns if absent, backfills from legacy
-- columns, never drops. Legacy owner_id/connected are retained (integrations/status
-- read them until this deploy; safe to remove in a later cleanup migration).

ALTER TABLE public.social_channels
  ADD COLUMN IF NOT EXISTS founder_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_connected            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS channel_name            TEXT,
  ADD COLUMN IF NOT EXISTS channel_id              TEXT,
  ADD COLUMN IF NOT EXISTS access_token_encrypted  TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follower_count          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata                JSONB NOT NULL DEFAULT '{}';

-- Backfill canonical columns from the legacy shape. Guarded per-column: fresh
-- environments created from 20260309000000_nexus_schema.sql never had the
-- legacy columns, and an unguarded UPDATE would abort the migration there.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_channels' AND column_name = 'owner_id'
  ) THEN
    UPDATE public.social_channels
    SET founder_id = owner_id
    WHERE founder_id IS NULL AND owner_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_channels' AND column_name = 'connected'
  ) THEN
    UPDATE public.social_channels
    SET is_connected = connected
    WHERE connected IS TRUE AND is_connected IS FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_channels' AND column_name = 'handle'
  ) THEN
    UPDATE public.social_channels
    SET channel_name = COALESCE(channel_name, handle)
    WHERE channel_name IS NULL AND handle IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_channels_founder_id
  ON public.social_channels (founder_id);

-- RLS: ensure the founder policy exists against the canonical column
-- (20260618020000 forced RLS; policy may predate founder_id on prod).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'social_channels'
      AND policyname = 'founder_all_social_channels'
  ) THEN
    CREATE POLICY "founder_all_social_channels" ON public.social_channels
      FOR ALL USING (founder_id = auth.uid())
      WITH CHECK (founder_id = auth.uid());
  END IF;
END $$;
