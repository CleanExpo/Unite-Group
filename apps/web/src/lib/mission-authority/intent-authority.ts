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
//
// Re-accepting an EDITED intent on a queued mission: the queued build's consent
// is bound to the old intent hash, so the runner can no longer claim it. Rather
// than strand it, the old binding is recorded as superseded (append-only
// `intent_superseded` event), the stale consent is withdrawn through the guarded
// queued → awaiting_approval edge (compare-and-swap on the queued row, so a
// runner claim that wins the race makes this fail instead of yanking the build),
// and approve() mints fresh consent bound to the new hash.

import { appendTaskEvent, getTaskById } from '@/lib/command-centre/tasks'
import { isDeliveryMission, readDeliveryMetadata } from '@/lib/command-centre/delivery-types'
import { DeliveryConflict, saveDelivery } from '@/lib/command-centre/delivery-store'
import { isLegalTransition } from '@/lib/command-centre/task-transitions'
import {
  DeliveryPreparationFailure,
  prepareDeliveryMission,
  type DeliveryPreparationDeps,
} from '@/lib/command-centre/delivery-prepare'
import { acceptedIntentBinding } from './intent-binding'

export type MintOutcome =
  | { minted: true; reason: 'build_authorised' }
  | { minted: false; reason: 'not_a_delivery_mission' | 'intent_not_accepted' | 'admission_not_ready' | 'approval_refused'; detail?: string }

export type MintOverrides = Partial<DeliveryPreparationDeps> & { appendTaskEvent?: typeof appendTaskEvent }

export async function mintAuthorityFromAcceptedIntent(
  founderId: string,
  taskId: string,
  overrides: MintOverrides = {},
): Promise<MintOutcome> {
  const read = overrides.getTaskById ?? getTaskById
  const task = await read({ founderId, taskId }, overrides.client)
  if (!task || !isDeliveryMission(task)) return { minted: false, reason: 'not_a_delivery_mission' }
  const current = acceptedIntentBinding(task)
  if (!current) return { minted: false, reason: 'intent_not_accepted' }

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
    d.board?.verdict !== 'APPROVED'
  ) {
    return { minted: false, reason: 'admission_not_ready' }
  }

  // A queued build whose signed consent names a DIFFERENT accepted intent has
  // had its source superseded. Only this exact shape is re-bound; a queued build
  // without an intent binding, or one still bound to the current intent, is left
  // alone, and nothing outside queued is ever demoted here.
  const bound = d.approval?.intent
  const superseded = task.status === 'queued' && !d.build && !!bound && bound.hash !== current.hash
  if (!superseded && !['proposed', 'awaiting_approval'].includes(task.status)) {
    return { minted: false, reason: 'admission_not_ready' }
  }

  try {
    if (superseded) {
      if (!isLegalTransition(task.status, 'awaiting_approval', 'approval')) {
        return { minted: false, reason: 'admission_not_ready' }
      }
      // Recorded first: the supersession is already a fact (the new intent is
      // saved). If this append fails nothing is demoted and the error surfaces.
      await (overrides.appendTaskEvent ?? appendTaskEvent)(
        {
          founderId,
          taskId,
          type: 'comment',
          actor: 'founder',
          payload: { kind: 'intent_superseded', oldHash: bound!.hash, newHash: current.hash },
        },
        overrides.client,
      )
      // Withdraw the stale consent. saveDelivery compares status 'queued' and
      // updated_at, so a runner that claimed the build first wins and this throws.
      // The continuation was minted for the old intent; it goes in the same CAS (UNI-2781).
      await (overrides.saveDelivery ?? saveDelivery)(task, { ...d, approval: null }, {
        status: 'awaiting_approval',
        clearMission: true,
        client: overrides.client,
      })
    }
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
