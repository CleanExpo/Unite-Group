import { describe, expect, it, vi, beforeEach } from 'vitest'

const redirect = vi.fn()
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => redirect(...a) }))

import DashboardPage from '../page'

describe('DashboardPage (retired surface stub · UNI-2306)', () => {
  beforeEach(() => redirect.mockClear())

  it('redirects to the canonical command centre', () => {
    DashboardPage()
    expect(redirect).toHaveBeenCalledWith('/founder/command-centre')
  })
})
