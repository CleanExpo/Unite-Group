export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import {
  DeckDetails,
  LIGHT_THEME_DECK_TOKENS,
  PAGE_LIST_CAP,
} from '@/components/command-centre/DeckDetails'
import type { WikiPageSummary } from '@/types/wiki'

async function getWikiPages(): Promise<WikiPageSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('id, title, word_count, tags, updated_at')
    .order('title')

  if (error) {
    throw new Error(sanitiseError(error, 'Failed to load wiki pages', { route: '/founder/wiki' }))
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    word_count: row.word_count ?? 0,
    tags: row.tags ?? [],
    updated_at: row.updated_at ?? '',
  }))
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function WikiPageRow({ page }: { page: WikiPageSummary }) {
  return (
    <Link
      href={`/founder/wiki/${page.id}`}
      className="group block rounded-sm border p-4 transition-colors"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--surface-card)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="font-medium text-sm truncate transition-colors group-hover:text-[#15803d]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {page.title}
          </span>
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {page.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: 'var(--color-accent-dim)',
                    color: 'var(--color-accent-text)',
                    border: '1px solid var(--color-accent-20)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div
          className="flex flex-col items-end gap-1 shrink-0 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span>{page.word_count?.toLocaleString('en-AU') ?? 0} words</span>
          <span>{formatDate(page.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}

export default async function WikiIndexPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const pages = await getWikiPages()
  // Summary-first (founder 14/07/2026): first PAGE_LIST_CAP pages visible,
  // the rest reachable behind a DeckDetails disclosure — nothing dumped flat.
  const visible = pages.slice(0, PAGE_LIST_CAP)
  const rest = pages.slice(PAGE_LIST_CAP)

  return (
    <div
      className="p-6 flex flex-col gap-6"
      style={{ background: 'var(--surface-canvas)', minHeight: '100vh', ...LIGHT_THEME_DECK_TOKENS }}
    >
      <div className="flex flex-col gap-1">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: 'var(--color-accent-text)' }}
        >
          Knowledge Base
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {pages.length} {pages.length === 1 ? 'page' : 'pages'} in the wiki
        </p>
      </div>

      {pages.length === 0 ? (
        <div
          className="rounded-sm border p-8 text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          No wiki pages found.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((page) => (
            <WikiPageRow key={page.id} page={page} />
          ))}
          {rest.length > 0 && (
            <DeckDetails title="All pages" stats={`+${rest.length} more`} testId="wiki-all-pages">
              <div className="flex flex-col gap-2">
                {rest.map((page) => (
                  <WikiPageRow key={page.id} page={page} />
                ))}
              </div>
            </DeckDetails>
          )}
        </div>
      )}
    </div>
  )
}
