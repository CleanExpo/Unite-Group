import { describe, expect, it } from 'vitest'
import { sortEngagements } from '../sort'

describe('sortEngagements', () => {
  it('sorts business then client names with the en-AU collator without mutating input', () => {
    const rows = [
      { business_name: 'Zenith', client_name: 'Zoe' },
      { business_name: 'apex', client_name: 'Brett' },
      { business_name: 'Apex', client_name: 'Anna' },
    ]
    const sorted = sortEngagements(rows)
    expect(sorted.map((row) => `${row.business_name}-${row.client_name}`)).toEqual([
      'Apex-Anna', 'apex-Brett', 'Zenith-Zoe',
    ])
    expect(rows[0].business_name).toBe('Zenith')
  })
})
