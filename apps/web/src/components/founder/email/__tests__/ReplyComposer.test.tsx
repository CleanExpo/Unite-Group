import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReplyComposer } from '../ReplyComposer'

const props = {
  threadId: 't-1',
  account: 'me@biz.com',
  defaultTo: 'client@acme.com',
  defaultSubject: 'Quote request',
  onSent: vi.fn(),
  onCancel: vi.fn(),
}

beforeEach(() => vi.restoreAllMocks())

describe('ReplyComposer — Draft with the skill', () => {
  it('fills the textarea with the drafted body on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ body: 'Thanks — here is the quote.\n\nCheers, Phill' }),
    } as Response)

    render(<ReplyComposer {...props} />)
    fireEvent.click(screen.getByLabelText('Draft with the skill'))

    const textarea = screen.getByPlaceholderText('Write your reply…') as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toContain('here is the quote'))

    // posts the account + threadId to the draft-reply route
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toBe('/api/email/draft-reply')
    expect(JSON.parse(call[1].body)).toEqual({ account: 'me@biz.com', threadId: 't-1' })
  })

  it('shows a loading state while drafting', async () => {
    let resolveFetch: (v: unknown) => void = () => {}
    global.fetch = vi.fn().mockReturnValue(new Promise(r => { resolveFetch = r }))

    render(<ReplyComposer {...props} />)
    const btn = screen.getByLabelText('Draft with the skill')
    fireEvent.click(btn)

    await waitFor(() => expect(btn).toHaveAttribute('aria-busy', 'true'))
    expect(btn).toBeDisabled()

    resolveFetch({ ok: true, json: async () => ({ body: 'done' }) })
    await waitFor(() => expect(btn).toHaveAttribute('aria-busy', 'false'))
  })

  it('surfaces an inline error in an alert when drafting fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Draft failed' }),
    } as Response)

    render(<ReplyComposer {...props} />)
    fireEvent.click(screen.getByLabelText('Draft with the skill'))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Draft failed'))
  })
})
