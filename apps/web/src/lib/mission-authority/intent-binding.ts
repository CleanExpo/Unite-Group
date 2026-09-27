// src/lib/mission-authority/intent-binding.ts
//
// UNI-2779 — binds a signed build approval to the exact intent.md the founder
// accepted. Pure and dependency-free so the delivery store can import it
// without a module cycle.
//
// The binding is recorded inside the signed approval payload. If the accepted
// markdown later changes, or the intent falls back to draft, the binding no
// longer holds and getApprovedDelivery refuses the approval.

import { createHash } from 'node:crypto'

/** Format version of the binding record itself. */
export const INTENT_BINDING_VERSION = 1

export interface IntentBinding {
  /** sha256 (hex) of the accepted intent markdown, byte for byte. */
  hash: string
  version: number
  acceptedAt: string | null
}

export function hashIntentMarkdown(markdown: string): string {
  return createHash('sha256').update(markdown, 'utf8').digest('hex')
}

/** The accepted intent's { status, markdown }, read without trusting its shape. */
function acceptedIntent(metadata: Record<string, unknown> | null | undefined): { markdown: string; acceptedAt: string | null } | null {
  const raw = metadata?.intent as Record<string, unknown> | undefined
  if (!raw || typeof raw !== 'object' || raw.status !== 'accepted' || typeof raw.markdown !== 'string') return null
  return { markdown: raw.markdown, acceptedAt: typeof raw.acceptedAt === 'string' ? raw.acceptedAt : null }
}

/** The binding for a task's currently accepted intent, or null when none is accepted. */
export function acceptedIntentBinding(task: { metadata: Record<string, unknown> }): IntentBinding | null {
  const intent = acceptedIntent(task.metadata)
  if (!intent) return null
  return { hash: hashIntentMarkdown(intent.markdown), version: INTENT_BINDING_VERSION, acceptedAt: intent.acceptedAt }
}

/** True only while the task's intent is still accepted with byte-identical markdown. */
export function intentBindingHolds(task: { metadata: Record<string, unknown> }, binding: IntentBinding): boolean {
  const current = acceptedIntentBinding(task)
  return !!current && binding.version === INTENT_BINDING_VERSION && current.hash === binding.hash
}
