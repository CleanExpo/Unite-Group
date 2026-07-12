import { buildAutonomousLoopReadiness } from '../autonomous-loop-readiness'

describe('buildAutonomousLoopReadiness', () => {
  it('remains retired even when every legacy credential and arming value is present', () => {
    const payload = buildAutonomousLoopReadiness({
      env: {
        LINEAR_API_KEY: 'sentinel-linear-secret',
        MISSION_CONTROL_RUNNER_CMD: 'sentinel-agent-command',
        MISSION_CONTROL_PUSH: '1',
        MISSION_CONTROL_COMPLETE_ON_SUCCESS: '1',
      },
      root: '/sentinel/repository',
      now: new Date('2026-07-12T00:00:00.000Z'),
    })

    expect(payload).toEqual({
      source: 'mission-control:autonomous-loop-readiness',
      generatedAt: '2026-07-12T00:00:00.000Z',
      overall: 'retired',
      checks: [
        {
          id: 'crm-authority',
          label: 'Execution authority',
          state: 'retired',
          detail: 'The Linear claim/author/push loop is retired. CRM cc_tasks and bounded OWNEST receipts are authoritative.',
          required: false,
        },
      ],
      nextAction: 'Use the CRM OWNEST canary runbook; an environment variable cannot reactivate this loop.',
    })
    expect(JSON.stringify(payload)).not.toMatch(/sentinel/)
  })
})
