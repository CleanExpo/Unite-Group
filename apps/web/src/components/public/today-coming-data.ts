// What a visitor can use today, and what is not live yet. The site may only advertise what has shipped and works.
// Unite Group sells its own agency products only (UNI-3017): the restoration sister companies are not shown here.

export type TodayItem = { name: string; line: string; href: string }
export type ComingItem = { name: string; line: string }

export const TODAY: readonly TodayItem[] = [
  { name: 'Living business card', line: 'A video card that ends on your logo, from $249', href: '/cards' },
  { name: 'Starter plan', line: 'Your marketing run by Unite Group, $99 a month', href: '/pricing' },
  { name: 'Email signatures', line: 'A branded signature for each person on your team, $22 each', href: '/signatures' },
]

export const COMING: readonly ComingItem[] = [
  { name: 'Revenue Intelligence', line: 'Missed-call rescue, quote follow-up and booking recovery' },
  { name: 'Experience Intelligence', line: 'Interactive websites, a concierge and review requests' },
  { name: 'Operations Intelligence', line: 'Job intake, dispatch and inspection paperwork checks' },
]

export const COMING_NOTE = 'Coming means it is not for sale yet.'
