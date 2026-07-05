// GET /api/command-centre/margot-health
// Founder-scoped Margot operational state for the Mission Control deck.
// Config-presence booleans + last voice-session + agent-presence heartbeat.
// Booleans and timestamps only — never key material.

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import {
  deriveMargotHealth,
  type MargotVoiceRead,
  type MargotPresenceRead,
} from '@/lib/command-centre/margot-health'

export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 14

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const supabase = await createClient()
    const now = new Date()
    const sinceIso = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const [voiceRes, latestVoiceRes, presenceRes] = await Promise.all([
      supabase
        .from('margot_voice_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('founder_id', user.id)
        .gte('created_at', sinceIso),
      supabase
        .from('margot_voice_sessions')
        .select('created_at')
        .eq('founder_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('operator_agent_presence')
        .select('last_seen_at')
        .eq('founder_id', user.id)
        .order('last_seen_at', { ascending: false }),
    ])

    const voice: MargotVoiceRead =
      voiceRes.error || latestVoiceRes.error
        ? { ok: false, latestSessionAt: null, sessionsInWindow: 0, error: 'voice read failed' }
        : {
            ok: true,
            latestSessionAt: latestVoiceRes.data?.[0]?.created_at ?? null,
            sessionsInWindow: voiceRes.count ?? 0,
          }

    const presence: MargotPresenceRead = presenceRes.error
      ? { ok: false, latestSeenAt: null, agentCount: 0, error: 'presence read failed' }
      : {
          ok: true,
          latestSeenAt: presenceRes.data?.[0]?.last_seen_at ?? null,
          agentCount: presenceRes.data?.length ?? 0,
        }

    const payload = deriveMargotHealth({
      now: now.toISOString(),
      windowDays: WINDOW_DAYS,
      config: {
        elevenLabsApiKey: !!process.env.ELEVENLABS_API_KEY?.trim(),
        margotAgentId: !!process.env.ELEVENLABS_MARGOT_AGENT_ID?.trim(),
        ingestToken: !!process.env.ELEVENLABS_INGEST_TOKEN?.trim(),
        founderConfigured: !!process.env.FOUNDER_USER_ID?.trim(),
      },
      voice,
      presence,
    })

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: sanitiseError(err, 'margot-health failed') }, { status: 500 })
  }
}
