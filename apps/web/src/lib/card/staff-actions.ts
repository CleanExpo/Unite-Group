// Server side of /cards/manage (UNI-3146). A private link's token is the only authority: it resolves to the owner of one
// account or the holder of one staff card, staff-permissions.ts decides, and only then does the service role write. See
// supabase/migrations/20261102130000_card_business_accounts_staff_cards.sql for why this is not RLS on the buyer.
// Tokens are stored only as sha256 hashes. A raw token leaves this file once, to the owner who just issued it.

import { createHash, randomBytes } from 'node:crypto'

import type { createServiceClient } from '@/lib/supabase/service'

import {
  BUSINESS_FIELDS,
  canEditField,
  canManageStaffCard,
  isCardField,
  roleFor,
  STAFF_FIELDS,
  type CardActor,
  type CardField,
  type CardState,
} from './staff-permissions'

export type Admin = ReturnType<typeof createServiceClient>
export type ManageResult = { status: number; body: Record<string, unknown> }

const TOKEN = /^[A-Za-z0-9_-]{43}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHONE = /^\+?[0-9 ()-]{6,24}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const MANAGE_BASE_URL = 'https://unite-group.in/cards/manage'

export function newCardToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashCardToken(token) }
}

export function hashCardToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** In the fragment, so the token is never sent in a request line, a log or a Referer header. */
export function manageLink(token: string): string {
  return `${MANAGE_BASE_URL}#k=${token}`
}

const ACCOUNT_COLUMNS = `id, founder_id, rounds_included, ${BUSINESS_FIELDS.join(', ')}`
const STAFF_COLUMNS = `id, founder_id, account_id, card_slug, rounds_included, status, token_hash, ${STAFF_FIELDS.join(', ')}`

const INVALID = { status: 404, body: { error: 'This link is not valid. Ask the account owner for a new one.' } }
const FORBIDDEN = { status: 403, body: { error: 'You cannot change that.' } }
const FAILED = { status: 500, body: { error: 'Something went wrong. Please try again.' } }

type Row = Record<string, unknown>

/** Token to actor. A failed read throws: it must never look like an invalid link. A deactivated card has no token left. */
export async function resolveCardActor(admin: Admin, token: unknown): Promise<CardActor> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return null
  const hash = hashCardToken(token)
  const owner = await admin.from('card_business_accounts').select('id, founder_id').eq('owner_token_hash', hash).maybeSingle()
  if (owner.error) throw new Error(`card account read failed: ${owner.error.message}`)
  if (owner.data) return { kind: 'owner', accountId: owner.data.id as string, founderId: owner.data.founder_id as string }
  const staff = await admin
    .from('card_staff_cards')
    .select('id, account_id, founder_id')
    .eq('token_hash', hash)
    .eq('status', 'active')
    .maybeSingle()
  if (staff.error) throw new Error(`staff card read failed: ${staff.error.message}`)
  if (staff.data) {
    return { kind: 'staff', staffId: staff.data.id as string, accountId: staff.data.account_id as string, founderId: staff.data.founder_id as string }
  }
  return null
}

/** Trim and check one field. Empty clears an optional field. Returns undefined when the value is not acceptable. */
export function cleanField(field: CardField, raw: unknown): string | null | undefined {
  if (raw === null) return field === 'business_name' || field === 'staff_name' ? undefined : null
  if (typeof raw !== 'string') return undefined
  const v = raw.trim()
  if (!v) return field === 'business_name' || field === 'staff_name' ? undefined : null
  switch (field) {
    case 'business_name':
      return v.length <= 120 ? v : undefined
    case 'staff_name':
      return v.length <= 80 ? v : undefined
    case 'phone':
    case 'mobile':
      return PHONE.test(v) ? v : undefined
    case 'email':
      return v.length <= 254 && EMAIL.test(v) ? v : undefined
    case 'address':
      return v.length <= 200 ? v : undefined
    case 'offer':
      return v.length <= 280 ? v : undefined
    case 'logo_url':
    case 'photo_url':
    case 'website':
      return isHttpsUrl(v) ? v : undefined
  }
}

