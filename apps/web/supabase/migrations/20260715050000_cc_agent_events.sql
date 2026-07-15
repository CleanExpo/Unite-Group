-- 20260715050000_cc_agent_events.sql
--
-- FOUNDER-GATED (Matrix wall Wave B1 — UNI-2378). Redacted agent-session
-- telemetry: one row per heartbeat / tool-call / status event emitted by an
-- estate runner, read by the Matrix wall over Supabase Realtime.
--
-- Apply on a Supabase database branch first, then prod via `supabase db push`
-- after founder review — never applied autonomously (CLAUDE.md DB rule).
--
-- Privacy: event NAMES and TARGETS only, never payloads/args. Founder-scoped
-- reads (RLS); writes are service-role only (the bearer-authed ingest route).

CREATE TABLE IF NOT EXISTS cc_agent_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The emitter's local session id (e.g. a Claude Code session), a free-text
  -- correlation key — NOT an FK to cc_execution_sessions, so a heartbeat is
  -- never rejected for lack of a control-plane row.
  session_id   TEXT,
  agent_name   TEXT NOT NULL,
  surface      TEXT NOT NULL DEFAULT 'claude-code'
               CHECK (surface IN ('codex', 'claude-code', 'pi-ceo-dev', 'local')),
  machine      TEXT,
  repo         TEXT,
  project_key  TEXT,
  plan_key     TEXT,
  event_type   TEXT NOT NULL
               CHECK (event_type IN ('heartbeat', 'tool_call', 'status')),
  tool_name    TEXT,
  target       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cc_agent_events IS 'Redacted agent-session telemetry for the Matrix wall (names+targets only; UNI-2378 B1)';

CREATE INDEX IF NOT EXISTS cc_agent_events_founder_created_idx
  ON cc_agent_events (founder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cc_agent_events_session_idx
  ON cc_agent_events (session_id, created_at DESC);

-- RLS: founder reads own rows; writes are service-role (bypasses RLS) via the
-- bearer-authed ingest route. No founder INSERT policy by design.
ALTER TABLE cc_agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_agent_events FORCE ROW LEVEL SECURITY;

-- Idempotent like the rest of this file (no CREATE POLICY IF NOT EXISTS in PG).
DROP POLICY IF EXISTS cc_agent_events_select ON cc_agent_events;
CREATE POLICY cc_agent_events_select ON cc_agent_events
  FOR SELECT USING (founder_id = auth.uid());

-- Realtime: the publication is explicit-table (not FOR ALL TABLES), so add this
-- table so the wall's postgres_changes subscription receives its rows. Guarded
-- against a double-add if the branch/prod already has it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cc_agent_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cc_agent_events;
  END IF;
END $$;
