-- Per-account signature slogan for Unite-Group Nexus email footers (UNI-2153).
--
-- Slice 1 added per-account VOICE, Slice 2 the auto-draft toggle. This adds the
-- founder-editable signature SLOGAN to the same email_account_voice row. The
-- slogan is a PROPOSED, editable line (lib/email/signature.ts DEFAULT_SLOGAN),
-- NOT an asserted brand tagline — nullable with no default, so an unset account
-- falls back to DEFAULT_SLOGAN in code.
--
-- Single-tenant: founder_id-scoped, RLS already enabled + forced on
-- email_account_voice (Slice 1 migration). Ships DARK — signatures render only
-- for business accounts and nothing sends on its own.
-- Validate on a Supabase database branch before prod; never apply to prod
-- directly (apps/web + apps/empire CLAUDE.md) — prod application is founder-gated.

ALTER TABLE public.email_account_voice
  ADD COLUMN IF NOT EXISTS slogan TEXT;
