import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IdeaConsole } from '../IdeaConsole'

const DRAFT = '---\nstatus: draft\nauthor: a@b.c\ncreated: 2026-09-24T00:00:00.000Z\ntask: t1\n---\n# Intent: Promo\n\n## Problem\nP\n'
const ACCEPTED = DRAFT.replace('status: draft', 'status: accepted') + '\nedited'

beforeEach(() => { vi.restoreAllMocks() })

describe('IdeaConsole capture intent', () => {
  it('shows the Capture Intent heading', () => {
    render(<IdeaConsole projects={[]} />)
    expect(screen.getByRole('heading', { name: /capture intent/i })).toBeInTheDocument()
  })

  it('drafts, lets the founder edit, accepts, then offers a copy of the accepted markdown', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url, 'https://t').pathname
      if (path === '/api/command-centre/ideas') {
        return { ok: true, status: 200, json: async () => ({ task: { id: 't1', title: 'Promo', status: 'proposed' } }) }
      }
      if (path === '/api/command-centre/intent' && init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ markdown: DRAFT }) }
      }
      if (path === '/api/command-centre/intent' && init?.method === 'PUT') {
        return { ok: true, status: 200, json: async () => ({ markdown: ACCEPTED, acceptedAt: '2026-09-24T01:00:00.000Z' }) }
      }
      return { ok: false, status: 500, json: async () => ({ error: 'unexpected' }) }
    })
    vi.stubGlobal('fetch', fetchMock as never)

    render(<IdeaConsole projects={[]} />)
    fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Run a winter promo' } })
    fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
    await waitFor(() => screen.getByRole('button', { name: 'Draft intent.md' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draft intent.md' }))

    const editor = await screen.findByLabelText('intent.md')
    expect((editor as HTMLTextAreaElement).value).toBe(DRAFT)
    fireEvent.change(editor, { target: { value: `${DRAFT}\nedited` } })

    fireEvent.click(screen.getByRole('button', { name: 'Accept intent' }))
    await waitFor(() => expect(screen.getByText(/^Accepted /)).toBeInTheDocument())

    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({ taskId: 't1', markdown: `${DRAFT}\nedited` })

    fireEvent.click(screen.getByRole('button', { name: 'Copy intent.md' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ACCEPTED))
    expect(screen.queryByRole('button', { name: 'Accept intent' })).not.toBeInTheDocument()
  })

  it('shows the API error when accept is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url, 'https://t').pathname
      if (path === '/api/command-centre/ideas') {
        return { ok: true, status: 200, json: async () => ({ task: { id: 't2', title: 'X', status: 'proposed' } }) }
      }
      if (init?.method === 'POST') return { ok: true, status: 200, json: async () => ({ markdown: DRAFT }) }
      return { ok: false, status: 400, json: async () => ({ error: 'intent.md is incomplete: Missing section "## Constraints"' }) }
    }) as never)

    render(<IdeaConsole projects={[]} />)
    fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Draft intent.md' }))
    await screen.findByLabelText('intent.md')
    fireEvent.click(screen.getByRole('button', { name: 'Accept intent' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Missing section "## Constraints"'))
    expect(screen.queryByRole('button', { name: 'Copy intent.md' })).not.toBeInTheDocument()
  })
})
