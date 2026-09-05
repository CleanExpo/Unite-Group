// src/app/(founder)/founder/command-centre/wiki-graph/page.tsx
//
// Wiki Graph View (UNI-2304) — an Obsidian-style interactive force-directed
// graph of the founder wiki knowledge base, inside the command centre.
// Auth-gated; queries wiki_pages directly server-side and builds the graph via
// the shared pure builder (same logic the /api/command-centre/wiki-graph route
// exposes for the deck tile). Honest empty state when the wiki is unsynced.

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getUser, createClient } from '@/lib/supabase/server'
import { buildWikiGraph, type WikiPageRow } from '@/lib/command-centre/wiki-graph'
import { WikiGraphView } from './WikiGraphView'
import { chakra, syne, jbMono } from '../fonts'

// PostgREST's default row cap — made explicit so truncation can be surfaced
// honestly instead of silently rendering a partial graph as complete.
const WIKI_PAGES_LIMIT = 1000

export default async function WikiGraphPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('id, title, tags, content, updated_at')
    .limit(WIKI_PAGES_LIMIT)

  const rows = (data ?? []) as WikiPageRow[]
  const graph = error ? null : buildWikiGraph(rows)
  const truncated = !error && rows.length === WIKI_PAGES_LIMIT

  return <WikiGraphView graph={graph} error={Boolean(error)} truncated={truncated} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
