import type { AgentEvent } from './agent-events'

export function eventVerb(event: Pick<AgentEvent, 'event_type' | 'tool_name'>): string {
  if (event.event_type === 'heartbeat') return 'heartbeat'
  return event.tool_name ?? event.event_type
}

/** Plain relative age in en-AU shorthand ("just now" / "4m ago" / "3h ago" /
 *  "2d ago"). Malformed timestamps degrade to an em dash — never a fake
 *  "live" signal. */
export function relativeAge(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const deltaS = Math.floor((nowMs - t) / 1000)
  if (deltaS < 60) return 'just now'
  const mins = Math.floor(deltaS / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
