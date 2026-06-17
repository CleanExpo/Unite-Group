-- ============================================================
-- Mobile Voice Board Review Packets
-- Tracks Board-ready review packet materialisation for persisted
-- Plaud/mobile source notes.
--
-- Additive only. This does not enable Hermes, Linear, external
-- dispatch, publishing, production execution, or raw-audio storage.
-- ============================================================

ALTER TABLE public.mobile_voice_packets
  ADD COLUMN IF NOT EXISTS board_review_packet_path TEXT,
  ADD COLUMN IF NOT EXISTS board_review_packet_written_at TIMESTAMPTZ;

COMMENT ON COLUMN public.mobile_voice_packets.board_review_packet_path IS
  'Relative path of the generated Board review packet for the mobile voice source note';

COMMENT ON COLUMN public.mobile_voice_packets.board_review_packet_written_at IS
  'Timestamp when the Board review packet was written; Hermes/Linear handoff remains separately gated';

CREATE INDEX IF NOT EXISTS mobile_voice_packets_board_packet_idx
  ON public.mobile_voice_packets(founder_id, board_review_packet_written_at DESC)
  WHERE board_review_packet_written_at IS NOT NULL;

-- DOWN / rollback
-- DROP INDEX IF EXISTS mobile_voice_packets_board_packet_idx;
-- ALTER TABLE public.mobile_voice_packets
--   DROP COLUMN IF EXISTS board_review_packet_written_at,
--   DROP COLUMN IF EXISTS board_review_packet_path;
