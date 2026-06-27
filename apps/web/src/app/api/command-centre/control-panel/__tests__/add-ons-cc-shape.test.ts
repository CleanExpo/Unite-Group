// Regression-pin for the add-on approval task shape on cc_tasks.
//
// Background: the legacy Authority route wrote to a workspace-scoped `tasks`
// table whose `assignee_type` CHECK enum caused a production bug. In apps/web
// the approval task lives in founder-scoped `cc_tasks`, which has no such
// column — the gate is expressed via status='awaiting_approval' +
// human_approval_required, keyed on external_ref `cc-addon:<id>`.
//
// This test pins those constants so a future change can't silently drift the
// add-on approval task off the cc_tasks contract.

import { describe, expect, it } from 'vitest'
import {
  ADD_ON_APPROVAL_STATUS,
  CC_ADDON_REF_PREFIX,
  CC_TASK_STATUSES,
  addOnExternalRef,
} from '../add-ons/_cc-task-shape'

describe('Add-on approval — cc_tasks shape', () => {
  it('approval status is awaiting_approval and is a valid cc_tasks status', () => {
    expect(ADD_ON_APPROVAL_STATUS).toBe('awaiting_approval')
    expect(CC_TASK_STATUSES).toContain(ADD_ON_APPROVAL_STATUS)
  })

  it('mirrors the cc_tasks status CHECK enum verbatim', () => {
    expect([...CC_TASK_STATUSES]).toEqual([
      'proposed',
      'queued',
      'running',
      'blocked',
      'awaiting_approval',
      'done',
      'failed',
    ])
  })

  it('builds a stable, founder-unique external_ref per add-on', () => {
    expect(CC_ADDON_REF_PREFIX).toBe('cc-addon:')
    expect(addOnExternalRef('voice')).toBe('cc-addon:voice')
    expect(addOnExternalRef('computer-use')).toBe('cc-addon:computer-use')
  })
})
