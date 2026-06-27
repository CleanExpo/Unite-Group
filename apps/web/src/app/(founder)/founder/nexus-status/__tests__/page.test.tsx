import { describe, expect, it, vi, beforeEach } from 'vitest'

const redirect = vi.fn()
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => redirect(...a) }))

import NexusStatusPage from '../page'

describe('NexusStatusPage (deprecated draft stub)', () => {
  beforeEach(() => redirect.mockClear())

  it('redirects to the canonical command centre', () => {
    NexusStatusPage()
    expect(redirect).toHaveBeenCalledWith('/founder/command-centre')
  })
})
