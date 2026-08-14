import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

import { BrandPersonas } from '../BrandPersonas'

// BrandPersonas takes no props, but it cannot be driven by the fixture sweep
// either: its destructive control (Save Persona) only renders after a business
// is clicked, and `driveFixture` has no way to click before mounting a fixture.
// A VISIBLE-half-only fixture would report this surface compliant while the
// blank-overwrite write stayed live — the exact failure shape UNI-2505 records.
// So this is the per-component test, following DecisionLog.test.tsx. [UNI-2486]
//
// THE HAZARD THIS FILE EXISTS FOR
//
// `selectBusiness` seeds `emptyPersona(key)` when `personas[key]` is missing.
// After a failed read EVERY key is missing, so pressing Save would PUT a BLANK
// persona over a real one. Note that this is worst when the map is EMPTY, which
// is when a conventional `staleRead` flag is FALSE — hence the Save gate keys on
// `loadError`, and the assertions below do too.

const PERSONA = {
  id: 'p-dr',
  founderId: 'f1',
  businessKey: 'dr',
  toneOfVoice: 'Retained tone of voice',
  targetAudience: 'Retained audience',
  industryKeywords: ['water damage'],
  uniqueSellingPoints: ['24/7'],
  characterMale: { name: 'Sam', age: 40, role: 'Technician', appearance: '', personality: '' },
  characterFemale: { name: 'Alex', age: 35, role: 'Manager', appearance: '', personality: '' },
  colourPrimary: '#ef4444',
  colourSecondary: '#111111',
  doList: ['Be direct'],
  dontList: ['Overpromise'],
  sampleContent: { instagram: '', linkedin: '', facebook: '', tiktok: '' },
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
}

// The mount loader auto-seeds CARSI and RestoreAssist with a POST when either is
// absent from the read. Every healthy fixture below therefore returns both keys,
// so a seed write can never be mistaken for the Save write under assertion.
function personasBody(extra: Array<Record<string, unknown>> = []) {
  return {
    personas: [
      { ...PERSONA, id: 'p-carsi', businessKey: 'carsi' },
      { ...PERSONA, id: 'p-restore', businessKey: 'restore' },
      ...extra,
    ],
  }
}

function writeCount(fetchMock: ReturnType<typeof vi.fn>): number {
  return fetchMock.mock.calls.filter((call) => {
    const method = (call[1] as { method?: string } | undefined)?.method
    return method === 'PUT' || method === 'POST'
  }).length
}

beforeEach(() => {
  vi.clearAllMocks()
})

