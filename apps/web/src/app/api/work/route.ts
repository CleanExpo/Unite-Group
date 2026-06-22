// POST /api/work — plain-English work ingestion with LLM-based intent classification.
// Body: { description: string, context?: string }
// Returns: { intent: { system, workType }, confidence: number, suggestedTitle: string }

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { classifyWork } from '@/lib/work/classifier'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { description?: unknown; context?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  if (description.length > 4000) {
    return NextResponse.json({ error: 'description exceeds 4,000 character limit' }, { status: 400 })
  }

  const context = typeof body.context === 'string' ? body.context.trim() || undefined : undefined

  try {
    const result = await classifyWork(description, context)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Classification service unavailable'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
