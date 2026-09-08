import { describe, expect, it } from 'vitest'
import { appendBriefLine, previewPrompt } from './command-center-screen'

describe('appendBriefLine', () => {
  it('adds a new line when the draft is empty', () => {
    expect(appendBriefLine('', 'Outcome: ship one clear brief')).toBe(
      'Outcome: ship one clear brief',
    )
  })

  it('keeps existing lines and avoids duplicates', () => {
    expect(
      appendBriefLine(
        'Outcome: ship one clear brief\nAudience: owners',
        'Audience: owners',
      ),
    ).toBe('Outcome: ship one clear brief\nAudience: owners')
  })

  it('trims whitespace before appending', () => {
    expect(appendBriefLine('Outcome: ship one clear brief', '  Evidence:  ')).toBe(
      'Outcome: ship one clear brief\nEvidence:',
    )
  })
})

describe('previewPrompt', () => {
  it('compacts repeated whitespace', () => {
    expect(previewPrompt('Read   the    brief\nthen act.')).toBe(
      'Read the brief then act.',
    )
  })

  it('truncates long prompts with an ellipsis', () => {
    expect(
      previewPrompt(
        'Read the canonical 2nd Brain and Mission Control status, then produce a concise founder decision card with evidence paths.',
        60,
      ),
    ).toBe(
      'Read the canonical 2nd Brain and Mission Control status, th…',
    )
  })
})
