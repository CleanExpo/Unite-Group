import { z } from 'zod'

import type { AgentEvent, AgentEventInput, AgentEventSurface } from './agent-events'

export const MACHINE_DEVICE_IDS = [
  'unite-mac-mini',
  'phill-macbook-pro',
  'phill-desktop',
] as const

export type MachineDeviceId = (typeof MACHINE_DEVICE_IDS)[number]
export type MachineConnectionState = 'connected' | 'stale' | 'offline' | 'not_reporting'
export type MachineScreenState = 'active' | 'blocked' | 'idle' | 'unknown' | MachineConnectionState
export type MachineScreenId = 'primary' | 'secondary'

export const MACHINE_ROSTER: ReadonlyArray<{
  deviceId: MachineDeviceId
  label: string
  platform: 'macOS' | 'Windows'
  role: string
}> = [
  {
    deviceId: 'unite-mac-mini',
    label: 'Unite Mac Mini',
    platform: 'macOS',
    role: 'Primary orchestration host',
  },
  {
    deviceId: 'phill-macbook-pro',
    label: 'Phill’s MacBook Pro',
    platform: 'macOS',
    role: 'Mobile command host',
  },
  {
    deviceId: 'phill-desktop',
    label: 'Phill Desktop',
    platform: 'Windows',
    role: 'Desktop execution host',
  },
]

export const CONNECTED_WITHIN_MS = 30_000
export const STALE_WITHIN_MS = 5 * 60_000
export const MAX_FUTURE_SKEW_MS = 10_000
export const MAX_OBSERVATION_AGE_MS = 5 * 60_000

const screenIdSchema = z.enum(['primary', 'secondary'])
const stateSchema = z.enum(['active', 'blocked', 'idle', 'unknown'])
const activitySchema = z.enum([
  'coding',
  'reviewing',
  'research',
  'meeting',
  'planning',
  'operating',
  'idle',
  'unknown',
])
const toolSchema = z.enum([
  'hermes',
  'claude-code',
  'codex',
  'browser',
  'terminal',
  'other',
])
const projectSchema = z.enum([
  'unite-group',
  'pi-ceo',
  'nexus',
  'synthex',
  'restore-assist',
  'dr-nrpg',
  'carsi',
  'ccw-crm',
  'unassigned',
])
const ticketRefSchema = z
  .string()
  .trim()
  .regex(/^(?:UNI|RA|CCW|SYN|NRPG|CARSI|RESTORE)-\d{1,7}$/)
const agentSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9][a-z0-9_-]*$/)

const screenActivitySchema = z
  .object({
    screenId: screenIdSchema,
    state: stateSchema,
    activity: activitySchema,
    tool: toolSchema.nullable(),
    agent: agentSlugSchema,
    projectKey: projectSchema,
    taskRef: ticketRefSchema.optional(),
  })
  .strict()
  .superRefine((screen, ctx) => {
    if (screen.state === 'idle' && (screen.activity !== 'idle' || screen.tool !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'idle screens must use idle activity and no tool',
      })
    }
    if (screen.state === 'unknown' && screen.activity !== 'unknown') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'unknown screens must use unknown activity',
      })
    }
  })

const activitySnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    bootId: z.string().uuid(),
    sequence: z.number().int().nonnegative().safe(),
    observedAt: z.string().datetime({ offset: true }),
    screens: z.tuple([screenActivitySchema, screenActivitySchema]),
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const ids = new Set(snapshot.screens.map((screen) => screen.screenId))
    if (ids.size !== 2 || !ids.has('primary') || !ids.has('secondary')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['screens'],
        message: 'screens must contain primary and secondary exactly once',
      })
    }
  })

export type ActivitySnapshot = z.infer<typeof activitySnapshotSchema>
export type ScreenActivity = z.infer<typeof screenActivitySchema>
export type SafeActivityKind = z.infer<typeof activitySchema>
export type SafeActivityTool = z.infer<typeof toolSchema>
export type SafeProjectKey = z.infer<typeof projectSchema>

export interface MachineScreenView {
  screenId: MachineScreenId
  label: 'Screen 1' | 'Screen 2'
  state: MachineScreenState
  activity: SafeActivityKind
  tool: SafeActivityTool | null
  agent: string | null
  projectKey: SafeProjectKey | null
  taskRef: string | null
  lastSeenAt: string | null
}

