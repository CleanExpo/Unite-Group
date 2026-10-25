import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

let user: unknown = { id: 'f1', email: 'phill@example.com' }
let allowed = true
let configured = true
const rpcCalls: string[] = []
let rpcImpl: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>

vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(async () => user) }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => allowed) }))
vi.mock('@/lib/supabase/service', () => ({
  hasSupabaseServiceConfig: vi.fn(() => configured),
  createServiceClient: vi.fn(() => ({
    rpc: (fn: string) => {
      rpcCalls.push(fn)
      return rpcImpl(fn)
    },
  })),
}))

import Page from '../page'
import { __resetPurgeThrottleForTests } from '@/lib/analytics/site-events-retention'

async function renderPage(days?: string) {
  const ui = await Page({ searchParams: Promise.resolve(days ? { days } : {}) })
  return render(ui)
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane' }).format(new Date())

beforeEach(() => {
  cleanup()
  rpcCalls.length = 0
  __resetPurgeThrottleForTests()
  user = { id: 'f1', email: 'phill@example.com' }
  allowed = true
  configured = true
  rpcImpl = async () => ({ data: [], error: null })
})

describe('founder site analytics page', () => {
  it('renders "No events yet" when the read succeeded and there is nothing', async () => {
    await renderPage()
    expect(screen.getByText('No events yet')).toBeTruthy()
    expect(document.querySelector('[data-state="error"]')).toBeNull()
  })

  it('runs the 13-month retention purge on load', async () => {
    await renderPage()
    expect(rpcCalls).toContain('site_events_purge')
  })

  it('renders an error state, not zeros, when the query fails', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'relation "site_events" does not exist' } })
    await renderPage()
    expect(screen.getByRole('alert').textContent).toContain('Could not load site analytics')
    expect(screen.getByRole('alert').textContent).toContain('not zero')
    expect(screen.queryByText('No events yet')).toBeNull()
    expect(document.querySelector('[data-state="ok"]')).toBeNull()
  })

  it('renders an error state when the service database is not configured', async () => {
    configured = false
    await renderPage()
    expect(screen.getByRole('alert').textContent).toContain('not configured')
  })

  it('renders tables and the chart when there is data', async () => {
    rpcImpl = async (fn) =>
      fn === 'site_events_daily'
        ? { data: [{ day: today, event_type: 'page_view', events: '5' }], error: null }
        : {
            data: [
              { dimension: 'page', key: '/cards', event_type: 'page_view', events: 5 },
              { dimension: 'cta', key: 'cards-hero-get-card', event_type: 'cta_click', events: 2 },
              { dimension: 'video', key: 'edition-a', event_type: 'video_play', events: 4 },
              { dimension: 'video', key: 'edition-a', event_type: 'video_complete', events: 1 },
              { dimension: 'referrer', key: 'google.com', event_type: 'page_view', events: 3 },
              { dimension: 'device', key: 'mobile', event_type: 'page_view', events: 5 },
            ],
            error: null,
          }
    await renderPage('30')
    expect(document.querySelector('[data-state="ok"]')).toBeTruthy()
    expect(document.querySelector('svg[role="img"]')).toBeTruthy()
    expect(screen.getByText('/cards')).toBeTruthy()
    expect(screen.getByText('cards-hero-get-card')).toBeTruthy()
    expect(screen.getByText('4 / 25%')).toBeTruthy()
    expect(screen.getByText('google.com')).toBeTruthy()
    expect(screen.getByText('mobile')).toBeTruthy()
  })

  it('sends a signed-out visitor to login and hides the page from a non-founder', async () => {
    user = null
    await expect(renderPage()).rejects.toThrow('REDIRECT:/auth/login')
    user = { id: 'x' }
    allowed = false
    await expect(renderPage()).rejects.toThrow('NOT_FOUND')
  })
})
