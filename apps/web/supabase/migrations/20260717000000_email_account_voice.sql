-- Per-account copywriter voice for Margot founder-voice drafts (task 21 / UNI-2153).
--
-- Each connected mailbox (account_email) can carry its own founder-voice config
-- so a draft written FROM an inbox speaks in that account's register. When no
-- row exists for an account, the accessor falls back to a labelled default voice
-- (lib/margot/account-voice.ts). Single-tenant: founder_id-scoped, RLS enabled +
-- forced (apps/web/.claude/rules/database/supabase.md). Ships DARK — nothing
-- reads this until MARGOT_DRAFTS_ENABLED is on and drafting is turned on.
-- Validate on a Supabase database branch before prod; never apply to prod
-- directly (apps/web + apps/empire CLAUDE.md) — prod application is founder-gated.

CREATE TABLE IF NOT EXISTS public.email_account_voice (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_email   TEXT NOT NULL,          -- the mailbox this voice speaks for
  name            TEXT,                   -- how the founder signs / is named
  sign_off        TEXT,                   -- sign-off line, e.g. 'Cheers, Phill'
  tone_guidelines TEXT[] NOT NULL DEFAULT '{}',
  never_do        TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One voice per (founder, account) — the upsert conflict target.
CREATE UNIQUE INDEX IF NOT EXISTS email_account_voice_founder_account_uidx
  ON public.email_account_voice (founder_id, account_email);

-- RLS — founder-scoped (single-tenant); service_role bypasses for server code.
ALTER TABLE public.email_account_voice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_account_voice FORCE ROW LEVEL SECURITY;

CREATE POLICY email_account_voice_founder_select ON public.email_account_voice
  FOR SELECT USING (founder_id = auth.uid());

CREATE POLICY email_account_voice_founder_insert ON public.email_account_voice
  FOR INSERT WITH CHECK (founder_id = auth.uid());

CREATE POLICY email_account_voice_founder_update ON public.email_account_voice
  FOR UPDATE USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

CREATE POLICY email_account_voice_founder_delete ON public.email_account_voice
  FOR DELETE USING (founder_id = auth.uid());
