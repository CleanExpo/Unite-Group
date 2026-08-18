/**
 * GET /api/lanes/gate?runId=…  — autonomy-gate decisions for one run (UNI-2409).
 *
 * The PreToolUse hook records every decision it made to a per-run
 * `decisions.jsonl`. Without this route those records exist and nobody sees
 * them: a blocked action would be invisible in Mission Control, which is the
 * one acceptance criterion a gate cannot skip. A block the founder never learns
 * about is indistinguishable from a lane that simply did less work.
 *
 * Read-only. The hook is the sole writer; nothing here grants or revokes an
 * approval.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import fs from 'node:fs/promises'
import { requireLocalOrAuth } from '../../../server/auth-middleware'
import { gateDecisionsPath } from '../../../server/lanes'
import { parseGateAudit } from '../../../server/lanes/autonomy-settings'
import { resolveRunId } from '../../../server/lanes/event-sse'

export const Route = createFileRoute('/api/lanes/gate')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const runId = resolveRunId(request)
        if (!runId) {
          return json(
            { ok: false, error: 'A valid runId query parameter is required' },
            { status: 400 },
          )
        }

        let raw: string
        try {
          raw = await fs.readFile(gateDecisionsPath(runId), 'utf8')
        } catch (error) {
          // No file means the run made no tool calls yet, or ran before the
          // gate existed. That is an empty decision list, not an error — and
          // it is reported as such rather than as a failure, so the panel can
          // say "none recorded" instead of showing a red state for a healthy
          // run.
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return json({ ok: true, runId, decisions: [], recorded: false })
          }
          return json(
            { ok: false, error: 'Failed to read gate decisions' },
            { status: 500 },
          )
        }

        const decisions = parseGateAudit(raw)
        return json({
          ok: true,
          runId,
          decisions,
          recorded: true,
          blocked: decisions.filter((decision) => !decision.allowed).length,
        })
      },
    },
  },
})
