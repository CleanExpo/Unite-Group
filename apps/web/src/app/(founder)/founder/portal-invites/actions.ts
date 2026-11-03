'use server'

import { revalidatePath } from 'next/cache'

import { hasPrivateAccess } from '@/lib/auth/private-access'
import { createInvite, revokeInvite, type CreateInviteResult, type NewInviteInput } from '@/lib/portal/invites/founder'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Founder-only. The proxy already turns away anyone not on the founder allow-list; each action checks again,
// because a server action is a POST endpoint of its own. Portal owners are never on that list.

async function founderUserId(): Promise<string | null> {
  const user = await getUser()
  if (!user || !hasPrivateAccess(user)) return null
  return user.id
}

export async function createInviteAction(input: NewInviteInput): Promise<CreateInviteResult> {
  const founderId = await founderUserId()
  if (!founderId) return { ok: false, error: 'Only the founder can make invite codes.' }
  const result = await createInvite(createServiceClient(), input, founderId)
  if (result.ok) revalidatePath('/founder/portal-invites')
  return result
}

export async function revokeInviteAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const founderId = await founderUserId()
  if (!founderId) return { ok: false, error: 'Only the founder can cancel invite codes.' }
  const result = await revokeInvite(createServiceClient(), id)
  if (result.ok) revalidatePath('/founder/portal-invites')
  return result
}
