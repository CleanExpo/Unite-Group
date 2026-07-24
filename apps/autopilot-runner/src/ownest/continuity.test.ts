import { expect, it } from 'vitest'
import { buildMissionContract } from './policy.js'
import type { CcTask, IntegrityNonce } from './types.js'

const SOURCE_COMMIT = '0123456789abcdef0123456789abcdef01234567'
const CHANGED_SOURCE_COMMIT = '89abcdef0123456789abcdef0123456789abcdef'
const INTEGRITY_NONCE = '000102030405060708090a0b0c0d0e0f'.repeat(2) as IntegrityNonce

type ContinuityTask = Omit<CcTask, 'metadata'> & {
  metadata: {
    continuity: {
      baseCommit: string
    }
  }
}

function task(baseCommit: string): ContinuityTask {
  return {
    id: 'task-continuity-1',
    founder_id: 'founder-1',
    title: 'Prepare a continuity-safe implementation',
    objective: 'Produce a candidate that can be independently verified.',
    priority: 'P1',
    status: 'queued',
    agent_owner: 'Hermes',
    risk_level: 'medium',
    execution_mode: 'branch-preview',
    dependencies: [],
    human_approval_required: false,
    validation_required: ['Bind all work and evidence to the admitted source commit'],
    metadata: {
      continuity: {
        baseCommit,
      },
    },
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
  }
}

it('binds the mission integrity digest to the admitted source commit', () => {
  const mission = buildMissionContract(
    task(SOURCE_COMMIT),
    'attempt-continuity-1',
    'rollout-continuity-1',
    INTEGRITY_NONCE,
    'ownest',
    'unite-group-ownest',
  )
  const changedSourceMission = buildMissionContract(
    task(CHANGED_SOURCE_COMMIT),
    'attempt-continuity-1',
    'rollout-continuity-1',
    INTEGRITY_NONCE,
    'ownest',
    'unite-group-ownest',
  )

  expect(mission.missionDigest).not.toBe(changedSourceMission.missionDigest)
})

it('rejects a missing continuity base commit', () => {
  expect(() =>
    buildMissionContract(
      {
        ...task(SOURCE_COMMIT),
        metadata: {
          continuity: {},
        },
      },
      'attempt-continuity-1',
      'rollout-continuity-1',
      INTEGRITY_NONCE,
      'ownest',
      'unite-group-ownest',
    ),
  ).toThrow(/continuity base commit/)
})

it('rejects an uppercase continuity base commit', () => {
  expect(() =>
    buildMissionContract(
      task(SOURCE_COMMIT.toUpperCase()),
      'attempt-continuity-1',
      'rollout-continuity-1',
      INTEGRITY_NONCE,
      'ownest',
      'unite-group-ownest',
    ),
  ).toThrow(/continuity base commit/)
})
