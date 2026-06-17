-- ============================================================
-- Mobile Voice Intake Packets
-- Founder-scoped Plaud/mobile transcript capture records.
--
-- Additive only. Stores transcript text and derived packet metadata;
-- does not store raw audio, credentials, or external dispatch state.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mobile_voice_packets (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  packet_id                     TEXT NOT NULL,
  source                        TEXT NOT NULL
                                CHECK (source IN (
                                  'plaud_dev_api_webhook',
                                  'plaud_zapier_export',
                                  'plaud_manual_mobile_export',
                                  'mobile_voice_note'
                                )),
  title                         TEXT NOT NULL,
  status                        TEXT NOT NULL DEFAULT 'captured_for_review'
                                CHECK (status IN (
                                  'captured_for_review',
                                  'source_note_ready',
                                  'research_ready',
                                  'board_review_ready',
                                  'queued_to_hermes',
                                  'blocked'
                                )),
  transcript                    TEXT NOT NULL,
  summary                       TEXT,
  captured_at_text              TEXT NOT NULL,
  transcript_character_count    INTEGER NOT NULL DEFAULT 0
                                CHECK (transcript_character_count >= 0),
  speaker_labels_included       BOOLEAN NOT NULL DEFAULT FALSE,
  timestamps_included           BOOLEAN NOT NULL DEFAULT FALSE,
  source_url                    TEXT,
  obsidian_target_path          TEXT NOT NULL,
  second_brain_tags             TEXT[] NOT NULL DEFAULT '{}',
  research_prompt               TEXT NOT NULL,
  senior_pm_work_candidates     TEXT[] NOT NULL DEFAULT '{}',
  board_gate                    TEXT NOT NULL DEFAULT 'mobile_voice_capture_review'
                                CHECK (board_gate = 'mobile_voice_capture_review'),
  external_dispatch_enabled     BOOLEAN NOT NULL DEFAULT FALSE
                                CHECK (external_dispatch_enabled = FALSE),
  auto_publish_enabled          BOOLEAN NOT NULL DEFAULT FALSE
                                CHECK (auto_publish_enabled = FALSE),
  production_execution_enabled  BOOLEAN NOT NULL DEFAULT FALSE
                                CHECK (production_execution_enabled = FALSE),
  raw_audio_stored              BOOLEAN NOT NULL DEFAULT FALSE
                                CHECK (raw_audio_stored = FALSE),
  metadata                      JSONB NOT NULL DEFAULT '{}',
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(founder_id, packet_id)
);

COMMENT ON TABLE public.mobile_voice_packets IS 'Founder-scoped mobile/Plaud transcript capture packets for Obsidian research and Board review';
COMMENT ON COLUMN public.mobile_voice_packets.transcript IS 'Transcript text only; raw audio is deliberately not stored';
COMMENT ON COLUMN public.mobile_voice_packets.external_dispatch_enabled IS 'Must remain false until a named Board gate enables downstream dispatch';

CREATE INDEX IF NOT EXISTS mobile_voice_packets_founder_created_idx
  ON public.mobile_voice_packets(founder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mobile_voice_packets_founder_status_idx
  ON public.mobile_voice_packets(founder_id, status);

CREATE INDEX IF NOT EXISTS mobile_voice_packets_tags_idx
  ON public.mobile_voice_packets USING GIN(second_brain_tags);

ALTER TABLE public.mobile_voice_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_voice_packets_select ON public.mobile_voice_packets
  FOR SELECT USING (founder_id = auth.uid());

CREATE POLICY mobile_voice_packets_insert ON public.mobile_voice_packets
  FOR INSERT WITH CHECK (founder_id = auth.uid());

CREATE POLICY mobile_voice_packets_update ON public.mobile_voice_packets
  FOR UPDATE USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mobile_voice_packets_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mobile_voice_packets_updated_at ON public.mobile_voice_packets;
CREATE TRIGGER mobile_voice_packets_updated_at
  BEFORE UPDATE ON public.mobile_voice_packets
  FOR EACH ROW EXECUTE FUNCTION public.mobile_voice_packets_update_updated_at();

-- DOWN / rollback
-- DROP TRIGGER IF EXISTS mobile_voice_packets_updated_at ON public.mobile_voice_packets;
-- DROP FUNCTION IF EXISTS public.mobile_voice_packets_update_updated_at();
-- DROP POLICY IF EXISTS mobile_voice_packets_update ON public.mobile_voice_packets;
-- DROP POLICY IF EXISTS mobile_voice_packets_insert ON public.mobile_voice_packets;
-- DROP POLICY IF EXISTS mobile_voice_packets_select ON public.mobile_voice_packets;
-- DROP INDEX IF EXISTS mobile_voice_packets_tags_idx;
-- DROP INDEX IF EXISTS mobile_voice_packets_founder_status_idx;
-- DROP INDEX IF EXISTS mobile_voice_packets_founder_created_idx;
-- DROP TABLE IF EXISTS public.mobile_voice_packets;
