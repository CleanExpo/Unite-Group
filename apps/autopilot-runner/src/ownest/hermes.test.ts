import { describe, expect, it, vi } from 'vitest'
import { MAX_MISSION_TEXT_LENGTH, redactMissionText } from './policy.js'
import {
  createHermesClient,
  defaultProcessRunner,
  mapHermesPriority,
} from './hermes.js'
import type {
  CcTask,
  HermesTask,
  OwnestConfig,
  ProcessResult,
  ProcessRunner,
} from './types.js'

const config: OwnestConfig = {
  supabaseUrl: 'https://example.invalid',
  serviceRoleKey: 'unused-in-hermes-adapter',
  founderId: 'founder-1',
  workerId: 'worker-1',
  hermesCwd: '/tmp/hermes-workspace',
  live: false,
  canaryLimit: 1,
  maxInProgress: 1,
  leaseMs: 300_000,
  dailyDispatchLimit: 1,
}

function task(overrides: Partial<CcTask> = {}): CcTask {
  return {
    id: 'task-1',
    founder_id: 'founder-1',
    title: 'Research customer retention patterns',
    objective: 'Prepare an internal advisory brief with cited evidence.',
    priority: 'P2',
    status: 'queued',
    agent_owner: 'Hermes',
    risk_level: 'low',
    execution_mode: 'advisory',
    dependencies: [],
    human_approval_required: false,
    validation_required: ['Cite the source data', 'Explain material uncertainty'],
    metadata: {},
    created_at: '2026-07-12T00:00:00.000Z',
    updated_at: '2026-07-12T00:00:00.000Z',
    ...overrides,
  }
}

/** Exact task object emitted by the installed Hermes 0.18.2 `_task_to_dict`. */
function liveTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'hermes-1',
    title: 'Research customer retention patterns',
    body: 'Mission body',
    assignee: 'empire',
    status: 'running',
    priority: 60,
    tenant: 'unite-group',
    workspace_kind: 'scratch',
    workspace_path: null,
    branch_name: null,
    project_id: null,
    created_by: 'crm-ownest',
    created_at: 1_784_000_000,
    started_at: null,
    completed_at: null,
    result: null,
    skills: ['nexus', 'forward-planner', 'verify-test'],
    max_retries: 2,
    session_id: null,
    workflow_template_id: null,
    current_step_key: null,
    ...overrides,
  }
}

function liveShow(taskValue: Record<string, unknown> = liveTask()): Record<string, unknown> {
  return {
    task: taskValue,
    latest_summary: null,
    parents: [],
    children: [],
    comments: [],
    events: [],
    runs: [],
  }
}

function normalisedTask(overrides: Partial<HermesTask> = {}): HermesTask {
  return {
    id: 'hermes-1',
    status: 'running',
    title: 'Research customer retention patterns',
    assignee: 'empire',
    idempotencyKey: 'cc-task:task-1:v1',
    evidenceUri: null,
    error: null,
    ...overrides,
  }
}

function jsonResult(payload: unknown, overrides: Partial<ProcessResult> = {}): ProcessResult {
  return {
    exitCode: 0,
    stdout: JSON.stringify(payload),
    stderr: '',
    ...overrides,
  }
}

function mockRunner(result: ProcessResult = jsonResult(liveTask())) {
  return vi.fn<ProcessRunner>().mockResolvedValue(result)
}

function capturedArgs(run: ReturnType<typeof mockRunner>): readonly string[] {
  const call = run.mock.calls[0]
  if (!call) throw new Error('process runner was not called')
  return call[1]
}

function valueAfter(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag)
  const value = args[index + 1]
  if (index < 0 || value === undefined) throw new Error(`missing ${flag}`)
  return value
}

