// GET /api/command-centre/wiki-graph
//
// The wiki knowledge base as an interactive graph (UNI-2304). Auth-gated to the
// founder exactly like sibling /api/command-centre/* routes. Reads wiki_pages
// (synced from the Obsidian 2nd Brain), parses [[wikilink]] references
// server-side, and returns the resolved node/edge graph. Unresolved links are
// dropped, never fabricated; orphan pages are included as isolated nodes.
//
// Read-only. Nothing executes.

import { NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { buildWikiGraph, type WikiPageRow } from '@/lib/command-centre/wiki-graph'

export const dynamic = 'force-dynamic'

// PostgREST's default row cap. Made explicit so truncation can be detected and
// surfaced honestly instead of silently rendering a partial graph as complete.
const WIKI_PAGES_LIMIT = 1000

export async function GET(): Promise<Response> {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const supabase = await createClient()
    // Explicit cap: without it PostgREST silently caps at 1000 anyway. Making it
    // explicit lets us detect the truncation and say so, rather than quietly
    // rendering a partial graph as if it were complete.
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('id, title, tags, content, updated_at')
      .limit(WIKI_PAGES_LIMIT)

    if (error) {
      return NextResponse.json(
        { error: sanitiseError(error, 'Failed to load wiki graph', { route: '/api/command-centre/wiki-graph' }) },
        { status: 500 },
      )
    }

    const rows = (data ?? []) as WikiPageRow[]
    const graph = buildWikiGraph(rows)
    return NextResponse.json({
      source: 'wiki_pages',
      generatedAt: new Date().toISOString(),
      ...graph,
      edgeCount: graph.edges.length,
      truncated: rows.length === WIKI_PAGES_LIMIT,
    })
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Failed to load wiki graph') },
      { status: 500 },
    )
  }
}
