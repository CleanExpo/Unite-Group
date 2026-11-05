import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
const listFactors = vi.fn()
const getUser = vi.fn()
const enroll = vi.fn()
const unenroll = vi.fn()
const challenge = vi.fn()
const verify = vi.fn()
const sendPortalEmailCodeAction = vi.fn()
const verifyPortalEmailCodeAction = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => refresh() }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
      mfa: {
        listFactors: (...args: unknown[]) => listFactors(...args),
        enroll: (...args: unknown[]) => enroll(...args),
        unenroll: (...args: unknown[]) => unenroll(...args),
        challenge: (...args: unknown[]) => challenge(...args),
        verify: (...args: unknown[]) => verify(...args),
      },
    },
  }),
}))
vi.mock('@/lib/portal/email-second-factor-action', () => ({
  sendPortalEmailCodeAction: (...args: unknown[]) => sendPortalEmailCodeAction(...args),
  verifyPortalEmailCodeAction: (...args: unknown[]) => verifyPortalEmailCodeAction(...args),
}))

import { EMAIL_FACTOR_META_KEY, PORTAL_EMAIL_FACTOR_NAME } from '@/lib/portal/second-factor-mode'

import { SecondFactorStep } from '../second-factor'

afterEach(() => {
  cleanup()
  refresh.mockReset()
  listFactors.mockReset()
  getUser.mockReset()
  enroll.mockReset()
  unenroll.mockReset()
  challenge.mockReset()
  verify.mockReset()
  sendPortalEmailCodeAction.mockReset()
  verifyPortalEmailCodeAction.mockReset()
})

function factors(totp: Array<{ id: string; status: string; friendly_name?: string }>, emailFactorId: string | null = null) {
  listFactors.mockResolvedValue({ data: { totp, all: totp }, error: null })
  const appMetadata = emailFactorId ? { [EMAIL_FACTOR_META_KEY]: { factor_id: emailFactorId } } : {}
  getUser.mockResolvedValue({ data: { user: { id: 'u1', app_metadata: appMetadata } }, error: null })
}

describe('SecondFactorStep', () => {
  it('lets an owner with no app choose an emailed code, resend it, and continue only when the check says so', async () => {
    factors([])
    sendPortalEmailCodeAction.mockResolvedValue({ ok: true })
    verifyPortalEmailCodeAction.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<SecondFactorStep email="sam@example.test" />)
    expect(await screen.findByRole('button', { name: 'Set up my app' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    expect(sendPortalEmailCodeAction).toHaveBeenCalledTimes(1)
    expect(await screen.findByLabelText('6-digit code from your email')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Resend code' }))
    expect(sendPortalEmailCodeAction).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(/another code/i)).toBeTruthy()
    await user.type(screen.getByLabelText('6-digit code from your email'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(verifyPortalEmailCodeAction).toHaveBeenCalledWith('123456')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('stays on the step when the emailed code does not raise the session', async () => {
    factors([])
    sendPortalEmailCodeAction.mockResolvedValue({ ok: true })
    verifyPortalEmailCodeAction.mockResolvedValue({ ok: false, outcome: 'bad_code' })
    const user = userEvent.setup()
    render(<SecondFactorStep email="sam@example.test" />)
    await user.click(await screen.findByRole('button', { name: 'Email me a code' }))
    await user.type(await screen.findByLabelText('6-digit code from your email'), '000000')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('does not offer email as a dead end to an owner whose only verified factor is their own app', async () => {
    factors([{ id: 'app', status: 'verified', friendly_name: 'Business portal' }])
    render(<SecondFactorStep email="sam@example.test" />)
    expect(await screen.findByLabelText('6-digit code from your app')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use email instead' })).toBeNull()
    expect(screen.getByText(/emailed code cannot replace it/i)).toBeTruthy()
  })

  it('treats an app named like our email factor as the owner\'s own app', async () => {
    factors([{ id: 'their-app', status: 'verified', friendly_name: PORTAL_EMAIL_FACTOR_NAME }])
    render(<SecondFactorStep email="sam@example.test" />)
    expect(await screen.findByLabelText('6-digit code from your app')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use email instead' })).toBeNull()
  })

  it('shows the app first and switches to email without sending until asked, when our email factor is verified too', async () => {
    factors([
      { id: 'app', status: 'verified', friendly_name: 'Business portal' },
      { id: 'mail', status: 'verified', friendly_name: PORTAL_EMAIL_FACTOR_NAME },
    ], 'mail')
    const user = userEvent.setup()
    render(<SecondFactorStep email="sam@example.test" />)
    expect(await screen.findByLabelText('6-digit code from your app')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Use email instead' }))
    expect(sendPortalEmailCodeAction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Email me a code' })).toBeTruthy()
    expect(screen.queryByLabelText('6-digit code from your app')).toBeNull()
  })

  it('still accepts the authenticator code', async () => {
    factors([{ id: 'app', status: 'verified', friendly_name: 'Business portal' }])
    challenge.mockResolvedValue({ data: { id: 'ch1' }, error: null })
    verify.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<SecondFactorStep email="sam@example.test" />)
    await user.type(await screen.findByLabelText('6-digit code from your app'), '654321')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(challenge).toHaveBeenCalledWith({ factorId: 'app' })
    expect(verify).toHaveBeenCalledWith({ factorId: 'app', challengeId: 'ch1', code: '654321' })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('opens on the emailed code when that is the only verified factor', async () => {
    factors([{ id: 'mail', status: 'verified', friendly_name: PORTAL_EMAIL_FACTOR_NAME }], 'mail')
    render(<SecondFactorStep email="sam@example.test" />)
    expect(await screen.findByRole('button', { name: 'Email me a code' })).toBeTruthy()
    expect(screen.queryByLabelText('6-digit code from your app')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Set up my app' })).toBeNull()
  })

  it('can still set up an authenticator app', async () => {
    factors([])
    enroll.mockResolvedValue({
      data: { id: 'new', type: 'totp', totp: { qr_code: 'data:image/svg+xml,abc', secret: 'SECRET' } },
      error: null,
    })
    const user = userEvent.setup()
    render(<SecondFactorStep email="sam@example.test" />)
    await user.click(await screen.findByRole('button', { name: 'Set up my app' }))
    expect(await screen.findByAltText(/QR code to add your business portal/i)).toBeTruthy()
    expect(enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'Business portal' })
  })
})
