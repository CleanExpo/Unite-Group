import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  buildMobileVoiceCapturePacket,
  getMobileVoiceIntakeStatus,
  type MobileVoiceCaptureInput,
} from '@/lib/operator-gateway/mobile-voice-intake'

export const dynamic = 'force-dynamic'

const MAX_TRANSCRIPT_LENGTH = 80_000

// GET — founder/session guarded mobile voice intake status.
// Read-only design/status: no external dispatch, no Plaud credential storage, no raw audio storage.
export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    return NextResponse.json({
      ...getMobileVoiceIntakeStatus(),
      founderOnly: true,
      externalDispatchEnabled: false,
      autoPublishEnabled: false,
      productionExecutionEnabled: false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load mobile voice intake' }, { status: 500 })
  }
}

// POST — founder/session guarded mobile/Plaud transcript packet builder.
// Returns an Obsidian/research/Board packet only; it does not persist, publish, or create tasks.
export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    let body: Partial<MobileVoiceCaptureInput>
    try {
      body = (await request.json()) as Partial<MobileVoiceCaptureInput>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
    if (!transcript) return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { error: `transcript exceeds ${MAX_TRANSCRIPT_LENGTH} character limit` },
        { status: 400 },
      )
    }

    const source = body.source ?? 'mobile_voice_note'
    const allowedSources = getMobileVoiceIntakeStatus().plaudIngressModes
    if (!allowedSources.includes(source)) {
      return NextResponse.json({ error: 'unsupported mobile voice source' }, { status: 400 })
    }

    const packet = buildMobileVoiceCapturePacket({
      source,
      transcript,
      title: typeof body.title === 'string' ? body.title : undefined,
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      capturedAt: typeof body.capturedAt === 'string' ? body.capturedAt : undefined,
      speakerLabelsIncluded: body.speakerLabelsIncluded === true,
      timestampsIncluded: body.timestampsIncluded === true,
      sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
    })

    return NextResponse.json({
      packet,
      founderOnly: true,
      persisted: false,
      tasksCreated: false,
      externalDispatchEnabled: false,
      autoPublishEnabled: false,
      productionExecutionEnabled: false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to build mobile voice packet' }, { status: 500 })
  }
}
