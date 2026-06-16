import { describe, expect, it } from 'vitest'
import { buildLiveAgentOperations } from '../live-agent-operations'
import type { CommandCentreTask } from '../tasks'
import type { ExecutionSession } from '../sessions'

const baseTask: CommandCentreTask = {
  id: 'task-1',
  founder_id: 'founder-1',
  external_ref: null,
  queue_id: null,
  project_id: null,
  project_key: 'unite_group',
  title: 'Build Live Agent Operations Map',
  objective: 'Make active work visible.',
  priority: 'P1',
  status: 'running',
  agent_owner: 'Hermes',
  risk_level: 'medium',
  execution_mode: 'local-code',
  origin: 'idea',
  dependencies: [],
  human_approval_required: false,
  evidence_path: null,
  validation_required: [],
  linear_id: 'UNI-2152',
  preview_url: null,
  metadata: {},
  created_at: '2026-06-16T08:00:00.000Z',
  updated_at: '2026-06-16T08:10:00.000Z',
}

const baseSession: ExecutionSession = {
  id: 'session-1',
  founder_id: 'founder-1',
  task_id: 'task-1',
  surface: 'claude-code',
  status: 'running',
  logs_ref: null,
  started_at: '2026-06-16T08:05:00.000Z',
  ended_at: null,
}

describe('buildLiveAgentOperations', () => {
  it('summarises active agents, queued work, and next action', () => {
    const payload = buildLiveAgentOperations(
      [
        baseTask,
        {
          ...baseTask,
          id: 'task-2',
          title: 'Ship provider usage cockpit',
          status: 'done',
          agent_owner: 'Pi-CEO',
          evidence_path: 'docs/evidence/provider-cockpit.md',
          updated_at: '2026-06-16T08:20:00.000Z',
        },
      ],
      [
        baseSession,
        {
          ...baseSession,
          id: 'session-2',
          task_id: 'task-2',
          surface: 'codex',
          status: 'done',
          ended_at: '2026-06-16T08:21:00.000Z',
        },
      ],
      new Date('2026-06-16T08:30:00.000Z'),
    )

    expect(payload.summary).toEqual({
      agents: 1,
      activeSessions: 1,
      openTasks: 1,
      blockedTasks: 0,
      approvalRequired: 0,
      recentShips: 1,
    })
    expect(payload.nodes[0]).toMatchObject({
      label: 'Hermes',
      state: 'working',
      activeSessions: 1,
      openTasks: 1,
      surfaces: ['claude-code'],
    })
    expect(payload.workQueue[0]).toMatchObject({
      id: 'UNI-2152',
      title: 'Build Live Agent Operations Map',
      state: 'running',
    })
    expect(payload.shipFeed[0]).toMatchObject({
      title: 'Ship provider usage cockpit',
      surface: 'codex',
    })
    expect(payload.nextAction).toBe('Monitor active sessions through evidence, validation, and completion.')
  })

  it('prioritises blocked work over normal queue guidance', () => {
    const payload = buildLiveAgentOperations(
      [
        {
          ...baseTask,
          status: 'blocked',
          human_approval_required: true,
        },
      ],
      [],
      new Date('2026-06-16T08:30:00.000Z'),
    )

    expect(payload.summary.blockedTasks).toBe(1)
    expect(payload.summary.approvalRequired).toBe(1)
    expect(payload.nodes[0].state).toBe('blocked')
    expect(payload.nextAction).toBe('Clear 1 blocked or failed command task.')
  })
})
