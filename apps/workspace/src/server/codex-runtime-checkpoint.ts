import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { getHermesRoot } from './claude-paths'

/**
 * The only file Codex may publish into the runtime control plane.
 *
 * It is deliberately a status receipt, rather than a dispatch request: the
 * local bridge can display it, but it cannot execute the declared next action.
 */
const TextSchema = z.string().trim().min(1).max(500)
const EvidenceSchema = z.object({
  label: TextSchema,
  kind: z.enum(['file', 'diff', 'patch', 'build', 'log', 'report', 'preview']),
})

export const CodexCheckpointSchema = z.object({
  version: z.literal(1),
  publisher: z.literal('codex'),
  observedAt: z.number().int().nonnegative(),
  task: z.object({
    id: TextSchema,
    title: TextSchema,
    state: z.enum(['active', 'waiting', 'blocked', 'complete']),
    deadlineAt: z.number().int().nonnegative().nullable(),
    evidence: z.array(EvidenceSchema).max(50),
    blocker: z.string().trim().min(1).max(500).nullable(),
    nextAction: z.string().trim().min(1).max(500).nullable(),
    receipt: z.string().trim().min(1).max(500).nullable(),
  }),
})

export type CodexCheckpoint = z.infer<typeof CodexCheckpointSchema>

export const CODEX_CHECKPOINT_MAX_AGE_MS = 10 * 60 * 1000

export function codexCheckpointPath(hermesRoot = getHermesRoot()): string {
  return join(hermesRoot, 'runtime-control-plane', 'codex.json')
}

function parseCheckpoint(value: unknown): CodexCheckpoint | null {
  const result = CodexCheckpointSchema.safeParse(value)
  return result.success ? result.data : null
}

export function readCodexCheckpoint(input: {
  now?: number
  hermesRoot?: string
} = {}): { checkpoint: CodexCheckpoint | null; detail: string } {
  const checkpointPath = codexCheckpointPath(input.hermesRoot)
  if (!existsSync(checkpointPath)) {
    return { checkpoint: null, detail: 'Codex has not published a checkpoint.' }
  }

  try {
    const checkpoint = parseCheckpoint(JSON.parse(readFileSync(checkpointPath, 'utf8')))
    if (!checkpoint) return { checkpoint: null, detail: 'Codex checkpoint is invalid.' }
    const now = input.now ?? Date.now()
    if (now - checkpoint.observedAt > CODEX_CHECKPOINT_MAX_AGE_MS) {
      return {
        checkpoint: null,
        detail: 'Codex checkpoint is stale; no current activity is inferred.',
      }
    }
    return { checkpoint, detail: 'Codex checkpoint observed.' }
  } catch {
    return { checkpoint: null, detail: 'Codex checkpoint could not be read.' }
  }
}

/** Atomically persist a validated, status-only Codex receipt. */
export function writeCodexCheckpoint(input: {
  checkpoint: unknown
  hermesRoot?: string
}): CodexCheckpoint {
  const checkpoint = CodexCheckpointSchema.parse(input.checkpoint)
  const checkpointPath = codexCheckpointPath(input.hermesRoot)
  mkdirSync(join(input.hermesRoot ?? getHermesRoot(), 'runtime-control-plane'), {
    recursive: true,
  })
  const temporaryPath = `${checkpointPath}.tmp-${process.pid}-${Date.now()}`
  writeFileSync(temporaryPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8')
  renameSync(temporaryPath, checkpointPath)
  return checkpoint
}
