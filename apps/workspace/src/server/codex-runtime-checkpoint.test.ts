import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { codexCheckpointPath, readCodexCheckpoint, writeCodexCheckpoint } from './codex-runtime-checkpoint'

function receipt(observedAt = 100) {
  return {
    version: 1 as const,
    publisher: 'codex' as const,
    observedAt,
    task: {
      id: 'task-1', title: 'Publish status', state: 'active' as const,
      deadlineAt: 200, evidence: [], blocker: null, nextAction: 'Capture receipt', receipt: null,
    },
  }
}

describe('Codex runtime checkpoint', () => {
  it('publishes one validated machine-readable status receipt atomically', () => {
    const hermesRoot = mkdtempSync(join(tmpdir(), 'runtime-control-plane-'))
    writeCodexCheckpoint({ checkpoint: receipt(), hermesRoot })
    expect(JSON.parse(readFileSync(codexCheckpointPath(hermesRoot), 'utf8'))).toMatchObject(receipt())
  })

  it('fails closed when the last Codex receipt is stale', () => {
    const hermesRoot = mkdtempSync(join(tmpdir(), 'runtime-control-plane-'))
    writeCodexCheckpoint({ checkpoint: receipt(0), hermesRoot })
    expect(readCodexCheckpoint({ hermesRoot, now: 10 * 60 * 1000 + 1 })).toMatchObject({
      checkpoint: null, detail: expect.stringMatching(/stale/i),
    })
  })
})
