// Schema-pinned shape for the add-on approval task written to cc_tasks.
//
// The legacy add-ons route wrote to a generic, workspace-scoped `tasks`
// table whose `assignee_type` CHECK enum was the source of a production bug
// (it hardcoded 'human', which the enum rejected). In apps/web that table
// does not exist: command-centre tasks live in founder-scoped `cc_tasks`
// (see supabase/migrations/20260604000000_cc_command_centre.sql), which has
// NO assignee_type column. The approval gate is expressed natively instead:
//
//   - status = 'awaiting_approval'   (cc_tasks status CHECK enum)
//   - human_approval_required = true
//   - origin = 'idea'
//   - external_ref = `cc-addon:<id>` (UNIQUE(founder_id, external_ref) →
//     natural idempotency, replacing the old obsidian_path lookup)
//
// This module pins those constants so a future change can't silently drift
// the add-on approval task off the cc_tasks contract.

export const CC_ADDON_REF_PREFIX = 'cc-addon:' as const

/** Stable, founder-unique external_ref for an add-on approval task. */
export function addOnExternalRef(addOnId: string): string {
  return `${CC_ADDON_REF_PREFIX}${addOnId}`
}

// cc_tasks.status CHECK enum (mirrors the migration). An approval gate lands
// on 'awaiting_approval' — nothing executes until the founder approves.
export const CC_TASK_STATUSES = [
  'proposed',
  'queued',
  'running',
  'blocked',
  'awaiting_approval',
  'done',
  'failed',
] as const
export type CcTaskStatus = (typeof CC_TASK_STATUSES)[number]

export const ADD_ON_APPROVAL_STATUS: CcTaskStatus = 'awaiting_approval'
