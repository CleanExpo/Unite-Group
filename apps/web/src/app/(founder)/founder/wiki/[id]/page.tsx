export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/supabase/server'
import type { WikiPage } from '@/types/wiki'

async function getWikiPage(id: string): Promise<WikiPage | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/wiki/${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function WikiPageDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const page = await getWikiPage(id)
  if (!page) notFound()

  return (
    <div className="p-6 flex flex-col gap-6" style={{ background: '#fffdf7', minHeight: '100vh' }}>
      <div className="flex flex-col gap-2">
        <Link
          href="/founder/wiki"
          className="text-xs transition-colors"
          style={{ color: 'rgba(22, 163, 74,0.6)' }}
        >
          &larr; Knowledge Base
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#15803d' }}>
          {page.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span>{page.word_count?.toLocaleString('en-AU') ?? 0} words</span>
          <span>&middot;</span>
          <span>Updated {formatDate(page.updated_at)}</span>
          {page.tags && page.tags.length > 0 && (
            <>
              <span>&middot;</span>
              <div className="flex flex-wrap gap-1">
                {page.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded-sm"
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
            </>
          )}
        </div>
      </div>

      <div
        className="rounded-sm border p-6"
        style={{ borderColor: 'rgba(22, 163, 74,0.15)', background: 'rgba(255,255,255,0.02)' }}
      >
        <pre
          className="text-sm whitespace-pre-wrap font-mono leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          {page.content}
        </pre>
      </div>
    </div>
  )
}
