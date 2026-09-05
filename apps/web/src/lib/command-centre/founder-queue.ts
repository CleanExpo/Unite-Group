// src/lib/command-centre/founder-queue.ts
//
// Mission Control Day 1 — "Blocked on me" reader for FOUNDER-QUEUE.md.
//
// A TypeScript port of the repo-root `scripts/founder-queue.mjs` parser
// (UNI-2523). The ledger's only claim is that ages are real, so the age is
// computed here from the `Opened` date and the file's own Age column is
// ignored. Every failure mode refuses rather than defaults: a malformed row
// is reported in `malformed`, never dropped, because dropping it turns a
// typo into the reassuring message "nothing is blocked on Phill".
//
// A parity test (founder-queue.test.ts) runs this parser and the .mjs one
// over the live ledger and asserts identical output, so the two cannot drift
// silently. Read-only; no secrets; no network.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

export interface FounderQueueOpenRow {
  id: string
  decision: string
  opened: string
  blocks: string
  context: string
  status: string
}

export interface FounderQueueResolvedRow {
  id: string
  decision: string
  opened: string
  resolved: string
  text: string
}

export interface ParsedFounderQueue {
  open: FounderQueueOpenRow[]
  resolved: FounderQueueResolvedRow[]
  malformed: string[]
}

export interface AgedFounderQueueRow extends FounderQueueOpenRow {
  age_days: number
}

