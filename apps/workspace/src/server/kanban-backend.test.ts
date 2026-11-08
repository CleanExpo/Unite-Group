import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Fixture paths are built with path.join rather than written as POSIX string
// literals. kanban-backend derives every path through claude-paths' path.join
// plus normalize, so on Windows it asks for a backslash-separated path while a
// forward-slash literal offered something else; nothing matched and auto-detect
// silently fell back to the local backend. On POSIX these resolve to exactly
// the strings the literals held.
const TEST_HOME = path.join(path.sep, 'tmp', 'test-home')
const CLAUDE_ROOT = path.join(TEST_HOME, '.claude')
const PROFILE_HOME = path.join(CLAUDE_ROOT, 'profiles', 'swarm2')
const LEGACY_PROFILE_HOME = path.join(CLAUDE_ROOT, 'profiles', 'swarm5', 'home')
const KANBAN_DB = path.join(CLAUDE_ROOT, 'kanban.db')
const KANBAN_DIR = path.join(CLAUDE_ROOT, 'kanban')
const CLAUDE_BIN = path.join(TEST_HOME, '.local', 'bin', 'claude')
const LOCAL_KANBAN_FILE = path.join(path.sep, 'tmp', 'swarm2-kanban.json')

beforeEach(() => {
  // claude-paths reads HERMES_HOME BEFORE CLAUDE_HOME, so on a machine that
  // exports HERMES_HOME every stubEnv('CLAUDE_HOME', ...) below was dead and
  // the backend resolved against the developer's real Hermes root.
  vi.stubEnv('HERMES_HOME', undefined)
})

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

async function loadKanbanBackend(options?: {
  existsSync?: (path: string) => boolean
  execFileSync?: (command: string, args?: Array<string>) => string
}) {
  vi.doMock('./swarm-kanban-store', () => ({
    SWARM_KANBAN_FILE: LOCAL_KANBAN_FILE,
    createSwarmKanbanCard: vi.fn((input) => ({
      id: 'local-1',
      title: input.title,
      spec: input.spec ?? '',
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      assignedWorker: input.assignedWorker ?? null,
      reviewer: input.reviewer ?? null,
      status: input.status ?? 'backlog',
      missionId: input.missionId ?? null,
      reportPath: input.reportPath ?? null,
      createdBy: input.createdBy ?? 'swarm2-kanban',
      createdAt: 1,
      updatedAt: 1,
    })),
    listSwarmKanbanCards: vi.fn(() => [
      {
        id: 'local-1',
        title: 'Local task',
        spec: '',
        acceptanceCriteria: [],
        assignedWorker: null,
        reviewer: null,
        status: 'backlog',
        missionId: null,
        reportPath: null,
        createdBy: 'local',
        createdAt: 1,
        updatedAt: 1,
      },
    ]),
    updateSwarmKanbanCard: vi.fn((cardId, updates) => ({
      id: cardId,
      title: updates.title ?? 'Local task',
      spec: updates.spec ?? '',
      acceptanceCriteria: [],
      assignedWorker: updates.assignedWorker ?? null,
      reviewer: null,
      status: updates.status ?? 'backlog',
      missionId: null,
      reportPath: null,
      createdBy: 'local',
      createdAt: 1,
      updatedAt: 2,
    })),
  }))

  vi.doMock('node:fs', () => ({
    existsSync: vi.fn((path: string) => options?.existsSync?.(path) ?? false),
  }))

  vi.doMock('node:child_process', () => ({
    execFileSync: vi.fn(
      (command: string, args?: Array<string>) =>
        options?.execFileSync?.(command, args) ?? '',
    ),
  }))

  return import('./kanban-backend')
}

