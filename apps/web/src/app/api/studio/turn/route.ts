// src/app/api/studio/turn/route.ts
//
// POST /api/studio/turn — the Visual Campaign Studio concept-round turn.
// Loads the routed idea-task, resolves the founder's brand, generates concept
// images (Gemini; OpenAI is honestly not_connected), uploads them, persists the
// session to cc_tasks.metadata.studio, and returns the concepts + agent message.
// Nothing is published here — that is the gated lock step in a later phase.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { resolveStudioBrand } from '@/lib/studio/studio-brand'
import { generateVisuals, type StudioProvider } from '@/lib/studio/generate-visuals'
import { uploadConceptImage } from '@/lib/studio/studio-storage'
import { applyConceptTurn, type ConceptImage, type StudioSession } from '@/lib/studio/studio-session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { taskId?: unknown; message?: unknown; provider?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!taskId) return NextResponse.json({ error: 'Field "taskId" is required' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'Field "message" is required' }, { status: 400 })
  const provider: StudioProvider = body.provider === 'openai' ? 'openai' : 'gemini'

  const task = await getTaskById({ founderId: user.id, taskId })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const routing = (task.metadata?.routing ?? {}) as { businessKey?: string | null }
  const resolved = await resolveStudioBrand({ founderId: user.id, businessKey: routing.businessKey ?? null })
  if (!resolved) {
    return NextResponse.json(
      { status: 'not_connected', reason: 'No ready brand profile — connect or select one first.' },
      { status: 200 },
    )
  }

  // `generateVisuals` is contracted never to throw — but harden defensively so a
  // thrown failure (e.g. a misbehaving provider client) is logged with its exact
  // detail server-side and surfaced honestly in `errors[]` rather than 500-ing.
  const errors: string[] = []
  let images: { imageBase64: string; mimeType: string }[] = []
  try {
    const gen = await generateVisuals({ prompt: message, count: 3, brand: resolved.brandDNA, provider })
    images = gen.images
    errors.push(...gen.errors)
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error(`[studio/turn] generateVisuals threw for task ${taskId}:`, e)
    errors.push(`Image generation failed: ${detail}`)
  }

  // Upload each generated image. A partial failure here (some upload, some don't)
  // must still return the ones that succeeded, with the failures named in `errors`.
  const concepts: ConceptImage[] = []
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    const conceptId = crypto.randomUUID()
    try {
      const url = await uploadConceptImage({
        imageBase64: img.imageBase64,
        mimeType: img.mimeType,
        founderId: user.id,
        taskId,
        conceptId,
      })
      if (url) {
        concepts.push({ id: conceptId, url, prompt: message })
      } else {
        errors.push(`Concept ${i + 1}: upload failed (no URL returned).`)
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      console.error(`[studio/turn] uploadConceptImage threw for task ${taskId}, concept ${i + 1}:`, e)
      errors.push(`Concept ${i + 1}: upload error — ${detail}`)
    }
  }

  const agentMessage =
    concepts.length > 0
      ? `Generated ${concepts.length} concept${concepts.length === 1 ? '' : 's'} from your brief. Pick one or tell me what to change.`
      : `I couldn't generate a usable concept this round${errors.length ? ` (${errors[0]})` : ''}. Try rephrasing, or switch the image engine.`

  const studioPrev = task.metadata?.studio as Partial<StudioSession> | undefined
  const session = applyConceptTurn(studioPrev, {
    founderMessage: message,
    agentMessage,
    newConcepts: concepts,
    provider,
    at: new Date().toISOString(),
  })

  await mergeTaskMetadata({ founderId: user.id, taskId, patch: { studio: session } })
  try {
    await appendTaskEvent({
      founderId: user.id,
      taskId,
      type: 'comment',
      actor: 'system',
      payload: { kind: 'studio_concept', count: concepts.length },
    })
  } catch {
    // best-effort
  }

  return NextResponse.json({ status: 'ok', agentMessage, concepts, errors }, { status: 200 })
}
