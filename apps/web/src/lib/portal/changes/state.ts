import type { ChangeStatus } from './types'

// The life of one change request. The database functions enforce the same table; this copy drives the buttons and
// the server-side checks, and the tests pin the two together.
//
//   submitted -> in_progress -> preview_ready -> approved -> published -> rolled_back
//        \             \             |  \
//         -> rejected   -> rejected  |   -> in_progress   (owner asks for edits)
//                                    -> rejected

export type ChangeActor = 'owner' | 'team'
export type ChangeAction = 'start' | 'preview' | 'approve' | 'ask_for_edits' | 'publish' | 'reject' | 'roll_back'

type Rule = { action: ChangeAction; from: ChangeStatus; to: ChangeStatus; actor: ChangeActor }

export const CHANGE_RULES: readonly Rule[] = [
  { action: 'start', from: 'submitted', to: 'in_progress', actor: 'team' },
  { action: 'preview', from: 'in_progress', to: 'preview_ready', actor: 'team' },
  { action: 'approve', from: 'preview_ready', to: 'approved', actor: 'owner' },
  { action: 'ask_for_edits', from: 'preview_ready', to: 'in_progress', actor: 'owner' },
  { action: 'publish', from: 'approved', to: 'published', actor: 'team' },
  { action: 'roll_back', from: 'published', to: 'rolled_back', actor: 'team' },
  { action: 'reject', from: 'submitted', to: 'rejected', actor: 'team' },
  { action: 'reject', from: 'in_progress', to: 'rejected', actor: 'team' },
  { action: 'reject', from: 'preview_ready', to: 'rejected', actor: 'team' },
]

/** The status after the action, or null when the action is not allowed from here by this actor. */
export function nextStatus(from: ChangeStatus, action: ChangeAction, actor: ChangeActor): ChangeStatus | null {
  const rule = CHANGE_RULES.find((r) => r.from === from && r.action === action && r.actor === actor)
  return rule ? rule.to : null
}

/** The owner sees Approve and Ask for edits only while a preview is waiting for her. */
export function ownerCanDecide(status: ChangeStatus): boolean {
  return status === 'preview_ready'
}

/** Plain words for the status chip. */
export const STATUS_LABEL: Record<ChangeStatus, string> = {
  submitted: 'Received',
  in_progress: 'We are working on it',
  preview_ready: 'Preview ready for you',
  approved: 'Approved, going live soon',
  published: 'Live on your site',
  rejected: 'Not going ahead',
  rolled_back: 'Undone',
}
