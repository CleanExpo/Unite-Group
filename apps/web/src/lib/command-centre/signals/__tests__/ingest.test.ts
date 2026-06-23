// src/lib/command-centre/signals/__tests__/ingest.test.ts
// TDD: Unit 3 — ingestSignal. Orchestrates normalise → dedup → createTask
// (proposed) → appendTaskEvent. DI'd (no live Supabase). Nothing auto-executes:
// the task lands `proposed`, exactly like a hand-typed idea.
import { describe, it, expect, vi } from 'vitest'
import type { IngestSignalDeps } from '../ingest'
import { ingestSignal } from '../ingest'
import type { RawSignal } from '../normalise'

const raw: RawSignal = {
  source: 'telegram',
  externalRef: 'tg-123',
  text: 'Add a dark-mode toggle to the settings page',
  observedAt: '2026-06-23T08:00:00.000Z',
}

function makeDeps(overrides: Partial<IngestSignalDeps> = {}): IngestSignalDeps {
  return {
    listTasks: vi.fn().mockResolvedValue([]),
    createTask: vi.fn().mockImplementation(async (input) => ({ id: 'task-1', ...input })),
    appendTaskEvent: vi.fn().mockResolvedValue({ id: 'evt-1' }),
    addEvidenceRecord: vi.fn().mockResolvedValue({ id: 'ev-1' }),
    ...overrides,
  } as unknown as IngestSignalDeps
}

describe('ingestSignal', () => {
  it('creates a PROPOSED task from a fresh substantive signal', async () => {
    const deps = makeDeps()
    const res = await ingestSignal('founder-1', raw, deps)

    expect(res.status).toBe('created')
    expect(deps.createTask).toHaveBeenCalledTimes(1)
    const arg = (deps.createTask as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.founderId).toBe('founder-1')
    expect(arg.status).toBe('proposed')
    expect(arg.origin).toBe('idea')
    expect(arg.externalRef).toBe('tg-123')
    expect(arg.title).toBe('Add a dark-mode toggle to the settings page')
    expect(arg.metadata.signalSource).toBe('telegram')
  })

  it("appends a 'created' audit event tagged with the signal source", async () => {
    const deps = makeDeps()
    await ingestSignal('founder-1', raw, deps)
    expect(deps.appendTaskEvent).toHaveBeenCalledTimes(1)
    const arg = (deps.appendTaskEvent as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.type).toBe('created')
    expect(arg.actor).toContain('telegram')
  })

  it('skips a duplicate signal whose external_ref is already on a recent task', async () => {
    const deps = makeDeps({
      listTasks: vi.fn().mockResolvedValue([{ external_ref: 'tg-123' }, { external_ref: 'tg-001' }]),
    })
    const res = await ingestSignal('founder-1', raw, deps)
    expect(res.status).toBe('skipped')
    expect(res.reason).toBe('duplicate')
    expect(deps.createTask).not.toHaveBeenCalled()
  })

  it('skips transport noise without creating a task', async () => {
    const deps = makeDeps()
    const res = await ingestSignal('founder-1', { ...raw, text: 'ok' }, deps)
    expect(res.status).toBe('skipped')
    expect(res.reason).toBe('noise')
    expect(deps.createTask).not.toHaveBeenCalled()
    expect(deps.appendTaskEvent).not.toHaveBeenCalled()
  })

  it("routes an error signal to a 'blocker' task", async () => {
    const deps = makeDeps()
    await ingestSignal('founder-1', { ...raw, source: 'error', externalRef: 'err-9', text: 'health check failing' }, deps)
    const arg = (deps.createTask as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.origin).toBe('blocker')
  })

  it('writes a founder-scoped evidence brief for the created signal task', async () => {
    const deps = makeDeps()
    await ingestSignal('founder-1', raw, deps)

    expect(deps.addEvidenceRecord).toHaveBeenCalledTimes(1)
    const ev = (deps.addEvidenceRecord as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(ev.founderId).toBe('founder-1')
    expect(ev.taskId).toBe('task-1')
    expect(ev.kind).toBe('brief')
    // The wiki path must be a non-empty string used as the task's evidencePath.
    expect(typeof ev.wikiPath).toBe('string')
    expect(ev.wikiPath.length).toBeGreaterThan(0)
    // Provenance: the signal source rides on the evidence sources.
    expect(ev.sources).toContain('signal:telegram')
  })

  it('sets the created task evidencePath to the evidence wiki path', async () => {
    const deps = makeDeps()
    await ingestSignal('founder-1', raw, deps)
    const taskArg = (deps.createTask as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const evArg = (deps.addEvidenceRecord as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(taskArg.evidencePath).toBe(evArg.wikiPath)
  })

  it('does NOT write an evidence record when the signal is skipped', async () => {
    const deps = makeDeps({
      listTasks: vi.fn().mockResolvedValue([{ external_ref: 'tg-123' }]),
    })
    const res = await ingestSignal('founder-1', raw, deps)
    expect(res.status).toBe('skipped')
    expect(deps.addEvidenceRecord).not.toHaveBeenCalled()
  })
})
