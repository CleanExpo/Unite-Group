import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudioClient } from '../StudioClient'

beforeEach(() => {
  vi.restoreAllMocks()
})

function mockFetch(payload: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => payload })) as never)
}

describe('StudioClient', () => {
  it('renders generated concepts + the agent message after a brief', async () => {
    mockFetch({
      status: 'ok',
      agentMessage: 'Generated 1 concept from your brief. Pick one or tell me what to change.',
      concepts: [{ id: 'c1', url: 'https://cdn/c1.png', prompt: 'p' }],
      errors: [],
    })
    render(<StudioClient taskId="t1" />)
    fireEvent.change(screen.getByLabelText(/campaign brief/i), { target: { value: 'winter promo' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() => expect(screen.getByLabelText('Concept c1')).toBeInTheDocument())
    expect(screen.getByText(/Generated 1 concept/)).toBeInTheDocument()
  })

  it('renders an honest connect-brand state on not_connected', async () => {
    mockFetch({ status: 'not_connected', reason: 'No ready brand profile — connect or select one first.' })
    render(<StudioClient taskId="t1" />)
    fireEvent.change(screen.getByLabelText(/campaign brief/i), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/brand profile/i))
  })
})
