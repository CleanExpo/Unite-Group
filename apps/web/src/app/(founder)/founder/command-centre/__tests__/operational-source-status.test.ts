import { describe, expect, it } from 'vitest'
import { getOperationalSourceStatus } from '../operational-source-status'

describe('getOperationalSourceStatus', () => {
  it('reports only the two operational reads it actually evaluates', () => {
    expect(
      getOperationalSourceStatus({ read_error: null }, { read_error: null }),
    ).toEqual({
      queueUnavailable: false,
      blockersUnavailable: false,
      unavailable: false,
      label: 'Queue and lane reads available',
    })
  })

  it.each([
    ['queue', 'queue failed', null],
    ['lane', null, 'lane failed'],
    ['both', 'queue failed', 'lane failed'],
  ])('fails closed when the %s read is unavailable', (_name, queueError, laneError) => {
    expect(
      getOperationalSourceStatus(
        { read_error: queueError },
        { read_error: laneError },
      ),
    ).toMatchObject({
      unavailable: true,
      label: 'Queue or lane read unavailable',
    })
  })
})
