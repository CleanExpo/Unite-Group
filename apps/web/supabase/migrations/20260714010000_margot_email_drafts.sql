-- Margot email drafts + approval gate (WS2 P2).
--
-- A Margot draft has NO send path until a human approval row exists — the
-- confirm-before-send gate enforced in code by lib/margot/approval-gate.ts.
-- Single-tenant: founder_id-scoped, RLS enabled + forced (apps/web rule).
-- Validate on a Supabase database branch before prod; never apply to prod
-- directly (apps/web + apps/empire CLAUDE.md).

CREATE TABLE IF NOT EXISTS public.margot_email_draft (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_key      TEXT,
  channel           TEXT NOT NULL DEFAULT 'email'
                      CHECK (channel IN ('email', 'telegram')),
  account_email     TEXT,            -- the mailbox to send FROM (which inbox)
  source_message_id TEXT,            -- provider message id being replied to
  thread_id         TEXT,
  to_address        TEXT,            -- recipient
  subject           TEXT,
  body              TEXT NOT NULL,
  voice_meta        JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'awaiting_approval'
                      CHECK (status IN ('awaiting_approval', 'approved', 'rejected', 'sent')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS margot_email_draft_founder_status_idx
  ON public.margot_email_draft (founder_id, status);

CREATE TABLE IF NOT EXISTS public.margot_draft_approval (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_id   UUID NOT NULL REFERENCES public.margot_email_draft(id) ON DELETE CASCADE,
  via        TEXT NOT NULL CHECK (via IN ('telegram', 'ui')),
  note       TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (draft_id)   -- one approval decision per draft
);

-- RLS — founder-scoped (single-tenant); service_role bypasses for server code.
ALTER TABLE public.margot_email_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margot_email_draft FORCE ROW LEVEL SECURITY;
CREATE POLICY margot_email_draft_founder_all ON public.margot_email_draft
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

ALTER TABLE public.margot_draft_approval ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margot_draft_approval FORCE ROW LEVEL SECURITY;
CREATE POLICY margot_draft_approval_founder_all ON public.margot_draft_approval
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
