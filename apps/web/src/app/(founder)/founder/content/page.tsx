export const dynamic = 'force-dynamic'

// /founder/content — Mission Control content library.
// One unified, newest-first, filterable browse surface over the real content
// the estate produces: wiki pages, Nexus pages, and Margot email drafts.
// Server-only: filtering is via ?source= links, no client JS.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitiseError } from '@/lib/error-reporting'
import {
  DeckDetails,
  LIGHT_THEME_DECK_TOKENS,
  PAGE_LIST_CAP,
} from '@/components/command-centre/DeckDetails'
import { mergeNewestFirst, parseSourceFilter, type SourceFilter } from './merge'

const PER_SOURCE_LIMIT = 100

type ContentItem =
  | { kind: 'wiki'; timestamp: string | null; id: string; title: string; wordCount: number; tags: string[] }
  | { kind: 'page'; timestamp: string | null; id: string; title: string; businessSlug: string | null; businessName: string | null }
  | { kind: 'draft'; timestamp: string | null; id: string; subject: string | null; status: string; body: string }

interface DraftRow {
  id: string
  subject: string | null
  status: string
  body: string
  created_at: string | null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const FILTERS: Array<{ key: SourceFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wiki', label: 'Wiki' },
  { key: 'pages', label: 'Pages' },
  { key: 'drafts', label: 'Drafts' },
]

export default async function ContentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>
}) {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const source = parseSourceFilter((await searchParams).source)

  const supabase = await createClient()
  const service = createServiceClient()
  // margot_email_draft is not in the generated Database types yet (dormant
  // migration — see src/lib/margot/draft-store.ts, which does the same).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const looseDb = service as any

  const [wikiResult, nexusResult, businessesResult, draftsResult] = await Promise.all([
    // wiki_pages has no founder_id column — same session-client (RLS) +
    // auth-gate pattern as the sibling /founder/wiki page.
    supabase
      .from('wiki_pages')
      .select('id, title, word_count, tags, updated_at')
      .order('updated_at', { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    // nexus_* is scoped by owner_id (the founder, single-tenant) — it has no
    // founder_id column; same scoping as /founder/[businessKey].
    service
      .from('nexus_pages')
      .select('id, title, business_id, updated_at')
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    service
      .from('businesses')
      .select('id, slug, name')
      .eq('founder_id', user.id),
    looseDb
      .from('margot_email_draft')
      .select('id, subject, status, body, created_at')
      .eq('founder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(PER_SOURCE_LIMIT) as Promise<{ data: DraftRow[] | null; error: { message: string } | null }>,
  ])

  if (wikiResult.error) {
    throw new Error(sanitiseError(wikiResult.error, 'Failed to load wiki pages', { route: '/founder/content' }))
  }
  if (nexusResult.error) {
    throw new Error(sanitiseError(nexusResult.error, 'Failed to load Nexus pages', { route: '/founder/content' }))
  }

  const businessById = new Map(
    (businessesResult.data ?? []).map((b) => [b.id, { slug: b.slug, name: b.name }])
  )

  const wikiItems: ContentItem[] = (wikiResult.data ?? []).map((row) => ({
    kind: 'wiki' as const,
    timestamp: row.updated_at,
    id: row.id,
    title: row.title,
    wordCount: row.word_count ?? 0,
    tags: row.tags ?? [],
  }))

  const pageItems: ContentItem[] = (nexusResult.data ?? []).map((row) => {
    const business = row.business_id ? businessById.get(row.business_id) : undefined
    return {
      kind: 'page' as const,
      timestamp: row.updated_at,
      id: row.id,
      title: row.title,
      businessSlug: business?.slug ?? null,
      businessName: business?.name ?? null,
    }
  })

  // The drafts store is a dormant edge — the table may not be migrated yet.
  // A query error here means "not available", not "empty"; say so honestly.
  const draftsUnavailable = Boolean(draftsResult.error)
  const draftItems: ContentItem[] = (draftsResult.data ?? []).map((row: DraftRow) => ({
    kind: 'draft' as const,
    timestamp: row.created_at,
    id: row.id,
    subject: row.subject,
    status: row.status,
    body: row.body,
  }))

  const items = mergeNewestFirst<ContentItem>(
    source === 'all' || source === 'wiki' ? wikiItems : [],
    source === 'all' || source === 'pages' ? pageItems : [],
    source === 'all' || source === 'drafts' ? draftItems : []
  )

  const counts: Record<SourceFilter, number> = {
    all: wikiItems.length + pageItems.length + draftItems.length,
    wiki: wikiItems.length,
    pages: pageItems.length,
    drafts: draftItems.length,
  }

  // Summary-first (founder 14/07/2026): the newest PAGE_LIST_CAP items are
  // visible; older items stay reachable behind a DeckDetails disclosure
  // instead of dumping up to 3 × PER_SOURCE_LIMIT rows flat.
  const visibleItems = items.slice(0, PAGE_LIST_CAP)
  const olderItems = items.slice(PAGE_LIST_CAP)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" style={LIGHT_THEME_DECK_TOKENS}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-light" style={{ color: 'var(--color-text-primary)' }}>
          Content Library
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {counts.wiki} wiki {counts.wiki === 1 ? 'page' : 'pages'} · {counts.pages} Nexus{' '}
          {counts.pages === 1 ? 'page' : 'pages'} · {counts.drafts} Margot{' '}
          {counts.drafts === 1 ? 'draft' : 'drafts'}
        </p>
      </div>

      {/* Source filter chips */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => {
          const active = f.key === source
          return (
            <Link
              key={f.key}
              href={f.key === 'all' ? '/founder/content' : `/founder/content?source=${f.key}`}
              className="text-[11px] px-3 py-1 rounded-sm font-medium uppercase tracking-wider transition-colors"
              style={
                active
                  ? {
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#15803d',
                      border: '1px solid rgba(22, 163, 74, 0.3)',
                    }
                  : {
                      background: 'var(--surface-card)',
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }
              }
            >
              {f.label} ({counts[f.key]})
            </Link>
          )
        })}
      </div>

      {/* Unified list */}
      <div
        className="rounded-sm divide-y"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)', borderColor: 'var(--color-border)' }}
      >
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] space-y-1" style={{ color: 'var(--color-text-disabled)' }}>
            {(source === 'all' || source === 'wiki') && counts.wiki === 0 && <p>No wiki pages yet.</p>}
            {(source === 'all' || source === 'pages') && counts.pages === 0 && <p>No Nexus pages yet.</p>}
            {(source === 'all' || source === 'drafts') && counts.drafts === 0 && (
              <p>{draftsUnavailable ? 'Margot drafts are not available yet (store not migrated).' : 'No Margot drafts yet.'}</p>
            )}
          </div>
        )}

        {visibleItems.map(renderContentRow)}
      </div>

      {/* Older items — reachable, not dumped */}
      {olderItems.length > 0 && (
        <DeckDetails
          title="Older items"
          stats={`+${olderItems.length} more`}
          testId="content-older-items"
        >
          <div
            className="rounded-sm divide-y"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--color-border)' }}
          >
            {olderItems.map(renderContentRow)}
          </div>
        </DeckDetails>
      )}
    </div>
  )
}

