import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { NextResponse } from 'next/server'
import { createIssue, fetchIssuesByLabel, resolveOrCreateLabelIds, type CreateIssueInput } from '@/lib/integrations/linear'
import { getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ExecFileAsync = (file: string, args: string[], options: { timeout: number; windowsHide: boolean }) => Promise<{ stdout: string; stderr?: string }>
type CreateLinearIssue = (input: CreateIssueInput) => Promise<{ id: string; url?: string }>

const defaultExecFileAsync = promisify(execFile) as ExecFileAsync
let execFileAsync: ExecFileAsync = defaultExecFileAsync
let createLinearIssue: CreateLinearIssue = createIssue

const STATUS_SYMBOLS: Record<string, string> = {
  '✓': 'done',
  '▶': 'ready',
  '●': 'running',
  '■': 'blocked',
  '○': 'todo',
  '◌': 'scheduled',
}

const TASK_ID_PATTERN = /^t_[a-z0-9]+$/i
const SAFE_TEXT_LIMIT = 2_000
const HERMES_AUTONOMY_LABELS = ['mesh:auto', 'pi-dev:autonomous', 'source:hermes-kanban']
const AUTO_LINKABLE_STATUSES = new Set(['ready', 'todo', 'scheduled'])
const DEFAULT_BATCH_LINK_LIMIT = 10
const MAX_BATCH_LINK_LIMIT = 25

interface LinearBacklink {
  identifier: string
  url?: string
}

interface HermesKanbanTask {
  id: string
  status: string
  assignee: string | null
  title: string
  linearLink?: LinearBacklink
}

type HermesActionPayload = {
  action?: string
  taskId?: string
  title?: string
  body?: string
  note?: string
  assignee?: string
  teamKey?: string
  limit?: number
}

function parseTaskLine(line: string): HermesKanbanTask | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const symbol = trimmed[0]
  const fallbackStatus = STATUS_SYMBOLS[symbol]
  const withoutSymbol = fallbackStatus ? trimmed.slice(1).trim() : trimmed
  const match = withoutSymbol.match(/^(t_[a-z0-9]+)\s+(\S+)\s+(.+?)\s{2,}(.+)$/i)
  if (!match) return null

  const [, id, rawStatus, rawAssignee, title] = match
  const assignee = rawAssignee.trim()
  return {
    id,
    status: rawStatus || fallbackStatus || 'unknown',
    assignee: assignee === '(unassigned)' ? null : assignee,
    title: title.trim(),
  }
}

function summarise(tasks: HermesKanbanTask[]) {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1
    return acc
  }, {})
}

