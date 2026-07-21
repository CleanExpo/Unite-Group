import { describe, expect, it, vi } from 'vitest'
import { createProcessTreeTracker, terminateProcessTree } from './process-tree'

describe('process-tree supervision', () => {
  it('escalates a surviving POSIX process group from TERM to KILL', async () => {
    const signals: Array<NodeJS.Signals> = []
    const groupStates = [true, false]

    await terminateProcessTree(42, {
      platform: 'darwin',
      graceMs: 0,
      forceAckMs: 0,
      signalGroup: (_pid, signal) => signals.push(signal),
      groupExists: () => groupStates.shift() ?? false,
      listDescendants: () => Promise.resolve([]),
      sleep: async () => {},
    })

    expect(signals).toEqual(['SIGTERM', 'SIGKILL'])
  })

  it('does not force-kill a POSIX group that acknowledges TERM', async () => {
    const signals: Array<NodeJS.Signals> = []

    await terminateProcessTree(42, {
      platform: 'linux',
      graceMs: 0,
      signalGroup: (_pid, signal) => signals.push(signal),
      groupExists: () => false,
      listDescendants: () => Promise.resolve([]),
      sleep: async () => {},
    })

    expect(signals).toEqual(['SIGTERM'])
  })

  it('treats EPERM from a POSIX existence probe as still alive and keeps polling', async () => {
    let probes = 0
    vi.spyOn(process, 'kill').mockImplementation(() => {
      probes += 1
      throw Object.assign(new Error('probe'), {
        code: probes === 1 ? 'EPERM' : 'ESRCH',
      })
    })

    await expect(
      terminateProcessTree(42, {
        platform: 'darwin',
        force: true,
        forceAckMs: 25,
        signalGroup: () => {},
        listDescendants: () => Promise.resolve([]),
        sleep: async () => {},
      }),
    ).resolves.toBeUndefined()
    expect(probes).toBe(2)
  })

  it('tracks, kills and verifies a descendant that escaped the root process group', async () => {
    const descendantSignals: Array<NodeJS.Signals> = []
    let groupAlive = true
    let descendantAlive = true

    await terminateProcessTree(42, {
      platform: 'darwin',
      graceMs: 0,
      forceAckMs: 0,
      signalGroup: (_pid, signal) => {
        if (signal === 'SIGKILL') groupAlive = false
      },
      groupExists: () => groupAlive,
      listDescendants: () => Promise.resolve([99]),
      signalProcess: (_pid, signal) => {
        descendantSignals.push(signal)
        if (signal === 'SIGKILL') descendantAlive = false
      },
      processExists: () => descendantAlive,
      sleep: async () => {},
    })

    expect(descendantSignals).toEqual(['SIGTERM', 'SIGKILL'])
  })

  it('adopts descendants added by the live tracker after termination starts', async () => {
    const externallyTracked = new Set<number>()
    const descendantSignals: Array<NodeJS.Signals> = []
    let descendantAlive = true

    await terminateProcessTree(42, {
      platform: 'darwin',
      graceMs: 0,
      ownedPids: externallyTracked,
      signalGroup: (_pid, signal) => {
        if (signal === 'SIGTERM') externallyTracked.add(99)
      },
      groupExists: () => false,
      listDescendants: () => Promise.resolve([]),
      signalProcess: (_pid, signal) => {
        descendantSignals.push(signal)
        descendantAlive = false
      },
      processExists: () => descendantAlive,
      sleep: async () => {},
    })

    expect(descendantSignals).toEqual(['SIGTERM'])
  })

  it('discovers children of a tracked process after the original root exits', async () => {
    const signalled = new Set<number>()

    await terminateProcessTree(42, {
      platform: 'darwin',
      graceMs: 0,
      ownedPids: new Set([99]),
      signalGroup: () => {},
      groupExists: () => false,
      listDescendants: (rootPid: number) =>
        Promise.resolve(rootPid === 99 ? [100] : []),
      signalProcess: (targetPid: number) => {
        signalled.add(targetPid)
      },
      processExists: (targetPid: number) => !signalled.has(targetPid),
      sleep: async () => {},
    })

    expect([...signalled].sort((a, b) => a - b)).toEqual([99, 100])
  })

  it('fails closed when any descendant-tracker sample fails', async () => {
    let samples = 0
    const tracker = createProcessTreeTracker(
      42,
      () => {
        samples += 1
        if (samples === 1) return Promise.reject(new Error('ps snapshot failed'))
        return Promise.resolve([])
      },
      1_000,
    )

    await expect(tracker.stop()).rejects.toThrow(/snapshot failed/i)
  })

  it('fails closed on Windows where taskkill cannot prove tree ownership', async () => {
    await expect(
      terminateProcessTree(42, { platform: 'win32' }),
    ).rejects.toThrow(/unsupported.*windows|windows.*unsupported/i)
  })
})
