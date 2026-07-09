-- evidence_ledger — cloud substrate for the founder Live Evidence Stream tile
-- (UNI-2227, third cloud-persistence slice of UNI-2340).
--
-- WRITE side: the local vault writer (src/lib/obsidian/evidence.ts) defaulted
-- WIKI_PATH to a Windows-only path (`D:\Hermes\wiki`) when the env var was
-- unset — on Vercel serverless every evidence note from compound moves /
-- operator gateway silently failed to persist. The writer now also
-- best-effort inserts one row per evidence event here via service_role (the
-- local vault write is unchanged and remains authoritative for local/dev).
--
-- READ side: the tile previously tailed
-- `~/2nd-brain/.agentic_nexus/evidence/evidence_ledger.jsonl` from the LOCAL
-- filesystem — permanently empty on Vercel serverless (no such disk exists).
-- The deck now reads this table first (authenticated read policy below),
-- falling back to the local tail honestly when the cloud table is
-- unreachable or empty.

CREATE TABLE IF NOT EXISTS public.evidence_ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL, -- e.g. 'compound_move', 'operator_gateway', 'manual'
  summary        text NOT NULL,
  detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_path  text, -- nullable — the old vault-relative pointer (raw/command-centre/<project>/...)
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_ledger_created_at_idx
  ON public.evidence_ledger (created_at DESC);

ALTER TABLE public.evidence_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evidence_ledger_read_authenticated ON public.evidence_ledger;
CREATE POLICY evidence_ledger_read_authenticated ON public.evidence_ledger
  FOR SELECT TO authenticated USING (true);
-- Writers use service_role (bypasses RLS); no user write policy by design.
