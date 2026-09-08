import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BusinessHubPage from '@/app/(founder)/founder/[businessKey]/page'

const { loadXeroTokens } = vi.hoisted(() => ({
  loadXeroTokens: vi.fn(),
}))

vi.mock('@/lib/integrations/xero', () => ({ loadXeroTokens }))
vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'founder-id' }),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

function queryResult(data: unknown = [], count: number | null = 0) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'business-id' }, error: null })),
    then: (resolve: (value: { data: unknown; count: number | null }) => unknown) =>
      Promise.resolve({ data, count }).then(resolve),
  }
  return chain
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => table === 'businesses'
      ? queryResult()
      : table === 'nexus_pages'
        ? queryResult([])
        : queryResult([]),
  }),
}))

describe('business hub Xero status', () => {
  beforeEach(() => {
    loadXeroTokens.mockReset()
  })

  it('does not show Connected when a matching vault row cannot be decrypted', async () => {
    loadXeroTokens.mockResolvedValue(null)

    render(await BusinessHubPage({ params: Promise.resolve({ businessKey: 'dr' }) }))

    expect(screen.getByText('Not connected')).toBeInTheDocument()
    expect(screen.queryByText('Connected')).not.toBeInTheDocument()
    expect(loadXeroTokens).toHaveBeenCalledWith('founder-id', 'dr')
  })
})
