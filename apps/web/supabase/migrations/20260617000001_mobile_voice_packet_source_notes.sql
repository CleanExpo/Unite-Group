-- ============================================================
-- Mobile Voice Packet Source Notes
-- Tracks Obsidian/2nd-brain source-note materialisation for
-- persisted Plaud/mobile transcript packets.
--
-- Additive only. This does not enable Hermes, Linear, external
-- dispatch, publishing, production execution, or raw-audio storage.
-- ============================================================

ALTER TABLE public.mobile_voice_packets
  ADD COLUMN IF NOT EXISTS obsidian_source_note_path TEXT,
  ADD COLUMN IF NOT EXISTS obsidian_source_note_written_at TIMESTAMPTZ;

COMMENT ON COLUMN public.mobile_voice_packets.obsidian_source_note_path IS
  'Relative path of the written Obsidian/2nd-brain source note, when materialised';

COMMENT ON COLUMN public.mobile_voice_packets.obsidian_source_note_written_at IS
  'Timestamp when the source note was written; task creation remains separately gated';

CREATE INDEX IF NOT EXISTS mobile_voice_packets_source_note_idx
  ON public.mobile_voice_packets(founder_id, obsidian_source_note_written_at DESC)
  WHERE obsidian_source_note_written_at IS NOT NULL;

-- DOWN / rollback
-- DROP INDEX IF EXISTS mobile_voice_packets_source_note_idx;
-- ALTER TABLE public.mobile_voice_packets
--   DROP COLUMN IF EXISTS obsidian_source_note_written_at,
--   DROP COLUMN IF EXISTS obsidian_source_note_path;
