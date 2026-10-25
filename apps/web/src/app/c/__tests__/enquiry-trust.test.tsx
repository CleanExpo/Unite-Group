import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const submitEnquiryAction = vi.fn()
vi.mock('../[slug]/actions', () => ({ submitEnquiryAction: (...a: unknown[]) => submitEnquiryAction(...a) }))

import { EnquiryForm } from '../[slug]/enquiry-form'

afterEach(() => {
  cleanup()
  submitEnquiryAction.mockReset()
})

describe('EnquiryForm trust controls', () => {
  it('links the privacy policy and names the card owner when given', () => {
    render(<EnquiryForm slug="sam" owner="Sam Lee" />)
    expect(screen.getByRole('link', { name: /privacy policy/i }).getAttribute('href')).toBe('/privacy-policy')
    expect(document.body.textContent).toMatch(/Unite Group stores your enquiry for Sam Lee/)
    // the owner inbox is not built: the form must not say the message is delivered to the owner
    expect(document.body.textContent).not.toMatch(/goes to|sent to|delivered to/i)
  })

  it('has a required consent checkbox and does not call the action until it is ticked', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: true, receipt: { id: 'i', reference: 'LC-I', status: 'received', acceptedAt: 't' } })
    render(<EnquiryForm slug="sam" />)
    const box = screen.getByRole('checkbox', { name: /agree to my details being used to reply/i }) as HTMLInputElement
    expect(box.required).toBe(true)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/your first name/i), 'Jo')
    await user.type(screen.getByLabelText(/what do you need/i), 'A quote please')
    await user.click(screen.getByRole('button', { name: /send enquiry/i }))
    expect(submitEnquiryAction).not.toHaveBeenCalled()
    await user.click(box)
    await user.click(screen.getByRole('button', { name: /send enquiry/i }))
    await waitFor(() => expect(submitEnquiryAction).toHaveBeenCalledTimes(1))
    expect(submitEnquiryAction).toHaveBeenCalledWith('sam', expect.objectContaining({ consent: true }))
  })

  it('hides the honeypot from the accessibility tree and tab order, and sends it empty with startedAt', async () => {
    submitEnquiryAction.mockResolvedValue({ ok: false, status: 400, error: 'x' })
    const before = Date.now()
    render(<EnquiryForm slug="sam" />)
    const trap = document.querySelector('input[name="lc_extra"]') as HTMLInputElement
    expect(trap).toBeTruthy()
    expect(trap.tabIndex).toBe(-1)
    expect(trap.getAttribute('autocomplete')).toBe('off')
    expect(trap.closest('[aria-hidden="true"]')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: /leave this empty/i })).toBeNull()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/your first name/i), 'Jo')
    await user.type(screen.getByLabelText(/what do you need/i), 'Hi')
    await user.click(screen.getByRole('checkbox', { name: /agree/i }))
    await user.click(screen.getByRole('button', { name: /send enquiry/i }))
    await waitFor(() => expect(submitEnquiryAction).toHaveBeenCalled())
    const sent = submitEnquiryAction.mock.calls[0][1]
    expect(sent.website).toBe('')
    expect(typeof sent.startedAt).toBe('number')
    expect(sent.startedAt).toBeGreaterThanOrEqual(before)
    expect(sent.startedAt).toBeLessThanOrEqual(Date.now())
  })
})

describe('submitEnquiryAction guard wiring', () => {
  const createServiceClient = vi.fn()
  const headerMap = new Headers({ 'x-forwarded-for': '8.8.8.8' })
  const NOW = 1_800_000_000_000
  const good = { firstName: 'Jo', ask: 'Hi', consent: true, website: '', startedAt: NOW - 10_000 }
  let action: (slug: string, input: never) => Promise<{ ok: boolean; status?: number }>

  beforeEach(async () => {
    vi.resetModules()
    vi.doUnmock('../[slug]/actions')
    vi.doMock('next/headers', () => ({ headers: async () => headerMap }))
    vi.doMock('@/lib/supabase/service', () => ({ createServiceClient: () => createServiceClient() }))
    createServiceClient.mockReset()
    createServiceClient.mockImplementation(() => { throw new Error('should not be built') })
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    action = (await import('../[slug]/actions')).submitEnquiryAction as never
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it.each([
    ['missing consent', { consent: undefined }, 400],
    ['filled honeypot', { website: 'x' }, 400],
    ['too-fast submit', { startedAt: NOW - 500 }, 400],
  ])('%s is refused and never builds a database client', async (_n, over, status) => {
    const r = await action('sam', { ...good, ...over } as never)
    expect(r).toMatchObject({ ok: false, status })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('an over-limit caller gets 429 before any database client is built', async () => {
    for (let i = 0; i < 5; i++) await action('sam', good as never) // each reaches the (throwing) client builder: 500
    createServiceClient.mockClear()
    const r = await action('sam', good as never)
    expect(r).toMatchObject({ ok: false, status: 429 })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('a clean request passes the guard and reaches the client builder', async () => {
    await action('sam', good as never)
    expect(createServiceClient).toHaveBeenCalledTimes(1)
  })
})
