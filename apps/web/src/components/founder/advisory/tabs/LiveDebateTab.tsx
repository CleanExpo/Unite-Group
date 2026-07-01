'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserClient } from '@supabase/ssr'
import type { DebateEvent, AdvisoryCase, AdvisoryProposal } from '@/lib/advisory/types'
import { ROUND_LABELS, FIRM_META, FIRM_KEYS } from '@/lib/advisory/types'
import { ProposalCard } from '../shared/ProposalCard'
import { JudgeScorecard } from '../shared/JudgeScorecard'

function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function LiveDebateTab() {
  const searchParams = useSearchParams()
  const caseId = searchParams.get('case')
  const [caseData, setCaseData] = useState<AdvisoryCase | null>(null)
  const [proposals, setProposals] = useState<AdvisoryProposal[]>([])
  const [events, setEvents] = useState<DebateEvent[]>([])
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const eventLogRef = useRef<HTMLDivElement>(null)

  // Realtime events are scoped to the selected advisory case; clear them before
  // subscribing/fetching a different case so dropped-firm warnings cannot leak.
  useEffect(() => {
    setEvents([])
    setStarted(false)
    setStartError(null)
  }, [caseId])

  // Fetch case detail
  useEffect(() => {
    if (!caseId) return
    async function load() {
      const res = await fetch(`/api/advisory/cases/${caseId}`)
      if (res.ok) {
        const data = await res.json()
        setCaseData(data.case)
        setProposals(data.proposals ?? [])
      }
    }
    load()
  }, [caseId])

  // Subscribe to Realtime
  useEffect(() => {
    if (!caseId) return
    const supabase = getSupabaseClient()
    const channel = supabase.channel(`advisory:${caseId}`)

    channel.on('broadcast', { event: 'debate_event' }, ({ payload }) => {
      const event = payload as DebateEvent
      setEvents(prev => [...prev, event])

      // Auto-scroll event log
      requestAnimationFrame(() => {
        eventLogRef.current?.scrollTo({ top: eventLogRef.current.scrollHeight, behavior: 'smooth' })
      })

      // Refresh proposals on round_complete or case_complete
      if (event.event === 'round_complete' || event.event === 'case_complete') {
        fetch(`/api/advisory/cases/${caseId}`)
          .then(r => r.json())
          .then(d => {
            setCaseData(d.case)
            setProposals(d.proposals ?? [])
          })
          .catch(() => {})
      }
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [caseId])

  async function startDebate() {
    if (!caseId) return
    setStarted(true)
    setLoading(true)
    setStartError(null)
    setEvents([])
    try {
      const res = await fetch(`/api/advisory/cases/${caseId}/start`, { method: 'POST' })
      if (!res.ok) {
        setStarted(false)
        setStartError('Could not start the debate — please try again.')
      }
    } catch (err) {
      console.error('[LiveDebateTab] start error:', err)
      setStarted(false)
      setStartError('Network error — could not start the debate.')
    } finally {
      setLoading(false)
    }
  }

  if (!caseId) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-[12px]" style={{ color: 'var(--color-text-disabled)' }}>
          Select a case from the Cases tab to view the live debate.
        </span>
      </div>
    )
  }

  const isDebating = caseData?.status === 'debating'
  const isDraft = caseData?.status === 'draft'

  // Partial-debate integrity (Step 3 / F2): a firm dropped if its proposal/evidence
  // failed to persist. Surface it from the persisted case (judge_scores.partial)
  // OR from a live firm_dropped event — never present a degraded debate as complete.
  const summary = caseData?.judge_scores
  const droppedFromEvents = Array.from(
    new Set(
      events
        .filter((e): e is Extract<DebateEvent, { event: 'firm_dropped' }> => e.event === 'firm_dropped')
        .map(e => e.firm)
    )
  )
  const droppedFirms = summary?.droppedFirms ?? droppedFromEvents
  const isPartial = summary?.partial === true || droppedFirms.length > 0
  const scoredFirmCount = summary?.scoredFirmCount ?? Math.max(0, FIRM_KEYS.length - droppedFirms.length)

  return (
    <div className="space-y-4">
      {/* Case header */}
      {caseData && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {caseData.title}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Round {caseData.current_round}/{caseData.total_rounds}
            </p>
          </div>
          {isDraft && !started && (
            <button
              onClick={startDebate}
              disabled={loading}
              className="text-[12px] font-medium px-3 py-1.5 rounded-sm transition-colors shrink-0"
              style={{ background: '#16a34a18', color: '#15803d', border: '1px solid #16a34a30' }}
            >
              {loading ? 'Starting...' : 'Start Debate'}
            </button>
          )}
        </div>
      )}

      {/* Start-debate failure — surface it so the user isn't left on a stuck state */}
      {startError && (
        <div
          role="alert"
          className="rounded-sm p-3 text-[11px]"
          style={{ background: '#050505', color: '#ef4444', border: '1px solid #ef4444' }}
        >
          {startError}
        </div>
      )}

      {/* Partial-debate warning — honest disclosure that the set is degraded (F2) */}
      {isPartial && (
        <div
          role="alert"
          className="rounded-sm p-3 text-[11px]"
          style={{ background: '#050505', color: '#00F5FF', border: '1px solid #00F5FF' }}
        >
          <span className="font-medium">Partial debate — </span>
          scored {scoredFirmCount} of {FIRM_KEYS.length} firms. The following firm(s)
          did not persist and were excluded from judging: {droppedFirms.map(f => FIRM_META[f]?.name ?? f).join(', ')}.
          This result is incomplete and must not be treated as a full debate.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Proposals by round */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(round => {
            const roundProposals = proposals.filter(p => p.round === round)
            if (roundProposals.length === 0) return null
            const info = ROUND_LABELS[round]

            return (
              <div key={round}>
                <h3 className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Round {round}: {info?.label}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roundProposals.map(p => (
                    <ProposalCard key={p.id} proposal={p} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Event log */}
        <div
          ref={eventLogRef}
          className="max-h-[600px] overflow-y-auto rounded-sm p-3 space-y-1"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
        >
          <h4 className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-disabled)' }}>
            Event Log
          </h4>
          <AnimatePresence>
            {events.map((evt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[10px] py-0.5"
                style={{ color: evt.event === 'error' ? '#ef4444' : 'var(--color-text-muted)' }}
              >
                {formatEvent(evt)}
              </motion.div>
            ))}
          </AnimatePresence>
          {(isDebating || started) && events.length > 0 && events[events.length - 1].event !== 'case_complete' && (
            <div className="flex items-center gap-1 py-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#16a34a' }} />
              <span className="text-[10px]" style={{ color: '#15803d' }}>Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Judge scores (shown after completion) */}
      {caseData && caseData.judge_scores && (
        <div className="mt-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Judge Scores
          </h3>
          <JudgeScorecard
            scores={caseData.judge_scores.scores?.map(s => ({
              firm_key: s.firmKey,
              legality_score: s.legality,
              compliance_risk_score: s.complianceRisk,
              financial_outcome_score: s.financialOutcome,
              documentation_score: s.documentation,
              ethics_score: s.ethics,
              weighted_total: s.weightedTotal,
              rationale: s.rationale,
            })) ?? []}
            winner={caseData.winning_firm}
          />
        </div>
      )}
    </div>
  )
}

function formatEvent(evt: DebateEvent): string {
  switch (evt.event) {
    case 'round_start':
      return `Round ${evt.round} started: ${ROUND_LABELS[evt.round]?.label}`
    case 'firm_start':
      return `${FIRM_META[evt.firm]?.name} is analysing...`
    case 'firm_response':
      return `${FIRM_META[evt.firm]?.name} responded: ${evt.preview.slice(0, 80)}...`
    case 'firm_dropped':
      return `${FIRM_META[evt.firm]?.name} dropped (round ${evt.round}): ${evt.reason}`
    case 'round_complete':
      return `Round ${evt.round} complete`
    case 'judge_start':
      return 'Judge is evaluating all proposals...'
    case 'judge_complete':
      return `Winner: ${FIRM_META[evt.winner]?.name}`
    case 'case_complete':
      return 'Debate complete — pending accountant review'
    case 'error':
      return `Error: ${evt.message}`
    default:
      return JSON.stringify(evt)
  }
}
