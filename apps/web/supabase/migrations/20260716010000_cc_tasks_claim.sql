-- Runner claim/lease columns (UNI-2383 — lifecycle grill DECIDED 2026-07-16).
--
-- cc_tasks gains claimed_by/claimed_at so a queue runner can claim a task
-- atomically via conditional UPDATE ... WHERE status = 'queued' (returned-row
-- check) — the brand_video_jobs precedent. No RPC in v1; concurrency is 1.
--
-- FOUNDER-GATED APPLY: this file is inert on merge — CI never runs db push.
-- `supabase db push` is the founder's step (same gate as cc_agent_events).

ALTER TABLE public.cc_tasks
  ADD COLUMN IF NOT EXISTS claimed_by TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Poll path: founder + status filter ordered by priority (P0 < P1 < P2 < P3
-- lexically) then age. Partial-index on the hot statuses only.
CREATE INDEX IF NOT EXISTS cc_tasks_founder_status_priority_idx
  ON public.cc_tasks (founder_id, status, priority, created_at)
  WHERE status IN ('queued', 'running');
