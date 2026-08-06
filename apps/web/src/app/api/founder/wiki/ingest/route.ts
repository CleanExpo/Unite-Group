// POST /api/founder/wiki/ingest — vault → wiki_pages producer (UNI-2373 P3).
// Founder session required. Writes use the service-role client because
// wiki_pages is shared knowledge (no founder_id) and product reads already
// assume a populated table.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitiseError } from '@/lib/error-reporting'
import { ingestWikiPages, resolveWikiIngestPath } from '@/lib/wiki/ingest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const

const bodySchema = z.object({
  dryRun: z.boolean().optional(),
  sinceUnixSeconds: z.number().nonnegative().optional(),
  limit: z.number().int().positive().max(2000).optional(),
})

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorised' },
      { status: 401, headers: NO_STORE_HEADERS },
    )
  }

  let raw: unknown = {}
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      raw = await request.json()
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const parsed = bodySchema.safeParse(raw ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const wikiRoot = resolveWikiIngestPath()
  const dryRun = parsed.data.dryRun ?? false

  try {
    const supabase = dryRun
      ? ({ from: () => ({ upsert: async () => ({ error: null }) }) } as never)
      : createServiceClient()

    const result = await ingestWikiPages({
      wikiRoot,
      supabase,
      dryRun,
      sinceUnixSeconds: parsed.data.sinceUnixSeconds,
      limit: parsed.data.limit ?? 500,
    })

    return NextResponse.json(
      {
        ok: result.failed === 0,
        ...result,
        source: 'vault→wiki_pages',
        triggeredBy: user.id,
      },
      { headers: NO_STORE_HEADERS },
    )
  } catch (err) {
    return NextResponse.json(
      {
        error: sanitiseError(err, 'Failed to ingest wiki pages', {
          route: '/api/founder/wiki/ingest',
        }),
      },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
