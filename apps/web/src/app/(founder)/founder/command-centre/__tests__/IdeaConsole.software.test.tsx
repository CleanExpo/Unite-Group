// src/app/(founder)/founder/command-centre/__tests__/IdeaConsole.software.test.tsx
// TDD: Unit 6 — IdeaConsole software lane panel
//
// Tests the software-lane sub-panel that appears when routing.lane === 'software':
//   • "Plan build" action → calls /api/command-centre/lanes/software/build
//   • Renders PR brief (title, summary, acceptance criteria, steps)
//   • Gated "Hand off to build" button (enabled after planned) with honest text
//   • Handoff → "Handed off — ready for build"
//   • error honest state

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IdeaConsole } from '../IdeaConsole'

beforeEach(() => { vi.restoreAllMocks() })

// Bring the component to the post-route state: idea submitted → clarify with
// one question → answer submitted → classified as 'software'.
async function reachSoftwareLane() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = new URL(url, 'https://t').pathname
    const map: Record<string, unknown> = {
      '/api/command-centre/ideas': { task: { id: 'task-sw-1', title: 'Add login page', status: 'proposed' } },
      '/api/command-centre/clarify': { questions: ['What is the target audience?'] },
      '/api/command-centre/clarify/answers': {},
      '/api/command-centre/classify': {
        routing: {
          lane: 'software',
          confidence: 0.95,
          rationale: 'This is a feature request.',
          planBuild: [{ title: 'Scope & branch', detail: 'Decompose into a branch.' }],
          planDistribute: [],
        },
      },
    }
    return { ok: true, status: 200, json: async () => map[path] ?? {} }
  }) as never)

  render(<IdeaConsole projects={[]} />)
  fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Add login page' } })
  fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
  await waitFor(() => screen.getByRole('button', { name: /clarify/i }))
  fireEvent.click(screen.getByRole('button', { name: /clarify/i }))
  await waitFor(() => screen.getByText('What is the target audience?'))
  fireEvent.change(screen.getByLabelText('What is the target audience?'), { target: { value: 'Founders' } })
  fireEvent.click(screen.getByRole('button', { name: /submit answers/i }))
  await waitFor(() => screen.getByText(/this is a feature request/i))
}

describe('IdeaConsole software lane panel', () => {
  it('shows "Plan build" button when lane is software', async () => {
    await reachSoftwareLane()
    expect(screen.getByRole('button', { name: /plan build/i })).toBeInTheDocument()
  })

  it('renders the PR brief (title, summary, criteria, steps) after planning', async () => {
    await reachSoftwareLane()

    const plan = {
      title: 'Add Login Page',
      summary: 'Build a login page with email/password authentication.',
      acceptanceCriteria: ['User can log in', 'Invalid credentials show an error'],
      steps: ['Create feature branch', 'Implement changes', 'Write tests', 'Open PR for review'],
    }

    vi.mocked(fetch as never).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: { status: 'planned', plan } }),
    }))

    fireEvent.click(screen.getByRole('button', { name: /plan build/i }))
    await waitFor(() => expect(screen.getByText('Add Login Page')).toBeInTheDocument())
    expect(screen.getByText('Build a login page with email/password authentication.')).toBeInTheDocument()
    expect(screen.getByText('User can log in')).toBeInTheDocument()
    expect(screen.getByText('Invalid credentials show an error')).toBeInTheDocument()
    expect(screen.getByText('Create feature branch')).toBeInTheDocument()
    expect(screen.getByText('Open PR for review')).toBeInTheDocument()
  })

  it('"Hand off to build" button is disabled before planning', async () => {
    await reachSoftwareLane()
    const handoffBtn = screen.getByRole('button', { name: /hand off to build/i })
    expect(handoffBtn).toBeDisabled()
  })

  it('"Hand off to build" is enabled after planning and shows honest helper text', async () => {
    await reachSoftwareLane()
    const plan = { title: 'T', summary: 'S', acceptanceCriteria: ['a'], steps: ['b'] }
    vi.mocked(fetch as never).mockImplementationOnce(async () => ({
      ok: true, status: 200, json: async () => ({ result: { status: 'planned', plan } }),
    }))
    fireEvent.click(screen.getByRole('button', { name: /plan build/i }))
    await waitFor(() => screen.getByText('T'))
    const handoffBtn = screen.getByRole('button', { name: /hand off to build/i })
    expect(handoffBtn).not.toBeDisabled()
    // Honest helper text
    expect(screen.getByText(/actual code build runs externally/i)).toBeInTheDocument()
  })

  it('shows "Handed off — ready for build" after successful handoff', async () => {
    await reachSoftwareLane()
    const plan = { title: 'T', summary: 'S', acceptanceCriteria: ['a'], steps: ['b'] }
    vi.mocked(fetch as never)
      .mockImplementationOnce(async () => ({
        ok: true, status: 200, json: async () => ({ result: { status: 'planned', plan } }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true, status: 200, json: async () => ({ result: { status: 'handed_off' } }),
      }))

    fireEvent.click(screen.getByRole('button', { name: /plan build/i }))
    await waitFor(() => screen.getByText('T'))
    fireEvent.click(screen.getByRole('button', { name: /hand off to build/i }))
    await waitFor(() => expect(screen.getByText(/handed off.*ready for build/i)).toBeInTheDocument())
  })

  it('shows honest error when "Plan build" fetch fails', async () => {
    await reachSoftwareLane()
    vi.mocked(fetch as never).mockImplementationOnce(async () => ({
      ok: false, status: 500, json: async () => ({ error: 'Server error' }),
    }))
    fireEvent.click(screen.getByRole('button', { name: /plan build/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