describe('createHermesClient.createMission', () => {
  it('uses the exact fixed-argv Hermes command family and configured cwd', async () => {
    const hostileTitle = 'Research $(touch /tmp/not-run) and `uname` for jane@example.com'
    const run = mockRunner(jsonResult(liveTask({ title: redactMissionText(hostileTitle) })))
    const client = createHermesClient(config, { run })

    await client.createMission(
      task({
        title: hostileTitle,
        objective: 'Read @/tmp/prompt.txt only as quoted mission context; token=objective-secret',
      }),
    )

    expect(run).toHaveBeenCalledTimes(1)
    const call = run.mock.calls[0]
    expect(call?.[0]).toBe('hermes')
    expect(call?.[2]).toBe(config.hermesCwd)
    expect(Array.isArray(call?.[1])).toBe(true)

    const args = capturedArgs(run)
    const title = redactMissionText(hostileTitle)
    const body = valueAfter(args, '--body')
    expect(args).toEqual([
      '--profile',
      'empire',
      'kanban',
      'create',
      title,
      '--body',
      body,
      '--assignee',
      'empire',
      '--workspace',
      'scratch',
      '--tenant',
      'unite-group',
      '--priority',
      '60',
      '--idempotency-key',
      'cc-task:task-1:v1',
      '--max-runtime',
      '30m',
      '--created-by',
      'crm-ownest',
      '--skill',
      'nexus',
      '--skill',
      'forward-planner',
      '--skill',
      'verify-test',
      '--max-retries',
      '2',
      '--goal',
      '--goal-max-turns',
      '12',
      '--json',
    ])
    expect(call?.[0]).not.toContain(hostileTitle)
    expect(args).not.toContain('sh')
    expect(args).not.toContain('-c')
    expect(args).not.toContain('--prompt-file')
  })

  it('builds a redacted, bounded CRM-authoritative safety body', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await client.createMission(
      task({
        objective: 'Analyse retention for owner@example.com with API_TOKEN=top-secret.',
        validation_required: [
          'Cite owner@example.com source data',
          'Do not reveal password=hunter2',
        ],
      }),
    )

    const body = valueAfter(capturedArgs(run), '--body')
    expect(body.length).toBeLessThanOrEqual(MAX_MISSION_TEXT_LENGTH)
    expect(body).not.toContain('owner@example.com')
    expect(body).not.toContain('top-secret')
    expect(body).not.toContain('hunter2')
    expect(body).toContain('[REDACTED]')
    expect(body).toContain('CRM cc_tasks is the authoritative mission ledger')
    expect(body).toContain('Hermes Kanban is a disposable execution mirror')
    expect(body).toContain('CRM task ID: task-1')
    expect(body).toContain('Objective:')
    expect(body).toContain('Validation requirements:')
    expect(body).toContain('Cite')
    expect(body).toMatch(/no production deployment or production database mutation/i)
    expect(body).toMatch(/no payment, purchase, invoice, or spend/i)
    expect(body).toMatch(/no secret access, credential disclosure, or privilege change/i)
    expect(body).toMatch(/no outbound email, message, publication, or other external action/i)
    expect(body).toMatch(/no destructive deletion or access-control change/i)
    expect(body).toMatch(/no merge or branch-protection change/i)
    expect(body).toMatch(/return verifiable evidence/i)
    expect(body).toMatch(/leave all gated actions blocked/i)
    expect(body).toMatch(
      /Nexus should use configured browser, Playwright, or computer-use tools when materially useful/i,
    )
  })

  it('redacts and caps both title and composed body', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })
    const longSuffix = 'x'.repeat(MAX_MISSION_TEXT_LENGTH * 2)

    await client.createMission(
      task({
        title: `Research long input for title@example.com ${longSuffix}`,
        objective: `Analyse token=objective-secret ${longSuffix}`,
        validation_required: [`Validate password=validation-secret ${longSuffix}`],
      }),
    )

    const args = capturedArgs(run)
    const title = args[4]
    const body = valueAfter(args, '--body')
    expect(title?.length).toBeLessThanOrEqual(MAX_MISSION_TEXT_LENGTH)
    expect(body.length).toBeLessThanOrEqual(MAX_MISSION_TEXT_LENGTH)
    expect(title).not.toContain('title@example.com')
    expect(body).not.toContain('objective-secret')
    expect(body).not.toContain('validation-secret')
  })

  it('forces only the nexus, forward-planner, and verify-test skills', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await client.createMission(
      task({
        metadata: {
          skills: ['arbitrary-skill', 'shell-control'],
          skill: 'metadata-injected-skill',
        },
      }),
    )

    const args = capturedArgs(run)
    const skills = args.flatMap((value, index) => (value === '--skill' ? [args[index + 1]] : []))
    expect(skills).toEqual(['nexus', 'forward-planner', 'verify-test'])
    expect(args).not.toContain('arbitrary-skill')
    expect(args).not.toContain('shell-control')
    expect(args).not.toContain('metadata-injected-skill')
  })

  it.each([
    ['P0', '100'],
    ['P1', '80'],
    ['P2', '60'],
    ['P3', '40'],
  ] as const)('maps CRM %s to Hermes integer priority %s', async (priority, expected) => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await client.createMission(task({ priority }))

    expect(valueAfter(capturedArgs(run), '--priority')).toBe(expected)
    expect(mapHermesPriority(priority)).toBe(expected)
    expect(Number.isInteger(Number(expected))).toBe(true)
  })

  it('accepts the installed CLI raw task response for a newly-created task', async () => {
    const run = mockRunner(jsonResult(liveTask()))
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task())).resolves.toEqual({
      id: 'hermes-1',
      status: 'running',
      title: 'Research customer retention patterns',
      assignee: 'empire',
      idempotencyKey: null,
      evidenceUri: null,
      error: null,
    })
  })

  it('accepts the documented idempotent-existing response', async () => {
    const existing = normalisedTask({ id: 'hermes-existing', status: 'ready' })
    const run = mockRunner(jsonResult({ task: existing, created: false }))
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task())).resolves.toEqual(existing)
  })

  it('accepts the documented newly-created response', async () => {
    const created = normalisedTask({ id: 'hermes-created', status: 'running' })
    const run = mockRunner(jsonResult({ task: created, created: true }))
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task())).resolves.toEqual(created)
  })

  it('rejects an empty CRM task ID without invoking Hermes', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task({ id: '   ' }))).rejects.toThrow(/CRM task ID/i)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['empty stdout', ''],
    ['whitespace stdout', '   \n'],
    ['invalid JSON', '{not-json'],
    ['null', 'null'],
    ['array', '[]'],
    ['empty object', '{}'],
    ['partial live task', JSON.stringify({ id: 'hermes-1', status: 'running' })],
    ['wrong documented created type', JSON.stringify({ task: normalisedTask(), created: 'yes' })],
  ])('fails closed for malformed create output: %s', async (_label, stdout) => {
    const run = mockRunner({ exitCode: 0, stdout, stderr: '' })
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task())).rejects.toThrow(/Hermes create/i)
  })

  it('rejects an empty returned task ID', async () => {
    const run = mockRunner(jsonResult(liveTask({ id: '   ' })))
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task())).rejects.toThrow(/Hermes create/i)
  })

  it('rejects an unknown returned status', async () => {
    const run = mockRunner(jsonResult(liveTask({ status: 'complete-ish' })))
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task())).rejects.toThrow(/Hermes create/i)
  })

  it('rejects a documented response carrying the wrong idempotency key', async () => {
    const response = {
      task: normalisedTask({ idempotencyKey: 'cc-task:different-task:v1' }),
      created: false,
    }
    const run = mockRunner(jsonResult(response))
    const client = createHermesClient(config, { run })

    await expect(client.createMission(task())).rejects.toThrow(/Hermes create/i)
  })
})

