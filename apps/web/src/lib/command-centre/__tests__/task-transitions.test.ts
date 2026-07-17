import { describe, it, expect } from 'vitest'
import { isLegalTransition, TASK_STATUSES } from '../task-transitions'

describe('isLegalTransition — governance boundary (UNI-2417)', () => {
  describe('approval actor', () => {
    it('allows the approval promotion edge awaiting_approval → queued', () => {
      expect(isLegalTransition('awaiting_approval', 'queued', 'approval')).toBe(true)
    })

    it('allows proposed → queued (a proposed task approved directly)', () => {
      expect(isLegalTransition('proposed', 'queued', 'approval')).toBe(true)
    })

    it('allows reject → failed and defer → blocked', () => {
      expect(isLegalTransition('awaiting_approval', 'failed', 'approval')).toBe(true)
      expect(isLegalTransition('awaiting_approval', 'blocked', 'approval')).toBe(true)
    })
  })

  describe('founder direct-PATCH actor — must not bypass governance', () => {
    it('DENIES proposed → queued', () => {
      expect(isLegalTransition('proposed', 'queued')).toBe(false)
      expect(isLegalTransition('proposed', 'queued', 'founder')).toBe(false)
    })

    it('DENIES awaiting_approval → queued', () => {
      expect(isLegalTransition('awaiting_approval', 'queued')).toBe(false)
    })

    it('DENIES awaiting_approval → running', () => {
      expect(isLegalTransition('awaiting_approval', 'running')).toBe(false)
    })

    it('DENIES proposed → running', () => {
      expect(isLegalTransition('proposed', 'running')).toBe(false)
    })

    it('never allows any founder edge to promote into queued or running', () => {
      for (const from of TASK_STATUSES) {
        // Same-state is a legal no-op, not a promotion — exclude it.
        if (from !== 'queued') expect(isLegalTransition(from, 'queued', 'founder')).toBe(false)
        if (from !== 'running') expect(isLegalTransition(from, 'running', 'founder')).toBe(false)
      }
    })

    it('allows benign edits: submit-for-approval, park, unblock, cancel, retry', () => {
      expect(isLegalTransition('proposed', 'awaiting_approval')).toBe(true)
      expect(isLegalTransition('proposed', 'blocked')).toBe(true)
      expect(isLegalTransition('blocked', 'proposed')).toBe(true)
      expect(isLegalTransition('queued', 'blocked')).toBe(true)
      expect(isLegalTransition('queued', 'failed')).toBe(true)
      expect(isLegalTransition('running', 'done')).toBe(true)
      expect(isLegalTransition('failed', 'proposed')).toBe(true)
    })
  })

  describe('runner actor', () => {
    it('allows queued → running and running → done/failed/queued', () => {
      expect(isLegalTransition('queued', 'running', 'runner')).toBe(true)
      expect(isLegalTransition('running', 'done', 'runner')).toBe(true)
      expect(isLegalTransition('running', 'failed', 'runner')).toBe(true)
      expect(isLegalTransition('running', 'queued', 'runner')).toBe(true)
    })
  })

  describe('default-deny', () => {
    it('treats a same-state transition as a legal no-op', () => {
      expect(isLegalTransition('queued', 'queued', 'founder')).toBe(true)
      expect(isLegalTransition('running', 'running', 'runner')).toBe(true)
    })

    it('denies unknown / non-string states', () => {
      expect(isLegalTransition('bogus', 'queued', 'approval')).toBe(false)
      expect(isLegalTransition('proposed', 'nonsense')).toBe(false)
      expect(isLegalTransition(undefined, 'queued')).toBe(false)
      expect(isLegalTransition('proposed', null)).toBe(false)
    })

    it('denies a done → anything edit (terminal) for the founder', () => {
      expect(isLegalTransition('done', 'proposed')).toBe(false)
      expect(isLegalTransition('done', 'queued')).toBe(false)
    })
  })
})
