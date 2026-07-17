import { describe, expect, it, vi } from 'vitest'
import { terminateProcessTree, windowsTaskkillArgs } from './process-tree'

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
        sleep: async () => {},
      }),
    ).resolves.toBeUndefined()
    expect(probes).toBe(2)
  })

  it('uses Windows tree termination and escalates to force', async () => {
    const forces: Array<boolean> = []
    const taskkill = vi.fn(async (_pid: number, force: boolean) => {
      forces.push(force)
      if (!force) throw new Error('soft termination failed')
    })

    await terminateProcessTree(42, {
      platform: 'win32',
      graceMs: 0,
      taskkill,
      sleep: async () => {},
    })

    expect(forces).toEqual([false, true])
  })

  it('builds taskkill arguments for the whole Windows process tree', () => {
    expect(windowsTaskkillArgs(42, false)).toEqual(['/PID', '42', '/T'])
    expect(windowsTaskkillArgs(42, true)).toEqual([
      '/PID',
      '42',
      '/T',
      '/F',
    ])
  })
})
