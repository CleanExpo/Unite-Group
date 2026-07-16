-- Contacts drift baseline (UNI-2389) — make fresh database rebuilds work again.
--
-- 20260630000000_crm_unify_contacts_view.sql copies these columns off the legacy
-- `contacts` table, but they were only ever added to prod OUT OF BAND — no
-- migration creates them. Any clean rebuild (`supabase db reset`, local stack,
-- CI database) therefore fails at that migration with
--   ERROR: column c.source does not exist (SQLSTATE 42703)
-- proven on a fresh local stack 16/07/2026 during the runner E2E run (UNI-2383).
--
-- This migration baselines that drift: it adds the columns 20260630000000 reads,
-- with types matching what that migration adds to crm_contacts. Every statement
-- is ADD COLUMN IF NOT EXISTS, so it is idempotent and a NO-OP on prod (where
-- the columns already exist). Timestamped 20260629990000 so it sorts immediately
-- before the migration that needs it. Applying to prod remains founder-gated via
-- a Supabase database branch — never db push directly.
--
-- NEVER edit 20260630000000 itself: it is already applied to prod.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS source              varchar,
  ADD COLUMN IF NOT EXISTS industry            varchar,
  ADD COLUMN IF NOT EXISTS buying_intent       varchar,
  ADD COLUMN IF NOT EXISTS decision_stage      varchar,
  ADD COLUMN IF NOT EXISTS role_type           varchar,
  ADD COLUMN IF NOT EXISTS engagement_velocity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sentiment_score     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_signals        text[]  DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS opportunity_signals text[]  DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_analysis         jsonb   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_analysis_at    timestamp,
  ADD COLUMN IF NOT EXISTS primary_email_id    uuid,
  ADD COLUMN IF NOT EXISTS custom_fields       jsonb   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_contacted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS created_by          uuid,
  ADD COLUMN IF NOT EXISTS email_count         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tenant_id           uuid,
  ADD COLUMN IF NOT EXISTS obsidian_note_path  text,
  ADD COLUMN IF NOT EXISTS obsidian_synced_at  timestamptz,
  ADD COLUMN IF NOT EXISTS embedding           vector;
