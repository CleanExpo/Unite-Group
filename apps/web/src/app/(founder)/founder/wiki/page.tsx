export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/supabase/server'
import type { WikiPageSummary } from '@/types/wiki'

async function getWikiPages(): Promise<WikiPageSummary[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/wiki`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function WikiIndexPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const pages = await getWikiPages()

  return (
    <div className="p-6 flex flex-col gap-6" style={{ background: '#fffdf7', minHeight: '100vh' }}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#15803d' }}>
          Knowledge Base
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {pages.length} {pages.length === 1 ? 'page' : 'pages'} in the wiki
        </p>
      </div>

      {pages.length === 0 ? (
        <div
          className="rounded-sm border p-8 text-center text-sm"
          style={{ borderColor: 'rgba(22, 163, 74,0.15)', color: 'rgba(255,255,255,0.4)' }}
        >
          No wiki pages found.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/founder/wiki/${page.id}`}
              className="group block rounded-sm border p-4 transition-colors"
              style={{
                borderColor: 'rgba(22, 163, 74,0.15)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <span
                    className="font-medium text-sm truncate transition-colors group-hover:text-[#15803d]"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
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
                            background: 'rgba(22, 163, 74,0.08)',
                            color: 'rgba(22, 163, 74,0.7)',
                            border: '1px solid rgba(22, 163, 74,0.15)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <span>{page.word_count?.toLocaleString('en-AU') ?? 0} words</span>
                  <span>{formatDate(page.updated_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
