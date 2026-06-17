import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { GET, POST, __test__ } from '../route'

describe('Hermes Kanban route parsing', () => {
  beforeEach(() => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
  })

  it('returns 401 from GET when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns 401 from POST when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const response = await POST(new Request('http://localhost/api/hermes/kanban', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', title: 'Unauthorised attempt' }),
    }))
    expect(response.status).toBe(401)
  })

  it('parses assigned Hermes task rows', () => {
    const task = __test__.parseTaskLine('✓ t_cae06971  done      default               RA continuation: reconcile Linear + dirty repo lanes')

    expect(task).toEqual({
      id: 't_cae06971',
      status: 'done',
      assignee: 'default',
      title: 'RA continuation: reconcile Linear + dirty repo lanes',
    })
  })

  it('parses unassigned ready rows', () => {
    const task = __test__.parseTaskLine('▶ t_01f3c9ea  ready     (unassigned)         [pi-ceo]  [CFO@restoreassist] debate — ship today')

    expect(task).toEqual({
      id: 't_01f3c9ea',
      status: 'ready',
      assignee: null,
      title: '[pi-ceo]  [CFO@restoreassist] debate — ship today',
    })
  })

  it('summarises tasks by status for the Founder cockpit', () => {
    expect(__test__.summarise([
      { id: 't_1', status: 'ready', assignee: null, title: 'one' },
      { id: 't_2', status: 'ready', assignee: 'default', title: 'two' },
      { id: 't_3', status: 'done', assignee: 'default', title: 'three' },
    ])).toEqual({ ready: 2, done: 1 })
  })

  it('maps safe Founder OS actions to Hermes Kanban CLI commands', () => {
    expect(__test__.buildHermesActionCommand({ action: 'create', title: 'Dual-board follow-up', body: 'Wire Linear later', assignee: 'default' })).toEqual([
      'kanban',
      'create',
      'Dual-board follow-up',
      '--body',
      'Wire Linear later',
      '--assignee',
      'default',
      '--created-by',
      'unite-hub',
      '--json',
    ])

    expect(__test__.buildHermesActionCommand({ action: 'complete', taskId: 't_abc123', note: 'Verified in Unite-Hub' })).toEqual([
      'kanban',
      'complete',
      't_abc123',
      '--result',
      'Verified in Unite-Hub',
    ])
  })

  it('rejects unsafe Hermes Kanban action payloads before shell execution', () => {
    expect(() => __test__.buildHermesActionCommand({ action: 'create', title: '' })).toThrow('title is required')
    expect(() => __test__.buildHermesActionCommand({ action: 'complete', taskId: 'not-a-task' })).toThrow('valid taskId is required')
    expect(() => __test__.buildHermesActionCommand({ action: 'delete', taskId: 't_abc123' })).toThrow('unsupported action')
  })

  it('executes a safe Hermes Kanban action and returns a refreshed command receipt', async () => {
    const execMock = vi.fn()
      .mockResolvedValueOnce({ stdout: '{"id":"t_new123","status":"ready"}\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'Current board: default\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '▶ t_new123  ready     default               Dual-board follow-up\n', stderr: '' })
    __test__.setExecFileForTest(execMock)

    const response = await POST(new Request('http://localhost/api/hermes/kanban', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', title: 'Dual-board follow-up', assignee: 'default' }),
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.action).toBe('create')
    expect(payload.receipt.stdout).toContain('t_new123')
    expect(payload.board.tasks).toHaveLength(1)
    expect(execMock).toHaveBeenCalledWith('hermes', [
      'kanban',
      'create',
      'Dual-board follow-up',
      '--assignee',
      'default',
      '--created-by',
      'unite-hub',
      '--json',
    ], expect.any(Object))
  })

  it('builds a deterministic Linear issue payload from a Hermes task', () => {
    expect(__test__.buildLinearIssueInput({
      taskId: 't_176bb1b0',
      title: 'Unite-Hub: keep Hermes Kanban mirrored in Founder OS',
      body: 'Evidence loop required',
      teamKey: 'UNI',
    })).toEqual({
      teamKey: 'UNI',
      title: '[Hermes t_176bb1b0] Unite-Hub: keep Hermes Kanban mirrored in Founder OS',
      description: [
        'Hermes Task: t_176bb1b0',
        'Source: Hermes Kanban',
        'Mission Control Eligible: yes',
        'Required Labels: mesh:auto, pi-dev:autonomous, source:hermes-kanban',
        '',
        'Evidence loop required',
      ].join('\n'),
      priority: 3,
      labelNames: ['mesh:auto', 'pi-dev:autonomous', 'source:hermes-kanban'],
    })
  })

  it('links a Hermes task to a new Linear issue and records the backlink as a Hermes comment', async () => {
    const createIssueMock = vi.fn().mockResolvedValue({ id: 'UNI-777', url: 'https://linear.app/unite-group/issue/UNI-777/test' })
    const execMock = vi.fn()
      .mockResolvedValueOnce({ stdout: JSON.stringify({ task: { id: 't_176bb1b0' }, comments: [] }), stderr: '' })
      .mockResolvedValueOnce({ stdout: 'commented t_176bb1b0\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'Current board: default\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '▶ t_176bb1b0  ready     default               Unite-Hub: keep Hermes Kanban mirrored in Founder OS\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ task: { id: 't_176bb1b0' }, comments: [{ body: 'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/test' }] }), stderr: '' })
    __test__.setExecFileForTest(execMock)
    __test__.setCreateIssueForTest(createIssueMock)

    const response = await POST(new Request('http://localhost/api/hermes/kanban', {
      method: 'POST',
      body: JSON.stringify({
        action: 'linkLinear',
        taskId: 't_176bb1b0',
        title: 'Unite-Hub: keep Hermes Kanban mirrored in Founder OS',
        body: 'Evidence loop required',
        teamKey: 'UNI',
      }),
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.action).toBe('linkLinear')
    expect(payload.linkedIssue).toEqual({ identifier: 'UNI-777', url: 'https://linear.app/unite-group/issue/UNI-777/test' })
    expect(createIssueMock).toHaveBeenCalledWith(expect.objectContaining({
      labelNames: ['mesh:auto', 'pi-dev:autonomous', 'source:hermes-kanban'],
    }))
    expect(execMock).toHaveBeenCalledWith('hermes', [
      'kanban',
      'comment',
      '--author',
      'unite-hub',
      't_176bb1b0',
      'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/test',
    ], expect.any(Object))
  })

  it('returns an existing Hermes Linear backlink without creating a duplicate Linear issue', async () => {
    const createIssueMock = vi.fn()
    const execMock = vi.fn()
      .mockResolvedValueOnce({ stdout: JSON.stringify({
        task: { id: 't_176bb1b0' },
        comments: [{ body: 'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/test' }],
      }), stderr: '' })
      .mockResolvedValueOnce({ stdout: 'Current board: default\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '▶ t_176bb1b0  ready     default               Unite-Hub: keep Hermes Kanban mirrored in Founder OS\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: JSON.stringify({
        task: { id: 't_176bb1b0' },
        comments: [{ body: 'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/test' }],
      }), stderr: '' })
    __test__.setExecFileForTest(execMock)
    __test__.setCreateIssueForTest(createIssueMock)

    const response = await POST(new Request('http://localhost/api/hermes/kanban', {
      method: 'POST',
      body: JSON.stringify({
        action: 'linkLinear',
        taskId: 't_176bb1b0',
        title: 'Unite-Hub: keep Hermes Kanban mirrored in Founder OS',
        body: 'Evidence loop required',
        teamKey: 'UNI',
      }),
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.linkedIssue).toEqual({ identifier: 'UNI-777', url: 'https://linear.app/unite-group/issue/UNI-777/test' })
    expect(payload.receipt.stdout).toBe('Existing Linear backlink reused')
    expect(createIssueMock).not.toHaveBeenCalled()
    expect(execMock).not.toHaveBeenCalledWith('hermes', expect.arrayContaining(['comment']), expect.any(Object))
  })

  it('batch-links ready Hermes tasks into Linear without duplicating linked tasks', async () => {
    const createIssueMock = vi.fn().mockResolvedValue({ id: 'UNI-888', url: 'https://linear.app/unite-group/issue/UNI-888/batch' })
    const execMock = vi.fn()
      .mockResolvedValueOnce({ stdout: 'Current board: default\n', stderr: '' })
      .mockResolvedValueOnce({
        stdout: [
          '▶ t_ready01  ready     default               Build batch Hermes link',
          '○ t_todo02   todo      default               Already linked task',
          '✓ t_done03   done      default               Completed task',
        ].join('\n'),
        stderr: '',
      })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ task: { id: 't_ready01' }, comments: [] }), stderr: '' })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          task: { id: 't_todo02' },
          comments: [{ body: 'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/existing' }],
        }),
        stderr: '',
      })
      .mockResolvedValueOnce({ stdout: 'commented t_ready01\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'Current board: default\n', stderr: '' })
      .mockResolvedValueOnce({
        stdout: [
          '▶ t_ready01  ready     default               Build batch Hermes link',
          '○ t_todo02   todo      default               Already linked task',
        ].join('\n'),
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          task: { id: 't_ready01' },
          comments: [{ body: 'Linear link: UNI-888 https://linear.app/unite-group/issue/UNI-888/batch' }],
        }),
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          task: { id: 't_todo02' },
          comments: [{ body: 'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/existing' }],
        }),
        stderr: '',
      })
    __test__.setExecFileForTest(execMock)
    __test__.setCreateIssueForTest(createIssueMock)

    const response = await POST(new Request('http://localhost/api/hermes/kanban', {
      method: 'POST',
      body: JSON.stringify({ action: 'linkReadyLinear', teamKey: 'UNI', limit: 5 }),
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.action).toBe('linkReadyLinear')
    expect(payload.scanned).toBe(3)
    expect(payload.linkedCount).toBe(1)
    expect(payload.reusedCount).toBe(0)
    expect(payload.linkedIssues).toEqual([
      expect.objectContaining({
        taskId: 't_ready01',
        linkedIssue: { identifier: 'UNI-888', url: 'https://linear.app/unite-group/issue/UNI-888/batch' },
        reused: false,
      }),
    ])
    expect(createIssueMock).toHaveBeenCalledTimes(1)
    expect(createIssueMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '[Hermes t_ready01] Build batch Hermes link',
      labelNames: ['mesh:auto', 'pi-dev:autonomous', 'source:hermes-kanban'],
    }))
    expect(execMock).toHaveBeenCalledWith('hermes', [
      'kanban',
      'comment',
      '--author',
      'unite-hub',
      't_ready01',
      'Linear link: UNI-888 https://linear.app/unite-group/issue/UNI-888/batch',
    ], expect.any(Object))
  })

  it('parses Linear backlinks from Hermes task comments', () => {
    expect(__test__.parseLinearBacklink([
      { body: 'Operator note' },
      { body: 'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/test' },
    ])).toEqual({ identifier: 'UNI-777', url: 'https://linear.app/unite-group/issue/UNI-777/test' })
  })

  it('hydrates Linear backlinks into the board task list from Hermes show output', async () => {
    const execMock = vi.fn()
      .mockResolvedValueOnce({ stdout: 'Current board: default\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '▶ t_176bb1b0  ready     default               Unite-Hub: keep Hermes Kanban mirrored in Founder OS\n', stderr: '' })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          task: { id: 't_176bb1b0' },
          comments: [
            { body: 'Linear link: UNI-777 https://linear.app/unite-group/issue/UNI-777/test' },
          ],
        }),
        stderr: '',
      })
    __test__.setExecFileForTest(execMock)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.tasks[0]).toMatchObject({
      id: 't_176bb1b0',
      linearLink: { identifier: 'UNI-777', url: 'https://linear.app/unite-group/issue/UNI-777/test' },
    })
    expect(execMock).toHaveBeenCalledWith('hermes', ['kanban', 'show', '--json', 't_176bb1b0'], expect.any(Object))
  })
})
