// IAQ Magazine board members to invite to the iaq-magazine portal (per Phill, 04/11/2026).
// Email addresses are not known yet: null means "email needed". Never fill one in by guessing. When Phill supplies
// an address he makes the invite in /founder/portal-invites (tenant iaq-magazine, bound to that address); the address
// lives on the invite row, not in this file.

export type BoardInvitee = { name: string; role: string | null; tenantSlug: 'iaq-magazine'; email: null }

export const IAQ_BOARD_INVITEES: readonly BoardInvitee[] = [
  { name: 'Shelby Berg', role: 'President', tenantSlug: 'iaq-magazine', email: null },
  { name: 'Ivi Simms', role: 'Co-founder', tenantSlug: 'iaq-magazine', email: null },
  { name: 'Phill McGurk', role: 'Co-founder', tenantSlug: 'iaq-magazine', email: null },
  { name: 'Muthukumar Maragathamayil', role: null, tenantSlug: 'iaq-magazine', email: null },
  { name: 'Philipp Schluter', role: null, tenantSlug: 'iaq-magazine', email: null },
]
