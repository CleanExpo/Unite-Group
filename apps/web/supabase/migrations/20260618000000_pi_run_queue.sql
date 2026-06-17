-- ============================================================
-- Pi Run Queue — durable, founder-scoped persistence
--
-- Replaces the in-memory module-level Map that backed the Pi run queue
-- (lost on every serverless cold start, never founder-fenced). Stores the
-- full FounderRunQueueItem as JSONB plus indexed scalar columns so the
-- queue survives restarts and is isolated per founder.
--
-- Additive only. No secrets, no external dispatch state.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pi_run_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue_id    TEXT NOT NULL,
  status      TEXT NOT NULL
              CHECK (status IN (
                'queued',
                'waiting_for_approval',
                'waiting_for_device',
                'in_progress',
                'blocked',
                'completed'
              )),
  item        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(founder_id, queue_id)
);

COMMENT ON TABLE public.pi_run_queue IS 'Founder-scoped durable Pi run-queue items (full FounderRunQueueItem in item JSONB)';
COMMENT ON COLUMN public.pi_run_queue.queue_id IS 'The application run id (run_<taskId>); unique per founder';
COMMENT ON COLUMN public.pi_run_queue.item IS 'Full FounderRunQueueItem snapshot — task packet, context pack, machine assignment, approvals, blockers, receipts';

CREATE INDEX IF NOT EXISTS pi_run_queue_founder_updated_idx
  ON public.pi_run_queue(founder_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS pi_run_queue_founder_status_idx
  ON public.pi_run_queue(founder_id, status);

ALTER TABLE public.pi_run_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY pi_run_queue_select ON public.pi_run_queue
  FOR SELECT USING (founder_id = auth.uid());

CREATE POLICY pi_run_queue_insert ON public.pi_run_queue
  FOR INSERT WITH CHECK (founder_id = auth.uid());

CREATE POLICY pi_run_queue_update ON public.pi_run_queue
  FOR UPDATE USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

CREATE OR REPLACE FUNCTION public.pi_run_queue_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pi_run_queue_updated_at ON public.pi_run_queue;
CREATE TRIGGER pi_run_queue_updated_at
  BEFORE UPDATE ON public.pi_run_queue
  FOR EACH ROW EXECUTE FUNCTION public.pi_run_queue_update_updated_at();

-- DOWN / rollback
-- DROP TRIGGER IF EXISTS pi_run_queue_updated_at ON public.pi_run_queue;
-- DROP FUNCTION IF EXISTS public.pi_run_queue_update_updated_at();
-- DROP POLICY IF EXISTS pi_run_queue_update ON public.pi_run_queue;
-- DROP POLICY IF EXISTS pi_run_queue_insert ON public.pi_run_queue;
-- DROP POLICY IF EXISTS pi_run_queue_select ON public.pi_run_queue;
-- DROP INDEX IF EXISTS pi_run_queue_founder_status_idx;
-- DROP INDEX IF EXISTS pi_run_queue_founder_updated_idx;
-- DROP TABLE IF EXISTS public.pi_run_queue;