describe('kanban-backend', () => {
  it('auto-detect prefers Hermes backend when Hermes CLI and canonical storage are present', async () => {
    vi.stubEnv('CLAUDE_HOME', PROFILE_HOME)
    const sqliteCalls: Array<{ command: string; args?: Array<string> }> = []
    const mod = await loadKanbanBackend({
      existsSync: (target) =>
        target === KANBAN_DB ||
        target === KANBAN_DIR,
      execFileSync: (command, args = []) => {
        if (command === 'which' && args[0] === 'claude')
          return `${CLAUDE_BIN}\n`
        if (
          command === CLAUDE_BIN &&
          args[0] === '--version'
        )
          return 'claude 1.0.0\n'
        if (command === 'sqlite3') {
          sqliteCalls.push({ command, args })
          return JSON.stringify([
            {
              id: 't_12345678',
              title: 'Hermes task',
              body: 'Backed by sqlite',
              status: 'running',
              assignee: 'swarm2',
              created_at: 1777527540,
              updated_at: 1777527644,
            },
          ])
        }
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
      },
    })

    expect(mod.getKanbanBackendMeta()).toMatchObject({
      id: 'claude',
      detected: true,
      writable: true,
      path: KANBAN_DB,
    })

    const cards = mod.listKanbanCards()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      id: 't_12345678',
      title: 'Hermes task',
      status: 'running',
      assignedWorker: 'swarm2',
      createdBy: 'claude-kanban',
    })
    expect(sqliteCalls[0]?.args?.[0]).toBe(KANBAN_DB)
  })

  it('auto-detect uses Hermes storage directly when the CLI is unavailable', async () => {
    vi.stubEnv('CLAUDE_HOME', PROFILE_HOME)
    const mod = await loadKanbanBackend({
      existsSync: (target) => target === KANBAN_DB,
      execFileSync: (command, args = []) => {
        if (command === 'which' && args[0] === 'claude')
          throw new Error('not found')
        if (command === 'sqlite3') {
          return JSON.stringify([
            {
              id: 't_direct',
              title: 'Direct Hermes task',
              body: '',
              status: 'ready',
              assignee: null,
              created_at: 1777527540,
              updated_at: 1777527644,
            },
          ])
        }
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
      },
    })

    expect(mod.getKanbanBackendMeta()).toMatchObject({
      id: 'claude',
      detected: true,
      writable: true,
      path: KANBAN_DB,
    })
    expect(mod.getKanbanBackendMeta().details).toContain(
      'direct local storage access',
    )
    expect(mod.listKanbanCards()[0]).toMatchObject({
      id: 't_direct',
      status: 'ready',
    })
  })

  it('resolves canonical Kanban paths from legacy profile-home env fallback too', async () => {
    vi.stubEnv('CLAUDE_HOME', LEGACY_PROFILE_HOME)
    const mod = await loadKanbanBackend({
      existsSync: (target) => target === KANBAN_DB,
      execFileSync: (command, args = []) => {
        if (command === 'which' && args[0] === 'claude')
          throw new Error('not found')
        if (command === 'sqlite3') return '[]'
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
      },
    })

    expect(mod.getKanbanBackendMeta()).toMatchObject({
      id: 'claude',
      detected: true,
      path: KANBAN_DB,
    })
  })

  it('auto-detect falls back to local when canonical Hermes storage is missing', async () => {
    vi.stubEnv('CLAUDE_HOME', PROFILE_HOME)
    const mod = await loadKanbanBackend({
      existsSync: () => false,
      execFileSync: (command, args = []) => {
        if (command === 'which' && args[0] === 'claude')
          return `${CLAUDE_BIN}\n`
        if (
          command === CLAUDE_BIN &&
          args[0] === '--version'
        )
          return 'claude 1.0.0\n'
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
      },
    })

    expect(mod.getKanbanBackendMeta()).toMatchObject({
      id: 'local',
      detected: true,
      writable: true,
      path: LOCAL_KANBAN_FILE,
    })
    expect(mod.listKanbanCards()[0]?.id).toBe('local-1')
  })

  it('creates and updates Hermes tasks through canonical kanban.db path', async () => {
    vi.stubEnv('CLAUDE_HOME', PROFILE_HOME)
    const sqliteCalls: Array<string> = []
    let readCount = 0
    const mod = await loadKanbanBackend({
      existsSync: (target) =>
        target === KANBAN_DB ||
        target === KANBAN_DIR,
      execFileSync: (command, args = []) => {
        if (command === 'which' && args[0] === 'claude')
          return `${CLAUDE_BIN}\n`
        if (
          command === CLAUDE_BIN &&
          args[0] === '--version'
        )
          return 'claude 1.0.0\n'
        if (command === 'sqlite3') {
          sqliteCalls.push(args.join(' '))
          const sql = args[2] ?? ''
          if (sql.includes('where id =')) {
            readCount += 1
            return JSON.stringify([
              {
                id: 't_deadbeef',
                title:
                  readCount === 1
                    ? 'Created Hermes task'
                    : 'Updated Hermes task',
                body: 'Task body',
                status: readCount === 1 ? 'queued' : 'done',
                assignee: 'swarm6',
                created_at: 1777527540,
                updated_at: 1777527644,
              },
            ])
          }
          return '[]'
        }
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
      },
    })

    const created = mod.createKanbanCard({
      title: 'Created Hermes task',
      spec: 'Task body',
      assignedWorker: 'swarm6',
      status: 'backlog',
    })
    const updated = mod.updateKanbanCard('t_deadbeef', {
      title: 'Updated Hermes task',
      status: 'done',
      assignedWorker: 'swarm6',
    })

    expect(created).toMatchObject({
      id: 't_deadbeef',
      title: 'Created Hermes task',
      status: 'backlog',
      assignedWorker: 'swarm6',
      createdBy: 'claude-kanban',
    })
    expect(updated).toMatchObject({
      id: 't_deadbeef',
      title: 'Updated Hermes task',
      status: 'done',
      assignedWorker: 'swarm6',
    })
    expect(
      sqliteCalls.every((call) =>
        call.startsWith(`${KANBAN_DB} `),
      ),
    ).toBe(true)
    expect(sqliteCalls.some((call) => call.includes('insert into tasks'))).toBe(
      true,
    )
    expect(sqliteCalls.some((call) => call.includes('update tasks set'))).toBe(
      true,
    )
  })
})
