import { describe, it, expect } from 'vitest'
import { buildReviewPatch, isEdited, NotReviewableError, type ReviewableExtraction } from '../review'

const NOW = new Date('2026-09-08T01:00:00.000Z')

function row(over: Partial<ReviewableExtraction> = {}): ReviewableExtraction {
  return {
    id: 'e1',
    status: 'proposed',
    body: 'Draft SOPs by hand for each scenario',
    original_body: null,
    ...over,
  }
}

describe('buildReviewPatch', () => {
  it('approves unchanged text without writing a correction', () => {
    const patch = buildReviewPatch(row(), 'approve', undefined, NOW)
    expect(patch.status).toBe('approved')
    expect(patch.reviewed_at).toBe(NOW.toISOString())
    // The whole value of the eval dataset depends on this staying absent.
    expect(patch.original_body).toBeUndefined()
    expect(patch.body).toBeUndefined()
  })

  it('treats text echoed back identically as unchanged', () => {
    const r = row()
    const patch = buildReviewPatch(r, 'approve', r.body, NOW)
    expect(patch.original_body).toBeUndefined()
  })

  it('does not count whitespace-only differences as an edit', () => {
    const r = row()
    const patch = buildReviewPatch(r, 'approve', `  ${r.body}  `, NOW)
    expect(patch.original_body).toBeUndefined()
    expect(patch.body).toBeUndefined()
  })

  it('logs the model text when the founder genuinely edits', () => {
    const r = row()
    const patch = buildReviewPatch(r, 'approve', 'Draft SOPs for water damage only', NOW)
    expect(patch.status).toBe('approved')
    expect(patch.body).toBe('Draft SOPs for water damage only')
    expect(patch.original_body).toBe(r.body)
  })

  it('NEVER overwrites an original_body that is already set', () => {
    const r = row({ body: 'first correction', original_body: 'what the model said' })
    const patch = buildReviewPatch(r, 'approve', 'second correction', NOW)
    // The model's first attempt is the thing being measured, not the last edit.
    expect(patch.original_body).toBe('what the model said')
    expect(patch.body).toBe('second correction')
  })

  it('rejects without discarding the body', () => {
    const patch = buildReviewPatch(row(), 'reject', undefined, NOW)
    expect(patch.status).toBe('rejected')
    expect(patch.body).toBeUndefined()
    expect(patch.original_body).toBeUndefined()
  })

  it('refuses to approve an empty body', () => {
    expect(() => buildReviewPatch(row(), 'approve', '   ', NOW)).toThrow(/empty body/)
  })

  it.each(['approved', 'rejected', 'superseded', 'done'])(
    'refuses to re-review a %s row',
    (status) => {
      expect(() => buildReviewPatch(row({ status }), 'approve', undefined, NOW))
        .toThrow(NotReviewableError)
    },
  )
})

describe('isEdited', () => {
  it('is false for identical and whitespace-padded text', () => {
    const r = row()
    expect(isEdited(r, r.body)).toBe(false)
    expect(isEdited(r, `\n${r.body}\t`)).toBe(false)
  })

  it('is true for any real change', () => {
    expect(isEdited(row(), 'something else')).toBe(true)
  })
})
