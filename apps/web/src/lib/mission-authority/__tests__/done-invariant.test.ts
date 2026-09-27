import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  getTaskById: vi.fn(),
  updateTaskStatusGuarded: vi.fn(),
  appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/approvals', () => ({ listApprovalsForTask: vi.fn() }))
vi.mock('@/lib/command-centre/validation', () => ({ getValidationSummary: vi.fn() }))
vi.mock('@/lib/integrations/linear', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/integrations/linear')>()
  return { ...actual, fetchIssue: vi.fn(), fetchTeamStates: vi.fn(), updateIssueState: vi.fn() }
})

import { getUser } from '@/lib/supabase/server'
import { getTaskById, updateTaskStatusGuarded } from '@/lib/command-centre/tasks'
import { getValidationSummary } from '@/lib/command-centre/validation'
import { fetchIssue, fetchTeamStates, updateIssueState } from '@/lib/integrations/linear'
import { PATCH as patchQueueTask } from '@/app/api/command-centre/queue/[id]/route'
import { PATCH as patchLinearIssue } from '@/app/api/linear/issues/route'
import { checkDoneAllowed } from '../done-invariant'

// UNI-2779 was moved to Done while its own description said part of the work
// was held back for the founder and listed conflicts it had not changed. This
// is that shape, kept verbatim enough to be the regression fixture.
const UNI_2779_HISTORICAL = [
  '## What shipped',
  'The build-authority envelope: build steps run without re-asking; protected actions stop at the shims.',
  '',
  '## Held back: the "do not ask" half (needs founder)',
  'The runner prompt still hand-writes its rules. Rendering them from the policy changes the control plane.',
  '',
  '## Conflicts found, not changed',
  '- runner.mjs says "never deploy" while the policy grants preview deploys.',
  '',
  '## Acceptance',
  '- [x] Build steps proceed with no stop',
  '- [ ] The runner never asks the founder about a build step',
].join('\n')

const CLEAN_ACCEPTANCE = [
  '## What shipped',
  'Mission authority v2, may(), the rendered runner prompt and the done invariant.',
  '',
  '## Acceptance',
  '- [x] Build steps continue without a founder question',
  '- [x] Protected actions escalate before they run',
  '',
  'Notes: the old flow was blocked by review until the fixes landed (lower-case prose is not a status marker).',
].join('\n')

describe('checkDoneAllowed', () => {
  it('refuses the UNI-2779 historical shape', () => {
    const result = checkDoneAllowed(UNI_2779_HISTORICAL)
    expect(result.allowed).toBe(false)
    expect(result.blockers.join('\n')).toMatch(/held back/i)
    expect(result.blockers.join('\n')).toMatch(/unchecked/i)
  })

  it('allows a clean acceptance', () => {
    expect(checkDoneAllowed(CLEAN_ACCEPTANCE)).toEqual({ allowed: true, blockers: [] })
  })

  it.each([
    ['NOT MET', 'Criterion 3: NOT MET'],
    ['HELD BACK', 'Release: HELD BACK pending review'],
    ['Held back', 'Held back for the founder'],
    ['BLOCKED', 'Status: BLOCKED on credentials'],
    ['UNVERIFIED', 'Live walk [UNVERIFIED]'],
  ])('refuses %s', (_marker, line) => {
    const result = checkDoneAllowed(`## Summary\n${line}\n`)
    expect(result.allowed).toBe(false)
    expect(result.blockers).toHaveLength(1)
  })

  it.each(['Acceptance criteria', 'Closure', 'Definition of Done'])('refuses an unchecked box under a "%s" heading', (heading) => {
    const result = checkDoneAllowed(`### ${heading}\n- [x] one\n* [ ] two\n`)
    expect(result.allowed).toBe(false)
    expect(result.blockers[0]).toContain('two')
  })

  it('does not treat an unchecked box outside an acceptance/closure section as a blocker', () => {
    expect(checkDoneAllowed('## Follow-ups\n- [ ] later idea\n').allowed).toBe(true)
  })

  it('refuses the directive markers REQUIRED FOLLOW-UP and FAILED', () => {
    expect(checkDoneAllowed('Gate: REQUIRED FOLLOW-UP on the canary').allowed).toBe(false)
    expect(checkDoneAllowed('Live walk: FAILED').allowed).toBe(false)
    expect(checkDoneAllowed('the retry failed once, then passed').allowed).toBe(true)
  })

  it('treats empty or missing text as nothing to refuse', () => {
    expect(checkDoneAllowed('')).toEqual({ allowed: true, blockers: [] })
    expect(checkDoneAllowed(undefined as unknown as string)).toEqual({ allowed: true, blockers: [] })
  })
})