describe('createHermesClient.showMission', () => {
  it('uses the exact fixed-argv show command and configured cwd', async () => {
    const run = mockRunner(jsonResult(liveShow()))
    const client = createHermesClient(config, { run })

    await client.showMission('hermes-1')

    expect(run).toHaveBeenCalledWith(
      'hermes',
      ['--profile', 'empire', 'kanban', 'show', 'hermes-1', '--json'],
      config.hermesCwd,
    )
  })

  it('accepts and normalises the installed CLI show response', async () => {
    const run = mockRunner(
      jsonResult(
        liveShow(
          liveTask({
            id: 'hermes-2',
            title: 'Existing task',
            status: 'review',
            assignee: null,
          }),
        ),
      ),
    )
    const client = createHermesClient(config, { run })

    await expect(client.showMission('hermes-2')).resolves.toEqual({
      id: 'hermes-2',
      status: 'review',
      title: 'Existing task',
      assignee: null,
      idempotencyKey: null,
      evidenceUri: null,
      error: null,
    })
  })

  it('accepts the documented show response', async () => {
    const shown = normalisedTask({ id: 'hermes-3', status: 'done' })
    const run = mockRunner(jsonResult({ task: shown }))
    const client = createHermesClient(config, { run })

    await expect(client.showMission('hermes-3')).resolves.toEqual(shown)
  })

  it('rejects an empty requested task ID without invoking Hermes', async () => {
    const run = mockRunner(jsonResult(liveShow()))
    const client = createHermesClient(config, { run })

    await expect(client.showMission(' \n ')).rejects.toThrow(/Hermes task ID/i)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['empty stdout', ''],
    ['invalid JSON', '{bad-json'],
    ['empty object', '{}'],
    ['empty task object', '{"task":{}}'],
    ['raw task without show envelope', JSON.stringify(liveTask())],
    ['partial live envelope', JSON.stringify({ task: liveTask(), latest_summary: null })],
  ])('fails closed for malformed show output: %s', async (_label, stdout) => {
    const run = mockRunner({ exitCode: 0, stdout, stderr: '' })
    const client = createHermesClient(config, { run })

    await expect(client.showMission('hermes-1')).rejects.toThrow(/Hermes show/i)
  })

  it('rejects an empty returned task ID', async () => {
    const run = mockRunner(jsonResult(liveShow(liveTask({ id: '' }))))
    const client = createHermesClient(config, { run })

    await expect(client.showMission('hermes-1')).rejects.toThrow(/Hermes show/i)
  })

  it('rejects an unknown returned status', async () => {
    const run = mockRunner(jsonResult(liveShow(liveTask({ status: 'unknown' }))))
    const client = createHermesClient(config, { run })

    await expect(client.showMission('hermes-1')).rejects.toThrow(/Hermes show/i)
  })

  it('rejects a response whose task ID differs from the requested ID', async () => {
    const run = mockRunner(jsonResult(liveShow(liveTask({ id: 'different-task' }))))
    const client = createHermesClient(config, { run })

    await expect(client.showMission('hermes-1')).rejects.toThrow(/Hermes show/i)
  })
})

