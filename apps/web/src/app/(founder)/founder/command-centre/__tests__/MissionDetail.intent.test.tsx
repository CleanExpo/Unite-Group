import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DeliveryMissionView } from '@/lib/command-centre/delivery-types'
import { MissionDetail } from '../MissionDetail'

const DRAFT = '---\nstatus: draft\nauthor: a@b.c\ncreated: 2026-09-24T00:00:00.000Z\ntask: mission-1\n---\n# Intent: Portal\n\n## Problem\nP\n'
const ACCEPTED = `${DRAFT.replace('status: draft', 'status: accepted')}\nedited`

function mission(overrides: Partial<DeliveryMissionView> = {}): DeliveryMissionView {
  return {
    taskId: 'mission-1', title: 'Customer workspace', objective: 'A customer workspace', projectKey: 'Unite-Group',
    status: 'proposed', stage: 'captured', lane: 'software', summary: 'A customer workspace',
    specVersion: null, spec: null, questions: [{ id: 'audience', label: 'Who is it for?' }], answers: { audience: 'Contractors' },
    harness: [], owner: { label: 'SPM', status: 'required' }, buildOwner: null,
    nextAction: { kind: 'resume', owner: 'Margot', label: 'Continue preparation' },
    blockers: [], previewUrl: null, updatedAt: '2026-09-05T03:00:00Z', receipts: [], sourceRefs: [],
    intent: null, intentReady: true, ...overrides,
  }
}

beforeEach(() => { vi.restoreAllMocks() })

describe('MissionDetail Capture Intent panel', () => {
  it('is hidden until the mission is ready for an intent', () => {
    render(<MissionDetail mission={mission({ intentReady: false })} busy={false} stale={false} onAction={vi.fn()} />)
    expect(screen.queryByRole('region', { name: 'Capture Intent' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Draft intent.md' })).not.toBeInTheDocument()
  })

  it('drafts, lets the founder edit, accepts, then copies the accepted markdown', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, status: 200, json: async () => ({ markdown: DRAFT }) }
      return { ok: true, status: 200, json: async () => ({ markdown: ACCEPTED, acceptedAt: '2026-09-24T01:00:00.000Z' }) }
    })
    vi.stubGlobal('fetch', fetchMock as never)
    const onAction = vi.fn()

    render(<MissionDetail mission={mission()} busy={false} stale={false} onAction={onAction} />)
    const panel = screen.getByRole('region', { name: 'Capture Intent' })
    expect(panel).toHaveTextContent('Describe it in your own words → answer the questions → check the intent → accept.')
    fireEvent.click(screen.getByRole('button', { name: 'Draft intent.md' }))

    const editor = await screen.findByLabelText('intent.md')
    expect((editor as HTMLTextAreaElement).value).toBe(DRAFT)
    fireEvent.change(editor, { target: { value: `${DRAFT}\nedited` } })
    fireEvent.click(screen.getByRole('button', { name: 'Accept intent' }))
    await waitFor(() => expect(screen.getByText(/^Accepted /)).toBeInTheDocument())

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(put?.[0]).toBe('/api/command-centre/intent')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ taskId: 'mission-1', markdown: `${DRAFT}\nedited` })

    fireEvent.click(screen.getByRole('button', { name: 'Copy intent.md' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ACCEPTED))
    expect(screen.queryByRole('button', { name: 'Accept intent' })).not.toBeInTheDocument()
    // Existing mission actions still render and are unaffected.
    expect(screen.getByRole('button', { name: 'Continue with Margot' })).toBeEnabled()
    expect(onAction).not.toHaveBeenCalled()
  })

  it('shows a stored accepted intent with Copy and Revise back to an editable draft', () => {
    render(<MissionDetail mission={mission({ intent: { status: 'accepted', markdown: ACCEPTED, acceptedAt: '2026-09-24T01:00:00.000Z', author: 'a@b.c' } })} busy={false} stale={false} onAction={vi.fn()} />)
    expect(screen.getByText(/^Accepted /)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy intent.md' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Revise' }))
    const editor = screen.getByLabelText('intent.md') as HTMLTextAreaElement
    expect(editor.readOnly).toBe(false)
    expect(editor.value).toBe(ACCEPTED)
    expect(screen.getByRole('button', { name: 'Accept intent' })).toBeInTheDocument()
  })

  it('shows a stored draft as editable', () => {
    render(<MissionDetail mission={mission({ intent: { status: 'draft', markdown: DRAFT } })} busy={false} stale={false} onAction={vi.fn()} />)
    expect((screen.getByLabelText('intent.md') as HTMLTextAreaElement).value).toBe(DRAFT)
    expect(screen.getByRole('button', { name: 'Accept intent' })).toBeInTheDocument()
  })

  it('shows the API reason when accept is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ error: 'This mission changed while you were working. Reload it and try again.' }) })) as never)
    render(<MissionDetail mission={mission({ intent: { status: 'draft', markdown: DRAFT } })} busy={false} stale={false} onAction={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Accept intent' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Reload it and try again'))
    expect(screen.queryByRole('button', { name: 'Copy intent.md' })).not.toBeInTheDocument()
  })
})
