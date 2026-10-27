// src/lib/command-centre/delivery-envelope.ts
//
// The single builder for a freshly captured v1 delivery envelope
// (metadata.delivery). Every producer that records an inert "captured"
// delivery mission — research capture (idea-lifecycle-store) and founder chat
// capture (founder-chat/mission-capture) — writes exactly this shape, so every
// delivery consumer (readDeliveryMetadata, toDeliveryMissionView, prepare,
// approve) parses it instead of reporting invalid_mission.

import { DELIVERY_SCOPE, type DeliveryMetadata } from './delivery-types'

export interface CapturedDeliveryInput {
  /** 64-char hex digest of the material input (hashDeliveryInput). */
  inputHash: string
  projectKey: string | null
  originalIdea: string
}

/** A captured, unprepared, unapproved delivery envelope. Grants no execution scope. */
export function buildCapturedDelivery(input: CapturedDeliveryInput): DeliveryMetadata {
  return {
    schemaVersion: 1, kind: 'software_delivery', lane: 'unknown', revision: 1,
    inputHash: input.inputHash, projectKey: input.projectKey, originalIdea: input.originalIdea,
    presetIds: [], recipeVersions: {}, answers: {}, questions: [], phase: 'captured',
    spec: null, specVersion: null, harness: [], sourceRefs: [], board: null,
    lease: null, approval: null, error: null, scope: DELIVERY_SCOPE,
  }
}