export interface MachineActivityDeviceView {
  deviceId: MachineDeviceId
  label: string
  platform: 'macOS' | 'Windows'
  role: string
  connection: MachineConnectionState
  lastSeenAt: string | null
  screens: [MachineScreenView, MachineScreenView]
}

export type MachineActivitySource = 'connected' | 'not_connected' | 'error'

export interface MachineActivityView {
  source: MachineActivitySource
  reason?: string
  generatedAt: string
  machines: MachineActivityDeviceView[]
}

function invalidSnapshot(message: string): Error {
  return new Error(`Invalid activity snapshot: ${message}`)
}

export function parseActivitySnapshot(input: unknown, nowMs: number = Date.now()): ActivitySnapshot {
  const parsed = activitySnapshotSchema.safeParse(input)
  if (!parsed.success) {
    throw invalidSnapshot(parsed.error.issues[0]?.message ?? 'validation failed')
  }

  const observedMs = Date.parse(parsed.data.observedAt)
  if (observedMs - nowMs > MAX_FUTURE_SKEW_MS) {
    throw invalidSnapshot('clock skew exceeds 10 seconds')
  }
  if (nowMs - observedMs >= MAX_OBSERVATION_AGE_MS) {
    throw invalidSnapshot('observation is too old')
  }

  return parsed.data
}

function surfaceFor(tool: SafeActivityTool | null): AgentEventSurface {
  if (tool === 'codex') return 'codex'
  if (tool === 'claude-code') return 'claude-code'
  return 'local'
}

export function machineSessionId(
  snapshot: Pick<ActivitySnapshot, 'bootId' | 'sequence'>,
  screenId: MachineScreenId,
): string {
  return `mission-control:v1:${snapshot.bootId}:${snapshot.sequence}:${screenId}`
}

export function toMachineActivityEvents(
  deviceId: MachineDeviceId,
  snapshot: ActivitySnapshot,
): AgentEventInput[] {
  return snapshot.screens.map((screen) => ({
    sessionId: machineSessionId(snapshot, screen.screenId),
    agentName: screen.agent,
    surface: surfaceFor(screen.tool),
    machine: deviceId,
    repo: null,
    projectKey: screen.projectKey === 'unassigned' ? null : screen.projectKey,
    planKey: null,
    eventType: 'status',
    toolName: `mc:${screen.state}:${screen.activity}:${screen.tool ?? 'none'}`,
    target: screen.taskRef ?? null,
  }))
}

export interface MachineCorrelation {
  bootId: string
  sequence: number
  screenId: MachineScreenId
}

const CORRELATION_RE =
  /^mission-control:v1:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):(\d+):(primary|secondary)$/i

export function parseMachineCorrelation(value: string | null): MachineCorrelation | null {
  if (!value) return null
  const match = CORRELATION_RE.exec(value)
  if (!match) return null
  const sequence = Number.parseInt(match[2], 10)
  if (!Number.isSafeInteger(sequence) || sequence < 0) return null
  return {
    bootId: match[1].toLowerCase(),
    sequence,
    screenId: match[3] as MachineScreenId,
  }
}

export function isReplayOrOldBoot(
  events: AgentEvent[],
  deviceId: MachineDeviceId,
  snapshot: Pick<ActivitySnapshot, 'bootId' | 'sequence'>,
): boolean {
  const prior = events
    .filter((event) => event.machine === deviceId)
    .map((event) => ({ event, correlation: parseMachineCorrelation(event.session_id) }))
    .filter(
      (entry): entry is { event: AgentEvent; correlation: MachineCorrelation } =>
        entry.correlation !== null && Number.isFinite(Date.parse(entry.event.created_at)),
    )
    .sort((a, b) => Date.parse(b.event.created_at) - Date.parse(a.event.created_at))

  if (prior.length === 0) return false

  const currentBootId = prior[0].correlation.bootId
  const submittedBootId = snapshot.bootId.toLowerCase()
  if (submittedBootId !== currentBootId) {
    return prior.some((entry) => entry.correlation.bootId === submittedBootId)
  }

  const maxSequence = Math.max(
    ...prior
      .filter((entry) => entry.correlation.bootId === submittedBootId)
      .map((entry) => entry.correlation.sequence),
  )
  return snapshot.sequence <= maxSequence
}

