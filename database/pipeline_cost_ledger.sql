-- SYN-518: Pipeline Cost Ledger
-- Run this migration before wiring trackPipelineCost() into any pipeline.

CREATE TABLE IF NOT EXISTS pipeline_cost_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name TEXT NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- null = board-level pipeline
  run_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcl_pipeline_name ON pipeline_cost_ledger(pipeline_name);
CREATE INDEX IF NOT EXISTS idx_pcl_client_id ON pipeline_cost_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_pcl_created_at ON pipeline_cost_ledger(created_at);

-- RLS: only service role writes; admins can read all
ALTER TABLE pipeline_cost_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all cost ledger entries"
  ON pipeline_cost_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE pipeline_cost_ledger IS 'Tracks per-run AI pipeline costs for margin monitoring. See SYN-518 and scripts/cost-report.sql.';
