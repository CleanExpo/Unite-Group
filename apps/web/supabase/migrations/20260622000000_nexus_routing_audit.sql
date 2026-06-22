-- nexus_routing_audit — immutable log of every AI provider routing decision.
-- Written by the Nexus router (src/lib/nexus/audit-logger.ts).
-- Append-only by design: no UPDATE or DELETE policies are granted.

CREATE TABLE IF NOT EXISTS public.nexus_routing_audit (
  id                            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  work_type                     TEXT        NOT NULL,
  complexity                    INTEGER     NOT NULL CHECK (complexity BETWEEN 0 AND 100),
  complexity_tier               TEXT        NOT NULL CHECK (complexity_tier IN ('high', 'medium', 'low')),
  token_budget_remaining        BIGINT      NOT NULL,
  selected_provider             TEXT        NOT NULL,
  selected_model                TEXT        NOT NULL,
  capability_score              INTEGER     NOT NULL,
  estimated_cost_per_1m_tokens  NUMERIC(10, 6) NOT NULL,
  reasoning                     TEXT        NOT NULL
);

ALTER TABLE public.nexus_routing_audit ENABLE ROW LEVEL SECURITY;

-- Service role can insert and read (used by the audit-logger and admin tooling).
CREATE POLICY "service_role_all" ON public.nexus_routing_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No authenticated user policies — this is an internal audit table.

-- Indexes for common query patterns (by time, by model, by complexity tier).
CREATE INDEX ON public.nexus_routing_audit (decided_at DESC);
CREATE INDEX ON public.nexus_routing_audit (selected_model, decided_at DESC);
CREATE INDEX ON public.nexus_routing_audit (complexity_tier, decided_at DESC);
