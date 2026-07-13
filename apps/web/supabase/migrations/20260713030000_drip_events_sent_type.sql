-- =============================================================================
-- Migration: allow 'sent' drip events (UNI-2356 live-send lane)
-- drip_events.event_type gains 'sent' — recorded when a drip step is delivered
-- via the provider (provider_send = 'sent', metadata.messageId = SendGrid id).
--
-- Rollback:
--   ALTER TABLE public.drip_events DROP CONSTRAINT drip_events_event_type_check;
--   ALTER TABLE public.drip_events ADD CONSTRAINT drip_events_event_type_check
--     CHECK (event_type IN ('dry_run_processed', 'skipped', 'failed'));
-- =============================================================================

alter table public.drip_events
  drop constraint if exists drip_events_event_type_check;

alter table public.drip_events
  add constraint drip_events_event_type_check
  check (event_type in ('dry_run_processed', 'skipped', 'failed', 'sent'));
