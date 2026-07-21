'use client'

// DigestBanner — the morning digest at the top of the Command Deck (CC-19).
// Fetches GET /api/command-centre/overnight-summary and shows the headline +
// what needs the founder's attention. Honest loading/error states.

import { useEffect, useState } from 'react'
import styles from './digest-banner.module.css'

type OvernightCrmReadSurface =
  | {
    source: 'crm:read-surface-signals'
    status?: 'ok'
    leads: { newCount: number; needsReviewCount: number }
    opportunities: {
      approvalGatedCount: number
      weightedForecast:
        | { status: 'available'; totalsByCurrency: Array<{ currency: string; amount: number }> }
        | { status: 'unavailable'; reason: 'currency_missing_or_invalid' }
    }
    window: {
      kind: 'latest-window'
      limit: number
      leadsReturned: number
      opportunitiesReturned: number
      leadsMayBeTruncated: boolean
      opportunitiesMayBeTruncated: boolean
    }
  }
  | {
    source: 'crm:read-surface-signals'
    status: 'unavailable'
    reason: 'read_failed'
  }

type OvernightCrmMetrics = Extract<OvernightCrmReadSurface, { leads: { newCount: number; needsReviewCount: number } }>

interface OvernightDigest {
  generatedAt: string
  tasks: { total: number; needsDecision: number; queued: number; blocked: number; failed: number; done: number }
  sessions: { total: number }
  attention: string[]
  headline: string
  crm?: OvernightCrmReadSurface
}

const REDACTED = '[REDACTED]'
const SECRET_CLI_FLAG = String.raw`--[A-Z0-9_-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[-_]?KEY|SERVICE[-_]?ROLE[-_]?KEY)[A-Z0-9_-]*`
const SECRET_HEADER_NAME = String.raw`[^"']*?(?:AUTHORIZATION|API[-_]?KEY|ACCESS[-_]?TOKEN|SECRET|TOKEN|PASSWORD|PASSWD)[^"']*?:\s*`

function redactDigestText(value: string): string {
  return value
    .replace(/\b(https?:\/\/)[^\s/?#@]+@/gi, `$1${REDACTED}@`)
    .replace(new RegExp(`(--header(?:=|\\s+))(["'])(${SECRET_HEADER_NAME})(.*?)\\2`, 'gi'), `$1$2$3${REDACTED}$2`)
    .replace(new RegExp(`(--header(?:=|\\s+))(${SECRET_HEADER_NAME})(?!["'])[^;,\\n]+`, 'gi'), `$1$2${REDACTED}`)
    .replace(new RegExp(`(--header=)(${SECRET_HEADER_NAME})[^\\s;,]+`, 'gi'), `$1$2${REDACTED}`)
    .replace(new RegExp(`(${SECRET_CLI_FLAG}\\s*=\\s*)(["'])(.*?)\\2`, 'gi'), `$1$2${REDACTED}$2`)
    .replace(new RegExp(`(${SECRET_CLI_FLAG}\\s*=\\s*)(?!["'])[^\\s;,]+`, 'gi'), `$1${REDACTED}`)
    .replace(new RegExp(`(${SECRET_CLI_FLAG})(\\s+)(["'])(.*?)\\3`, 'gi'), `$1$2$3${REDACTED}$3`)
    .replace(new RegExp(`(${SECRET_CLI_FLAG})(\\s+)[^\\s;,]+`, 'gi'), `$1$2${REDACTED}`)
    .replace(/(?<!-)\b[A-Z0-9_-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)[A-Z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s;,]+)/gi, REDACTED)
    .replace(/\b(Bearer\s+)[A-Z0-9_-]+(?:\.[A-Z0-9_-]+){2,}\b/gi, `$1${REDACTED}`)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED)
    .replace(/\bBOARD-[A-Z0-9-]{3,}\b/gi, REDACTED)
    .replace(/(?:\+61|\b0\d)[\d\s().-]{7,}\d\b/g, REDACTED)
    .replace(/\bcard\s+(?:ending|ending\s+in|ends\s+in)\s+\d{3,4}\b/gi, REDACTED)
}

