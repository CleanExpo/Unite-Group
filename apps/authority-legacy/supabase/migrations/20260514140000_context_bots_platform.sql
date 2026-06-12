-- ContextBot platform — central registry for every Telegram bot the swarm operates.
--
-- One primitive — (bot_identity, context, routing_rules) — covers:
--   - portfolio bots (Pi-CEO branded, Phill-inbound: UG, RA, DR, NRPG, CARSI, ATIA)
--   - client bots   (Unite-Group branded, client-inbound: CCW, Duncan, Ivi, …)
--   - partner bots  (Unite-Group branded, partner-inbound: vendors, sub-contractors)
--   - function bots (Pi-CEO branded, swarm-outbound: general, research, dev, ops, marketing)
--
-- Bot identity carries the routing context — zero NLP needed for classification.
-- Idempotent: safe to re-run.

-- ── context_bots ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.context_bots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_username         TEXT NOT NULL UNIQUE,
  bot_token            TEXT NOT NULL,
  kind                 TEXT NOT NULL
                         CHECK (kind IN ('portfolio','client','partner','function')),
  brand                TEXT NOT NULL
                         CHECK (brand IN ('pi-ceo','unite-group')),
  context_id           TEXT NOT NULL,
  context_label        TEXT NOT NULL,
  linear_team_key      TEXT,
  linear_project_id    TEXT,
  wiki_section         TEXT,
  greeting_template    TEXT,
  auto_reply_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  intake_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  long_poll_offset     BIGINT  NOT NULL DEFAULT 0,
  authorized_chat_ids  JSONB   NOT NULL DEFAULT '[]'::jsonb,
  metadata             JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES auth.users(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS context_bots_kind_idx
  ON public.context_bots(kind);
CREATE INDEX IF NOT EXISTS context_bots_context_idx
  ON public.context_bots(context_id);
CREATE INDEX IF NOT EXISTS context_bots_intake_active_idx
  ON public.context_bots(intake_enabled)
  WHERE intake_enabled = TRUE;

-- ── context_bot_messages — audit log of every inbound message ───────────────
CREATE TABLE IF NOT EXISTS public.context_bot_messages (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id                 UUID NOT NULL REFERENCES public.context_bots(id) ON DELETE CASCADE,
  context_id             TEXT NOT NULL,
  telegram_update_id     BIGINT NOT NULL,
  telegram_message_id    BIGINT NOT NULL,
  from_user_id           BIGINT NOT NULL,
  from_username          TEXT,
  from_name              TEXT,
  body                   TEXT NOT NULL,
  raw_payload            JSONB NOT NULL,
  filed_linear_issue     TEXT,
  filed_wiki_path        TEXT,
  filed_at               TIMESTAMPTZ,
  received_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT context_bot_messages_dedupe UNIQUE (bot_id, telegram_update_id)
);

CREATE INDEX IF NOT EXISTS context_bot_messages_context_received_idx
  ON public.context_bot_messages (context_id, received_at DESC);
CREATE INDEX IF NOT EXISTS context_bot_messages_unfiled_idx
  ON public.context_bot_messages (received_at DESC)
  WHERE filed_at IS NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.context_bots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_bot_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS context_bots_service_role_all ON public.context_bots;
CREATE POLICY context_bots_service_role_all
  ON public.context_bots
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS context_bots_phill_admin_all ON public.context_bots;
CREATE POLICY context_bots_phill_admin_all
  ON public.context_bots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email IN ('contact@unite-group.in','phill.mcgurk@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email IN ('contact@unite-group.in','phill.mcgurk@gmail.com')
    )
  );

DROP POLICY IF EXISTS context_bot_messages_service_role_all ON public.context_bot_messages;
CREATE POLICY context_bot_messages_service_role_all
  ON public.context_bot_messages
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS context_bot_messages_phill_admin_select ON public.context_bot_messages;
CREATE POLICY context_bot_messages_phill_admin_select
  ON public.context_bot_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email IN ('contact@unite-group.in','phill.mcgurk@gmail.com')
    )
  );

-- ── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.context_bots_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS context_bots_set_updated_at ON public.context_bots;
CREATE TRIGGER context_bots_set_updated_at
  BEFORE UPDATE ON public.context_bots
  FOR EACH ROW EXECUTE FUNCTION public.context_bots_touch_updated_at();