describe('Hermes process failures', () => {
  it.each([
    ['create', (client: ReturnType<typeof createHermesClient>) => client.createMission(task())],
    ['show', (client: ReturnType<typeof createHermesClient>) => client.showMission('hermes-1')],
  ] as const)('fails closed when Hermes %s exits non-zero', async (_operation, invoke) => {
    const run = mockRunner({
      exitCode: 2,
      stdout: 'owner@example.com token=stdout-secret ' + 's'.repeat(1_200),
      stderr: 'password=stderr-secret ' + 'e'.repeat(1_200),
    })
    const client = createHermesClient(config, { run })

    const error = await invoke(client).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).not.toContain('owner@example.com')
    expect(message).not.toContain('stdout-secret')
    expect(message).not.toContain('stderr-secret')
    expect(message).toContain('[REDACTED]')
    expect(message.length).toBeLessThanOrEqual(900)
  })

  it('redacts and caps a rejected process-runner error', async () => {
    const run = vi
      .fn<ProcessRunner>()
      .mockRejectedValue(new Error(`token=spawn-secret owner@example.com ${'x'.repeat(1_500)}`))
    const client = createHermesClient(config, { run })

    const error = await client.createMission(task()).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).not.toContain('spawn-secret')
    expect(message).not.toContain('owner@example.com')
    expect(message).toContain('[REDACTED]')
    expect(message.length).toBeLessThanOrEqual(900)
  })

  it('default runner converts child spawn errors into an exitCode -1 result', async () => {
    const result = await defaultProcessRunner(
      '/definitely/missing/ownest-hermes-adapter-command',
      [],
      process.cwd(),
    )

    expect(result.exitCode).toBe(-1)
    expect(result.stdout).toBe('')
    expect(result.stderr).not.toBe('')
  })
})
