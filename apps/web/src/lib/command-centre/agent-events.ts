// src/lib/command-centre/agent-events.ts
//
// Typed accessors over cc_agent_events (Matrix wall Wave B1 — UNI-2378). One
// row per redacted agent-session event (heartbeat / tool_call / status). Reads
// are founder-scoped by RLS; writes come from the bearer-authed ingest route
// via the service client with founder_id set explicitly (single-tenant).
//
// No remote calls at import time — the Supabase client is created lazily inside
// each accessor (matching tasks.ts). Redaction is enforced at the type + insert
// boundary: only names and targets are ever stored, never payloads/args.

export type AgentEventSurface = 'codex' | 'claude-code' | 'pi-ceo-dev' | 'local'
export type AgentEventType = 'heartbeat' | 'tool_call' | 'status'

/** A durable redacted agent-session event row (cc_agent_events). */
export interface AgentEvent {
  id: string
  founder_id: string
  session_id: string | null
  agent_name: string
  surface: AgentEventSurface
  machine: string | null
  repo: string | null
  project_key: string | null
  plan_key: string | null
  event_type: AgentEventType
  tool_name: string | null
  target: string | null
  created_at: string
}

/** The redacted shape an emitter may submit — names and targets only. */
export interface AgentEventInput {
  sessionId?: string | null
  agentName: string
  surface?: AgentEventSurface
  machine?: string | null
  repo?: string | null
  projectKey?: string | null
  planKey?: string | null
  eventType: AgentEventType
  toolName?: string | null
  target?: string | null
}

export const CC_AGENT_EVENTS_TABLE = 'cc_agent_events'

interface SupabaseErrorLike {
  message: string
  code?: string
}

// Minimal structural client type so accessors are testable with a mock and
// don't pull the full generated types.
export interface AgentEventsClientLike {
  from(table: string): {
    insert(values: unknown): {
      select(columns?: string): Promise<{ data: unknown; error: SupabaseErrorLike | null }>
    }
    select(columns?: string): {
      eq(column: string, value: unknown): {
        order(column: string, opts: { ascending: boolean }): {
          limit(n: number): Promise<{ data: unknown; error: SupabaseErrorLike | null }>
        }
      }
    }
  }
}

/**
 * Map an emitter input to a stored row, binding founder_id from the caller and
 * REDACTING to names+targets only. Any extra key on the input (args/payload) is
 * structurally impossible to carry through — this function names every column
 * it writes, so nothing else is ever persisted.
 */
export function toAgentEventRow(founderId: string, input: AgentEventInput): Record<string, unknown> {
  return {
    founder_id: founderId,
    session_id: input.sessionId ?? null,
    agent_name: input.agentName,
    surface: input.surface ?? 'claude-code',
    machine: input.machine ?? null,
    repo: input.repo ?? null,
    project_key: input.projectKey ?? null,
    plan_key: input.planKey ?? null,
    event_type: input.eventType,
    tool_name: input.toolName ?? null,
    target: input.target ?? null,
  }
}

/**
 * Insert a batch of redacted events (service-role client). Returns the inserted
 * rows so the route can write-then-confirm. Throws on any persistence failure —
 * no false success is ever reported.
 */
export async function insertAgentEvents(
  client: AgentEventsClientLike,
  founderId: string,
  events: AgentEventInput[],
): Promise<AgentEvent[]> {
  const rows = events.map((e) => toAgentEventRow(founderId, e))
  const { data, error } = await client.from(CC_AGENT_EVENTS_TABLE).insert(rows).select('*')
  if (error) throw new Error(`insertAgentEvents failed: ${error.message}`)
  return (data as AgentEvent[]) ?? []
}

/** List a founder's recent events, newest first. Capped at 200 rows. */
export async function listAgentEvents(
  client: AgentEventsClientLike,
  founderId: string,
  limit = 50,
): Promise<AgentEvent[]> {
  const capped = Math.min(Math.max(limit, 1), 200)
  const { data, error } = await client
    .from(CC_AGENT_EVENTS_TABLE)
    .select('*')
    .eq('founder_id', founderId)
    .order('created_at', { ascending: false })
    .limit(capped)
  if (error) throw new Error(`listAgentEvents failed: ${error.message}`)
  return (data as AgentEvent[]) ?? []
}
