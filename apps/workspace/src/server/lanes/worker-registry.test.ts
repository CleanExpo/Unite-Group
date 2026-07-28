import { describe, expect, it } from 'vitest'
import { buildWorkerRegistry, workerIdForBackend } from './worker-registry'

describe('Nexus worker registry', () => {
  it('maps existing bounded adapters to stable worker identities', () => {
    expect(
      workerIdForBackend({
        kind: 'cli',
        tool: 'claude-code',
        account: 'max-1',
      }),
    ).toBe('claude-cli')
    expect(
      workerIdForBackend({ kind: 'cli', tool: 'codex', account: 'openai-pro' }),
    ).toBe('codex-cli')
    expect(
      workerIdForBackend({
        kind: 'gateway',
        provider: 'openrouter',
        model: 'model',
      }),
    ).toBe('hermes-gateway')
  })

  it('keeps the Mac Mini Tailscale interface dormant and unverified', () => {
    const workers = buildWorkerRegistry({
      machineId: 'macbook',
      claudeAvailable: true,
      codexAvailable: true,
      hermesAvailable: true,
    })

    expect(workers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mac-mini-tailscale',
          transport: 'tailscale',
          enabled: false,
          machineStatus: 'unverified',
        }),
      ]),
    )
    expect(workers.filter((worker) => worker.enabled)).toHaveLength(3)
  })

  it('reports unavailable local workers honestly', () => {
    const workers = buildWorkerRegistry({
      machineId: 'macbook',
      claudeAvailable: false,
      codexAvailable: false,
      hermesAvailable: false,
    })

    expect(workers.every((worker) => !worker.enabled)).toBe(true)
    expect(
      workers.find((worker) => worker.id === 'hermes-gateway')?.reason,
    ).toMatch(/unavailable/i)
  })
})
