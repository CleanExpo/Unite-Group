// GET /api/wiki — list or search all wiki pages

import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = await createClient()
  const search = req.nextUrl.searchParams.get('search')

  let query = supabase
    .from('wiki_pages')
    .select('id, title, word_count, tags, updated_at')
    .order('title')

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to load wiki pages', { route: '/api/wiki' }) }, { status: 500 })

  return NextResponse.json(data ?? [])
}
