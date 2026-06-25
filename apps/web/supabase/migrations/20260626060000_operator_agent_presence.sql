-- ============================================================
-- Model Operator Gateway — operator_agent_presence (Step 2: the connection)
-- Companion to 20260606000000_operator_gateway_jobs_events.sql
--   (operator_jobs / operator_events — applied to prod lksfwktwtmyznckodsau 26/06/2026).
--
-- Purpose: make "HERMES AGENT connected" a VERIFIABLE FACT, not a static claim.
--   A local Hermes agent dials OUT to Supabase and upserts its heartbeat row here
--   every ~15s. The live command-centre reads last_seen_at and derives:
--     now - last_seen_at < 30s  -> connected
--                        < 5m   -> stale
--                        else   -> offline
--   No inbound exposure of the agent; no second crypto layer. Supabase IS the relay.
--
-- Additive only. Founder-scoped RLS (founder_id = auth.uid()), single-tenant.
-- The agent writes with the service-role key + FOUNDER_USER_ID (the existing cron
-- auth pattern); service_role bypasses RLS, but founder_id is still set explicitly.
--
-- ⚠️  Apply target: prod "Unite-Group" (lksfwktwtmyznckodsau), via the SQL editor.
--     Applying is a human-gated operator action — never autonomous. Reversible
--     DOWN block at the foot. Until applied, the status route degrades to honest
--     'offline' (table-missing), consistent with the No-Invaders honest-not_connected rule.
-- ============================================================

CREATE TABLE IF NOT EXISTS operator_agent_presence (
  founder_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,                       -- stable per-machine/runner id
  hostname      TEXT,
  agent_version TEXT,
  capabilities  JSONB NOT NULL DEFAULT '{}',         -- honest "what's on the other end"
  metadata      JSONB NOT NULL DEFAULT '{}',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- uptime since last (re)start
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- the heartbeat — freshness = connection
  PRIMARY KEY (founder_id, agent_id)                 -- natural upsert key
);
COMMENT ON TABLE operator_agent_presence IS 'Live heartbeat of local Hermes agent(s). Freshness of last_seen_at drives connected/stale/offline on the command-centre.';

CREATE INDEX IF NOT EXISTS operator_agent_presence_founder_seen_idx
  ON operator_agent_presence(founder_id, last_seen_at DESC);

-- ============================================================
-- RLS (founder-scoped)
-- ============================================================
ALTER TABLE operator_agent_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY operator_agent_presence_all ON operator_agent_presence
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

-- ============================================================
-- DOWN / rollback
-- ============================================================
-- DROP TABLE IF EXISTS operator_agent_presence;
-- ============================================================
