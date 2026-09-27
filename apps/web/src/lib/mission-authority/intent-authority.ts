// src/lib/mission-authority/intent-authority.ts
//
// UNI-2779 — ACCEPTED + ADMITTED => BUILD_AUTHORISED with no second founder
// action. When the founder accepts a delivery mission's intent.md and the
// mission is already admitted (ready, fingerprinted spec with a Board APPROVED
// verdict), this mints the signed build approval through the EXISTING
// approve() path — the same preconditions, the same receipt, the same
// signature — and approve() binds the accepted intent into that signature.
//
// It never mints for a draft intent, and never relaxes approve(): every
// refusal approve() raises is reported, not retried or worked around.

import { getTaskById } from '@/lib/command-centre/tasks'
import { isDeliveryMission, readDeliveryMetadata } from '@/lib/command-centre/delivery-types'
import { DeliveryConflict } from '@/lib/command-centre/delivery-store'
import {
  DeliveryPreparationFailure,
  prepareDeliveryMission,
  type DeliveryPreparationDeps,
} from '@/lib/command-centre/delivery-prepare'
import { acceptedIntentBinding } from './intent-binding'

export type MintOutcome =
  | { minted: true; reason: 'build_authorised' }
  | { minted: false; reason: 'not_a_delivery_mission' | 'intent_not_accepted' | 'admission_not_ready' | 'approval_refused'; detail?: string }

export async function mintAuthorityFromAcceptedIntent(
  founderId: string,
  taskId: string,
  overrides: Partial<DeliveryPreparationDeps> = {},
): Promise<MintOutcome> {
  const read = overrides.getTaskById ?? getTaskById
  const task = await read({ founderId, taskId }, overrides.client)
  if (!task || !isDeliveryMission(task)) return { minted: false, reason: 'not_a_delivery_mission' }
  if (!acceptedIntentBinding(task)) return { minted: false, reason: 'intent_not_accepted' }

  // Admission: approve() re-checks all of this and more; these are the cheap
  // "not yet" states that are normal, not errors. The Board verdict is the
  // admission decision approve() does not itself check, so it is required here
  // before consent is minted without the founder looking at it again.
  const d = readDeliveryMetadata(task)
  if (
    !d ||
    d.phase !== 'ready' ||
    !d.specVersion ||
    d.lane !== 'software' ||
    d.board?.verdict !== 'APPROVED' ||
    !['proposed', 'awaiting_approval'].includes(task.status)
  ) {
    return { minted: false, reason: 'admission_not_ready' }
  }

  try {
    const { task: approved } = await prepareDeliveryMission(
      founderId,
      { action: 'approve', taskId, specVersion: d.specVersion },
      overrides,
    )
    return approved.status === 'queued'
      ? { minted: true, reason: 'build_authorised' }
      : { minted: false, reason: 'approval_refused', detail: 'The approval path did not queue the build.' }
  } catch (error) {
    if (error instanceof DeliveryConflict || error instanceof DeliveryPreparationFailure) {
      return { minted: false, reason: 'approval_refused', detail: error.message }
    }
    throw error
  }
}