describe('wired: cc_tasks mark-done (PATCH /api/command-centre/queue/[id])', () => {
  const params = Promise.resolve({ id: 'task-1' })
  const req = () => new Request('https://app.test/api/command-centre/queue/task-1', { method: 'PATCH', body: JSON.stringify({ status: 'done' }) })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getValidationSummary).mockResolvedValue({ canComplete: true, failed: [], pending: [], byGate: {} } as never)
    vi.mocked(updateTaskStatusGuarded).mockResolvedValue({ id: 'task-1', status: 'done' } as never)
  })

  it('refuses done while the acceptance text is held back, and writes nothing', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'running', objective: UNI_2779_HISTORICAL, metadata: {} } as never)
    const res = await patchQueueTask(req(), { params })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/acceptance/i)
    expect(body.blockers.length).toBeGreaterThan(0)
    expect(updateTaskStatusGuarded).not.toHaveBeenCalled()
  })

  it('reads metadata.acceptance as acceptance text too', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'running', objective: 'Ship it', metadata: { acceptance: 'Walk live: NOT MET' } } as never)
    const res = await patchQueueTask(req(), { params })
    expect(res.status).toBe(409)
    expect(updateTaskStatusGuarded).not.toHaveBeenCalled()
  })

  it('reads the task title too — a title-only marker refuses done', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'running', title: 'Status: BLOCKED on credentials', objective: CLEAN_ACCEPTANCE, metadata: {} } as never)
    const res = await patchQueueTask(req(), { params })
    expect(res.status).toBe(409)
    expect(updateTaskStatusGuarded).not.toHaveBeenCalled()
  })

  it('allows done for a clean acceptance', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'running', objective: CLEAN_ACCEPTANCE, metadata: {} } as never)
    const res = await patchQueueTask(req(), { params })
    expect(res.status).toBe(200)
    expect(updateTaskStatusGuarded).toHaveBeenCalledOnce()
  })
})

describe('wired: founder Linear state change (PATCH /api/linear/issues)', () => {
  const STATES = [{ id: 'team-uni', key: 'UNI', states: { nodes: [
    { id: 's-done', name: 'Done', type: 'completed' },
    { id: 's-prog', name: 'In Progress', type: 'started' },
  ] } }]
  const req = (columnId: string, stateId: string) => new Request('https://app.test/api/linear/issues', {
    method: 'PATCH',
    body: JSON.stringify({ issueId: 'UNI-2779', columnId, teamKey: 'UNI', stateMap: { UNI: { [columnId]: stateId } } }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LINEAR_API_KEY', 'k')
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(fetchTeamStates).mockResolvedValue(STATES as never)
  })

  it('refuses moving an issue to Done while its description is held back', async () => {
    vi.mocked(fetchIssue).mockResolvedValue({ id: 'UNI-2779', description: UNI_2779_HISTORICAL } as never)
    const res = await patchLinearIssue(req('done', 's-done'))
    expect(res.status).toBe(409)
    expect((await res.json()).blockers.length).toBeGreaterThan(0)
    expect(fetchIssue).toHaveBeenCalledWith('UNI-2779')
    expect(updateIssueState).not.toHaveBeenCalled()
  })

  it('refuses a Done state reached through a relabelled column (state type decides, not the column name)', async () => {
    vi.mocked(fetchIssue).mockResolvedValue({ id: 'UNI-2779', description: UNI_2779_HISTORICAL } as never)
    const res = await patchLinearIssue(req('today', 's-done'))
    expect(res.status).toBe(409)
    expect(updateIssueState).not.toHaveBeenCalled()
  })

  it('refuses Done when only the TITLE carries the marker (description empty)', async () => {
    vi.mocked(fetchIssue).mockResolvedValue({ id: 'UNI-2779', title: 'Status: BLOCKED on credentials', description: null } as never)
    const res = await patchLinearIssue(req('done', 's-done'))
    expect(res.status).toBe(409)
    expect(updateIssueState).not.toHaveBeenCalled()
  })

  it('allows Done for a clean acceptance', async () => {
    vi.mocked(fetchIssue).mockResolvedValue({ id: 'UNI-2779', description: CLEAN_ACCEPTANCE } as never)
    const res = await patchLinearIssue(req('done', 's-done'))
    expect(res.status).toBe(200)
    expect(updateIssueState).toHaveBeenCalledWith('UNI-2779', 's-done')
  })

  it('fails closed when the target state cannot be resolved (Cursor P1 at 417a532)', async () => {
    vi.mocked(fetchTeamStates).mockResolvedValue([] as never)
    vi.mocked(fetchIssue).mockResolvedValue({ id: 'UNI-2779', title: 'Status: BLOCKED', description: UNI_2779_HISTORICAL } as never)
    const res = await patchLinearIssue(req('shipped', 's-done-real'))
    expect(res.status).toBe(502)
    expect(updateIssueState).not.toHaveBeenCalled()
  })

  it('does not fetch the description for a non-Done move', async () => {
    const res = await patchLinearIssue(req('today', 's-prog'))
    expect(res.status).toBe(200)
    expect(fetchIssue).not.toHaveBeenCalled()
    expect(updateIssueState).toHaveBeenCalledWith('UNI-2779', 's-prog')
  })
})
