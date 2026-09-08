import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTROL } from '../../../../scripts/coaching-extraction-check'

describe('coaching extraction acceptance fixture path', () => {
  it('decodes file URLs before reading a fixture from a path containing spaces', () => {
    expect(CONTROL).not.toContain('%20')
    expect(existsSync(CONTROL)).toBe(true)
  })
})