export type FounderQueueLoadResult =
  | { ok: true; source: string; checkedAt: string; rows: AgedFounderQueueRow[]; unaged: string[]; malformed: string[] }
  | { ok: false; source: string; checkedAt: string; error: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u
const MS_PER_DAY = 86_400_000
const BRISBANE_TZ = 'Australia/Brisbane'
const BRISBANE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: BRISBANE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** `Date` -> the `YYYY-MM-DD` a wall clock in Brisbane would read. */
export function brisbaneCalendarDate(instant: Date): string {
  const parts = Object.fromEntries(BRISBANE_PARTS.formatToParts(instant).map((p) => [p.type, p.value]))
  if (!parts.year || !parts.month || !parts.day) {
    throw new Error('Could not resolve a Brisbane calendar date for the current instant.')
  }
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** `YYYY-MM-DD` -> its UTC-midnight epoch, refusing anything that is not a real date. */
function calendarDateToEpoch(value: unknown, label: string): number {
  if (typeof value !== 'string' || !ISO_DATE.test(value.trim())) {
    throw new Error(`Unparseable ${label} date: ${JSON.stringify(value)}`)
  }
  const trimmed = value.trim()
  const ms = Date.parse(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(ms)) throw new Error(`Unparseable ${label} date: ${JSON.stringify(value)}`)
  // ISO shape is not calendar validity: Date.parse rolls 2026-02-31 forward.
  if (new Date(ms).toISOString().slice(0, 10) !== trimmed) {
    throw new Error(`Not a real calendar date: ${JSON.stringify(value)}`)
  }
  return ms
}

/** Whole Brisbane calendar days between `opened` and `now`; a future date is refused. */
export function computeAgeDays(opened: string, now: string): number {
  const openedMs = calendarDateToEpoch(opened, 'opened')
  const nowMs = Date.parse(now)
  if (Number.isNaN(nowMs)) throw new Error(`Unparseable now: ${JSON.stringify(now)}`)
  const todayMs = calendarDateToEpoch(brisbaneCalendarDate(new Date(nowMs)), 'current')
  const days = (todayMs - openedMs) / MS_PER_DAY
  if (days < 0) {
    throw new Error(`Opened date ${opened} is after the current Brisbane date ${brisbaneCalendarDate(new Date(nowMs))}.`)
  }
  return days
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/u, '').replace(/\|$/u, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/u.test(cell))
}

function isHeaderRow(cells: string[], section: 'open' | 'resolved'): boolean {
  const expected =
    section === 'resolved'
      ? ['id', 'decision', 'opened', 'resolved', 'decision text']
      : ['id', 'decision', 'opened', 'age (days)', 'blocks', 'context', 'status']
  if (cells.length !== expected.length) return false
  return cells.every((cell, index) => cell.trim().toLowerCase() === expected[index])
}

function looksLikeRow(line: string): boolean {
  return line.includes('|')
}

/**
 * Parses the ledger, FAILING CLOSED. A GFM table body runs from the separator
 * to the first blank line; inside it every non-blank line is a row and must
 * parse. Outside it, a line that still has its outer pipes or its full width
 * is a row that drifted out of its table and is reported, not dropped.
 */
export function parseFounderQueue(markdown: string): ParsedFounderQueue {
  const lines = markdown.split(/\r?\n/u)
  const open: FounderQueueOpenRow[] = []
  const resolved: FounderQueueResolvedRow[] = []
  const malformed: string[] = []
  const headersSeen = new Set<'open' | 'resolved'>()
  const separatorsSeen = new Set<'open' | 'resolved'>()
  let section: 'open' | 'resolved' = 'open'
  let lineNumber = 0
  let inBody = false

  for (const line of lines) {
    lineNumber += 1
    const heading = /^##\s+(.+?)\s*$/u.exec(line)
    if (heading) {
      section = /^resolved$/iu.test(heading[1]) ? 'resolved' : 'open'
      inBody = false
      continue
    }
    if (line.trim() === '') {
      inBody = false
      continue
    }

    const cells = splitRow(line)
    if (looksLikeRow(line) && isSeparator(cells)) {
      inBody = headersSeen.has(section)
      if (inBody) separatorsSeen.add(section)
      continue
    }
    if (looksLikeRow(line) && isHeaderRow(cells, section)) {
      headersSeen.add(section)
      continue
    }

    if (!inBody) {
      if (/^\|.*\|$/u.test(line.trim()) || cells.length === 7 || cells.length === 5) {
        malformed.push(`Line ${lineNumber} looks like a table row but sits outside any table body: ${line.trim()}`)
      }
      continue
    }

    if (!looksLikeRow(line)) {
      malformed.push(`Line ${lineNumber} of the ${section} table has no cell separators: ${line.trim()}`)
      continue
    }

    const required = section === 'resolved' ? 5 : 7
    if (cells.length !== required) {
      malformed.push(
        `Line ${lineNumber} of the ${section} table has ${cells.length} cells, expected exactly ${required}: ${line.trim()}`,
      )
      continue
    }

    if (section === 'resolved') {
      resolved.push({ id: cells[0], decision: cells[1], opened: cells[2], resolved: cells[3], text: cells[4] ?? '' })
    } else {
      open.push({
        id: cells[0],
        decision: cells[1],
        opened: cells[2],
        blocks: cells[4] ?? '',
        context: cells[5] ?? '',
        status: cells[6] ?? 'open',
      })
    }
  }

  for (const seen of headersSeen) {
    if (!separatorsSeen.has(seen)) {
      malformed.push(
        `The ${seen} table has a header row but no separator beneath it, so no row under it ` +
          'could be attributed to the table; an empty result here is not proof of an empty queue.',
      )
    }
  }
  if (!headersSeen.has('open')) {
    malformed.push('The Open table header was never found; no row could be attributed to it.')
  }

  return { open, resolved, malformed }
}

const OPEN_STATUS = 'open'
const MISPLACED_STATUS = 'resolved'

/**
 * Port of scripts/founder-queue.mjs `classifyOpenRows`. Every Open-table row is
 * checked against the ledger's own rules; nothing is excluded by failing to
 * match. A filter that selects `open` silently discards `opne`; a validator
 * that classifies each value cannot. `resolved` inside the Open table is an
 * anomaly (the row should have moved), reported rather than counted or dropped.
 */
export function classifyOpenRows(rows: FounderQueueOpenRow[]): { stillOpen: FounderQueueOpenRow[]; notes: string[] } {
  const stillOpen: FounderQueueOpenRow[] = []
  const notes: string[] = []
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const label = id === '' ? '(a row with no ID)' : id
    const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : ''
    if (id === '') notes.push('An Open-table row has an empty ID cell, so it cannot be named in a report.')
    if (typeof row.decision !== 'string' || row.decision.trim() === '') {
      notes.push(`Row ${label} has an empty Decision cell, so there is nothing to report.`)
    }
    if (status === OPEN_STATUS) {
      stillOpen.push(row)
      continue
    }
    if (status === MISPLACED_STATUS) {
      notes.push(
        `Row ${label} is marked \`resolved\` inside the Open table; the ledger's rules say a resolved row moves to the Resolved section with its decision text.`,
      )
      continue
    }
    notes.push(
      `Row ${label} has status ${JSON.stringify(row.status)}, which is neither \`open\` nor \`resolved\`; it is not counted and the queue cannot be called clean.`,
    )
  }
  return { stillOpen, notes }
}

