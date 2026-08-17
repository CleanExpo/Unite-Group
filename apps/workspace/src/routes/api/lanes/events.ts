/**
 * GET /api/lanes/events?runId=…  — live lane run stream (UNI-2406).
 *
 * Server-sent events. Every frame carries `id: <sequence>`, so a browser that
 * drops reconnects with `Last-Event-ID` and resumes exactly where it stopped
 * without the page tracking anything. `?cursor=` is available for a non-browser
 * client or a deliberate replay from the start.
 *
 * The ledger is polled rather than pushed: it is a JSONL file the orchestrator
 * appends to, with no event bus in front of it. Polling is honest about that,
 * and a bus added later can replace the pump without changing the wire format.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../../server/auth-middleware'
import { getLaneOrchestrator } from '../../../server/lanes'
import {
  createLaneEventPump,
  formatControlFrame,
  resolveCursor,
  resolveRunId,
  SSE_KEEPALIVE_MS,
  SSE_POLL_INTERVAL_MS,
} from '../../../server/lanes/event-sse'

export const Route = createFileRoute('/api/lanes/events')({
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

        const orchestrator = getLaneOrchestrator()
        const pump = createLaneEventPump({
          runId,
          listRunEvents: (id) => orchestrator.listRunEvents(id),
        })
        pump.seek(resolveCursor(request))

        const encoder = new TextEncoder()
        let pollTimer: ReturnType<typeof setInterval> | null = null
        let keepaliveTimer: ReturnType<typeof setInterval> | null = null
        let closed = false

        const stream = new ReadableStream({
          async start(controller) {
            const send = (frame: string) => {
              if (closed) return
              try {
                controller.enqueue(encoder.encode(frame))
              } catch {
                closed = true
              }
            }

            send(
              formatControlFrame('connected', {
                runId,
                cursor: pump.cursor,
                pollIntervalMs: SSE_POLL_INTERVAL_MS,
              }),
            )

            const drain = async () => {
              if (closed) return
              try {
                // Keep draining while the ledger is ahead of us, so a client
                // resuming far behind catches up instead of trickling one page
                // per poll interval.
                for (;;) {
                  const page = await pump.poll()
                  for (const frame of page.frames) send(frame)
                  if (!page.hasMore || closed) break
                }
              } catch (error) {
                // A corrupt ledger is reported to the client rather than
                // silently ending the stream — an empty stream and a broken one
                // look identical from the browser.
                send(
                  formatControlFrame('stream_error', {
                    runId,
                    cursor: pump.cursor,
                    error:
                      error instanceof Error
                        ? error.message
                        : 'Failed to read the lane event ledger',
                  }),
                )
              }
            }

            await drain()
            pollTimer = setInterval(() => void drain(), SSE_POLL_INTERVAL_MS)
            keepaliveTimer = setInterval(
              () => send(': keepalive\n\n'),
              SSE_KEEPALIVE_MS,
            )
          },
          cancel() {
            closed = true
            if (pollTimer) clearInterval(pollTimer)
            if (keepaliveTimer) clearInterval(keepaliveTimer)
          },
        })

        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
