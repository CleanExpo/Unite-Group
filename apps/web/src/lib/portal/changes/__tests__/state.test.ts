import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHANGE_RULES, nextStatus, ownerCanDecide } from '../state'
import { CHANGE_STATUSES } from '../types'

const MIGRATION = readFileSync(
  join(__dirname, '..', '..', '..', '..', '..', 'supabase', 'migrations', '20261102180000_portal_change_requests.sql'),
  'utf8',
)

describe('change request status rules', () => {
  it('approve is allowed only from preview_ready, and only by the owner', () => {
    for (const from of CHANGE_STATUSES) {
      expect(nextStatus(from, 'approve', 'owner'), from).toBe(from === 'preview_ready' ? 'approved' : null)
      expect(nextStatus(from, 'approve', 'team'), `team ${from}`).toBeNull()
    }
  })

  it('ask for edits is allowed only from preview_ready and sends the request back to in_progress', () => {
    for (const from of CHANGE_STATUSES) {
      expect(nextStatus(from, 'ask_for_edits', 'owner'), from).toBe(from === 'preview_ready' ? 'in_progress' : null)
    }
  })

  it('the owner can never publish, roll back, start, preview or reject', () => {
    for (const from of CHANGE_STATUSES) {
      for (const action of ['publish', 'roll_back', 'start', 'preview', 'reject'] as const) {
        expect(nextStatus(from, action, 'owner'), `${action} from ${from}`).toBeNull()
      }
    }
  })

  it('the decision buttons show only while a preview waits for her', () => {
    expect(CHANGE_STATUSES.filter(ownerCanDecide)).toEqual(['preview_ready'])
  })

  it('every team rule in state.ts is the same rule the database function enforces', () => {
    // Pull "when p_action = 'x' and v_from = 'y' then 'z'" and "v_from in (...)" out of the team function.
    const sqlRules = new Set<string>()
    for (const m of MIGRATION.matchAll(/when p_action = '(\w+)' and v_from = '(\w+)' then '(\w+)'/g)) sqlRules.add(`${m[1]}:${m[2]}:${m[3]}`)
    for (const m of MIGRATION.matchAll(/when p_action = '(\w+)' and v_from in \(([^)]+)\) then '(\w+)'/g)) {
      for (const from of m[2].split(',').map((s) => s.trim().replace(/'/g, ''))) sqlRules.add(`${m[1]}:${from}:${m[3]}`)
    }
    const tsRules = new Set(CHANGE_RULES.filter((r) => r.actor === 'team').map((r) => `${r.action}:${r.from}:${r.to}`))
    expect(sqlRules.size).toBeGreaterThan(4) // positive control: the parser really found the SQL rules
    expect([...tsRules].sort()).toEqual([...sqlRules].sort())
  })

  it('the owner approve and ask-for-edits functions check preview_ready in the database too', () => {
    const approve = MIGRATION.slice(MIGRATION.indexOf('function public.portal_approve_change_request'))
    expect(approve.slice(0, 1200)).toContain("v_status <> 'preview_ready'")
    const edits = MIGRATION.slice(MIGRATION.indexOf('function public.portal_ask_for_change_edits'))
    expect(edits.slice(0, 1200)).toContain("v_status <> 'preview_ready'")
  })
})
