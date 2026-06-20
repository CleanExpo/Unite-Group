-- Migration: margot_voice_sessions
-- Stores Margot Voice (ElevenLabs conversational AI) session packets ingested
-- via the /api/pi-ceo/margot-voice/task endpoint.
-- Note: voice_command_sessions already exists in the shared DB with a different schema.

CREATE TABLE IF NOT EXISTS public.margot_voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  packet_id TEXT NOT NULL,
  conversation_id TEXT,
  transcript_text TEXT NOT NULL,
  summary TEXT NOT NULL,
  requested_outcome TEXT,
  business_context TEXT DEFAULT 'unite-group',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  approval_required BOOLEAN DEFAULT FALSE,
  approval_reason TEXT,
  actions JSONB DEFAULT '[]',
  evidence_refs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.margot_voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_all" ON public.margot_voice_sessions
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

CREATE INDEX ON public.margot_voice_sessions (founder_id, created_at DESC);
