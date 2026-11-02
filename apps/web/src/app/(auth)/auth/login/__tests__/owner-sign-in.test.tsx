import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithOtp = vi.fn(async () => ({ error: null }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOtp,
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
  }),
}))

import { renderedFindings } from '@/__tests__/portal-forbidden-words'
import { PORTAL_LOGIN_URL } from '@/lib/portal/paths'

import LoginPage from '../page'

// The portal promises "You never give us your password", and a signed-out owner is sent here first
// (the portal layout redirects to PORTAL_LOGIN_URL). So on the way to /portal this page must not offer a password.
async function open(search: string) {
  window.history.replaceState(null, '', `/auth/login${search}`)
  const view = render(<LoginPage />)
  await act(async () => {})
  return view
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => cleanup())

describe('sign-in on the way to the owner portal', () => {
  it.each([
    ['the portal login link', PORTAL_LOGIN_URL.slice('/auth/login'.length)],
    ['a page beneath the portal', '?redirectTo=%2Fportal%2Fsettings'],
  ])('offers only Google and the emailed link for %s', async (_name, search) => {
    const { container } = await open(search)
    expect(screen.getByText('Continue with Google')).toBeTruthy()
    expect(screen.getByText('Email me a sign-in link')).toBeTruthy()
    expect(container.querySelector('input[type="password"]')).toBeNull()
    expect(screen.queryByText('Use email instead')).toBeNull()
    expect(screen.queryByText(/forgot/i)).toBeNull()
    expect(renderedFindings(container.innerHTML)).toEqual([])
  })

  it('sends the emailed link back to the portal, for an existing account only', async () => {
    const { container } = await open(PORTAL_LOGIN_URL.slice('/auth/login'.length))
    fireEvent.change(container.querySelector('#login-email') as HTMLInputElement, { target: { value: 'sam@example.test' } })
    await act(async () => {
      fireEvent.click(screen.getByText('Email me a sign-in link'))
    })
    expect(signInWithOtp).toHaveBeenCalledTimes(1)
    const [{ email, options }] = signInWithOtp.mock.calls[0] as unknown as [{ email: string; options: { emailRedirectTo: string; shouldCreateUser: boolean } }]
    expect(email).toBe('sam@example.test')
    expect(new URL(options.emailRedirectTo).searchParams.get('next')).toBe('/portal')
    expect(options.shouldCreateUser).toBe(false)
  })

  // The founder's page is unchanged: the hidden email-and-password fallback is still there. This is also the
  // positive control for the rendered check: it must fire on the real password form.
  it.each([
    ['no return path', ''],
    ['the founder area', '?redirectTo=%2Ffounder%2Fcommand-centre'],
    ['a look-alike of the portal', '?redirectTo=%2Fportalx'],
  ])('keeps the founder fallback for %s', async (_name, search) => {
    const { container } = await open(search)
    expect(container.querySelector('input[type="password"]')).toBeNull()
    fireEvent.click(screen.getByText('Use email instead'))
    expect(container.querySelector('input[type="password"]')).not.toBeNull()
    expect(screen.getByText('Forgot password?')).toBeTruthy()
    expect(renderedFindings(container.innerHTML).length).toBeGreaterThan(0)
  })
})