const ENCODED_ACTIVITY_RE =
  /^mc:(active|blocked|idle|unknown):(coding|reviewing|research|meeting|planning|operating|idle|unknown):(hermes|claude-code|codex|browser|terminal|other|none)$/

function decodeActivity(value: string | null): {
  state: 'active' | 'blocked' | 'idle' | 'unknown'
  activity: SafeActivityKind
  tool: SafeActivityTool | null
} | null {
  if (!value) return null
  const match = ENCODED_ACTIVITY_RE.exec(value)
  if (!match) return null
  return {
    state: match[1] as 'active' | 'blocked' | 'idle' | 'unknown',
    activity: match[2] as SafeActivityKind,
    tool: match[3] === 'none' ? null : (match[3] as SafeActivityTool),
  }
}

function isDeviceId(value: string | null): value is MachineDeviceId {
  return MACHINE_DEVICE_IDS.includes(value as MachineDeviceId)
}

function connectionFor(lastSeenMs: number | null, nowMs: number): MachineConnectionState {
  if (lastSeenMs === null || !Number.isFinite(lastSeenMs)) return 'not_reporting'
  const age = nowMs - lastSeenMs
  if (age < -MAX_FUTURE_SKEW_MS) return 'not_reporting'
  if (age < CONNECTED_WITHIN_MS) return 'connected'
  if (age < STALE_WITHIN_MS) return 'stale'
  return 'offline'
}

function safeProject(value: string | null): SafeProjectKey | null {
  const parsed = projectSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

function safeTaskRef(value: string | null): string | null {
  const parsed = ticketRefSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

function safeAgent(value: string): string | null {
  const parsed = agentSlugSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

function screenLabel(screenId: MachineScreenId): 'Screen 1' | 'Screen 2' {
  return screenId === 'primary' ? 'Screen 1' : 'Screen 2'
}

export function buildMachineActivityView(
  events: AgentEvent[],
  nowMs: number = Date.now(),
  source: MachineActivitySource = 'connected',
  reason?: string,
): MachineActivityView {
  const safeEvents = events
    .map((event) => ({
      event,
      correlation: parseMachineCorrelation(event.session_id),
      activity: decodeActivity(event.tool_name),
      createdMs: Date.parse(event.created_at),
    }))
    .filter(
      (entry) =>
        isDeviceId(entry.event.machine) &&
        entry.correlation !== null &&
        entry.activity !== null &&
        Number.isFinite(entry.createdMs) &&
        entry.createdMs - nowMs <= MAX_FUTURE_SKEW_MS,
    )

  const machines = MACHINE_ROSTER.map((roster): MachineActivityDeviceView => {
    const deviceEvents = safeEvents
      .filter((entry) => entry.event.machine === roster.deviceId)
      .sort((a, b) => b.createdMs - a.createdMs)
    const lastSeenMs = deviceEvents[0]?.createdMs ?? null
    const connection = connectionFor(lastSeenMs, nowMs)

    const screens = (['primary', 'secondary'] as const).map((screenId): MachineScreenView => {
      const latest = deviceEvents.find((entry) => entry.correlation?.screenId === screenId)
      const disconnectedState: MachineScreenState =
        connection === 'connected' ? 'unknown' : connection

      if (!latest || !latest.activity || !latest.correlation) {
        return {
          screenId,
          label: screenLabel(screenId),
          state: disconnectedState,
          activity: 'unknown',
          tool: null,
          agent: null,
          projectKey: null,
          taskRef: null,
          lastSeenAt: null,
        }
      }

      const isCurrent = connection === 'connected'
      return {
        screenId,
        label: screenLabel(screenId),
        state: isCurrent ? latest.activity.state : connection,
        activity: isCurrent ? latest.activity.activity : 'unknown',
        tool: isCurrent ? latest.activity.tool : null,
        agent: isCurrent ? safeAgent(latest.event.agent_name) : null,
        projectKey: isCurrent ? safeProject(latest.event.project_key) : null,
        taskRef: isCurrent ? safeTaskRef(latest.event.target) : null,
        lastSeenAt: latest.event.created_at,
      }
    }) as [MachineScreenView, MachineScreenView]

    return {
      ...roster,
      connection,
      lastSeenAt: lastSeenMs === null ? null : new Date(lastSeenMs).toISOString(),
      screens,
    }
  })

  return {
    source,
    ...(reason ? { reason } : {}),
    generatedAt: new Date(nowMs).toISOString(),
    machines,
  }
}