function safeText(value: unknown, field: string, required: true): string
function safeText(value: unknown, field: string, required?: false): string | undefined
function safeText(value: unknown, field: string, required = false) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${field} is required`)
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    if (required) throw new Error(`${field} is required`)
    return undefined
  }
  if (trimmed.length > SAFE_TEXT_LIMIT) throw new Error(`${field} is too long`)
  return trimmed
}

function safeTaskId(value: unknown) {
  const taskId = safeText(value, 'taskId', true)
  if (!TASK_ID_PATTERN.test(taskId)) throw new Error('valid taskId is required')
  return taskId
}

function safeLimit(value: unknown) {
  if (value === undefined) return DEFAULT_BATCH_LINK_LIMIT
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error('limit must be an integer')
  if (value < 1 || value > MAX_BATCH_LINK_LIMIT) throw new Error(`limit must be between 1 and ${MAX_BATCH_LINK_LIMIT}`)
  return value
}

function buildHermesActionCommand(payload: HermesActionPayload) {
  const action = safeText(payload.action, 'action', true)

  if (action === 'create') {
    const title = safeText(payload.title, 'title', true)
    const args: string[] = ['kanban', 'create', title]
    const body = safeText(payload.body, 'body')
    const assignee = safeText(payload.assignee, 'assignee')
    if (body) args.push('--body', body)
    if (assignee) args.push('--assignee', assignee)
    args.push('--created-by', 'unite-hub', '--json')
    return args
  }

  if (action === 'complete') {
    const taskId = safeTaskId(payload.taskId)
    const args: string[] = ['kanban', 'complete', taskId]
    const note = safeText(payload.note, 'note')
    if (note) args.push('--result', note)
    return args
  }

  if (action === 'block') {
    const taskId = safeTaskId(payload.taskId)
    const args: string[] = ['kanban', 'block', taskId]
    const note = safeText(payload.note, 'note')
    if (note) args.push(note)
    return args
  }

  if (action === 'unblock') return ['kanban', 'unblock', safeTaskId(payload.taskId)]
  if (action === 'promote') return ['kanban', 'promote', safeTaskId(payload.taskId)]

  if (action === 'comment') {
    const note = safeText(payload.note, 'note', true)
    return ['kanban', 'comment', '--author', 'unite-hub', safeTaskId(payload.taskId), note]
  }

  throw new Error('unsupported action')
}

function buildLinearIssueInput(payload: HermesActionPayload): CreateIssueInput {
  const taskId = safeTaskId(payload.taskId)
  const title = safeText(payload.title, 'title', true)
  const body = safeText(payload.body, 'body') ?? 'No additional Hermes task context supplied.'
  const teamKey = safeText(payload.teamKey, 'teamKey') ?? 'UNI'
  return {
    teamKey,
    title: `[Hermes ${taskId}] ${title}`,
    description: [
      `Hermes Task: ${taskId}`,
      'Source: Hermes Kanban',
      'Mission Control Eligible: yes',
      `Required Labels: ${HERMES_AUTONOMY_LABELS.join(', ')}`,
      '',
      body,
    ].join('\n'),
    priority: 3,
    labelNames: HERMES_AUTONOMY_LABELS,
  }
}

function parseLinearBacklink(comments: unknown): LinearBacklink | undefined {
  if (!Array.isArray(comments)) return undefined

  for (const comment of comments) {
    if (!comment || typeof comment !== 'object') continue
    const body = 'body' in comment && typeof comment.body === 'string' ? comment.body : undefined
    if (!body) continue

    const match = body.match(/Linear link:\s*([A-Z]+-\d+)(?:\s+(https?:\/\/\S+))?/)
    if (match) return { identifier: match[1], ...(match[2] ? { url: match[2] } : {}) }
  }

  return undefined
}

async function readExistingLinearBacklink(taskId: string): Promise<LinearBacklink | undefined> {
  const { stdout } = await execFileAsync('hermes', ['kanban', 'show', '--json', taskId], { timeout: 15_000, windowsHide: true })
  const detail = JSON.parse(stdout) as { comments?: unknown }
  return parseLinearBacklink(detail.comments)
}

async function hydrateLinearBacklinks(tasks: HermesKanbanTask[]) {
  const hydrateableTaskIds = new Set(tasks
    .filter((task) => task.status !== 'done')
    .slice(0, 25)
    .map((task) => task.id))

  return Promise.all(tasks.map(async (task) => {
    if (!hydrateableTaskIds.has(task.id)) return task

    try {
      const linearLink = await readExistingLinearBacklink(task.id)
      return linearLink ? { ...task, linearLink } : task
    } catch {
      return task
    }
  }))
}

const HERMES_SOURCE_LABEL = 'source:hermes-kanban'

/** True when the failure is "the `hermes` binary isn't installed" (always so in serverless). */
function isCliMissing(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT')
}

function linearStateToHermes(stateType: string): string {
  if (stateType === 'completed') return 'done'
  if (stateType === 'started') return 'running'
  if (stateType === 'backlog') return 'scheduled'
  return 'todo'
}

/** Serverless board: read the Hermes-labelled Linear issues as the execution board. */
async function readHermesBoardFromLinear() {
  let issues: Awaited<ReturnType<typeof fetchIssuesByLabel>> = []
  try {
    issues = await fetchIssuesByLabel(HERMES_SOURCE_LABEL)
  } catch {
    issues = [] // a label-filter hiccup must not make create/board appear to fail
  }
  const tasks: HermesKanbanTask[] = issues.map((issue) => ({
    id: issue.identifier,
    status: linearStateToHermes(issue.state?.type ?? ''),
    assignee: null,
    title: issue.title,
    linearLink: { identifier: issue.identifier, url: issue.url },
  }))
  return {
    source: 'linear',
    configured: true,
    mode: 'linear' as const,
    board: 'linear',
    summary: summarise(tasks),
    tasks,
    lastSyncedAt: new Date().toISOString(),
  }
}

/** Create a Hermes task as a labelled Linear issue (the prod push-to-execution path). */
async function createTaskViaLinear(payload: HermesActionPayload) {
  const title = safeText(payload.title, 'title', true)
  const body = safeText(payload.body, 'body')
  // Ensure the autopilot labels exist so the new issue is pipeline-eligible.
  await resolveOrCreateLabelIds(HERMES_AUTONOMY_LABELS)
  return createLinearIssue({
    teamKey: safeText(payload.teamKey, 'teamKey') ?? 'UNI',
    title,
    description: [
      body ?? 'No additional Hermes task context supplied.',
      '',
      'Source: Hermes Kanban (Founder OS)',
      'Mission Control Eligible: yes',
      `Autonomy labels: ${HERMES_AUTONOMY_LABELS.join(', ')}`,
    ].join('\n'),
    priority: 3,
    labelNames: HERMES_AUTONOMY_LABELS,
  })
}

async function readHermesBoardViaCli() {
  const [{ stdout: boardsStdout }, { stdout: listStdout }] = await Promise.all([
    execFileAsync('hermes', ['kanban', 'boards', 'list'], { timeout: 15_000, windowsHide: true }),
    execFileAsync('hermes', ['kanban', 'list'], { timeout: 15_000, windowsHide: true }),
  ])

  const tasks = await hydrateLinearBacklinks(listStdout
    .split(/\r?\n/)
    .map(parseTaskLine)
    .filter((task): task is HermesKanbanTask => Boolean(task)))

  return {
    source: 'hermes-kanban',
    configured: true,
    mode: 'cli' as const,
    board: boardsStdout.includes('Current board:') ? boardsStdout.match(/Current board:\s*(\S+)/)?.[1] ?? 'default' : 'default',
    summary: summarise(tasks),
    tasks,
    lastSyncedAt: new Date().toISOString(),
  }
}

/** Read the board via the Hermes CLI, falling back to the Linear-backed board in serverless. */
async function readHermesBoard() {
  try {
    return await readHermesBoardViaCli()
  } catch (error) {
    if (!isCliMissing(error)) throw error
    return readHermesBoardFromLinear()
  }
}

async function linkTaskToLinear(payload: HermesActionPayload, existingLink?: LinearBacklink | null) {
  const taskId = safeTaskId(payload.taskId)
  const linearLink = existingLink === undefined ? await readExistingLinearBacklink(taskId) : existingLink
  if (linearLink) {
    return {
      taskId,
      linkedIssue: linearLink,
      reused: true,
      receipt: { command: ['hermes', 'kanban', 'show', '--json', taskId], stdout: 'Existing Linear backlink reused', stderr: '' },
    }
  }

  const issue = await createLinearIssue(buildLinearIssueInput(payload))
  const backlink = `Linear link: ${issue.id}${issue.url ? ` ${issue.url}` : ''}`
  const args = ['kanban', 'comment', '--author', 'unite-hub', taskId, backlink]
  const { stdout, stderr } = await execFileAsync('hermes', args, { timeout: 20_000, windowsHide: true })
  return {
    taskId,
    linkedIssue: { identifier: issue.id, url: issue.url },
    reused: false,
    receipt: { command: ['hermes', ...args], stdout: stdout.trim(), stderr: stderr?.trim() ?? '' },
  }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    return NextResponse.json(await readHermesBoard())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Hermes Kanban error'
    return NextResponse.json(
      { source: 'hermes-kanban', configured: false, error: message, summary: {}, tasks: [], lastSyncedAt: new Date().toISOString() },
      { status: 502 },
    )
  }
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const payload = await request.json() as HermesActionPayload
    const action = safeText(payload.action, 'action', true)

    if (action === 'linkLinear') {
      const linkResult = await linkTaskToLinear(payload)
      return NextResponse.json({
        source: 'hermes-kanban',
        action,
        linkedIssue: linkResult.linkedIssue,
        receipt: linkResult.receipt,
        board: await readHermesBoard(),
      })
    }

    if (action === 'linkReadyLinear') {
      const teamKey = safeText(payload.teamKey, 'teamKey') ?? 'UNI'
      const limit = safeLimit(payload.limit)
      const board = await readHermesBoard()
      const candidates = board.tasks
        .filter((task) => AUTO_LINKABLE_STATUSES.has(task.status.toLowerCase()) && !task.linearLink)
        .slice(0, limit)

      const linkedIssues = []
      for (const task of candidates) {
        linkedIssues.push(await linkTaskToLinear({
          action: 'linkLinear',
          taskId: task.id,
          title: task.title,
          body: `Auto-linked from Hermes Kanban status: ${task.status}.`,
          teamKey,
        }, task.linearLink ?? null))
      }

      return NextResponse.json({
        source: 'hermes-kanban',
        action,
        scanned: board.tasks.length,
        linkedCount: linkedIssues.filter((issue) => !issue.reused).length,
        reusedCount: linkedIssues.filter((issue) => issue.reused).length,
        linkedIssues,
        board: await readHermesBoard(),
      })
    }

    // Generic Hermes CLI action — with a serverless Linear fallback when the
    // `hermes` binary isn't present. `create` becomes a labelled Linear issue
    // (the push-to-production path); other actions defer to Linear for state.
    try {
      const args = buildHermesActionCommand(payload)
      const { stdout, stderr } = await execFileAsync('hermes', args, { timeout: 20_000, windowsHide: true })
      return NextResponse.json({
        source: 'hermes-kanban',
        action,
        receipt: { command: ['hermes', ...args], stdout: stdout.trim(), stderr: stderr?.trim() ?? '' },
        board: await readHermesBoard(),
      })
    } catch (error) {
      if (!isCliMissing(error)) throw error
      if (action === 'create') {
        const issue = await createTaskViaLinear(payload)
        return NextResponse.json({
          source: 'linear',
          action,
          mode: 'linear',
          linkedIssue: { identifier: issue.id, url: issue.url },
          board: await readHermesBoardFromLinear(),
        })
      }
      return NextResponse.json({
        source: 'linear',
        action,
        mode: 'linear',
        note: 'This task lives in Linear — open it there to change its state.',
        board: await readHermesBoardFromLinear(),
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Hermes Kanban action error'
    return NextResponse.json({ source: 'hermes-kanban', configured: false, error: message }, { status: 400 })
  }
}

function setExecFileForTest(mock: ExecFileAsync) {
  execFileAsync = mock
}

function setCreateIssueForTest(mock: CreateLinearIssue) {
  createLinearIssue = mock
}

export const __test__ = { parseTaskLine, summarise, buildHermesActionCommand, buildLinearIssueInput, parseLinearBacklink, setExecFileForTest, setCreateIssueForTest }
