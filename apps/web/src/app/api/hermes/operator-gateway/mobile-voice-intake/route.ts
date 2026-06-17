import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import {
  buildMobileVoiceCapturePacket,
  getMobileVoiceIntakeStatus,
  type MobileVoiceCaptureInput,
} from '@/lib/operator-gateway/mobile-voice-intake'
import { persistMobileVoicePacket, type MobileVoicePacketWriteClient } from '@/lib/operator-gateway/mobile-voice-packets'

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
// Persists a review packet only; it does not publish, dispatch, or create tasks.
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
    const supabase = await createClient()
    const persistence = await persistMobileVoicePacket({
      founderId: user.id,
      client: supabase as unknown as MobileVoicePacketWriteClient,
      packet,
      transcript,
      summary: typeof body.summary === 'string' ? body.summary : null,
      sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : null,
    })

    if (!persistence.ok) {
      return NextResponse.json({
        error: persistence.error,
        reasons: persistence.reasons,
        persisted: false,
        tasksCreated: false,
        externalDispatchEnabled: false,
        autoPublishEnabled: false,
        productionExecutionEnabled: false,
      }, { status: persistence.status })
    }

    return NextResponse.json({
      packet,
      record: persistence.record,
      founderOnly: true,
      persisted: true,
      tasksCreated: false,
      externalDispatchEnabled: false,
      autoPublishEnabled: false,
      productionExecutionEnabled: false,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to build mobile voice packet' }, { status: 500 })
  }
}
