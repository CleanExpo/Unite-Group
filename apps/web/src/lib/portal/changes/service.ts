import { deniedResult, type ActionDenied, type PortalAccess } from './access'
import { nextStatus } from './state'
import { CHANGE_STATUSES, type ChangePage, type ChangeRequest, type ChangeStatus } from './types'
import { validateChangeInput, validateEditNote, type ChangeInput } from './validate'

// Owner actions on change requests. Each one:
//   1. refuses unless the session is a signed-in owner at aal2 (decidePortalAccess);
//   2. scopes every read to her tenant in code, on top of the row rules;
//   3. writes only through a database function, which re-checks tenant, aal2 and status in one transaction
//      and writes the audit event. The code check gives a friendly answer; the database check is the real one.

type DbError = { message: string; code?: string } | null
type Result<T> = PromiseLike<{ data: T; error: DbError }>

/** The slice of the Supabase client these functions use. Kept structural so tests can pass a fake. */
export interface PortalChangesDb {
  rpc(fn: string, args: Record<string, unknown>): Result<unknown>
  from(table: 'portal_change_requests'): {
    select(columns: string): {
      eq(column: 'tenant_slug', value: string): {
        order(column: 'created_at', options: { ascending: boolean }): Result<unknown>
        eq(column: 'id', value: string): { maybeSingle(): Result<unknown> }
      }
    }
  }
}

export type ActionFailed = { ok: false; code: 'invalid' | 'not_allowed' | 'not_found' | 'failed'; message: string }
export type ActionResult<T> = ({ ok: true } & T) | ActionDenied | ActionFailed

const COLUMNS = 'id, tenant_slug, page, request_text, photo_path, status, preview_url, edit_note, created_at, updated_at, approved_at'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Row = {
  id: string; tenant_slug: string; page: string; request_text: string; photo_path: string | null; status: string
  preview_url: string | null; edit_note: string | null; created_at: string; updated_at: string; approved_at: string | null
}

function toRequest(row: Row): ChangeRequest | null {
  if (!CHANGE_STATUSES.includes(row.status as ChangeStatus)) return null
  return {
    id: row.id, tenantSlug: row.tenant_slug, page: row.page as ChangePage, requestText: row.request_text,
    photoPath: row.photo_path, status: row.status as ChangeStatus,
    // a preview link is shown only when it is https; anything else is dropped rather than rendered
    previewUrl: row.preview_url && row.preview_url.startsWith('https://') ? row.preview_url : null,
    editNote: row.edit_note, createdAt: row.created_at, updatedAt: row.updated_at, approvedAt: row.approved_at,
  }
}

/** A failed read is an error, never an empty list. */
export async function listChangeRequests(
  access: PortalAccess, db: PortalChangesDb,
): Promise<ActionResult<{ requests: ChangeRequest[] }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  const { data, error } = await db.from('portal_change_requests').select(COLUMNS)
    .eq('tenant_slug', access.owner.tenantSlug).order('created_at', { ascending: false })
  if (error || !Array.isArray(data)) return { ok: false, code: 'failed', message: 'We could not load your requests. Please refresh.' }
  const requests = (data as Row[])
    .filter((row) => row.tenant_slug === access.owner.tenantSlug)
    .map(toRequest)
    .filter((r): r is ChangeRequest => r !== null)
  return { ok: true, requests }
}

export async function submitChangeRequest(
  access: PortalAccess, db: PortalChangesDb, input: ChangeInput,
): Promise<ActionResult<{ id: string }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  const v = validateChangeInput(input, access.owner.tenantSlug)
  if (!v.ok) return { ok: false, code: 'invalid', message: v.error }
  const { data, error } = await db.rpc('portal_create_change_request', {
    p_page: v.value.page, p_request_text: v.value.requestText, p_photo_path: v.value.photoPath,
  })
  if (error || typeof data !== 'string') return fromDbError(error)
  return { ok: true, id: data }
}

export async function approveChangeRequest(
  access: PortalAccess, db: PortalChangesDb, requestId: unknown,
): Promise<ActionResult<{ status: ChangeStatus }>> {
  return ownerDecision(access, db, requestId, 'approve', () => db.rpc('portal_approve_change_request', { p_request_id: requestId }))
}

export async function askForChangeEdits(
  access: PortalAccess, db: PortalChangesDb, requestId: unknown, note: unknown,
): Promise<ActionResult<{ status: ChangeStatus }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  const v = validateEditNote(note)
  if (!v.ok) return { ok: false, code: 'invalid', message: v.error }
  return ownerDecision(access, db, requestId, 'ask_for_edits',
    () => db.rpc('portal_ask_for_change_edits', { p_request_id: requestId, p_note: v.value }))
}

async function ownerDecision(
  access: PortalAccess, db: PortalChangesDb, requestId: unknown, action: 'approve' | 'ask_for_edits',
  call: () => Result<unknown>,
): Promise<ActionResult<{ status: ChangeStatus }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  if (typeof requestId !== 'string' || !UUID_RE.test(requestId)) return { ok: false, code: 'not_found', message: 'We could not find that request.' }
  const { data: row, error: readError } = await db.from('portal_change_requests').select('id, tenant_slug, status')
    .eq('tenant_slug', access.owner.tenantSlug).eq('id', requestId).maybeSingle()
  if (readError) return { ok: false, code: 'failed', message: 'Something went wrong. Please try again.' }
  const current = row as Pick<Row, 'id' | 'tenant_slug' | 'status'> | null
  if (!current || current.tenant_slug !== access.owner.tenantSlug) return { ok: false, code: 'not_found', message: 'We could not find that request.' }
  const target = nextStatus(current.status as ChangeStatus, action, 'owner')
  if (!target) return { ok: false, code: 'not_allowed', message: 'This request is not waiting for your decision.' }
  const { data, error } = await call()
  if (error || data !== target) return fromDbError(error)
  return { ok: true, status: target }
}

function fromDbError(error: DbError): ActionFailed | ActionDenied {
  const m = error?.message ?? ''
  if (m.includes('portal_not_owner')) return { ok: false, code: 'verify_second_factor', message: 'Please confirm it is you with your second sign-in step first.' }
  if (m.includes('portal_wrong_status')) return { ok: false, code: 'not_allowed', message: 'This request is not waiting for your decision.' }
  if (m.includes('portal_not_found')) return { ok: false, code: 'not_found', message: 'We could not find that request.' }
  if (m.includes('portal_bad_input')) return { ok: false, code: 'invalid', message: 'Please check what you entered and try again.' }
  return { ok: false, code: 'failed', message: 'Something went wrong. Please try again.' }
}