/** https only, so a card can never carry a javascript: or data: link. Same shape as the database check. */
function isHttpsUrl(v: string): boolean {
  if (v.length > 500 || /[\s<>"]/.test(v)) return false
  try {
    const url = new URL(v)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

/** Every key must be a known field, allowed for this caller and valid. One bad key refuses the whole change. */
function buildPatch(
  fields: unknown,
  allowed: (field: CardField) => boolean,
): { patch: Record<string, string | null> } | { refused: ManageResult } {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return { refused: { status: 400, body: { error: 'Nothing to change.' } } }
  const entries = Object.entries(fields as Record<string, unknown>)
  if (entries.length === 0) return { refused: { status: 400, body: { error: 'Nothing to change.' } } }
  const patch: Record<string, string | null> = {}
  for (const [key, raw] of entries) {
    if (!isCardField(key) || !allowed(key)) return { refused: FORBIDDEN }
    const value = cleanField(key, raw)
    if (value === undefined) return { refused: { status: 400, body: { error: `Please check ${key.replace('_', ' ')}.`, field: key } } }
    patch[key] = value
  }
  return { patch }
}

async function loadStaffCard(admin: Admin, founderId: string, staffId: unknown): Promise<Row | null> {
  if (typeof staffId !== 'string' || !UUID.test(staffId)) return null
  const { data, error } = await admin.from('card_staff_cards').select(STAFF_COLUMNS).eq('id', staffId).eq('founder_id', founderId).maybeSingle()
  if (error) throw new Error(`staff card read failed: ${error.message}`)
  return (data as Row | null) ?? null
}

function publicStaff(row: Row) {
  return {
    id: row.id,
    card_slug: row.card_slug,
    staff_name: row.staff_name ?? null,
    photo_url: row.photo_url ?? null,
    mobile: row.mobile ?? null,
    status: row.status,
    rounds_included: row.rounds_included,
    has_link: Boolean(row.token_hash),
  }
}

async function loadView(admin: Admin, actor: Exclude<CardActor, null>): Promise<ManageResult> {
  const account = await admin.from('card_business_accounts').select(ACCOUNT_COLUMNS).eq('id', actor.accountId).eq('founder_id', actor.founderId).maybeSingle()
  if (account.error) throw new Error(`card account read failed: ${account.error.message}`)
  if (!account.data) return INVALID
  const a = account.data as unknown as Row
  if (actor.kind === 'staff') {
    const me = await loadStaffCard(admin, actor.founderId, actor.staffId)
    if (!me) return INVALID
    return { status: 200, body: { role: 'staff', business_name: a.business_name ?? null, card: publicStaff(me) } }
  }
  const staff = await admin.from('card_staff_cards').select(STAFF_COLUMNS).eq('account_id', actor.accountId).eq('founder_id', actor.founderId).order('created_at')
  if (staff.error) throw new Error(`staff card read failed: ${staff.error.message}`)
  const business = Object.fromEntries(BUSINESS_FIELDS.map((f) => [f, a[f] ?? null]))
  return {
    status: 200,
    body: { role: 'owner', rounds_included: a.rounds_included, business, staff: ((staff.data ?? []) as unknown as Row[]).map(publicStaff) },
  }
}

async function updateBusiness(admin: Admin, actor: Exclude<CardActor, null>, fields: unknown): Promise<ManageResult> {
  // The target is the caller's own account by construction, so a staff link resolves to other_staff and is refused.
  const role = roleFor(actor, { accountId: actor.accountId })
  const built = buildPatch(fields, (field) => canEditField(role, field, 'active'))
  if ('refused' in built) return built.refused
  const { error } = await admin.from('card_business_accounts').update(built.patch).eq('id', actor.accountId).eq('founder_id', actor.founderId)
  if (error) throw new Error(`card account update failed: ${error.message}`)
  return loadView(admin, actor)
}

async function updateStaff(admin: Admin, actor: Exclude<CardActor, null>, staffId: unknown, fields: unknown): Promise<ManageResult> {
  const card = await loadStaffCard(admin, actor.founderId, staffId)
  if (!card) return FORBIDDEN
  const role = roleFor(actor, { accountId: card.account_id as string, staffId: card.id as string })
  const built = buildPatch(fields, (field) => canEditField(role, field, card.status as CardState))
  if ('refused' in built) return built.refused
  const { data, error } = await admin.from('card_staff_cards').update(built.patch).eq('id', card.id as string).eq('status', 'active').select('id')
  if (error) throw new Error(`staff card update failed: ${error.message}`)
  if (!data || data.length === 0) return FORBIDDEN
  return loadView(admin, actor)
}

async function deactivateStaff(admin: Admin, actor: Exclude<CardActor, null>, staffId: unknown): Promise<ManageResult> {
  const card = await loadStaffCard(admin, actor.founderId, staffId)
  if (!card) return FORBIDDEN
  const role = roleFor(actor, { accountId: card.account_id as string, staffId: card.id as string })
  if (!canManageStaffCard(role, card.status as CardState)) return FORBIDDEN
  const { error } = await admin.from('card_staff_cards').update({ status: 'deactivated' }).eq('id', card.id as string).eq('status', 'active')
  if (error) throw new Error(`staff card deactivate failed: ${error.message}`)
  return loadView(admin, actor)
}

/** A new link replaces the old one. The raw token is returned here once and never stored. */
async function issueStaffLink(admin: Admin, actor: Exclude<CardActor, null>, staffId: unknown): Promise<ManageResult> {
  const card = await loadStaffCard(admin, actor.founderId, staffId)
  if (!card) return FORBIDDEN
  const role = roleFor(actor, { accountId: card.account_id as string, staffId: card.id as string })
  if (!canManageStaffCard(role, card.status as CardState)) return FORBIDDEN
  const { token, hash } = newCardToken()
  const { data, error } = await admin.from('card_staff_cards').update({ token_hash: hash }).eq('id', card.id as string).eq('status', 'active').select('id')
  if (error) throw new Error(`staff link update failed: ${error.message}`)
  if (!data || data.length === 0) return FORBIDDEN
  const view = await loadView(admin, actor)
  return { status: view.status, body: { ...view.body, issued_link: manageLink(token), issued_for: card.id } }
}

/** One request to /api/cards/manage. Never throws: a failed read or write is a 500, never a quiet success. */
export async function handleCardManage(admin: Admin, input: Record<string, unknown>): Promise<ManageResult> {
  try {
    const actor = await resolveCardActor(admin, input.token)
    if (!actor) return INVALID
    switch (input.action) {
      case 'load':
        return await loadView(admin, actor)
      case 'update_business':
        return await updateBusiness(admin, actor, input.fields)
      case 'update_staff':
        return await updateStaff(admin, actor, input.staff_id, input.fields)
      case 'deactivate_staff':
        return await deactivateStaff(admin, actor, input.staff_id)
      case 'issue_staff_link':
        return await issueStaffLink(admin, actor, input.staff_id)
      default:
        return { status: 400, body: { error: 'Unknown action.' } }
    }
  } catch (err) {
    console.error('[cards/manage]', err instanceof Error ? err.message : err)
    return FAILED
  }
}
