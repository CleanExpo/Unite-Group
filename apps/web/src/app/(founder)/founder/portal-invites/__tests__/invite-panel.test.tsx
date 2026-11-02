import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createInviteAction = vi.fn()
const revokeInviteAction = vi.fn()
const refresh = vi.fn()
vi.mock('../actions', () => ({
  createInviteAction: (...a: unknown[]) => createInviteAction(...a),
  revokeInviteAction: (...a: unknown[]) => revokeInviteAction(...a),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

import { BRII_EXAMPLE_CODE, BRII_INVITES, BRII_OWNER_EMAIL } from '@/lib/portal/invites/__fixtures__/brii'

import { InvitePanel } from '../invite-panel'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('InvitePanel', () => {
  it('shows the new code once with its join link, and the list never shows a full code', async () => {
    createInviteAction.mockResolvedValue({ ok: true, code: BRII_EXAMPLE_CODE, invite: { ...BRII_INVITES[0] } })
    const user = userEvent.setup()
    render(<InvitePanel invites={BRII_INVITES} readError={null} />)
    await user.type(screen.getByLabelText('Business short name'), 'brii')
    await user.type(screen.getByLabelText(/owner's email/i), BRII_OWNER_EMAIL)
    await user.click(screen.getByRole('button', { name: 'Make code' }))
    expect(createInviteAction).toHaveBeenCalledWith({ tenantSlug: 'brii', boundEmail: BRII_OWNER_EMAIL, expiryDays: 14 })
    expect((await screen.findByTestId('invite-code')).textContent).toBe(BRII_EXAMPLE_CODE)
    expect(screen.getByText(/it will not be shown again/i)).toBeTruthy()
    expect(screen.getByText(`${window.location.origin}/portal/join?code=${BRII_EXAMPLE_CODE}`)).toBeTruthy()
    expect(within(screen.getByRole('table')).queryByText(BRII_EXAMPLE_CODE)).toBeNull()
  })

  it('a refused form shows the reason and no code', async () => {
    createInviteAction.mockResolvedValue({ ok: false, error: 'Only the founder can make invite codes.' })
    const user = userEvent.setup()
    render(<InvitePanel invites={[]} readError={null} />)
    await user.type(screen.getByLabelText('Business short name'), 'brii')
    await user.click(screen.getByRole('button', { name: 'Make code' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Only the founder')
    expect(screen.queryByTestId('invite-code')).toBeNull()
  })

  it('lists codes by their last four characters and offers Cancel only on a ready code', async () => {
    revokeInviteAction.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<InvitePanel invites={BRII_INVITES} readError={null} />)
    expect(screen.getByText('…JKMN')).toBeTruthy()
    expect(screen.getByText('Used')).toBeTruthy()
    expect(screen.getByText('Cancelled')).toBeTruthy()
    const cancels = screen.getAllByRole('button', { name: /cancel code ending/i })
    expect(cancels).toHaveLength(1)
    await user.click(cancels[0])
    expect(revokeInviteAction).toHaveBeenCalledWith(BRII_INVITES[0].id)
    expect(refresh).toHaveBeenCalled()
  })

  it('a failed read says so, never "No codes yet"', () => {
    render(<InvitePanel invites={null} readError="could not read invite codes" />)
    expect(screen.getByRole('alert').textContent).toContain('could not read invite codes')
    expect(screen.queryByText('No codes yet.')).toBeNull()
  })
})
