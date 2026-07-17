-- Per-account auto-draft toggle for the Margot email copywriter agent (Slice 2 / UNI-2153).
--
-- Slice 1 added per-account VOICE (email_account_voice). Slice 2 ACTIVATES
-- per-account auto-DRAFTING: when agent_enabled is true AND the global
-- MARGOT_DRAFTS_ENABLED env flag is on, the email-draft cron pre-writes reply
-- drafts FROM that mailbox for threads triage flagged for review. Every draft is
-- stored `awaiting_approval` (margot_email_draft) and NEVER auto-sent.
--
-- Ships DARK: DEFAULT false. Nothing drafts until the founder both flips the prod
-- env flag AND turns an account on. Single-tenant: founder_id-scoped, RLS already
-- enabled + forced on email_account_voice (Slice 1 migration).
-- Validate on a Supabase database branch before prod; never apply to prod
-- directly (apps/web + apps/empire CLAUDE.md) — prod application is founder-gated.

ALTER TABLE public.email_account_voice
  ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN NOT NULL DEFAULT false;
