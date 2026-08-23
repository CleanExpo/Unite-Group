import { describe, expect, it } from 'vitest'
import { buildSynthexOptimisationStandard } from '../optimisation-standard'

describe('Synthex optimisation standard', () => {
  it.each([
    ['ccw', 'Product'],
    ['carsi', 'Course'],
    ['restore', 'SoftwareApplication'],
  ])('uses the correct schema for %s', (businessKey, schema) => {
    const standard = buildSynthexOptimisationStandard(businessKey)
    expect(standard.schemaTypes).toContain(schema)
    expect(standard.schemaTypes).toContain('Organization')
  })

  it('does not invent a GEO schema type', () => {
    expect(buildSynthexOptimisationStandard('ccw').schemaTypes).not.toContain('GEO')
  })
})
