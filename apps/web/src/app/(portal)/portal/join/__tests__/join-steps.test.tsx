import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const requestJoinLinkAction = vi.fn()
const redeemInviteAction = vi.fn()
vi.mock('../actions', () => ({
  requestJoinLinkAction: (...a: unknown[]) => requestJoinLinkAction(...a),
  redeemInviteAction: (...a: unknown[]) => redeemInviteAction(...a),
}))
vi.mock('../second-factor', () => ({ SecondFactorStep: () => <p>second factor step</p> }))

import { BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL } from '@/lib/portal/invites/__fixtures__/brii'
import { REDEEM_COPY } from '@/lib/portal/invites/outcomes'

import { JoinSteps } from '../join-steps'

afterEach(() => { cleanup(); requestJoinLinkAction.mockReset(); redeemInviteAction.mockReset() })

describe('JoinSteps', () => {
  it('with no code, asks for one with a plain form', () => {
    render(<JoinSteps step="code" code="" email={null} />)
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    expect(screen.getByLabelText('Invite code')).toBeTruthy()
  })

  it('signed out: sends a link and says to check email', async () => {
    requestJoinLinkAction.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<JoinSteps step="sign-in" code={BRII_EXAMPLE_CODE} email={null} />)
    await user.type(screen.getByLabelText('Your email'), BRII_OWNER_EMAIL)
    await user.click(screen.getByRole('button', { name: /email me a sign-in link/i }))
    expect(requestJoinLinkAction).toHaveBeenCalledWith(BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL)
    expect(await screen.findByText('Check your email')).toBeTruthy()
  })

  it('signed out with an expired code: friendly words, no link', async () => {
    requestJoinLinkAction.mockResolvedValue({ ok: false, outcome: 'expired' })
    const user = userEvent.setup()
    render(<JoinSteps step="sign-in" code={BRII_EXAMPLE_CODE} email={null} />)
    await user.type(screen.getByLabelText('Your email'), BRII_OWNER_EMAIL)
    await user.click(screen.getByRole('button', { name: /email me a sign-in link/i }))
    expect((await screen.findByRole('alert')).textContent).toContain(REDEEM_COPY.expired.title)
    expect(screen.queryByText('Check your email')).toBeNull()
  })

  it('aal1: shows the second-factor step, never the claim button', () => {
    render(<JoinSteps step="second-factor" code={BRII_EXAMPLE_CODE} email={BRII_OWNER_EMAIL} />)
    expect(screen.getByText('second factor step')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /claim my portal/i })).toBeNull()
  })

  it('aal2: claims, then links to the portal', async () => {
    redeemInviteAction.mockResolvedValue('redeemed')
    const user = userEvent.setup()
    render(<JoinSteps step="claim" code={BRII_EXAMPLE_CODE} email={BRII_OWNER_EMAIL} />)
    await user.click(screen.getByRole('button', { name: /claim my portal/i }))
    expect(redeemInviteAction).toHaveBeenCalledWith(BRII_EXAMPLE_CODE)
    expect(await screen.findByRole('link', { name: /go to my portal/i })).toBeTruthy()
  })

  it.each(['used', 'wrong_email', 'revoked', 'rate_limited', 'error'] as const)('aal2 refused (%s): friendly words and no portal link', async (outcome) => {
    redeemInviteAction.mockResolvedValue(outcome)
    const user = userEvent.setup()
    render(<JoinSteps step="claim" code={BRII_EXAMPLE_CODE} email={BRII_OWNER_EMAIL} />)
    await user.click(screen.getByRole('button', { name: /claim my portal/i }))
    expect((await screen.findByRole('alert')).textContent).toContain(REDEEM_COPY[outcome].title)
    expect(screen.queryByRole('link', { name: /go to my portal/i })).toBeNull()
  })
})
