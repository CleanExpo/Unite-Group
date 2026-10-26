// What a visitor can use today, and what is not live yet. The site may only advertise what has shipped and works.
// Sources: nexus-doctrine.md; Niche Agentic spec v2.0 section 2.1
// (founder-drive-2026-10-25b); go-live list W9/W10.
// Synthex and Trade Hall are left out on purpose: no sourced customer line exists for either yet.

export type TodayItem = { name: string; line: string; href: string }
export type ComingItem = { name: string; line: string }

export const TODAY: readonly TodayItem[] = [
  { name: 'Living business card', line: 'A video card that ends on your logo, from $249', href: '/cards' },
]

export const COMING: readonly ComingItem[] = [
  { name: 'Revenue Intelligence', line: 'Missed-call rescue, quote follow-up and booking recovery' },
  { name: 'Experience Intelligence', line: 'Interactive websites, a concierge and review requests' },
  { name: 'Operations Intelligence', line: 'Job intake, dispatch and inspection paperwork checks' },
]

export const COMING_NOTE = 'Coming means it is not for sale yet.'
