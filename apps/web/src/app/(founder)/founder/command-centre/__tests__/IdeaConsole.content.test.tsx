import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IdeaConsole } from '../IdeaConsole'

beforeEach(() => { vi.restoreAllMocks() })

// Drives the component through idea → clarify → classify (lane=content) then tests content actions
function setupContentLane(fetchHandlers: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = new URL(url, 'https://t').pathname
    const data = fetchHandlers[path]
    return {
      ok: data !== undefined,
      status: data !== undefined ? 200 : 500,
      json: async () => data ?? { error: 'Server error' },
    }
  }) as never)
}

const baseHandlers = {
  '/api/command-centre/ideas': { task: { id: 't1', title: 'Draft a post', status: 'proposed' } },
  '/api/command-centre/clarify': { questions: ['Who is the target audience?'] },
  '/api/command-centre/clarify/answers': {},
  '/api/command-centre/classify': {
    routing: {
      lane: 'content',
      confidence: 0.9,
      rationale: 'Content generation signal.',
      planBuild: [{ title: 'Generate variants', detail: 'AI drafts 3 variants.' }],
      planDistribute: [{ title: 'Publish', detail: 'Push to social.' }],
    },
  },
}

async function renderToContentLane() {
  render(<IdeaConsole projects={[]} />)
  fireEvent.change(screen.getByLabelText(/idea/i), { target: { value: 'Draft a social post' } })
  fireEvent.click(screen.getByRole('button', { name: /submit idea/i }))
  await waitFor(() => screen.getByRole('button', { name: /clarify/i }))
  fireEvent.click(screen.getByRole('button', { name: /clarify/i }))
  await waitFor(() => screen.getByText('Who is the target audience?'))
  fireEvent.change(screen.getByLabelText('Who is the target audience?'), { target: { value: 'SMBs' } })
  fireEvent.click(screen.getByRole('button', { name: /submit answers/i }))
  await waitFor(() => screen.getByRole('button', { name: /draft content/i }))
}

describe('IdeaConsole content lane', () => {
  it('shows Draft content button when lane is content', async () => {
    setupContentLane(baseHandlers)
    await renderToContentLane()
    expect(screen.getByRole('button', { name: /draft content/i })).toBeInTheDocument()
  })

  it('Publish button is disabled before build', async () => {
    setupContentLane(baseHandlers)
    await renderToContentLane()
    const publishBtn = screen.getByRole('button', { name: /publish/i })
    expect(publishBtn).toBeDisabled()
  })

  it('shows generated variants count after build', async () => {
    setupContentLane({
      ...baseHandlers,
      '/api/command-centre/lanes/content/build': {
        result: { status: 'built', count: 3, ids: ['id1', 'id2', 'id3'] },
      },
    })
    await renderToContentLane()
    fireEvent.click(screen.getByRole('button', { name: /draft content/i }))
    await waitFor(() => expect(screen.getByText(/3 variants generated/i)).toBeInTheDocument())
  })

  it('shows Published message after distribute', async () => {
    setupContentLane({
      ...baseHandlers,
      '/api/command-centre/lanes/content/build': {
        result: { status: 'built', count: 3, ids: ['id1', 'id2', 'id3'] },
      },
      '/api/command-centre/lanes/content/distribute': {
        result: { status: 'distributed', postsCreated: 3 },
      },
    })
    await renderToContentLane()
    fireEvent.click(screen.getByRole('button', { name: /draft content/i }))
    await waitFor(() => screen.getByRole('button', { name: /publish/i, hidden: false }))
    // Wait until publish button is enabled (after build completes)
    await waitFor(() => expect(screen.getByRole('button', { name: /publish/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /publish/i }))
    await waitFor(() => expect(screen.getByText(/published — 3 posts/i)).toBeInTheDocument())
  })

  it('names the brand-not-connected blocker explicitly after build', async () => {
    setupContentLane({
      ...baseHandlers,
      '/api/command-centre/lanes/content/build': {
        result: { status: 'not_connected', reason: 'No social brand linked yet' },
      },
    })
    await renderToContentLane()
    fireEvent.click(screen.getByRole('button', { name: /draft content/i }))
    await waitFor(() =>
      expect(
        screen.getByText(/brand not connected — no social brand linked yet/i),
      ).toBeInTheDocument(),
    )
  })

  it('shows a draft-first prerequisite hint before any content is built', async () => {
    setupContentLane(baseHandlers)
    await renderToContentLane()
    // Nothing drafted yet: the panel must say so honestly rather than imply readiness.
    expect(screen.getByText(/draft content first/i)).toBeInTheDocument()
  })

  it('clears the draft-first hint once content is built', async () => {
    setupContentLane({
      ...baseHandlers,
      '/api/command-centre/lanes/content/build': {
        result: { status: 'built', count: 3, ids: ['id1', 'id2', 'id3'] },
      },
    })
    await renderToContentLane()
    expect(screen.getByText(/draft content first/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /draft content/i }))
    await waitFor(() => expect(screen.getByText(/3 variants generated/i)).toBeInTheDocument())
    expect(screen.queryByText(/draft content first/i)).not.toBeInTheDocument()
  })

  it('shows error state on build failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const path = new URL(url, 'https://t').pathname
      if (path === '/api/command-centre/ideas') {
        return { ok: true, status: 200, json: async () => baseHandlers['/api/command-centre/ideas'] }
      }
      if (path === '/api/command-centre/clarify') {
        return { ok: true, status: 200, json: async () => ({ questions: ['Who is the target audience?'] }) }
      }
      if (path === '/api/command-centre/clarify/answers') {
        return { ok: true, status: 200, json: async () => ({}) }
      }
      if (path === '/api/command-centre/classify') {
        return { ok: true, status: 200, json: async () => baseHandlers['/api/command-centre/classify'] }
      }
      if (path === '/api/command-centre/lanes/content/build') {
        return { ok: false, status: 500, json: async () => ({ error: 'AI quota exceeded' }) }
      }
      return { ok: false, status: 500, json: async () => ({ error: 'Unknown' }) }
    }) as never)

    await renderToContentLane()
    fireEvent.click(screen.getByRole('button', { name: /draft content/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
