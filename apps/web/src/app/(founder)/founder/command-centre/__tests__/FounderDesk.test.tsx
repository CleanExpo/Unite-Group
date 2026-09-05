import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FounderDesk } from '../FounderDesk'
import { DELIVERY_PRESETS } from '@/lib/command-centre/delivery-presets'

const mission = {
  taskId: '00000000-0000-4000-8000-000000000001', title: 'Customer portal',
  objective: 'Give customers a place to see their job', projectKey: 'RestoreAssist',
  status: 'proposed', stage: 'ready_for_review', summary: 'A customer portal with job updates.',
  specVersion: 'a'.repeat(64), spec: { requirements: ['Show job updates'], acceptanceCriteria: ['A customer can see their own job'], steps: ['Build the portal'], presetIds: [] },
  questions: [], answers: {}, harness: [{ id: 'spm', label: 'Senior project manager', purpose: 'Own delivery', status: 'recommended', assignmentRef: null }],
  owner: { label: 'SPM', status: 'required' }, nextAction: { kind: 'approve', owner: 'founder', label: 'Approve this build' },
  blockers: [], previewUrl: null, updatedAt: '2026-09-05T01:00:00Z', receipts: [],
}

function response(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body }
}

beforeEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

describe('FounderDesk mission journey', () => {
  it('sends an explicitly selected GitHub owner/repository as the persisted project key', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/repositories')) return response({ repositories: [{ fullName: 'OtherOwner/uncommon-project', private: true, archived: false }], status: 'complete', nextCursor: null, incomplete: false, message: '', observedAt: '2026-09-05T00:00:00Z', coverage: 'Connected GitHub account.' })
      return response(init?.method === 'POST' ? { mission: { ...mission, projectKey: 'OtherOwner/uncommon-project' } } : { missions: [], presets: [], source: 'supabase' })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<FounderDesk projects={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /^Business or project/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'OtherOwner/uncommon-project Private' }))
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'Give customers a project workspace' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Customer portal' })).toBeInTheDocument())
    const body = JSON.parse(fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')![1]!.body as string)
    expect(body.projectKey).toBe('OtherOwner/uncommon-project')
    expect(body.action).toBe('prepare')
  })

  it('accepts plain language without presets and moves directly to the prepared spec', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => response(init?.method === 'POST' ? { mission, deduplicated: false } : { missions: [], presets: [], source: 'supabase' }))
    vi.stubGlobal('fetch', fetchMock)
    render(<FounderDesk projects={[{ name: 'RestoreAssist' }]} />)
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'Give customers a place to see their job' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Customer portal' })).toBeInTheDocument())
    expect(screen.getByText('A customer can see their own job')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clarify' })).not.toBeInTheDocument()
    expect(screen.getByText('SPM assignment pending')).toBeInTheDocument()
    const body = JSON.parse(fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')![1]!.body as string)
    expect(body).toMatchObject({ action: 'prepare', idea: 'Give customers a place to see their job', presetIds: [] })
    expect(body).not.toHaveProperty('projectKey')
  })

  it('restores a persisted selection and sends approval for its exact spec version', async () => {
    window.history.replaceState({}, '', `/?mission=${mission.taskId}`)
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => response(init?.method === 'POST' ? { mission: { ...mission, stage: 'queued', nextAction: { kind: 'wait', owner: 'SPM', label: 'Waiting for a worker' } } } : { missions: [mission], presets: [], source: 'supabase' }))
    vi.stubGlobal('fetch', fetchMock)
    render(<FounderDesk projects={[]} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve this build' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Approve this build' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/command-centre/missions', expect.objectContaining({ body: JSON.stringify({ action: 'approve', taskId: mission.taskId, specVersion: mission.specVersion }) })))
  })

  it('keeps saved questions visible after a failed answer save', async () => {
    const questioning = { ...mission, stage: 'needs_clarification', questions: [{ id: 'audience', label: 'Who will use this?' }], nextAction: { kind: 'answer', owner: 'founder', label: 'Answer a business question' } }
    window.history.replaceState({}, '', `/?mission=${mission.taskId}`)
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => init?.method === 'POST' ? response({ error: 'Your answers could not be saved.' }, false) : response({ missions: [questioning], presets: [], source: 'supabase' })))
    render(<FounderDesk projects={[]} />)
    await waitFor(() => screen.getByLabelText('Who will use this?'))
    fireEvent.change(screen.getByLabelText('Who will use this?'), { target: { value: 'Our customers' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save answers and continue' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Your answers could not be saved.'))
    expect(screen.getByLabelText('Who will use this?')).toHaveValue('Our customers')
    expect(screen.queryByRole('button', { name: 'Approve this build' })).not.toBeInTheDocument()
  })

  it('does not let a late preparation response replace a fresh idea', async () => {
    let finish: (value: ReturnType<typeof response>) => void = () => {}
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => init?.method === 'POST' ? new Promise(resolve => { finish = resolve }) : Promise.resolve(response({ missions: [], presets: [], source: 'supabase' }))))
    render(<FounderDesk projects={[]} />)
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'First idea' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    fireEvent.click(screen.getByRole('button', { name: 'New idea' }))
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'Second idea' } })
    finish(response({ mission }))
    await waitFor(() => expect(screen.getByLabelText('Your idea')).toHaveValue('Second idea'))
    expect(screen.queryByRole('heading', { name: 'Customer portal' })).not.toBeInTheDocument()
  })

  it('never turns a legacy done status into verified live delivery or renders unsafe links', async () => {
    window.history.replaceState({}, '', `/?mission=${mission.taskId}`)
    vi.stubGlobal('fetch', vi.fn(async () => response({ missions: [{ ...mission, status: 'done', stage: 'review', previewUrl: 'javascript:alert(1)', nextAction: { kind: 'wait', owner: 'SPM', label: 'Independent review required' } }], presets: [], source: 'supabase' })))
    render(<FounderDesk projects={[]} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Customer portal' })).toBeInTheDocument())
    expect(screen.queryByText('Live and verified')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open preview' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Selected mission' })).getByText('Independent review required')).toBeInTheDocument()
  })

  it('keeps shared recipe requirements when deselecting one capability and never executes on a toggle', async () => {
    const fetchMock = vi.fn(async () => response({ missions: [], presets: DELIVERY_PRESETS, source: 'supabase' }))
    vi.stubGlobal('fetch', fetchMock)
    render(<FounderDesk projects={[]} />)
    await waitFor(() => screen.getByText('Add capabilities'))
    fireEvent.click(screen.getByText('Add capabilities'))
    const portal = screen.getByRole('button', { name: 'Customer portal Requires new work' })
    const approval = screen.getByRole('button', { name: 'Review & approval Ready to reuse' })
    fireEvent.click(portal)
    fireEvent.click(approval)
    const sharedRequirement = DELIVERY_PRESETS.find(p => p.id === 'access-control')!.requirements[0]
    expect(screen.getAllByText(sharedRequirement)).toHaveLength(1)
    fireEvent.click(portal)
    expect(screen.getByText(sharedRequirement)).toBeInTheDocument()
    expect(screen.queryByText(DELIVERY_PRESETS.find(p => p.id === 'customer-portal')!.requirements[0])).not.toBeInTheDocument()
    fireEvent.click(approval)
    expect(screen.queryByText(sharedRequirement)).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps an unsent idea when switching operations views and clears it on New idea', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ missions: [mission], presets: [], source: 'supabase' })))
    render(<FounderDesk projects={[]} />)
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'My unsent idea' } })
    fireEvent.click(screen.getByRole('button', { name: 'Operations floor' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Mission operations floor' })).toHaveTextContent('Customer portal'))
    fireEvent.click(screen.getByRole('button', { name: 'Founder desk' }))
    expect(screen.getByLabelText('Your idea')).toHaveValue('My unsent idea')
    fireEvent.click(screen.getByRole('button', { name: 'New idea' }))
    expect(screen.getByLabelText('Your idea')).toHaveValue('')
  })

  it('retries an uncertain intake with the same request identity', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return response({ missions: [], presets: [], source: 'supabase' })
      bodies.push(JSON.parse(init.body as string))
      if (bodies.length === 1) throw new Error('Connection interrupted')
      return response({ mission })
    }))
    render(<FounderDesk projects={[]} />)
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'One durable mission' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    await waitFor(() => screen.getByRole('alert'))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[0].clientRequestId).toBe(bodies[1].clientRequestId)
  })

  it('retains history but disables decisions after a failed refresh', async () => {
    window.history.replaceState({}, '', `/?mission=${mission.taskId}`)
    let reads = 0
    vi.stubGlobal('fetch', vi.fn(async () => ++reads === 1 ? response({ missions: [mission], presets: [], source: 'supabase' }) : response({ error: 'History is unavailable' }, false)))
    render(<FounderDesk projects={[]} />)
    await waitFor(() => screen.getByRole('button', { name: 'Approve this build' }))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve this build' })).toBeDisabled())
    expect(screen.getByRole('heading', { name: 'Customer portal' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('History is unavailable')
  })

  it('answers the project question, then only the new business questions, and reaches the prepared spec', async () => {
    const projectQuestion = { ...mission, projectKey: null, spec: null, specVersion: null, stage: 'needs_clarification', questions: [{ id: 'project', label: 'Which business or project is this idea for?' }], answers: {}, nextAction: { kind: 'answer', owner: 'You', label: 'Choose the business' } }
    const businessQuestion = { ...projectQuestion, projectKey: 'Unite-Group', questions: [{ id: 'q1', label: 'Who will use this?' }], answers: { project: 'Unite-Group' } }
    const writes: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return response({ missions: [], presets: [], source: 'supabase' })
      const body = JSON.parse(init.body as string)
      writes.push(body)
      if (body.action === 'prepare') return response({ mission: projectQuestion })
      if (writes.length === 2) return response({ mission: businessQuestion })
      // Mirror the server's strict current-question check, rather than accepting stale project keys.
      if (JSON.stringify(Object.keys(body.answers)) !== JSON.stringify(['q1'])) return response({ error: 'An answer does not match the current questions.' }, false)
      return response({ mission })
    }))
    render(<FounderDesk projects={[]} />)
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'Build a customer workspace' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    await waitFor(() => screen.getByLabelText('Which business or project is this idea for?'))
    fireEvent.change(screen.getByLabelText('Which business or project is this idea for?'), { target: { value: 'Unite-Group' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save answers and continue' }))
    await waitFor(() => screen.getByLabelText('Who will use this?'))
    expect(screen.queryByLabelText('Which business or project is this idea for?')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Who will use this?'), { target: { value: 'Our customers' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save answers and continue' }))
    await waitFor(() => screen.getByRole('button', { name: 'Approve this build' }))
    expect(writes[1].answers).toEqual({ project: 'Unite-Group' })
    expect(writes[2].answers).toEqual({ q1: 'Our customers' })
  })

  it('reopens interrupted work for a new specification decision without automatically requeueing it', async () => {
    window.history.replaceState({}, '', `/?mission=${mission.taskId}`)
    const recoveredVersion = 'b'.repeat(64)
    const blocked = { ...mission, status: 'blocked', stage: 'failed', nextAction: { kind: 'resume', owner: 'Margot', label: 'Prepare a fresh build decision' } }
    const writes: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return response({ missions: [blocked], presets: [], source: 'supabase' })
      const body = JSON.parse(init.body as string)
      writes.push(body)
      return response({ mission: { ...mission, specVersion: recoveredVersion } })
    }))
    render(<FounderDesk projects={[]} />)
    await waitFor(() => screen.getByRole('button', { name: 'Continue with Margot' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Margot' }))
    await waitFor(() => screen.getByRole('button', { name: 'Approve this build' }))
    expect(writes).toEqual([{ action: 'resume', taskId: mission.taskId }])
    fireEvent.click(screen.getByRole('button', { name: 'Approve this build' }))
    await waitFor(() => expect(writes).toHaveLength(2))
    expect(writes[1]).toEqual({ action: 'approve', taskId: mission.taskId, specVersion: recoveredVersion })
  })
})
