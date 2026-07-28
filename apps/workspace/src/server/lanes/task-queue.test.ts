import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createBoundedTaskAuthority,
  createNexusTaskQueue,
  missionContainsSensitiveValue,
} from './task-queue'

let root = ''
let queuePath = ''
const authority = () => createBoundedTaskAuthority(5)

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-queue-'))
  queuePath = path.join(root, 'private', 'tasks.jsonl')
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('Nexus durable task queue', () => {
  it('persists pending work privately without exposing the mission in list results', async () => {
    const queue = createNexusTaskQueue({
      queuePath,
      idgen: () => 'task-1',
      now: () => 10,
    })

    const task = await queue.enqueue({
      laneId: 'lane-1',
      workerId: 'codex-cli',
      mission: '  build the bounded slice  ',
      authority: authority(),
    })

    expect(task).toEqual({
      id: 'task-1',
      laneId: 'lane-1',
      workerId: 'codex-cli',
      status: 'pending',
      createdAt: 10,
      updatedAt: 10,
      authority: authority(),
    })
    expect(await queue.list()).toEqual([task])
    expect((await fs.stat(queuePath)).mode & 0o777).toBe(0o600)
    expect((await fs.stat(path.dirname(queuePath))).mode & 0o777).toBe(0o700)
    expect(await fs.readFile(queuePath, 'utf8')).toContain(
      'build the bounded slice',
    )
  })

  it('refuses credential-shaped missions before writing the durable ledger', async () => {
    const queue = createNexusTaskQueue({ queuePath })
    expect(
      missionContainsSensitiveValue(
        'Use OPENAI_API_KEY=synthetic-secret-value to run this',
      ),
    ).toBe(true)

    await expect(
      queue.enqueue({
        laneId: 'lane-1',
        workerId: 'codex-cli',
        mission: 'Use OPENAI_API_KEY=synthetic-secret-value to run this',
        authority: authority(),
      }),
    ).rejects.toThrow(/credential-shaped/i)
    await expect(fs.stat(queuePath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('refuses malformed authority before writing the durable ledger', async () => {
    const queue = createNexusTaskQueue({ queuePath })

    await expect(
      queue.enqueue({
        laneId: 'lane-1',
        workerId: 'codex-cli',
        mission: 'build the bounded slice',
        authority: {
          ...authority(),
          prohibitedActions: [],
        },
      }),
    ).rejects.toThrow(/bounded task authority/i)
    await expect(fs.stat(queuePath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('claims the oldest pending task for exactly one worker', async () => {
    let id = 0
    let now = 0
    const queue = createNexusTaskQueue({
      queuePath,
      idgen: () => `task-${++id}`,
      now: () => ++now,
    })
    await queue.enqueue({
      laneId: 'lane-codex',
      workerId: 'codex-cli',
      mission: 'first',
      authority: authority(),
    })
    await queue.enqueue({
      laneId: 'lane-claude',
      workerId: 'claude-cli',
      mission: 'other worker',
      authority: authority(),
    })
    await queue.enqueue({
      laneId: 'lane-codex',
      workerId: 'codex-cli',
      mission: 'second',
      authority: authority(),
    })

    await expect(queue.claimNext('codex-cli')).resolves.toMatchObject({
      id: 'task-1',
      mission: 'first',
      status: 'running',
    })
    await expect(queue.claimNext('codex-cli')).resolves.toMatchObject({
      id: 'task-3',
      mission: 'second',
      status: 'running',
    })
    await expect(queue.claimNext('codex-cli')).resolves.toBeNull()
  })

  it('settles a claimed task with run and commit evidence', async () => {
    const queue = createNexusTaskQueue({
      queuePath,
      idgen: () => 'task-1',
      now: () => 10,
    })
    await queue.enqueue({
      laneId: 'lane-1',
      workerId: 'codex-cli',
      mission: 'build',
      authority: authority(),
    })
    await queue.claimNext('codex-cli')

    await expect(
      queue.settle('task-1', {
        status: 'completed',
        runId: 'run-1',
        evidence: {
          runUri: 'lane-run:run-1',
          eventsUri: 'lane-events:run-1',
          commitSha: 'a'.repeat(40),
        },
      }),
    ).resolves.toMatchObject({
      status: 'completed',
      runId: 'run-1',
      evidence: { commitSha: 'a'.repeat(40) },
    })
  })

  it('fails closed when a prior dispatcher left a running task', async () => {
    const queue = createNexusTaskQueue({
      queuePath,
      idgen: () => 'task-1',
      now: () => 10,
    })
    await queue.enqueue({
      laneId: 'lane-1',
      workerId: 'codex-cli',
      mission: 'build',
      authority: authority(),
    })
    await queue.claimNext('codex-cli')

    await expect(queue.reconcileInterrupted()).resolves.toBe(1)
    await expect(queue.list()).resolves.toEqual([
      expect.objectContaining({
        status: 'blocked',
        blockedReason: expect.stringMatching(/manual run reconciliation/i),
      }),
    ])
  })

  it('recovers a stale dead same-host lock before accepting work', async () => {
    await fs.mkdir(path.dirname(queuePath), { recursive: true })
    await fs.writeFile(
      `${queuePath}.lock`,
      JSON.stringify({
        token: 'abandoned-lock',
        pid: 424_242,
        hostId: 'test-host',
        acquiredAt: Date.now() - 6_000,
      }),
    )
    const checkedPids: Array<number> = []
    const queue = createNexusTaskQueue({
      queuePath,
      hostId: 'test-host',
      processId: 101,
      isProcessAlive: (pid) => {
        checkedPids.push(pid)
        return false
      },
      idgen: () => 'task-recovered-lock',
      now: () => 20,
    })

    await expect(
      queue.enqueue({
        laneId: 'lane-1',
        workerId: 'codex-cli',
        mission: 'resume bounded work',
        authority: authority(),
      }),
    ).resolves.toMatchObject({
      id: 'task-recovered-lock',
      status: 'pending',
    })
    expect(checkedPids).toContain(424_242)
    await expect(fs.stat(`${queuePath}.lock`)).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('repairs a torn final JSONL record while preserving prior tasks and future writes', async () => {
    let id = 0
    const queue = createNexusTaskQueue({
      queuePath,
      idgen: () => `task-${++id}`,
      now: () => id,
    })
    await queue.enqueue({
      laneId: 'lane-1',
      workerId: 'codex-cli',
      mission: 'preserve this task',
      authority: authority(),
    })
    await fs.appendFile(queuePath, '{"id":"torn')

    await expect(queue.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'task-1',
        status: 'pending',
      }),
    ])
    await expect(
      queue.enqueue({
        laneId: 'lane-2',
        workerId: 'claude-cli',
        mission: 'write after recovery',
        authority: authority(),
      }),
    ).resolves.toMatchObject({
      id: 'task-2',
      status: 'pending',
    })

    const raw = await fs.readFile(queuePath, 'utf8')
    expect(raw).not.toContain('{"id":"torn')
    expect(raw.endsWith('\n')).toBe(true)
    await expect(queue.list()).resolves.toEqual([
      expect.objectContaining({ id: 'task-2' }),
      expect.objectContaining({ id: 'task-1' }),
    ])
  })
})
