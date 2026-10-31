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
  await user.click(screen.getByRole('checkbox', { name: /agree/i }))
  await user.click(screen.getByRole('button', { name: /send enquiry/i }))
}

describe('EnquiryForm', () => {
  it('shows the receipt id only from a stored-row result', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: true, receipt: { id: 'row-123', reference: 'LC-ROW123', status: 'received', acceptedAt: 't' } })
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByText(/LC-ROW123/)).toBeTruthy())
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

  it('v1.4 G1 shows the LC- reference and never the raw row id', async () => {
    submitEnquiryAction.mockResolvedValue({
      ok: true, receipt: { id: 'f3a1c0de-0000-4000-8000-000000000001', reference: 'LC-F3A1C0DE0000', status: 'received', acceptedAt: 't' },
    })
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByText(/Reference: LC-F3A1C0DE0000/)).toBeTruthy())
    expect(document.body.textContent).not.toContain('f3a1c0de-0000')
  })

  it('v1.4 G2 shows Sending while the call is pending and Saved only after a stored result', async () => {
    let finish: (v: unknown) => void = () => {}
    submitEnquiryAction.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    expect(screen.getByRole('status').textContent).toMatch(/sending/i)
    expect(document.body.textContent).not.toMatch(/saved/i)
    finish({ ok: true, receipt: { id: 'i', reference: 'LC-I', status: 'received', acceptedAt: 't' } })
    await waitFor(() => expect(document.body.textContent).toMatch(/Saved\. Reference: LC-I/))
    expect(screen.queryByText(/sending/i)).toBeNull()
  })

  it('v1.4 G2 a failed save never says Saved', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: false, status: 500, error: 'could not store the enquiry' })
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(document.body.textContent).not.toMatch(/saved|received/i)
  })

  it('v1.4 G3 a failed save shows the card\'s own Call and Email links as the way to reach the business', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: false, status: 500, error: 'could not store the enquiry' })
    render(<EnquiryForm slug="sam" fallback={{ phone: '+61 400 111 222', email: 'sam@example.com' }} />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Call' }).getAttribute('href')).toBe('tel:+61400111222')
    expect(screen.getByRole('link', { name: 'Email' }).getAttribute('href')).toBe('mailto:sam@example.com')
    expect(screen.getByRole('alert').textContent).toMatch(/not saved/i)
  })

  it('v1.4 G3 the same fallback is shown when the call itself throws, and nothing is invented when the card has no contact', async () => {
    submitEnquiryAction.mockRejectedValue(new Error('network'))
    const first = render(<EnquiryForm slug="sam" fallback={{ phone: null, email: 'sam@example.com' }} />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Email' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Call' })).toBeNull()
    first.unmount()
    render(<EnquiryForm slug="sam" fallback={{ phone: null, email: null }} />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    // only the privacy-policy link (always present) remains: no Call or Email invented
    expect(screen.queryAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/privacy-policy'])
  })

  it('v1.4 G4 the receipt states the next step and how to correct details, without claiming a notification or a response time', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: true, receipt: { id: 'i', reference: 'LC-I', status: 'received', acceptedAt: 't' } })
    render(<EnquiryForm slug="sam" />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByText(/next step/i)).toBeTruthy())
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/quote this reference/i)
    expect(text).toMatch(/correct anything you sent/i)
    expect(text).toMatch(/not notified yet/i)
    expect(text).not.toMatch(/24\/7|within \d|we.re on it|team (has been )?notified|will reply/i)
  })

  // UNI-3021: the receipt says the owner was emailed only when the server says Mailtrap accepted the owner's email.
  it('says the card owner was emailed only when the receipt carries ownerNotified: true', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: true, receipt: { id: 'i', reference: 'LC-I', status: 'received', acceptedAt: 't', ownerNotified: true } })
    render(<EnquiryForm slug="sam" ownerAlerts />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByText(/next step/i)).toBeTruthy())
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/emailed a copy to the card owner/i)
    expect(text).not.toMatch(/not notified/i)
    expect(text).toMatch(/quote this reference/i)
  })

  it('a stored enquiry whose owner email did not go through says so, even when alerts are switched on', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: true, receipt: { id: 'i', reference: 'LC-I', status: 'received', acceptedAt: 't', ownerNotified: false } })
    render(<EnquiryForm slug="sam" ownerAlerts />)
    await fillAndSend()
    await waitFor(() => expect(screen.getByText(/next step/i)).toBeTruthy())
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/not notified yet/i)
    expect(text).not.toMatch(/emailed a copy/i)
  })
})
