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

  it('AC-12 a build verb aimed at the founder, not at a piece of work, is a question', () => {
    const questions = [
      'Update me on the Synthex dashboard',
      'Write me a summary of the report',
      'Make sense of this list',
      'Fix my understanding of the API',
      'Update us on the CARSI landing page',
    ]
    for (const text of questions) expect(classifyMissionIntent(text), text).toBe('question')
    // Siblings: the work noun close behind the verb still makes a build request.
    for (const text of [
      'Build the RestoreAssist inspection view and verify it',
      'Add a new monthly revenue chart to the Synthex dashboard',
      'Build a payment page for CARSI',
      'Build an approval screen for Unite-Group',
    ]) {
      expect(classifyMissionIntent(text), text).toBe('build_request')
    }
  })

  it('AC-3 a question that mentions a protected action word is still a question', () => {
    const questions = [
      'Did the Synthex deploy finish?',
      'Did the deploy finish?',
      "What's the payment status?",
      'When was the last CARSI release?',
      'Has the approval come through for Unite-Group?',
      'Is the merge done',
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
      'Deploy this now',
      'Go live with RestoreAssist',
      'Migrate the database',
      'Roll back the release',
      'Rollback the Synthex deploy',
      'Send the invoice email',
      'Promote the preview to production',
      'Execute the cleanup script',
      'Drop the old CARSI table',
      'Run the migration in production',
      'Please deploy the Synthex dashboard',
      'Build the CARSI landing page, then publish it',
    ]
    for (const text of unsupported) expect(classifyMissionIntent(text), text).toBe('unsupported_action')
  })

  it('AC-5 a protected verb disguised by hyphens, punctuation or spacing is unsupported_action; derived nouns stay builds', () => {
    for (const text of [
      'Build a reporting dashboard for Synthex and go-live with it',
      'Build a reporting dashboard for Synthex and roll-back the deployment',
      'Build a reporting dashboard for Synthex and de\u2019ploy it',
      'Build a reporting dashboard for Synthex and de\u2014ploy it',
      'Build a reporting dashboard for Synthex and de\u2026ploy it',
      "Build a reporting dashboard for Synthex and de'ploy it",
      'Build a reporting dashboard for Synthex and de-ploy it',
      'Build a reporting dashboard for Synthex and d e p l o y it',
      'Build a reporting dashboard for Synthex and de_ploy it',
      'Build a reporting dashboard for Synthex and re-lease it',
      'Build a reporting dashboard for Synthex and p.u.s.h it live',
    ]) {
      expect(classifyMissionIntent(text), JSON.stringify(text)).toBe('unsupported_action')
    }
    for (const text of [
      'Build a payment page for CARSI',
      'Build an approval screen for Unite-Group',
      'Build a deployment report page for Synthex',
      'Build a sign-up form for CARSI',
    ]) {
      expect(classifyMissionIntent(text), text).toBe('build_request')
    }
  })

  it('AC-5 a build request carrying any non-ASCII character after normalisation is unsupported_action', () => {
    for (const text of [
      'Build a reporting dashboard for Synthex. de\u00ADploy it',
      'Build a reporting dashboard for Synthex. de\u034Fploy it',
      'Build a reporting dashboard for Synthex. d\u0435ploy it',
      'Build a reporting dashboard for Synthex. depl\u03BFy it',
      'Build a reporting dashboard for Synthex. de\u0301ploy it',
      'Build a reporting dashboard for Synthex \u{1F680}',
    ]) {
      expect(classifyMissionIntent(text), JSON.stringify(text)).toBe('unsupported_action')
    }
    // Siblings: typographic punctuation maps to ASCII, so these stay build requests.
    for (const text of [
      'Build the \u201CQuick Quote\u201D page for CARSI',
      'Build Phill\u2019s reporting dashboard for Synthex',
      'Build a reporting dashboard for Synthex \u2014 monthly view',
      'Build a reporting dashboard for Synthex \u2013 weekly\u2026',
      'Build a\u00A0reporting dashboard for Synthex',
    ]) {
      expect(classifyMissionIntent(text), JSON.stringify(text)).toBe('build_request')
    }
    // A non-ASCII question is still a question.
    expect(classifyMissionIntent('Did the d\u0435ploy finish?')).toBe('question')
  })

  it('AC-5 fullwidth or zero-width-split protected words are still unsupported_action', () => {
    for (const text of [
      'Build a reporting dashboard for Synthex. \uFF24\uFF45\uFF50\uFF4C\uFF4F\uFF59 it',
      'Build a reporting dashboard for Synthex. De\u200Bploy it',
      'Build a reporting dashboard for Synthex and re\u2060lease it',
      '\uFF24\uFF45\uFF50\uFF4C\uFF4F\uFF59 the Synthex dashboard',
      'Build a reporting dashboard for Synthex and pu\uFEFFsh it',
    ]) {
      expect(classifyMissionIntent(text), JSON.stringify(text)).toBe('unsupported_action')
    }
    // Sibling: a fullwidth build request without a protected word is still a build request.
    expect(classifyMissionIntent('\uFF22uild a reporting dashboard for Synthex')).toBe('build_request')
  })

  it('AC-5 a build request naming a protected action ANYWHERE is unsupported_action; derived nouns are not', () => {
    for (const text of [
      'Build a dashboard for Synthex. Deploy it',
      'Build a dashboard for Synthex to deploy it',
      'Build a dashboard for Synthex, then please deploy it',
      'Build a dashboard for Synthex and deploy it',
      'Build the Synthex dashboard; release it tomorrow',
      'Build the Synthex dashboard so we can ship it',
      'Build the Synthex dashboard and get it deployed',
    ]) {
      expect(classifyMissionIntent(text), text).toBe('unsupported_action')
    }
    for (const text of ['Build a payment page for CARSI', 'Build an approval screen for Unite-Group', 'Build a deployment report page for Synthex']) {
      expect(classifyMissionIntent(text), text).toBe('build_request')
    }
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
