import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { ReviewQueueClient } from '@/components/coaching/ReviewQueueClient'
import type { ReviewItem } from '@/components/coaching/ReviewQueue'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The review queue for one engagement.
 *
 * This is where a model's proposal becomes part of a client's record, so the
 * screen shows the grounding (the transcript quote) beside the claim and keeps
 * the model's original text visible while the founder edits it.
 */
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ engagementId: string }>
}) {
  const { engagementId } = await params
  const user = await getUser()
  if (!user) return null

  if (!UUID_RE.test(engagementId)) notFound()

  const supabase = await createClient()

  const { data: engagement, error: engagementError } = await supabase
    .from('coaching_engagements')
    .select('id, business_name, client_name')
    .eq('founder_id', user.id)
    .eq('id', engagementId)
    .maybeSingle()

  if (engagementError) throw new Error(`Couldn't load engagement: ${engagementError.message}`)
  if (!engagement) notFound()

  // Errors are thrown, never discarded. A failed read rendering as "nothing to
  // review" would hide a queue rather than report a fault (No-Invaders #1).
  const { data: rows, error: rowsError } = await supabase
    .from('coaching_extractions')
    .select('id, kind, body, original_body, owner, due_date, transcript_quote, confidence, session_id')
    .eq('founder_id', user.id)
    .eq('engagement_id', engagementId)
    .eq('status', 'proposed')
    .order('kind', { ascending: true })

  if (rowsError) throw new Error(`Couldn't load the review queue: ${rowsError.message}`)

  // Session dates, so a quote can be placed in time. Fetched separately rather
  // than joined — the flyout's lesson is that a denormalised read beats a join
  // on a hot path, and this list is small.
  const sessionIds = [...new Set((rows ?? []).map((r) => r.session_id).filter(Boolean))]
  const sessionDates = new Map<string, string>()
  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select('id, session_date')
      .eq('founder_id', user.id)
      .in('id', sessionIds)

    if (sessionsError) throw new Error(`Couldn't load session dates: ${sessionsError.message}`)
    for (const s of sessions ?? []) sessionDates.set(s.id, s.session_date)
  }

  const items: ReviewItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    body: r.body,
    original_body: r.original_body,
    owner: r.owner,
    due_date: r.due_date,
    transcript_quote: r.transcript_quote,
    confidence: r.confidence,
    session_date: r.session_id ? sessionDates.get(r.session_id) ?? null : null,
  }))

  return (
    <div className="px-8 py-6 max-w-4xl">
      <Link
        href={`/founder/coaching/${engagementId}`}
        className="text-[12px] hover:underline"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ← {engagement.business_name} - {engagement.client_name}
      </Link>

      <h1 className="mt-2 text-[20px] font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
        Review
      </h1>
      <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        {items.length === 0
          ? 'Nothing waiting.'
          : `${items.length} proposed ${items.length === 1 ? 'item' : 'items'}. Edit the wording if it is wrong — the correction is kept against what the model proposed.`}
      </p>

      <div className="mt-6">
        <ReviewQueueClient items={items} />
      </div>
    </div>
  )
}
