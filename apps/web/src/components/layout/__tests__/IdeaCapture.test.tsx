import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { IdeaCapture } from '../IdeaCapture'
import { useUIStore } from '@/store/ui'

vi.mock('framer-motion', () => ({ motion: { div: ({ children, ...props }: React.ComponentProps<'div'>) => <div className={props.className} style={props.style}>{children}</div> }, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

const response = (body: unknown, ok = true) => ({ ok, json: async () => body })
beforeEach(() => { vi.restoreAllMocks(); useUIStore.setState({ captureOpen: true }) })
function start() {
  render(<IdeaCapture />)
  fireEvent.change(screen.getByPlaceholderText('I want to add...'), { target: { value: 'Keep this customer portal idea' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send to Claude' }))
}

describe('Idea Capture request failures', () => {
  it('shows a 503 as a recoverable error and retries the same entered idea', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ error: 'Idea capture is unavailable in this preview.' }, false)).mockResolvedValueOnce(response({ type: 'question', question: 'Who should use it?' }))
    vi.stubGlobal('fetch', fetchMock)
    start()
    expect(await screen.findByRole('alert')).toHaveTextContent('Idea capture is unavailable in this preview.')
    expect(screen.getByText('Keep this customer portal idea')).toBeInTheDocument()
    expect(screen.queryByText('Issue created')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry idea capture' }))
    expect(await screen.findByText('Who should use it?')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body)
  })
  it('handles unreadable successful responses without adding a blank assistant message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ error: 'Wrong response shape' })))
    start()
    expect(await screen.findByRole('alert')).toHaveTextContent('Idea capture returned an unreadable response.')
    expect(screen.getByRole('button', { name: 'Retry idea capture' })).toBeInTheDocument()
  })
  it('preserves a typed answer after a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ type: 'question', question: 'Who should use it?' })).mockRejectedValueOnce(new Error('Connection lost.')))
    start()
    await screen.findByText('Who should use it?')
    fireEvent.change(screen.getByPlaceholderText('Your answer...'), { target: { value: 'Our customers' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Your answer...'), { key: 'Enter' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost.')
    expect(screen.getByPlaceholderText('Your answer...')).toHaveValue('Our customers')
  })
  it('keeps the prepared spec after issue creation fails and never claims success', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ type: 'spec', spec: { title: 'Customer portal', teamKey: 'UNI', priority: 3, labels: [], description: 'A portal', acceptanceCriteria: ['Customers can sign in'] } })).mockResolvedValueOnce(response({ error: 'Linear is unavailable.' }, false)).mockResolvedValueOnce(response({ identifier: 'UNI-123' }))
    vi.stubGlobal('fetch', fetchMock)
    start()
    fireEvent.click(await screen.findByRole('button', { name: 'Create in Linear' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Linear is unavailable.')
    expect(screen.getByText('Customer portal')).toBeInTheDocument()
    expect(screen.queryByText('Issue created')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create in Linear' }))
    expect(await screen.findByText('UNI-123 added to Linear')).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[2][1].body)
  })
})
