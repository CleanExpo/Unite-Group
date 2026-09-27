// src/lib/mission-authority/done-invariant.ts
//
// UNI-2779 — a thing whose own acceptance text says it is not finished cannot
// be marked Done. UNI-2779 itself was moved to Done while its description read
// "Held back: the 'do not ask' half (needs founder)" with an unchecked
// acceptance box. This check reads the text the founder or runner wrote and
// refuses Done while any status marker or open acceptance item remains.
//
// Pure. It never decides a thing IS done — only that this text forbids it.

export interface DoneCheck {
  allowed: boolean
  blockers: string[]
}

// Status markers are matched as written by the Evidence/Ground-Truth standards:
// upper-case, so ordinary prose ("was blocked by review") is not a marker.
// "Held back" is matched in any case: it is the heading shape that slipped
// through on UNI-2779.
const MARKERS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'NOT MET', pattern: /\bNOT MET\b/ },
  { label: 'HELD BACK', pattern: /\bheld back\b/i },
  { label: 'BLOCKED', pattern: /\bBLOCKED\b/ },
  { label: 'UNVERIFIED', pattern: /\bUNVERIFIED\b/ },
]

const HEADING = /^\s{0,3}#{1,6}\s+(.*)$/
const ACCEPTANCE_HEADING = /\b(acceptance|closure|definition of done)\b/i
const UNCHECKED_BOX = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s*(.*)$/

export function checkDoneAllowed(acceptanceText: string): DoneCheck {
  const text = typeof acceptanceText === 'string' ? acceptanceText : ''
  const blockers: string[] = []
  let inAcceptance = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    const heading = HEADING.exec(rawLine)
    if (heading) inAcceptance = ACCEPTANCE_HEADING.test(heading[1])
    for (const { label, pattern } of MARKERS) {
      if (pattern.test(line)) blockers.push(`${label}: "${line.slice(0, 200)}"`)
    }
    if (!heading && inAcceptance) {
      const box = UNCHECKED_BOX.exec(rawLine)
      if (box) blockers.push(`Unchecked acceptance item: "${box[1].slice(0, 200)}"`)
    }
  }

  return { allowed: blockers.length === 0, blockers }
}