// restoreAllMocks rather than clearAllMocks: the stubbed global `fetch` must be
// torn down between cases, or a later test inherits the previous case's mock.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('BrandPersonas — a failed read must not authorise a blank overwrite [UNI-2486]', () => {
  // MUTATION CONTROL. Restore the console-only catch (drop `loadError`, the
  // `handleSave` guard and the button gate) and this case fails three
  // independent ways: no `role="alert"` renders, Save is enabled, and the PUT
  // goes out — writing an empty persona over Disaster Recovery's real one.
  it('takes Save offline and issues no write when the personas read fails', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('network down') })
    vi.stubGlobal('fetch', fetchMock)

    render(<BrandPersonas />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/failed read, not an absence of personas/i)).toBeInTheDocument()

    // Open the editor for a business whose persona the read could not confirm.
    fireEvent.click(screen.getByText('Disaster Recovery'))

    const save = await screen.findByRole('button', { name: /save persona/i })
    expect(save).toBeDisabled()

    // Behavioural half: clicking it must not write, not merely look disabled.
    fireEvent.click(save)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(writeCount(fetchMock)).toBe(0)
  })

  it('treats a non-ok read the same way as a rejection', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<BrandPersonas />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Disaster Recovery'))
    expect(await screen.findByRole('button', { name: /save persona/i })).toBeDisabled()
    expect(writeCount(fetchMock)).toBe(0)
  })

  // NEGATIVE CONTROL. Without this, "always disable Save" would pass the cases
  // above. A healthy read must leave the write path fully working.
  it('leaves Save live and writes exactly once when the read succeeds', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT' || init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ persona: PERSONA }) }
      }
      return { ok: true, status: 200, json: async () => personasBody([PERSONA]) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<BrandPersonas />)

    await waitFor(() => {
      expect(screen.getByText('Disaster Recovery')).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).toBeNull()
    // Stage-1 negative control: a healthy read must not be marked stale.
    expect(document.querySelector('[data-stale-read="true"]')).toBeNull()

    fireEvent.click(screen.getByText('Disaster Recovery'))
    const save = await screen.findByRole('button', { name: /save persona/i })
    expect(save).not.toBeDisabled()

    fireEvent.click(save)
    await waitFor(() => {
      expect(writeCount(fetchMock)).toBe(1)
    })
  })

  // The unread map must not be reported as "this business has no persona".
  it('does not render a missing-persona verdict for every business after a failed read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))

    render(<BrandPersonas />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    // '—' is the "no persona" badge; '?' is the honest unknown.
    expect(screen.queryAllByText('—')).toHaveLength(0)
    expect(screen.queryAllByText('?').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByText('Disaster Recovery'))
    await waitFor(() => {
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
    expect(screen.queryByText('Missing')).toBeNull()
  })

  it('marks a retained map stale on a failed refresh and clears it on recovery', async () => {
    let failNext = false
    const fetchMock = vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT' || init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ persona: PERSONA }) }
      }
      if (failNext) throw new Error('refresh failed')
      return { ok: true, status: 200, json: async () => personasBody([PERSONA]) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<BrandPersonas />)
    await waitFor(() => expect(screen.getByText('Disaster Recovery')).toBeInTheDocument())
    expect(document.querySelector('[data-stale-read="true"]')).toBeNull()

    failNext = true
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull()
    })
    // Retained payload survives, marked rather than blanked.
    expect(screen.getByText('Disaster Recovery')).toBeInTheDocument()
    expect(document.querySelector('[data-stale-read-notice="true"]')).not.toBeNull()

    failNext = false
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).toBeNull()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // THE RECOVERY OVERWRITE. Raised by review on PR #981, and a real hole in the
  // first version of this fix: the Save gate only DELAYED the blank overwrite.
  // Sequence — read fails, founder clicks a business (draft seeded blank because
  // the map is unread), refresh succeeds, `loadError` clears, Save re-enables —
  // and the blank draft from the outage is still sitting there, now writable
  // over the persona the recovered read just returned.
  //
  // MUTATION CONTROL: delete the `draftSynthesisedRef` rebuild block from
  // `loadPersonas` and this case fails on the PUT body — the write goes out with
  // empty fields instead of the recovered ones.
  it('rebuilds a draft synthesised during an outage, so recovery cannot be overwritten with blanks', async () => {
    let failNext = true
    const fetchMock = vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT' || init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ persona: PERSONA }) }
      }
      if (failNext) throw new Error('network down')
      return { ok: true, status: 200, json: async () => personasBody([PERSONA]) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<BrandPersonas />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    // Select while the map is unread — this is where the blank draft is born.
    fireEvent.click(screen.getByText('Disaster Recovery'))
    expect(await screen.findByRole('button', { name: /save persona/i })).toBeDisabled()

    // Recover.
    failNext = false
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save persona/i })).not.toBeDisabled()
    })

    // The editor must now hold the RECOVERED persona, not the blank guess.
    await waitFor(() => {
      expect(screen.getByDisplayValue('Retained tone of voice')).toBeInTheDocument()
    })

    // And saving must write the recovered values, not empty ones.
    fireEvent.click(screen.getByRole('button', { name: /save persona/i }))
    await waitFor(() => expect(writeCount(fetchMock)).toBe(1))

    const put = fetchMock.mock.calls.find(
      (call) => (call[1] as { method?: string } | undefined)?.method === 'PUT',
    )
    const body = JSON.parse(String((put![1] as { body?: string }).body)) as { toneOfVoice: string }
    expect(body.toneOfVoice).toBe('Retained tone of voice')
    expect(body.toneOfVoice).not.toBe('')
  })

  // The in-flight case. The fixture sweep catches clear-on-entry with stage 2b;
  // a per-component test has none, so it is written by hand. Moving
  // `setLoadError(null)` to loader entry fails exactly this case — the mark
  // would drop, and Save would re-enable, while the map was still the unread one.
  it('keeps the mark and Save offline while a recovery read is in flight', async () => {
    let release: (() => void) | null = null
    let failNext = false
    let holdNext = false

    const fetchMock = vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT' || init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ persona: PERSONA }) }
      }
      if (failNext) throw new Error('refresh failed')
      if (holdNext) {
        await new Promise<void>((resolve) => { release = resolve })
      }
      return { ok: true, status: 200, json: async () => personasBody([PERSONA]) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<BrandPersonas />)
    await waitFor(() => expect(screen.getByText('Disaster Recovery')).toBeInTheDocument())

    failNext = true
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull()
    })

    fireEvent.click(screen.getByText('Disaster Recovery'))
    expect(await screen.findByRole('button', { name: /save persona/i })).toBeDisabled()

    // Retry, holding the response open.
    failNext = false
    holdNext = true
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => expect(release).not.toBeNull())
    expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: /save persona/i })).toBeDisabled()

    release!()
    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).toBeNull()
    })
    expect(screen.getByRole('button', { name: /save persona/i })).not.toBeDisabled()
  })
})
