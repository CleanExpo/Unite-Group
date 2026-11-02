'use server'

import { revalidatePath } from 'next/cache'

import { portalContext } from '@/lib/portal/changes/server'
import { approveChangeRequest, askForChangeEdits, submitChangeRequest } from '@/lib/portal/changes/service'

// Server actions for /portal/changes. Each one rebuilds who is asking from the session; nothing from the browser is
// trusted for identity, tenant or status. The database functions make the final decision and write the audit event.

export type FormState = { ok: boolean; message: string } | null

export async function submitChangeAction(input: { page: string; requestText: string; photoPath: string | null }): Promise<FormState> {
  const { access, db } = await portalContext()
  const result = await submitChangeRequest(access, db, input)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/portal/changes')
  return { ok: true, message: 'Thanks. We have your request and will let you know when a preview is ready.' }
}

export async function approveChangeAction(requestId: string): Promise<FormState> {
  const { access, db } = await portalContext()
  const result = await approveChangeRequest(access, db, requestId)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/portal/changes')
  return { ok: true, message: 'Approved. We will put it live and let you know.' }
}

export async function askForEditsAction(requestId: string, note: string): Promise<FormState> {
  const { access, db } = await portalContext()
  const result = await askForChangeEdits(access, db, requestId, note)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/portal/changes')
  return { ok: true, message: 'Thanks. We will make those edits and send a new preview.' }
}
