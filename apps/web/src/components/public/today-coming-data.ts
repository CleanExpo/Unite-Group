import { BUSINESSES } from './businesses'

// What a visitor can use today, and what is not live yet. The site may only advertise what has shipped and works.
// Sources: Wiki carsi.md, dr-nrpg.md, restore-assist.md, nexus-doctrine.md; Niche Agentic spec v2.0 section 2.1
// (founder-drive-2026-10-25b); go-live list W9/W10.
// Urls come from businesses.ts, never retyped. Synthex and Trade Hall are left out on purpose: no sourced
// customer line exists for either yet.

export type TodayItem = { name: string; line: string; href: string }
export type ComingItem = { name: string; line: string }

const urlOf = (name: string): string => {
  const url = BUSINESSES.find((b) => b.name === name)?.url
  if (!url) throw new Error(`businesses.ts has no url for ${name}`)
  return url
}

export const TODAY: readonly TodayItem[] = [
  { name: 'Living business card', line: 'A video card that ends on your logo, from $249', href: '/cards' },
  { name: 'CARSI', line: 'Online training for restoration and cleaning pros', href: urlOf('CARSI') },
  { name: 'Disaster Recovery', line: 'Connects homes and businesses with restoration companies', href: urlOf('Disaster Recovery') },
  { name: 'RestoreAssist', line: 'A field app for restoration crews', href: urlOf('RestoreAssist') },
  { name: 'NRPG', line: 'The restoration company network', href: urlOf('NRPG') },
]

export const COMING: readonly ComingItem[] = [
  { name: 'Revenue Intelligence', line: 'Missed-call rescue, quote follow-up and booking recovery' },
  { name: 'Experience Intelligence', line: 'Interactive websites, a concierge and review requests' },
  { name: 'Operations Intelligence', line: 'Job intake, dispatch and inspection paperwork checks' },
]

export const COMING_NOTE = 'Coming means it is not for sale yet.'
