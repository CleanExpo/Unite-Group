// GET /api/video/jobs — list video jobs with filtering

import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const projectKey = searchParams.get('project')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const supabase = await createClient()

  let query = supabase
    .from('video_jobs')
    .select('*, knowledge_notes:vault_path, title', { count: 'exact' })
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status as Database['public']['Enums']['video_job_status'])
  }

  if (projectKey) {
    query = query.eq('project_key', projectKey)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to load video jobs', { route: '/api/video/jobs' }) }, { status: 500 })

  return NextResponse.json({ jobs: data ?? [], count: count ?? 0, offset, limit })
}
