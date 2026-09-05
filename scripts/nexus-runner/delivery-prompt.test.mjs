import test from 'node:test'
import assert from 'node:assert/strict'
import { taskPrompt, parseOutcome, assertDeliveryRepository } from './runner.mjs'

test('frozen delivery payload carries exact specification and role duties', () => {
  const approvedDelivery = {
    revision: 4, fingerprint: 'frozen-fingerprint',
    spec: { requirements: ['Make customer bookings editable'], acceptanceCriteria: ['Saved changes persist after reload'], allowedScope: ['apps/web'] },
    roster: [{ role: 'SPM', deliverable: 'Retain ownership through live acceptance' }],
  }
  const prompt = taskPrompt({
    title: 'Booking workflow', objective: 'older title-only objective',
    metadata: { delivery: { schemaVersion: 1, kind: 'software_delivery' } }, approvedDelivery,
  })
  assert.ok(prompt.includes(JSON.stringify(approvedDelivery)))
  assert.ok(prompt.includes('does not mean delivered'))
  assert.ok(prompt.includes('never deploy'))
  assert.ok(prompt.includes('build-SPM responsibility'))
  assert.ok(prompt.includes('branch_preview_only'))
})

test('marked delivery cannot fall back to executing its title without frozen consent', () => {
  assert.throws(() => taskPrompt({
    title: 'A changed idea', metadata: { delivery: { kind: 'software_delivery' } },
  }), /approved delivery/i)
  assert.throws(() => taskPrompt({ title: 'Damaged saved mission', external_ref: 'delivery:request-1', metadata: {} }), /approved delivery/i)
})

test('legacy task retains the existing title/objective execution path', () => {
  const prompt = taskPrompt({ title: 'Research', objective: 'Compare existing options' })
  assert.ok(prompt.includes('Compare existing options'))
})

test('delivery requires the actual checkout to match the approved canonical repository', () => {
  const task = { approvedDelivery: { repository: 'CleanExpo/Unite-Group' } }
  assert.doesNotThrow(() => assertDeliveryRepository(task, () => 'https://github.com/CleanExpo/Unite-Group.git'))
  assert.doesNotThrow(() => assertDeliveryRepository(task, () => 'git@github.com:CleanExpo/Unite-Group.git'))
  assert.throws(() => assertDeliveryRepository(task, () => 'https://github.com/CleanExpo/Other.git'), /target unavailable/)
  assert.throws(() => assertDeliveryRepository(task, () => ''), /target unavailable/)
  assert.throws(() => assertDeliveryRepository({ approvedDelivery: {} }, () => 'https://github.com/CleanExpo/Unite-Group.git'), /target unavailable/)
})

test('only a final valid GitHub PR marker yields a review handoff', () => {
  assert.equal(parseOutcome('PR_URL: https://github.com/CleanExpo/Unite-Group/pull/12\nRUNNER_FAILED: checks_failed').kind, 'failed')
  assert.equal(parseOutcome('PR_URL: javascript:alert(1)').kind, 'failed')
  assert.equal(parseOutcome('PR_URL: https://github.com.evil.test/CleanExpo/Unite-Group/pull/12').kind, 'failed')
  assert.equal(parseOutcome('PR_URL: https://github.com/CleanExpo/Unite-Group/pull/12').kind, 'done')
})