export function DigestBanner() {
  const [digest, setDigest] = useState<OvernightDigest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/command-centre/overnight-summary', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) {
          if (active) setError(`Digest unavailable (HTTP ${res.status})`)
          return
        }
        const data = (await res.json()) as { digest?: OvernightDigest }
        if (active) setDigest(data.digest ?? null)
      } catch {
        if (active) setError('Digest unavailable — network error.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className={styles.banner}>
        <span className={styles.muted}>Loading morning digest…</span>
      </div>
    )
  }
  if (error || !digest) {
    return (
      <div className={styles.banner}>
        <span className={styles.muted}>{error ?? 'No digest available.'}</span>
      </div>
    )
  }

  const hasAttention = digest.attention.length > 0
  const safeHeadline = redactDigestText(digest.headline)
  const safeAttention = digest.attention.map(redactDigestText)
  const crmMetrics: OvernightCrmMetrics | null = digest.crm && 'leads' in digest.crm ? digest.crm : null
  const crmUnavailable = digest.crm?.status === 'unavailable'
  return (
    <div className={styles.banner} data-attention={hasAttention}>
      <div className={styles.head}>
        {/* "Board digest" names the scope: these counts come from the cc_tasks
            board, while the hero's "N actions need you" counts the action
            queue — two real sources, so each labels its own. */}
        <span className={styles.title}>Board Digest</span>
        <span className={styles.headline}>{safeHeadline}</span>
      </div>
      {hasAttention ? (
        <ul className={styles.attention}>
          {safeAttention.map((attentionItem, index) => (
            <li key={`${index}-${attentionItem}`}>{attentionItem}</li>
          ))}
        </ul>
      ) : (
        <span className={styles.clear}>Nothing needs you — the board is clear.</span>
      )}
      {digest.crm ? (
        <section className={styles.crmSurface} aria-label="CRM read surface">
          <div className={styles.crmHead}>
            <span>CRM read surface</span>
            <span>{digest.crm.source}</span>
          </div>
          {crmUnavailable ? (
            <>
              <p className={styles.crmGuardrail}>CRM read surface unavailable</p>
              <p className={styles.crmGuardrail}>Check lead/opportunity sync before making CRM decisions.</p>
              <p className={styles.crmGuardrail}>Decision support degraded — no approvals, conversions, billing, or outreach are executed here.</p>
            </>
          ) : crmMetrics ? (
            <>
              <p className={styles.crmScope}>
                Latest-window limit {crmMetrics.window.limit} per table · {crmMetrics.window.leadsReturned} leads returned · {crmMetrics.window.opportunitiesReturned} opportunities returned
              </p>
              {(crmMetrics.window.leadsMayBeTruncated || crmMetrics.window.opportunitiesMayBeTruncated) ? (
                <p className={styles.crmGuardrail}>Bounded window may be truncated; values are not complete CRM totals.</p>
              ) : null}
              <ul className={styles.crmMetrics}>
                <li>New CRM leads in window: {crmMetrics.leads.newCount}</li>
                <li>Leads needing review in window: {crmMetrics.leads.needsReviewCount}</li>
                <li>Approval-gated opportunities in window: {crmMetrics.opportunities.approvalGatedCount}</li>
                {crmMetrics.opportunities.weightedForecast.status === 'available' ? (
                  crmMetrics.opportunities.weightedForecast.totalsByCurrency.map((total) => (
                    <li key={total.currency}>Weighted forecast in window: {redactDigestText(total.currency)} {total.amount}</li>
                  ))
                ) : (
                  <li>Weighted forecast unavailable — currency missing or invalid.</li>
                )}
              </ul>
              <p className={styles.crmGuardrail}>Decision support only — no approvals, conversions, billing, or outreach are executed here.</p>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
