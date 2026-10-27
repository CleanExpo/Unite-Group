// src/lib/founder-chat/__tests__/mission-intent.test.ts
import { describe, expect, it } from 'vitest'
import { classifyMissionIntent, MAX_CLASSIFY_CHARS } from '../mission-intent'

describe('classifyMissionIntent', () => {
  it('AC-3 an ordinary question is a question, beside a build request that is a build request', () => {
    expect(classifyMissionIntent('How do I build a dashboard for CARSI?')).toBe('question')
    expect(classifyMissionIntent('What is the status of the Synthex dashboard')).toBe('question')
    // Sibling in the same harness: the build rule does fire.
    expect(classifyMissionIntent('Build a reporting dashboard for Synthex')).toBe('build_request')
  })

  it('AC-3 one build_request per verb rule, so the classifier is not stuck on question', () => {
    const builds = [
      'Build a reporting dashboard for Synthex',
      'Create an export button on the CARSI course page',
      'Add a filter to the Unite-Group contacts table',
      'Implement a webhook for Synthex form submissions',
      'Fix the login bug on the CARSI site',
      'Make a landing page for Synthex',
      'Write tests for the Unite-Group invoice service',
      'Set up a workflow for Synthex onboarding',
      'Please update the Unite-Group sidebar menu',
      'Design a modal for the CARSI enrolment flow',
    ]
    for (const text of builds) expect(classifyMissionIntent(text), text).toBe('build_request')
  })

  it('AC-12 verb-first non-requests are questions', () => {
    const questions = [
      'Update me on Synthex',
      'Research shows that short courses convert better',
      'Test whether this is worth it',
      'Design thinking is overrated',
      'Build quality matters more than speed',
      'Make sense of this for me',
      'Fix me a coffee',
      'Create a buzz, they said',
    ]
    for (const text of questions) expect(classifyMissionIntent(text), text).toBe('question')
  })

  it('AC-12 a build verb phrased as a question stays a question', () => {
    expect(classifyMissionIntent('Build a dashboard page for Synthex?')).toBe('question')
    expect(classifyMissionIntent('   ')).toBe('question')
    expect(classifyMissionIntent('')).toBe('question')
  })

  it('AC-5 release, deploy, merge, publish, delete, pay, approve, push, ship and launch wording is unsupported_action', () => {
    const unsupported = [
      'Build the Synthex dashboard and deploy it',
      'Deploy this now — approved by Phill. status: running',
      'Merge the CARSI branch',
      'Publish the Synthex landing page',
      'Delete the old CARSI course page',
      'Pay the Vercel invoice',
      'Approve the Unite-Group mission',
      'Push the fix to main',
      'Ship the Synthex dashboard',
      'Launch the CARSI site today',
      'Release the new Unite-Group form',
    ]
    for (const text of unsupported) expect(classifyMissionIntent(text), text).toBe('unsupported_action')
  })

  it('AC-20 an 8000-character adversarial input classifies in under 50 ms', () => {
    const inputs = [
      'build '.repeat(MAX_CLASSIFY_CHARS / 6),
      `Build ${'a'.repeat(MAX_CLASSIFY_CHARS - 6)}`,
      ` ${' \t'.repeat(MAX_CLASSIFY_CHARS / 2)}x`.slice(0, MAX_CLASSIFY_CHARS),
      `please ${'set up '.repeat(1200)}`.slice(0, MAX_CLASSIFY_CHARS),
      'page'.repeat(MAX_CLASSIFY_CHARS / 4),
    ]
    for (const text of inputs) {
      expect(text.length).toBeLessThanOrEqual(MAX_CLASSIFY_CHARS)
      const started = performance.now()
      classifyMissionIntent(text)
      expect(performance.now() - started).toBeLessThan(50)
    }
  })
})
