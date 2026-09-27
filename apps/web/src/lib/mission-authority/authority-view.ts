// src/lib/mission-authority/authority-view.ts
//
// UNI-2779 — what Mission Control shows about a mission's authority: where it
// is, what it does next, and whether it continues on its own or stopped for the
// founder. Pure: built from the stored continuation and the same nextStep()
// verdict the runner gets, so the panel can never disagree with the runner.
// A missing or unreadable continuation is reported as such, never filled in.

import policy from '../../../../../scripts/nexus-runner/mission-authority.json'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import { nextStep, readContinuation } from './continuation'
import type { MissionAuthority } from './may'

interface ViewBase {
  taskId: string
  /** Linear issue or external reference, when the task carries one. */
  missionRef: string | null
}

export type AuthorityDecisionView =
  | { continuing: true; why: string }
  | { continuing: false; stoppedAt: string; why: string; founderPacket: string | null }

export type MissionAuthorityView =
  | (ViewBase & { state: 'none' })
  | (ViewBase & { state: 'invalid'; error: string })
  | (ViewBase & {
      state: 'ok'
      missionId: string
      phase: string
      status: string
      nextAction: string
      /** BUILD_CONTINUE / SAFE_RELEASE / PROTECTED_RELEASE / NO_AUTHORITY / HALTED. */
      authority: string
      decision: AuthorityDecisionView
      updatedAt: string
    })

const ACTION_CLASSES: Record<string, string> = policy.action_classes

export function buildMissionAuthorityView(
  task: Pick<CommandCentreTask, 'id' | 'linear_id' | 'external_ref' | 'risk_level' | 'metadata'>,
  authority: MissionAuthority | null,
  now: number,
  gates: Record<string, boolean> = {},
): MissionAuthorityView {
  const base: ViewBase = { taskId: task.id, missionRef: task.linear_id ?? task.external_ref ?? null }
  const stored = readContinuation(task)
  if (stored.state === 'none') return { ...base, state: 'none' }
  if (stored.state === 'invalid') return { ...base, state: 'invalid', error: stored.error }

  const continuation = stored.continuation
  const step = nextStep(continuation, authority, gates, now, task.risk_level)
  const decision: AuthorityDecisionView = step.execute
    ? { continuing: true, why: step.reason }
    : { continuing: false, stoppedAt: continuation.next_action, why: step.reason, founderPacket: step.founderPacket ?? null }
  return {
    ...base,
    state: 'ok',
    missionId: continuation.mission_id,
    phase: continuation.phase,
    status: continuation.status,
    nextAction: continuation.next_action,
    authority: step.execute ? ACTION_CLASSES[step.action] : step.boundary,
    decision,
    updatedAt: continuation.updated_at,
  }
}
