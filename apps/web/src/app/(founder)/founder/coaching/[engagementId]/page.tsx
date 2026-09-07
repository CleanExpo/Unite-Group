import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Display order for the client file. Wants/needs/requirements lead — they are
 *  what the founder asked to capture; commitments are what drive the next call. */
const KIND_ORDER = [
  'want',
  'need',
  'requirement',
  'commitment',
  'metric',
  'blocker',
  'decision',
  'open_question',
] as const

/** A route param that is not a UUID can never match a row. Postgres rejects it
 *  with 22P02 (invalid input syntax for type uuid), which surfaced as a thrown
 *  error and a 500 — reporting a server fault for what is really a bad URL.
 *  Checked before the query so it renders as 404, like any other missing id. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const KIND_LABEL: Record<string, string> = {
  want: 'Wants',
  need: 'Needs',
  requirement: 'Requirements',
  commitment: 'Commitments',
  metric: 'Business metrics',
  blocker: 'Blockers',
  decision: 'Decisions',
  open_question: 'Open questions',
}

export default async function EngagementPage({
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
    .select('id, business_name, client_name, status, consent_given, consent_date, consent_method, notes')
    .eq('founder_id', user.id)
    .eq('id', engagementId)
    .maybeSingle()

  if (engagementError) throw new Error(`Couldn't load engagement: ${engagementError.message}`)
  if (!engagement) notFound()

  // Errors are captured and thrown, never swallowed. Dropping them here and
  // rendering `data ?? []` turns a FAILED read into "Nothing approved yet" —
  // a failed read wearing the face of a successful empty one. That is the
  // no-fake-as-real violation, and it was caught in independent review (P1)
  // after the engagement lookup above already got this right.
  const [
    { data: extractions, error: extractionsError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from('coaching_extractions')
      .select('id, kind, body, owner, due_date, metric_value, metric_unit, metric_period, transcript_quote, confidence, status, valid_from')
      .eq('founder_id', user.id)
      .eq('engagement_id', engagementId)
      .eq('status', 'approved')
      .is('superseded_by', null)
      .order('valid_from', { ascending: true }),
    supabase
      .from('coaching_sessions')
      .select('id, session_date, session_number, duration_minutes, source, status')
      .eq('founder_id', user.id)
      .eq('engagement_id', engagementId)
      .order('session_date', { ascending: false }),
  ])

  if (extractionsError) throw new Error(`Couldn't load the client file: ${extractionsError.message}`)
  if (sessionsError) throw new Error(`Couldn't load sessions: ${sessionsError.message}`)

  // Same class as the two above: a failed count silently rendering as
  // "0 awaiting review" would hide a review queue rather than report a fault.
  const { count: proposedRaw, error: proposedError } = await supabase
    .from('coaching_extractions')
    .select('id', { count: 'exact', head: true })
    .eq('founder_id', user.id)
    .eq('engagement_id', engagementId)
    .eq('status', 'proposed')

  if (proposedError) throw new Error(`Couldn't count pending review items: ${proposedError.message}`)
  const proposedCount = proposedRaw ?? 0

  const byKind = new Map<string, typeof extractions>()
  for (const row of extractions ?? []) {
    const list = byKind.get(row.kind) ?? []
    list.push(row)
    byKind.set(row.kind, list as typeof extractions)
  }

  return (
    <div className="px-8 py-6 max-w-4xl">
      <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
        {engagement.business_name} - {engagement.client_name}
      </h1>

      <div className="mt-2 flex items-center gap-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        <span className="capitalize">{engagement.status}</span>
        <span>·</span>
        <span>{sessions?.length ?? 0} session{(sessions?.length ?? 0) === 1 ? '' : 's'}</span>
        {proposedCount > 0 && (
          <>
            <span>·</span>
            <Link
              href={`/founder/coaching/${engagementId}/review`}
              className="hover:underline"
              style={{ color: 'var(--color-accent-text, var(--color-text-primary))' }}
            >
              {proposedCount} awaiting review
            </Link>
          </>
        )}
      </div>

      {/* Consent is surfaced at the top, not buried in settings. Nothing
          identifiable about this client publishes while this reads "not on file". */}
      <div
        className="mt-4 rounded-sm border px-4 py-3 text-[12px]"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Consent: </span>
        {engagement.consent_given
          ? `on file — ${engagement.consent_method} , ${engagement.consent_date}`
          : 'not on file. Nothing identifiable about this client may be published.'}
      </div>

      {/* The client file */}
      <h2 className="mt-8 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-disabled)' }}>
        The file
      </h2>

      {(extractions ?? []).length === 0 && (
        <div
          className="mt-2 rounded-sm border px-4 py-6 text-[13px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          Nothing approved yet. Add a session transcript and review what comes back.
        </div>
      )}

      {KIND_ORDER.filter((k) => (byKind.get(k) ?? []).length > 0).map((kind) => (
        <section key={kind} className="mt-6">
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {KIND_LABEL[kind]}
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {(byKind.get(kind) ?? []).map((row) => (
              <li
                key={row.id}
                className="rounded-sm border px-3 py-2 text-[13px]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <div>{row.body}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
                  {row.owner && <span className="capitalize">{row.owner}</span>}
                  {row.due_date && <span>due {row.due_date}</span>}
                  {row.metric_value && (
                    <span>{row.metric_value}{row.metric_unit ? ` ${row.metric_unit}` : ''}{row.metric_period ? ` / ${row.metric_period}` : ''}</span>
                  )}
                  <span>from {row.valid_from}</span>
                </div>
                {row.transcript_quote && (
                  <blockquote
                    className="mt-2 border-l-2 pl-2 text-[12px] italic"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    &ldquo;{row.transcript_quote}&rdquo;
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Sessions */}
      <h2 className="mt-10 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-disabled)' }}>
        Sessions
      </h2>
      {(sessions ?? []).length === 0 ? (
        <div className="mt-2 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          No sessions captured yet.
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {(sessions ?? []).map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-sm border px-3 h-10 text-[13px]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <span>{s.session_date}</span>
              {s.session_number && <span style={{ color: 'var(--color-text-disabled)' }}>#{s.session_number}</span>}
              {s.duration_minutes && (
                <span style={{ color: 'var(--color-text-disabled)' }}>{s.duration_minutes} min</span>
              )}
              <span className="ml-auto text-[11px] capitalize" style={{ color: 'var(--color-text-disabled)' }}>
                {s.source} · {s.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
