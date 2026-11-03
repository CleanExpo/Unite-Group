// Who may change what on a Business Pack account and its staff cards (UNI-3146, Phill 02/11/2026). The one rule table:
// the owner controls the business details, a staff member changes only their own name, photo and mobile while their
// card is active, and nobody else changes anything. staff-actions.ts calls this before every write.

export const BUSINESS_FIELDS = ['business_name', 'logo_url', 'phone', 'email', 'website', 'address', 'offer'] as const
export const STAFF_FIELDS = ['staff_name', 'photo_url', 'mobile'] as const

export type BusinessField = (typeof BUSINESS_FIELDS)[number]
export type StaffField = (typeof STAFF_FIELDS)[number]
export type CardField = BusinessField | StaffField

export const ROLES = ['owner', 'own_staff', 'other_staff', 'other_owner', 'anonymous'] as const
export type CardRole = (typeof ROLES)[number]

export const CARD_STATES = ['active', 'deactivated'] as const
export type CardState = (typeof CARD_STATES)[number]

/** Who a resolved private link belongs to. Null means no valid link. */
export type CardActor =
  | { kind: 'owner'; accountId: string; founderId: string }
  | { kind: 'staff'; staffId: string; accountId: string; founderId: string }
  | null

const isBusinessField = (field: string): field is BusinessField => (BUSINESS_FIELDS as readonly string[]).includes(field)
const isStaffField = (field: string): field is StaffField => (STAFF_FIELDS as readonly string[]).includes(field)

export function isCardField(field: string): field is CardField {
  return isBusinessField(field) || isStaffField(field)
}

/** May this role change this field? Business fields live on the account, so a card's state does not affect them. */
export function canEditField(role: CardRole, field: CardField, state: CardState): boolean {
  if (isBusinessField(field)) return role === 'owner'
  return role === 'own_staff' && state === 'active'
}

/** Only the owner of the account can deactivate a staff card or issue its link, and only while it is active. */
export function canManageStaffCard(role: CardRole, state: CardState): boolean {
  return role === 'owner' && state === 'active'
}

/** The caller's role towards an account, or towards one staff card on an account. Never trusts anything the caller sent. */
export function roleFor(actor: CardActor, target: { accountId: string; staffId?: string }): CardRole {
  if (!actor) return 'anonymous'
  if (actor.kind === 'owner') return actor.accountId === target.accountId ? 'owner' : 'other_owner'
  return target.staffId !== undefined && actor.staffId === target.staffId ? 'own_staff' : 'other_staff'
}