// One content row — shared by the visible list and the "Older items"
// disclosure so the markup is never duplicated.
function renderContentRow(item: ContentItem) {
  if (item.kind === 'wiki') {
    return (
      <Link
        key={`wiki-${item.id}`}
        href={`/founder/wiki/${item.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors duration-100 hover:brightness-110"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <SourceBadge label="Wiki" />
        <span className="text-[13px] flex-1 truncate">{item.title}</span>
        <span className="text-[11px] shrink-0" style={{ color: 'var(--color-text-disabled)' }}>
          {item.wordCount.toLocaleString('en-AU')} words · {formatDate(item.timestamp)}
        </span>
      </Link>
    )
  }

  if (item.kind === 'page') {
    const row = (
      <>
        <SourceBadge label="Page" />
        <span className="text-[13px] flex-1 truncate">{item.title}</span>
        <span className="text-[11px] shrink-0" style={{ color: 'var(--color-text-disabled)' }}>
          {item.businessName ? `${item.businessName} · ` : ''}
          {formatDate(item.timestamp)}
        </span>
      </>
    )
    // Only link when the business slug resolves — no dead links.
    return item.businessSlug ? (
      <Link
        key={`page-${item.id}`}
        href={`/founder/${item.businessSlug}/page/${item.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors duration-100 hover:brightness-110"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {row}
      </Link>
    ) : (
      <div
        key={`page-${item.id}`}
        className="flex items-center gap-3 px-4 py-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {row}
      </div>
    )
  }

  // Drafts have no reading surface yet — inline expandable preview
  // (<details> keeps this server-only) instead of a dead link.
  return (
    <details key={`draft-${item.id}`} className="group">
      <summary
        className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none transition-colors duration-100 hover:brightness-110"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <SourceBadge label="Draft" />
        <span className="text-[13px] flex-1 truncate">{item.subject ?? '(no subject)'}</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-sm font-medium uppercase tracking-wider shrink-0"
          style={{
            background: item.status === 'sent' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.05)',
            color: item.status === 'sent' ? '#22c55e' : 'var(--color-text-muted)',
          }}
        >
          {item.status.replace(/_/g, ' ')}
        </span>
        <span className="text-[11px] shrink-0" style={{ color: 'var(--color-text-disabled)' }}>
          {formatDate(item.timestamp)}
        </span>
      </summary>
      <pre
        className="text-[12px] whitespace-pre-wrap font-mono leading-relaxed px-4 pb-4 pt-1 m-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {item.body.length > 600 ? `${item.body.slice(0, 600)}…` : item.body}
      </pre>
    </details>
  )
}

function SourceBadge({ label }: { label: string }) {
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-sm font-medium uppercase tracking-wider shrink-0"
      style={{
        background: 'rgba(22, 163, 74, 0.08)',
        color: '#15803d',
        border: '1px solid rgba(22, 163, 74, 0.15)',
        minWidth: 44,
        textAlign: 'center',
      }}
    >
      {label}
    </span>
  )
}
