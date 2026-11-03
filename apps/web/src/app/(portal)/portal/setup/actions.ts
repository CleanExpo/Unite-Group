'use server'

import { revalidatePath } from 'next/cache'

import { portalContext } from '@/lib/portal/changes/server'
import { markAccessGranted, saveConnection } from '@/lib/portal/setup/service'

// Server actions for /portal/setup. Identity and tenant come from the session only. Only a public link, a property id
// and short notes are ever sent; there is no field for a secret, token or key.

export type SetupFormState = { ok: boolean; message: string } | null

export async function saveConnectionAction(input: { kind: string; value: string; notes: string }): Promise<SetupFormState> {
  const { access, db } = await portalContext()
  const result = await saveConnection(access, db, input)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/portal/setup')
  return { ok: true, message: 'Saved.' }
}

export async function markAccessGrantedAction(kind: string): Promise<SetupFormState> {
  const { access, db } = await portalContext()
  const result = await markAccessGranted(access, db, kind)
  if (!result.ok) return { ok: false, message: result.message }
  revalidatePath('/portal/setup')
  return { ok: true, message: 'Thanks. We will check it and mark it verified.' }
}
