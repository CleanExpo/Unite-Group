export type LoopReadinessState = 'retired'

export interface LoopReadinessCheck {
  id: string
  label: string
  state: LoopReadinessState
  detail: string
  required: boolean
}

export interface LoopReadinessPayload {
  source: string
  generatedAt: string
  overall: LoopReadinessState
  checks: LoopReadinessCheck[]
  nextAction: string
}

/**
 * Permanent status contract for the old Linear-authoritative executor.
 * Configuration and credentials cannot make this surface ready again.
 */
export function buildAutonomousLoopReadiness(args?: {
  env?: NodeJS.ProcessEnv
  root?: string
  now?: Date
}): LoopReadinessPayload {
  return {
    source: 'mission-control:autonomous-loop-readiness',
    generatedAt: (args?.now ?? new Date()).toISOString(),
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
  }
}
