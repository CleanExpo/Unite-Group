import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IdeaConsole } from '../IdeaConsole'

beforeEach(() => { vi.restoreAllMocks() })

function mockFetchSequence(handlers: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true, status: 200, json: async () => handlers[new URL(url, 'https://t').pathname],
  })) as never)
}

describe('IdeaConsole clarify/route', () => {
  it('shows clarifying questions after requesting them', async () => {
    mockFetchSequence({
      '/api/command-centre/ideas': { task: { id: 't1', title: 'Promo', status: 'proposed' } },
      '/api/command-centre/clarify': { questions: ['Who is the audience?'] },
    })
    render(<IdeaConsole projects={[]} />)
    fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Run a winter promo' } })
    fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
    await waitFor(() => screen.getByRole('button', { name: /clarify/i }))
    fireEvent.click(screen.getByRole('button', { name: /clarify/i }))
    await waitFor(() => expect(screen.getByText('Who is the audience?')).toBeInTheDocument())
  })

  it('renders the routed plan panel after submitting answers', async () => {
    mockFetchSequence({
      '/api/command-centre/ideas': { task: { id: 't2', title: 'Widget', status: 'proposed' } },
      '/api/command-centre/clarify': { questions: ['What is the budget?'] },
      '/api/command-centre/clarify/answers': {},
      '/api/command-centre/classify': {
        routing: {
          lane: 'build',
          confidence: 0.92,
          rationale: 'Strong product signal.',
          planBuild: [{ title: 'Design mockups', detail: 'Create initial wireframes.' }],
          planDistribute: [],
        },
      },
    })
    render(<IdeaConsole projects={[]} />)
    fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Build a widget' } })
    fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
    await waitFor(() => screen.getByRole('button', { name: /clarify/i }))
    fireEvent.click(screen.getByRole('button', { name: /clarify/i }))
    await waitFor(() => screen.getByText('What is the budget?'))
    fireEvent.change(screen.getByLabelText('What is the budget?'), { target: { value: '$10k' } })
    fireEvent.click(screen.getByRole('button', { name: /submit answers/i }))
    await waitFor(() => expect(screen.getByText('Strong product signal.')).toBeInTheDocument())
    expect(screen.getByText('Design mockups')).toBeInTheDocument()
    const approveBtn = screen.getByRole('button', { name: /approve & build/i })
    expect(approveBtn).toBeDisabled()
  })

  it('shows honest error state when clarify fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const path = new URL(url, 'https://t').pathname
      if (path === '/api/command-centre/ideas') {
        return { ok: true, status: 200, json: async () => ({ task: { id: 't3', title: 'Fail test', status: 'proposed' } }) }
      }
      return { ok: false, status: 500, json: async () => ({ error: 'Service unavailable' }) }
    }) as never)
    render(<IdeaConsole projects={[]} />)
    fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Test failure handling' } })
    fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
    await waitFor(() => screen.getByRole('button', { name: /clarify/i }))
    fireEvent.click(screen.getByRole('button', { name: /clarify/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('shows "no questions" message when clarify returns empty array', async () => {
    mockFetchSequence({
      '/api/command-centre/ideas': { task: { id: 't4', title: 'Clear idea', status: 'proposed' } },
      '/api/command-centre/clarify': { questions: [] },
    })
    render(<IdeaConsole projects={[]} />)
    fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Crystal clear idea' } })
    fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
    await waitFor(() => screen.getByRole('button', { name: /clarify/i }))
    fireEvent.click(screen.getByRole('button', { name: /clarify/i }))
    await waitFor(() => expect(screen.getByText(/no questions/i)).toBeInTheDocument())
  })
})
