'use server'

import { savePlaceId, type OwnerClient, type SavePlaceIdResult } from '@/lib/card/review-owner'
import {
  createReviewRequest, recordReviewOptOut, type CreateRequestResult, type OptOutResult, type ReviewRequestClient, type ReviewRequestInput,
} from '@/lib/card/review-request'
import { createClient, getUser } from '@/lib/supabase/server'

// Every action runs on the owner's own signed-in client: the database functions check auth.uid() owns the card.
// We send nothing from here. The owner presses send on their own phone or email.

async function ownerClient(): Promise<unknown | null> {
  const user = await getUser()
  if (!user) return null
  return createClient()
}

export async function createReviewRequestAction(input: ReviewRequestInput): Promise<CreateRequestResult> {
  const client = await ownerClient()
  if (!client) return { ok: false, status: 403, error: 'sign in again to ask for a review' }
  return createReviewRequest(client as ReviewRequestClient, input)
}

export async function recordOptOutAction(slug: string, contact: string): Promise<OptOutResult> {
  const client = await ownerClient()
  if (!client) return { ok: false, status: 403, error: 'sign in again to manage your card' }
  return recordReviewOptOut(client as ReviewRequestClient, slug, contact)
}

export async function savePlaceIdAction(slug: string, placeId: string): Promise<SavePlaceIdResult> {
  const client = await ownerClient()
  if (!client) return { ok: false, error: 'sign in again to edit your card' }
  return savePlaceId(client as OwnerClient, slug, placeId)
}
