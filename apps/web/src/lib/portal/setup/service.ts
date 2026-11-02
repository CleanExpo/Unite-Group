import { deniedResult, type ActionDenied, type PortalAccess } from '../changes/access'

import { ACCESS_KINDS, CONNECTION_KINDS, CONNECTION_STATUSES, type Connection, type ConnectionKind, type ConnectionStatus } from './types'
import { validateConnectionValue, validateNotes } from './validate'

// Owner actions on the connections checklist. Same shape as the change-request actions:
//   1. refuse unless the session is a signed-in owner at aal2;
//   2. scope every read to her tenant in code, on top of the row rules;
//   3. write only through a database function, which re-checks tenant, aal2 and the value in one transaction.

type DbError = { message: string; code?: string } | null
type Result<T> = PromiseLike<{ data: T; error: DbError }>

/** The slice of the Supabase client these functions use. Kept structural so tests can pass a fake. */
export interface PortalSetupDb {
  rpc(fn: string, args: Record<string, unknown>): Result<unknown>
  from(table: 'portal_connections'): {
    select(columns: string): { eq(column: 'tenant_slug', value: string): Result<unknown> }
  }
}

export type SetupFailed = { ok: false; code: 'invalid' | 'not_allowed' | 'failed'; message: string }
export type SetupResult<T> = ({ ok: true } & T) | ActionDenied | SetupFailed

type Row = {
  tenant_slug: string; kind: string; status: string; profile_url: string | null; property_id: string | null
  notes: string | null; updated_at: string | null
}
const COLUMNS = 'tenant_slug, kind, status, profile_url, property_id, notes, updated_at'

function isKind(v: unknown): v is ConnectionKind {
  return typeof v === 'string' && (CONNECTION_KINDS as readonly string[]).includes(v)
}

/** A failed read is an error, never an empty checklist. */
export async function listConnections(access: PortalAccess, db: PortalSetupDb): Promise<SetupResult<{ connections: Connection[] }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  const { data, error } = await db.from('portal_connections').select(COLUMNS).eq('tenant_slug', access.owner.tenantSlug)
  if (error || !Array.isArray(data)) return { ok: false, code: 'failed', message: 'We could not load your checklist. Please refresh.' }
  const connections = (data as Row[])
    .filter((r) => r.tenant_slug === access.owner.tenantSlug && isKind(r.kind)
      && (CONNECTION_STATUSES as readonly string[]).includes(r.status))
    .map((r) => ({
      kind: r.kind as ConnectionKind, status: r.status as ConnectionStatus,
      value: r.profile_url ?? r.property_id, notes: r.notes, updatedAt: r.updated_at,
    }))
  return { ok: true, connections }
}

export async function saveConnection(
  access: PortalAccess, db: PortalSetupDb, input: { kind: unknown; value: unknown; notes?: unknown },
): Promise<SetupResult<{ status: ConnectionStatus }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  if (!isKind(input.kind)) return { ok: false, code: 'invalid', message: 'Something went wrong. Please refresh and try again.' }
  const value = validateConnectionValue(input.kind, input.value)
  if (!value.ok) return { ok: false, code: 'invalid', message: value.error }
  const notes = validateNotes(input.notes)
  if (!notes.ok) return { ok: false, code: 'invalid', message: notes.error }
  const { data, error } = await db.rpc('portal_save_connection', {
    p_kind: input.kind, p_profile_url: value.value.profileUrl, p_property_id: value.value.propertyId, p_notes: notes.value,
  })
  return statusResult(data, error, 'Please check the link and try again.')
}

export async function markAccessGranted(
  access: PortalAccess, db: PortalSetupDb, kind: unknown,
): Promise<SetupResult<{ status: ConnectionStatus }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  if (!isKind(kind) || !ACCESS_KINDS.includes(kind)) return { ok: false, code: 'invalid', message: 'This item has no access step.' }
  const { data, error } = await db.rpc('portal_mark_connection_access_granted', { p_kind: kind })
  return statusResult(data, error, 'Please save the link for this item first, then try again.')
}

function statusResult(data: unknown, error: DbError, badInput: string): SetupResult<{ status: ConnectionStatus }> {
  if (!error && typeof data === 'string' && (CONNECTION_STATUSES as readonly string[]).includes(data)) {
    return { ok: true, status: data as ConnectionStatus }
  }
  const m = error?.message ?? ''
  if (m.includes('portal_not_owner')) return { ok: false, code: 'verify_second_factor', message: 'Please confirm it is you with your second sign-in step first.' }
  if (m.includes('portal_bad_input')) return { ok: false, code: 'invalid', message: badInput }
  return { ok: false, code: 'failed', message: 'Something went wrong. Please try again.' }
}
