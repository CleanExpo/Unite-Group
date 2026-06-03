// POST /api/knowledge/notes/{id}/create-video
// One-click: knowledge note → video job (draft state)

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const supabase = await createClient()

  // Verify note exists and belongs to founder
  const { data: note, error: noteError } = await supabase
    .from('knowledge_notes')
    .select('id, project_key, title, content, tags, quality, confidence, word_count')
    .eq('founder_id', user.id)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (noteError || !note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  // Gate: only published/high-quality notes become videos
  if (note.quality !== 'published' && note.confidence !== 'high') {
    return NextResponse.json(
      { error: 'Note must be quality=published or confidence=high to create video' },
      { status: 400 }
    )
  }

  // Gate: minimum word count
  if ((note.word_count || 0) < 300) {
    return NextResponse.json(
      { error: 'Note must be at least 300 words for video generation' },
      { status: 400 }
    )
  }

  // Check if video already exists for this note
  const { data: existing } = await supabase
    .from('video_jobs')
    .select('id, status')
    .eq('source_note_id', note.id)
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing && !['failed', 'published'].includes(existing.status)) {
    return NextResponse.json(
      { error: `Video job already exists: ${existing.status}`, videoJobId: existing.id },
      { status: 409 }
    )
  }

  // Create video job
  const { data: job, error: jobError } = await supabase
    .from('video_jobs')
    .insert({
      founder_id: user.id,
      source_note_id: note.id,
      project_key: note.project_key || 'nexus',
      status: 'draft',
      title: note.title,
      tags: note.tags || [],
      target_duration_seconds: 300,
      cost_cents: 0,
      cost_breakdown: {},
    })
    .select('id')
    .single()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  // Update note with video_job_id
  await supabase
    .from('knowledge_notes')
    .update({ video_job_id: job.id })
    .eq('id', note.id)
    .eq('founder_id', user.id)

  return NextResponse.json({
    videoJobId: job.id,
    noteId: note.id,
    status: 'draft',
    message: 'Video job created. Status will advance through: scripting → audio → assets → video → composing → queued → published.',
  })
}
