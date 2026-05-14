-- Security P0 fixes — companion migration to PR `security: P0 fixes from deepsec-2026-05-14`.
--
-- Adds the database-level guards the application code now relies on:
--   1. UNIQUE constraint on stripe_events.stripe_event_id — prevents the
--      TOCTOU race in webhooks/stripe/route.ts where Stripe retries can
--      duplicate-insert and double-trigger Hour-1 provisioning.
--   2. UNIQUE constraint on video_production_queue.metadata->>'github_delivery_id'
--      via a deterministic generated column — prevents duplicate enqueue
--      from GitHub webhook retries.
--   3. Length checks on user-supplied text columns where the code-side
--      enforcement is not yet wired (defense in depth).

-- 1. Stripe event idempotency — UNIQUE on stripe_event_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stripe_events_event_id_unique'
  ) THEN
    ALTER TABLE public.stripe_events
      ADD CONSTRAINT stripe_events_event_id_unique
      UNIQUE (stripe_event_id);
  END IF;
END $$;

-- 2. GitHub webhook idempotency — UNIQUE on the delivery_id stored in metadata
ALTER TABLE public.video_production_queue
  ADD COLUMN IF NOT EXISTS github_delivery_id TEXT GENERATED ALWAYS AS (
    metadata->>'github_delivery_id'
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS video_production_queue_github_delivery_unique
  ON public.video_production_queue(github_delivery_id)
  WHERE github_delivery_id IS NOT NULL;

-- 3. Length-check guards on text fields used as inbound surfaces
--    (deepsec P2 — defence in depth; the API also caps these now)
ALTER TABLE public.client_approvals
  DROP CONSTRAINT IF EXISTS client_approvals_deliverable_title_len;
ALTER TABLE public.client_approvals
  ADD CONSTRAINT client_approvals_deliverable_title_len
  CHECK (char_length(deliverable_title) BETWEEN 1 AND 500);

ALTER TABLE public.client_approvals
  DROP CONSTRAINT IF EXISTS client_approvals_changes_body_len;
ALTER TABLE public.client_approvals
  ADD CONSTRAINT client_approvals_changes_body_len
  CHECK (changes_requested_body IS NULL OR char_length(changes_requested_body) <= 10000);
