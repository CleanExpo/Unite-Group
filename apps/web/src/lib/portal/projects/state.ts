// Lifecycle of a client project item. The 14 states mirror the check constraint in
// supabase/migrations/20261119090000_portal_projects.sql; that migration is the authority, this file only labels them.
// Client acceptance (client_accepted) is never release approval: release states are team-only and need evidence.

export const ITEM_STATES = [
  'proposed', 'clarification_required', 'approved_scope', 'ready_for_development', 'in_development', 'in_testing',
  'technically_verified', 'awaiting_client_review', 'client_accepted', 'approved_for_release', 'deployed',
  'production_verified', 'done', 'blocked',
] as const
export type ItemState = (typeof ITEM_STATES)[number]

export const ITEM_KINDS = ['requirement', 'defect', 'question', 'milestone', 'blocker', 'decision'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

export type AuthorKind = 'client_human' | 'client_bot' | 'staff' | 'agent'

/** Plain-English label a business owner reads. */
export const STATE_LABEL: Record<ItemState, string> = {
  proposed: 'Received',
  clarification_required: 'Needs more detail',
  approved_scope: 'Agreed in scope',
  ready_for_development: 'Ready to build',
  in_development: 'Being built',
  in_testing: 'Being tested',
  technically_verified: 'Tested by us',
  awaiting_client_review: 'Ready for your review',
  client_accepted: 'You accepted it',
  approved_for_release: 'Approved for release',
  deployed: 'Released',
  production_verified: 'Checked after release',
  done: 'Done',
  blocked: 'Blocked',
}

/** Groups for the client page. A held release is "waiting on release", never "failed". */
export type StateGroup = 'waiting_on_you' | 'in_progress' | 'accepted_awaiting_release' | 'released' | 'blocked' | 'received'

export function stateGroup(state: ItemState): StateGroup {
  switch (state) {
    case 'awaiting_client_review':
    case 'clarification_required':
      return 'waiting_on_you'
    case 'blocked':
      return 'blocked'
    case 'client_accepted':
    case 'approved_for_release':
      return 'accepted_awaiting_release'
    case 'deployed':
    case 'production_verified':
    case 'done':
      return 'released'
    case 'proposed':
      return 'received'
    default:
      return 'in_progress'
  }
}

/** The only state in which the client may accept or ask for changes (the database re-checks this). */
export function clientCanRespond(state: ItemState): boolean {
  return state === 'awaiting_client_review'
}

export function isItemState(v: unknown): v is ItemState {
  return typeof v === 'string' && (ITEM_STATES as readonly string[]).includes(v)
}

export function isItemKind(v: unknown): v is ItemKind {
  return typeof v === 'string' && (ITEM_KINDS as readonly string[]).includes(v)
}

/** Who wrote the original words, said plainly. A bot's words are labelled as such, never as the client's decision. */
export function authorLabel(kind: AuthorKind): string {
  switch (kind) {
    case 'client_human': return 'You'
    case 'client_bot': return 'Your assistant (automated, not a confirmed decision)'
    case 'staff': return 'Unite-Group team'
    case 'agent': return 'Unite-Group automated agent'
  }
}
