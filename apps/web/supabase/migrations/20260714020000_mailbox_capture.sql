-- Mailbox registry + unified capture (WS2 P1).
--
-- Moves the hardcoded EMAIL_ACCOUNTS (src/lib/email-accounts.ts) into per-business
-- DB config (the SSOT), and captures EVERY inbox into one message store — not
-- just Google (today's live pull skips the Microsoft + SiteGround mailboxes).
-- founder_id-scoped, RLS forced. Validate on a Supabase DB branch; never
-- prod-autonomous.

CREATE TABLE IF NOT EXISTS public.mailbox_account (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  business_key      TEXT NOT NULL,
  label             TEXT,
  provider          TEXT NOT NULL
                      CHECK (provider IN ('google', 'microsoft', 'siteground', 'imap')),
  scope             TEXT NOT NULL DEFAULT 'owned'
                      CHECK (scope IN ('owned', 'client', 'personal')),
  receipt_ingestion BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'disconnected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (founder_id, email)
);

CREATE TABLE IF NOT EXISTS public.captured_message (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mailbox_account_id  UUID REFERENCES public.mailbox_account(id) ON DELETE CASCADE,
  business_key        TEXT,
  provider_message_id TEXT NOT NULL,
  thread_id           TEXT,
  from_address        TEXT,
  to_address          TEXT,
  subject             TEXT,
  snippet             TEXT,
  received_at         TIMESTAMPTZ,
  raw                 JSONB NOT NULL DEFAULT '{}',
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mailbox_account_id, provider_message_id)   -- idempotent capture
);
CREATE INDEX IF NOT EXISTS captured_message_founder_received_idx
  ON public.captured_message (founder_id, received_at DESC);

ALTER TABLE public.mailbox_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox_account FORCE ROW LEVEL SECURITY;
CREATE POLICY mailbox_account_founder_all ON public.mailbox_account
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

ALTER TABLE public.captured_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_message FORCE ROW LEVEL SECURITY;
CREATE POLICY captured_message_founder_all ON public.captured_message
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