/** Ages every open row; a row whose date does not compute is NAMED in `unaged`, not thrown past. */
export function ageOpenRows(rows: FounderQueueOpenRow[], now: string): { aged: AgedFounderQueueRow[]; unaged: string[] } {
  const aged: AgedFounderQueueRow[] = []
  const unaged: string[] = []
  for (const row of rows) {
    try {
      aged.push({ ...row, age_days: computeAgeDays(row.opened, now) })
    } catch (error) {
      unaged.push(`${row.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  aged.sort((a, b) => b.age_days - a.age_days || a.id.localeCompare(b.id))
  return { aged, unaged }
}

/** In-tree copy written by `prebuild` (scripts/sync-founder-queue.mjs) — the path that ships in the lambda bundle. */
function inTreeQueuePath(): string {
  return path.join(process.cwd(), 'data', 'command-centre', 'founder-queue.md')
}

/** The ledger itself, two levels above apps/web (repo root). Dev/test fallback only. */
function repoRootQueuePath(): string {
  return path.join(process.cwd(), '..', '..', 'FOUNDER-QUEUE.md')
}

async function readQueueSource(): Promise<{ source: string; raw: string }> {
  try {
    return { source: inTreeQueuePath(), raw: await readFile(inTreeQueuePath(), 'utf-8') }
  } catch {
    return { source: repoRootQueuePath(), raw: await readFile(repoRootQueuePath(), 'utf-8') }
  }
}

/**
 * Load, parse and age the founder queue. NEVER throws. A ledger with any
 * malformed line returns ok:false — a half-read queue rendered as a whole one
 * is the false-reassurance shape this reader exists to remove.
 */
export async function loadFounderQueue(now: () => Date = () => new Date()): Promise<FounderQueueLoadResult> {
  const checkedAt = now().toISOString()
  let source = inTreeQueuePath()
  try {
    const read = await readQueueSource()
    source = read.source
    return evaluateFounderQueue(read.raw, source, checkedAt)
  } catch (err: unknown) {
    return { ok: false, source, checkedAt, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Pure evaluation of ledger text: parse (structure), classify (the ledger's own
 * status rules), age. Any malformed line or rule-breaking row returns ok:false —
 * a half-read queue rendered as a whole one is the false-reassurance shape this
 * reader exists to remove.
 */
export function evaluateFounderQueue(raw: string, source: string, checkedAt: string): FounderQueueLoadResult {
  const parsed = parseFounderQueue(raw)
  if (parsed.malformed.length > 0) {
    return { ok: false, source, checkedAt, error: `ledger has ${parsed.malformed.length} unreadable line(s): ${parsed.malformed[0]}` }
  }
  const { stillOpen, notes } = classifyOpenRows(parsed.open)
  if (notes.length > 0) {
    return { ok: false, source, checkedAt, error: `ledger has ${notes.length} row(s) that break its own rules: ${notes[0]}` }
  }
  const { aged, unaged } = ageOpenRows(stillOpen, checkedAt)
  return { ok: true, source, checkedAt, rows: aged, unaged, malformed: [] }
}
