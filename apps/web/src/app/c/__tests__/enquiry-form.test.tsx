import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const submitEnquiryAction = vi.fn()
vi.mock('../[slug]/actions', () => ({ submitEnquiryAction: (...a: unknown[]) => submitEnquiryAction(...a) }))

import { EnquiryForm } from '../[slug]/enquiry-form'

afterEach(() => {
  cleanup()
  submitEnquiryAction.mockReset()
})

async function fillAndSend() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/your first name/i), 'Jo')
  await user.type(screen.getByLabelText(/what do you need/i), 'A quote please')
  await user.click(screen.getByRole('button', { name: /send enquiry/i }))
}

describe('EnquiryForm', () => {
  it('shows the receipt id only from a stored-row result', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: true, receipt: { id: 'row-123', status: 'received', acceptedAt: 't' } })
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByText(/row-123/)).toBeTruthy())
    expect(submitEnquiryAction).toHaveBeenCalledWith('sam', expect.objectContaining({ firstName: 'Jo', ask: 'A quote please' }))
  })

  it('on a failed result keeps what was typed and shows no receipt', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: false, status: 500, error: 'could not store the enquiry' })
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not store/i))
    expect((screen.getByLabelText(/your first name/i) as HTMLInputElement).value).toBe('Jo')
    expect((screen.getByLabelText(/what do you need/i) as HTMLTextAreaElement).value).toBe('A quote please')
    expect(screen.queryByText(/reference/i)).toBeNull()
  })

  it('when the action itself throws (offline), shows an error and no receipt', async () => {
    submitEnquiryAction.mockRejectedValue(new Error('network'))
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByText(/reference/i)).toBeNull()
    expect((screen.getByLabelText(/your first name/i) as HTMLInputElement).value).toBe('Jo')
  })
})
