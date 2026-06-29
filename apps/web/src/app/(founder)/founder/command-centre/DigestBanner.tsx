'use client'

// DigestBanner — the morning digest at the top of the Command Deck (CC-19).
// Fetches GET /api/command-centre/overnight-summary and shows the headline +
// what needs the founder's attention. Honest loading/error states.

import { useEffect, useState } from 'react'
import styles from './digest-banner.module.css'

interface OvernightDigest {
  generatedAt: string
  tasks: { total: number; needsDecision: number; queued: number; blocked: number; failed: number; done: number }
  sessions: { total: number }
  attention: string[]
  headline: string
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
  return (
    <div className={styles.banner} data-attention={hasAttention}>
      <div className={styles.head}>
        <span className={styles.title}>Morning Digest</span>
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
    </div>
  )
}
