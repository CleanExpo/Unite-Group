import { margotPhoneForCard } from './margot-phone'
import type { PublicCard } from './published'

const MAX_OCTETS = 75

/** Fold one content line at 75 octets, never inside a UTF-8 character; continuation lines start with one space. */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= MAX_OCTETS) return line
  const parts: string[] = []
  let start = 0
  let limit = MAX_OCTETS
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length)
    // do not cut before a continuation byte (10xxxxxx): back up to the character start
    while (end < bytes.length && end > start && (bytes[end] & 0xc0) === 0x80) end--
    parts.push((start === 0 ? '' : ' ') + bytes.subarray(start, end).toString('utf8'))
    start = end
    limit = MAX_OCTETS - 1
  }
  return parts.join('\r\n')
}

/** Text escaping for vCard 4.0. Line breaks become \n, so a field can never start a new property. */
function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

function splitName(displayName: string): { family: string; given: string } {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length < 2) return { family: parts[0] ?? '', given: '' }
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') }
}

/** vCard 4.0, CRLF line ends, public fields only. Deterministic for the same card. */
export function buildVCard(card: PublicCard, baseUrl: string, margotPhone: string | null = margotPhoneForCard(card.slug)): string {
  const { family, given } = splitName(card.displayName)
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:4.0', `FN:${esc(card.displayName)}`, `N:${esc(family)};${esc(given)};;;`]
  if (card.businessName) lines.push(`ORG:${esc(card.businessName)}`)
  if (card.roleTitle) lines.push(`TITLE:${esc(card.roleTitle)}`)
  if (card.phone) lines.push(`TEL;VALUE=uri;TYPE="cell,voice":tel:${card.phone.replace(/[^+\d]/g, '')}`)
  // The AI phone line is founder-card only (margotPhoneForCard), and is a validated E.164 number (+ and digits only), so nothing needs escaping.
  if (margotPhone) lines.push(`TEL;TYPE=WORK;VALUE=uri:tel:${margotPhone}`)
  if (card.email) lines.push(`EMAIL:${esc(card.email)}`)
  lines.push(`URL:${baseUrl}/c/${card.slug}`)
  if (card.serviceArea) lines.push(`NOTE:${esc(`Service area: ${card.serviceArea}`)}`)
  lines.push(`UID:urn:unite-group:card:${card.slug}`, 'END:VCARD')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
