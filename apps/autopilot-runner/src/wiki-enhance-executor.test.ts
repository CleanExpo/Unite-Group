import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'

const spawnMock = vi.fn()

// Mock node:child_process so no real `claude` process is ever launched.
// The mocked child is a bare EventEmitter with stdout/stderr streams — enough
// for runWikiEnhanceScan's .on('data')/.on('error')/.on('close') wiring.
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

import { runWikiEnhanceScan } from './wiki-enhance-executor.js'

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
    kill: (signal?: string) => void
  }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = vi.fn()
  return child
}

describe('runWikiEnhanceScan', () => {
  beforeEach(() => {
    spawnMock.mockReset()
  })

  it('spawns claude with the model pinned to claude-sonnet-5 (regression: UNI-2307 dropped this pin silently)', async () => {
    const child = fakeChild()
    spawnMock.mockReturnValue(child)

    const resultPromise = runWikiEnhanceScan({})
    child.emit('close', 0)
    await resultPromise

    expect(spawnMock).toHaveBeenCalledTimes(1)
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]]
    expect(cmd).toBe('claude')
    const modelFlagIndex = args.indexOf('--model')
    expect(modelFlagIndex).toBeGreaterThan(-1)
    expect(args[modelFlagIndex + 1]).toBe('claude-sonnet-5')
  })

  it('resolves ok:true when the scan exits 0', async () => {
    const child = fakeChild()
    spawnMock.mockReturnValue(child)

    const resultPromise = runWikiEnhanceScan({})
    child.stdout.emit('data', Buffer.from('wiki-growth scan complete\n'))
    child.emit('close', 0)

    const result = await resultPromise
    expect(result.ok).toBe(true)
    expect(result.summary).toContain('wiki-growth scan complete')
  })

  it('resolves ok:false with the exit code when the scan fails', async () => {
    const child = fakeChild()
    spawnMock.mockReturnValue(child)

    const resultPromise = runWikiEnhanceScan({})
    child.emit('close', 1)

    const result = await resultPromise
    expect(result.ok).toBe(false)
    expect(result.summary).toContain('exited 1')
  })

  it('resolves ok:false when the claude CLI cannot start', async () => {
    const child = fakeChild()
    spawnMock.mockReturnValue(child)

    const resultPromise = runWikiEnhanceScan({})
    child.emit('error', new Error('ENOENT'))

    const result = await resultPromise
    expect(result.ok).toBe(false)
    expect(result.summary).toContain('could not start claude CLI')
  })
})
