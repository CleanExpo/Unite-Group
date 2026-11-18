'use server'

import { revalidatePath } from 'next/cache'

import { portalProjectsContext } from '@/lib/portal/projects/server'
import { respondToProjectItem, submitProjectRequest } from '@/lib/portal/projects/service'

// Server actions for /portal/project. Identity and tenant come from the session only; nothing from the browser is
// trusted for them. The database functions make the final decision and write the audit event.

export type FormState = { ok: boolean; message: string } | null

export async function submitProjectRequestAction(input: { projectSlug: string; text: string; idempotencyKey: string }): Promise<FormState> {
  const { access, db } = await portalProjectsContext()
  const result = await submitProjectRequest(access, db, input)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/portal/project')
  return { ok: true, message: 'Thanks. We have your request. You will see it below as Received, and we will tell you if we need more detail.' }
}

export async function respondToItemAction(input: { itemId: string; verdict: string; note: string; currentState: string }): Promise<FormState> {
  const { access, db } = await portalProjectsContext()
  const result = await respondToProjectItem(access, db, input)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/portal/project')
  return result.state === 'client_accepted'
    ? { ok: true, message: 'Accepted. This records that the work meets your requirement. Release is a separate step.' }
    : { ok: true, message: 'Thanks. We have your notes and will come back to you.' }
}
