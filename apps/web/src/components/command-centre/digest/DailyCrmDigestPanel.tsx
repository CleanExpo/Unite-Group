'use client'

import { SourceBadge } from '../SourceBadge'

export interface DailyCrmDigestSummary {
  leadCount?: number
  opportunityCount?: number
  approvalRequiredCount?: number
  blockedTaskCount?: number
  blockerCount?: number
}

export interface DailyCrmDigestPanelProps {
  generatedAt?: string
  summary?: DailyCrmDigestSummary
  operatorPriorities?: string[]
  approvals?: string[]
  blockers?: string[]
  sourceLiveAt?: string
}

const COUNT_CARDS: Array<{ key: keyof DailyCrmDigestSummary; label: string }> = [
  { key: 'leadCount', label: 'Leads' },
  { key: 'opportunityCount', label: 'Opportunities' },
  { key: 'approvalRequiredCount', label: 'Approvals' },
  { key: 'blockedTaskCount', label: 'Blocked tasks' },
  { key: 'blockerCount', label: 'Blockers' },
]

const REDACTED = '[REDACTED]'
const SECRET_CLI_FLAG = String.raw`--[A-Z0-9_-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[-_]?KEY|SERVICE[-_]?ROLE[-_]?KEY)[A-Z0-9_-]*`
const SECRET_HEADER_NAME = String.raw`[^"']*?(?:AUTHORIZATION|API[-_]?KEY|ACCESS[-_]?TOKEN|SECRET|TOKEN|PASSWORD|PASSWD)[^"']*?:\s*`

function safeCount(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0
}

function redactDigestText(value: string): string {
  return value
    .replace(new RegExp(`(--header(?:=|\\s+))(["'])(${SECRET_HEADER_NAME})(.*?)\\2`, 'gi'), `$1$2$3${REDACTED}$2`)
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

function DigestList({
  title,
  items,
  emptyCopy,
}: {
  title: string
  items?: string[]
  emptyCopy: string
}) {
  const safeItems = items?.map(redactDigestText).filter((item) => item.trim().length > 0) ?? []

  return (
    <div className="space-y-2">
      <h3
        className="font-mono text-[11px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        {title}
      </h3>
      {safeItems.length > 0 ? (
        <ul className="space-y-2">
          {safeItems.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="rounded-sm px-3 py-2 text-sm leading-5"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--cc-grid)',
                color: 'var(--cc-ink)',
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-5" style={{ color: 'var(--cc-ink-hush)' }}>
          {emptyCopy}
        </p>
      )}
    </div>
  )
}

export function DailyCrmDigestPanel({
  generatedAt,
  summary,
  operatorPriorities,
  approvals,
  blockers,
  sourceLiveAt,
}: DailyCrmDigestPanelProps) {
  const isLive = !!sourceLiveAt

  return (
    <section
      className="flex flex-col gap-4 px-5 py-4"
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
      }}
      aria-label="Daily CRM Digest"
    >
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--cc-ink-hush)' }}
            >
              Command Center
            </p>
            <h2
              className="font-mono text-[12px] uppercase tracking-[0.22em]"
              style={{ color: 'var(--cc-ink)' }}
            >
              Daily CRM Digest
            </h2>
          </div>
          {isLive ? (
            <SourceBadge mode="live" label="daily_crm_digest" lastUpdatedAt={sourceLiveAt} />
          ) : (
            <SourceBadge mode="seed" label="awaits daily CRM digest" />
          )}
        </div>
        {generatedAt && (
          <p
            className="font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--cc-ink-hush)' }}
          >
            Generated · <time dateTime={generatedAt}>{generatedAt}</time>
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-2">
        {COUNT_CARDS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-sm px-3 py-2"
            style={{
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid var(--cc-grid)',
            }}
          >
            <dt
              className="font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: 'var(--cc-ink-hush)' }}
            >
              {label}
            </dt>
            <dd className="font-mono text-lg" style={{ color: 'var(--cc-ink)' }}>
              {safeCount(summary?.[key])}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-4">
        <DigestList
          title="Operator priorities"
          items={operatorPriorities}
          emptyCopy="No CRM priorities supplied for this digest window."
        />
        <DigestList
          title="Board decisions"
          items={approvals}
          emptyCopy="No approval-required items supplied for this digest window."
        />
        <DigestList
          title="Blockers"
          items={blockers}
          emptyCopy="No blockers supplied for this digest window."
        />
      </div>
    </section>
  )
}
