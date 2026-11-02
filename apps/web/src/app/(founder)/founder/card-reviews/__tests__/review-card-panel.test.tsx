import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createReviewRequestAction = vi.fn()
const recordOptOutAction = vi.fn()
const savePlaceIdAction = vi.fn()
vi.mock('../actions', () => ({
  createReviewRequestAction: (...a: unknown[]) => createReviewRequestAction(...a),
  recordOptOutAction: (...a: unknown[]) => recordOptOutAction(...a),
  savePlaceIdAction: (...a: unknown[]) => savePlaceIdAction(...a),
}))

import { DUPLICATE_NOTE, ReviewCardPanel } from '../review-card-panel'

const card = { slug: 'sam', displayName: 'Sam Smith', businessName: 'Sam Co', placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4', published: true }
const REQUEST_ID = '6f1e2d3c-4b5a-4987-8a7b-6c5d4e3f2a1b'

afterEach(() => {
  cleanup()
  createReviewRequestAction.mockReset()
  recordOptOutAction.mockReset()
  savePlaceIdAction.mockReset()
})

async function prepare(user: ReturnType<typeof userEvent.setup>, tick = true) {
  await user.type(screen.getByLabelText(/customer first name/i), 'Jo')
  await user.type(screen.getAllByLabelText(/their mobile or email/i)[0], '0412 345 678')
  if (tick) await user.click(screen.getByRole('checkbox', { name: /agreed I can message them/i }))
  await user.click(screen.getByRole('button', { name: /prepare message/i }))
}

const sendControls = () => [
  screen.queryByRole('link', { name: /open my texts/i }),
  screen.queryByRole('link', { name: /open my email/i }),
  screen.queryByRole('button', { name: /share or copy/i }),
]

describe('ReviewCardPanel', () => {
  it('a new request shows the message and the owner-sent text link', async () => {
    createReviewRequestAction.mockResolvedValue({ ok: true, requestId: REQUEST_ID, duplicate: false })
    render(<ReviewCardPanel card={card} />)
    await prepare(userEvent.setup())
    const texts = await screen.findByRole('link', { name: /open my texts/i })
    expect(texts.getAttribute('href')).toMatch(/^sms:0412345678\?body=/)
    expect(decodeURIComponent(texts.getAttribute('href')!)).toContain(`/c/sam/review?q=${REQUEST_ID}`)
    expect(createReviewRequestAction).toHaveBeenCalledWith({ slug: 'sam', firstName: 'Jo', contact: '0412 345 678', channel: 'owner_sms', consent: true })
  })

  it('a repeat for the same customer today shows a notice and NO way to send again', async () => {
    createReviewRequestAction.mockResolvedValue({ ok: true, requestId: REQUEST_ID, duplicate: true })
    render(<ReviewCardPanel card={card} />)
    await prepare(userEvent.setup())
    await screen.findByText(DUPLICATE_NOTE)
    expect(sendControls()).toEqual([null, null, null])
    expect(screen.queryByText(/Reply STOP/)).toBeNull()
  })

  it('recording STOP removes a message prepared before it, so it cannot be sent', async () => {
    createReviewRequestAction.mockResolvedValue({ ok: true, requestId: REQUEST_ID, duplicate: false })
    recordOptOutAction.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<ReviewCardPanel card={card} />)
    await prepare(user)
    await screen.findByRole('link', { name: /open my texts/i })
    await user.type(screen.getAllByLabelText(/their mobile or email/i)[1], '0412 345 678')
    await user.click(screen.getByRole('button', { name: /don't ask them again/i }))
    await screen.findByText(/Recorded\./)
    await waitFor(() => expect(sendControls()).toEqual([null, null, null]))
    expect(recordOptOutAction).toHaveBeenCalledWith('sam', '0412 345 678')
  })

  it('a failed STOP keeps nothing new and says why', async () => {
    recordOptOutAction.mockResolvedValue({ ok: false, status: 500, error: 'could not record the opt-out' })
    const user = userEvent.setup()
    render(<ReviewCardPanel card={card} />)
    await user.type(screen.getAllByLabelText(/their mobile or email/i)[1], '0412 345 678')
    await user.click(screen.getByRole('button', { name: /don't ask them again/i }))
    await screen.findByText('could not record the opt-out')
  })

  it('a refused request (no consent at the server, or opted out) shows the error and no send controls', async () => {
    createReviewRequestAction.mockResolvedValue({ ok: false, status: 409, error: 'this customer asked not to be contacted again' })
    render(<ReviewCardPanel card={card} />)
    await prepare(userEvent.setup())
    await screen.findByText('this customer asked not to be contacted again')
    expect(sendControls()).toEqual([null, null, null])
  })

  it('without a Place ID there is no ask form at all', () => {
    render(<ReviewCardPanel card={{ ...card, placeId: null }} />)
    expect(screen.queryByRole('button', { name: /prepare message/i })).toBeNull()
  })
})
