import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

// Founder route (NOT /preview/) — so the preview fallback must never engage.
vi.mock('next/navigation', () => ({ usePathname: () => '/founder/knowledge-console' }))

import { KnowledgeConsoleClient } from '../KnowledgeConsoleClient'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('KnowledgeConsoleClient — no fabricated data on the founder route', () => {
  it('renders an honest error (no mock projects) when the projects API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText(/knowledge unavailable/i)).toBeDefined()
    })
    // No-Invaders #1: a failed load must NOT render fabricated fallback projects as live data.
    expect(screen.queryByText('RestoreAssist')).toBeNull()
    expect(screen.queryByText('Synthex')).toBeNull()
    expect(screen.getByText('No project selected')).toBeDefined()
  })

  it('renders an honest empty state (no mock projects) when the API returns none', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ projects: [] }),
    } as Response)

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText('No project selected')).toBeDefined()
    })
    expect(screen.queryByText('RestoreAssist')).toBeNull()
    // A successful-but-empty load is not an error.
    expect(screen.queryByText(/knowledge unavailable/i)).toBeNull()
  })
})

// UNI-2496: three independent reads (projects, notes list, note detail) used to
// share ONE error slot that only the projects loader ever cleared. A notes or
// note-detail read that failed once kept its banner after it recovered.
describe('KnowledgeConsoleClient — a recovered read clears its own error', () => {
  const PROJECT = {
    id: 'p1',
    key: 'alpha',
    label: 'Alpha Project',
    description: 'Alpha description',
    note_count: 2,
    status: 'active',
    last_ingested_at: null,
    metadata: {},
  }

  function note(id: string, title: string) {
    return {
      id,
      vault_path: `/02-Projects/alpha/${title}.md`,
      title,
      slug: id,
      project_key: 'alpha',
      note_type: 'project',
      tags: [],
      word_count: 10,
      confidence: 'medium',
      quality: 'draft',
      ai_optimized: false,
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
    }
  }

  function detail(id: string, title: string) {
    return {
      ...note(id, title),
      content: `Body of ${title}`,
      content_html: null,
      frontmatter: {},
      sources: [],
      obsidian_source: null,
      obsidian_mtime: null,
    }
  }

  function ok(body: unknown) {
    return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
  }

  function fail(status = 503) {
    return Promise.resolve({ ok: false, status, json: async () => ({}) } as Response)
  }

  type Route = (url: string) => Promise<Response>

  function mockFetch(route: Route) {
    global.fetch = vi.fn((input: RequestInfo | URL) => route(String(input))) as typeof fetch
  }

  // A response the test releases by hand, so it can arrive after a newer read.
  function held() {
    let release!: (response: Response) => void
    const promise = new Promise<Response>((resolve) => { release = resolve })
    return { promise, release }
  }

  function okResponse(body: unknown) {
    return { ok: true, status: 200, json: async () => body } as Response
  }

  function failResponse(status = 503) {
    return { ok: false, status, json: async () => ({}) } as Response
  }

  // Release a held response and let every promise and state update it starts settle.
  async function releaseAndSettle(response: { release: (r: Response) => void }, value: Response) {
    await act(async () => {
      response.release(value)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  function fetchedUrls() {
    return vi.mocked(global.fetch).mock.calls.map(([input]) => String(input))
  }

  it('clears the notes error once the notes read recovers', async () => {
    mockFetch((url) => {
      if (url.startsWith('/api/knowledge/projects')) return ok({ projects: [PROJECT] })
      if (url.startsWith('/api/knowledge/notes?')) {
        // Fails until the founder searches, then recovers.
        return url.includes('q=') ? ok({ notes: [note('n1', 'Recovered note')] }) : fail()
      }
      if (url === '/api/knowledge/notes/n1') return ok(detail('n1', 'Recovered note'))
      return fail(404)
    })

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText(/Notes API returned 503/)).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText('Search notes'), { target: { value: 'recovered' } })

    await waitFor(() => {
      expect(screen.getByText('Body of Recovered note')).toBeDefined()
    })
    expect(screen.queryByText(/knowledge unavailable/i)).toBeNull()
  })

  it('clears the selected-note error once a note detail read recovers', async () => {
    mockFetch((url) => {
      if (url.startsWith('/api/knowledge/projects')) return ok({ projects: [PROJECT] })
      if (url.startsWith('/api/knowledge/notes?')) {
        return ok({ notes: [note('n1', 'Broken note'), note('n2', 'Working note')] })
      }
      if (url === '/api/knowledge/notes/n1') return fail(500)
      if (url === '/api/knowledge/notes/n2') return ok(detail('n2', 'Working note'))
      return fail(404)
    })

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText(/Note API returned 500/)).toBeDefined()
    })

    fireEvent.click(screen.getByText('Working note'))

    await waitFor(() => {
      expect(screen.getByText('Body of Working note')).toBeDefined()
    })
    expect(screen.queryByText(/knowledge unavailable/i)).toBeNull()
  })

  it('clears the selected-note error when a later notes read leaves no note selected', async () => {
    // No note selected means no detail read: the old detail failure must not linger.
    mockFetch((url) => {
      if (url.startsWith('/api/knowledge/projects')) return ok({ projects: [PROJECT] })
      if (url.startsWith('/api/knowledge/notes?')) {
        return url.includes('q=') ? ok({ notes: [] }) : ok({ notes: [note('n1', 'Broken note')] })
      }
      if (url === '/api/knowledge/notes/n1') return fail(500)
      return fail(404)
    })

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText(/Note API returned 500/)).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText('Search notes'), { target: { value: 'nothing' } })

    await waitFor(() => {
      expect(screen.getByText('No notes indexed')).toBeDefined()
    })
    await waitFor(() => {
      expect(screen.queryByText(/knowledge unavailable/i)).toBeNull()
    })
  })

  it('keeps the error while the notes read is still failing', async () => {
    // Negative control: a read that keeps failing keeps its banner, so a fix
    // that never records the notes error cannot pass. The second read is held
    // and released by hand, so the assertion runs only after it has settled.
    const second = held()
    mockFetch((url) => {
      if (url.startsWith('/api/knowledge/projects')) return ok({ projects: [PROJECT] })
      if (url.startsWith('/api/knowledge/notes?')) return url.includes('q=') ? second.promise : fail()
      return fail(404)
    })

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText(/Notes API returned 503/)).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText('Search notes'), { target: { value: 'still broken' } })

    await waitFor(() => {
      expect(fetchedUrls().some((url) => url.includes('q=still+broken'))).toBe(true)
    })
    await releaseAndSettle(second, failResponse(502))

    // The banner now carries the SECOND read's failure, so it cannot be the first one's leftover.
    expect(screen.getByText(/Notes API returned 502/)).toBeDefined()
    expect(screen.queryByText(/Notes API returned 503/)).toBeNull()
    // The projects read succeeded, so its project is still shown.
    expect(screen.getByText('Alpha Project', { selector: 'h2' })).toBeDefined()
  })

  // UNI-2496 review: a read that was superseded (its effect re-ran and aborted it)
  // must not write anything when its response finally arrives. Its late success
  // would otherwise clear the NEWER read's live error and show stale data.
  it('a late success from a superseded notes read leaves the newer notes error in place', async () => {
    const first = held()
    mockFetch((url) => {
      if (url.startsWith('/api/knowledge/projects')) return Promise.resolve(okResponse({ projects: [PROJECT] }))
      if (url.startsWith('/api/knowledge/notes?')) {
        return url.includes('q=') ? Promise.resolve(failResponse(503)) : first.promise
      }
      if (url === '/api/knowledge/notes/stale') return Promise.resolve(okResponse(detail('stale', 'Stale note')))
      return Promise.resolve(failResponse(404))
    })

    render(<KnowledgeConsoleClient />)

    // The first notes read is in flight; a search supersedes it and the newer read fails.
    await waitFor(() => {
      expect(vi.mocked(global.fetch).mock.calls.some(([input]) => String(input).startsWith('/api/knowledge/notes?'))).toBe(true)
    })
    fireEvent.change(screen.getByPlaceholderText('Search notes'), { target: { value: 'newer' } })
    await waitFor(() => {
      expect(screen.getByText(/Notes API returned 503/)).toBeDefined()
    })

    await releaseAndSettle(first, okResponse({ notes: [note('stale', 'Stale note')] }))

    expect(screen.getByText(/Notes API returned 503/)).toBeDefined()
    expect(screen.queryByText('Stale note')).toBeNull()
  })

  it('a late success from a superseded note-detail read leaves the newer note error in place', async () => {
    const firstDetail = held()
    mockFetch((url) => {
      if (url.startsWith('/api/knowledge/projects')) return Promise.resolve(okResponse({ projects: [PROJECT] }))
      if (url.startsWith('/api/knowledge/notes?')) {
        return Promise.resolve(okResponse({ notes: [note('n1', 'Note One'), note('n2', 'Note Two')] }))
      }
      if (url === '/api/knowledge/notes/n1') return firstDetail.promise
      if (url === '/api/knowledge/notes/n2') return Promise.resolve(failResponse(500))
      return Promise.resolve(failResponse(404))
    })

    render(<KnowledgeConsoleClient />)

    // Note One's detail read is in flight; selecting Note Two supersedes it and that read fails.
    await waitFor(() => {
      expect(vi.mocked(global.fetch).mock.calls.some(([input]) => String(input) === '/api/knowledge/notes/n1')).toBe(true)
    })
    fireEvent.click(screen.getByText('Note Two'))
    await waitFor(() => {
      expect(screen.getByText(/Note API returned 500/)).toBeDefined()
    })

    await releaseAndSettle(firstDetail, okResponse(detail('n1', 'Note One')))

    expect(screen.getByText(/Note API returned 500/)).toBeDefined()
    expect(screen.queryByText('Body of Note One')).toBeNull()
  })
})
