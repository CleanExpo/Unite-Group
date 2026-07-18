import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import {
  insertAgentEvents,
  listAgentEvents,
  type AgentEventsClientLike,
} from '@/lib/command-centre/agent-events'
import {
  MACHINE_DEVICE_IDS,
  isReplayOrOldBoot,
  parseActivitySnapshot,
  toMachineActivityEvents,
  type MachineDeviceId,
} from '@/lib/command-centre/machine-activity'
import { sanitiseError } from '@/lib/error-reporting'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const MIN_DEVICE_TOKEN_LENGTH = 32

type DeviceTokens = Partial<Record<MachineDeviceId, string>>

function parseDeviceTokens(raw: string | undefined): DeviceTokens {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const record = parsed as Record<string, unknown>
    const allowed = new Set<string>(MACHINE_DEVICE_IDS)
    if (Object.keys(record).some((key) => !allowed.has(key))) return {}

    const tokens: DeviceTokens = {}
    const seen = new Set<string>()
    for (const deviceId of MACHINE_DEVICE_IDS) {
      const value = record[deviceId]
      if (value === undefined) continue
      if (typeof value !== 'string' || value.trim().length < MIN_DEVICE_TOKEN_LENGTH) return {}
      const token = value.trim()
      if (seen.has(token)) return {}
      seen.add(token)
      tokens[deviceId] = token
    }
    return tokens
  } catch {
    return {}
  }
}

function safeBearerMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(`Bearer ${expected}`)
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

function deviceForRequest(request: Request): MachineDeviceId | null {
  const tokens = parseDeviceTokens(process.env.MACHINE_ACTIVITY_DEVICE_TOKENS)
  const authorization = request.headers.get('authorization') ?? ''
  let matched: MachineDeviceId | null = null
  for (const deviceId of MACHINE_DEVICE_IDS) {
    const token = tokens[deviceId]
    if (token && safeBearerMatch(authorization, token)) matched = deviceId
  }
  return matched
}

export async function POST(request: Request) {
  const deviceId = deviceForRequest(request)
  if (!deviceId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 503 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  let snapshot
  try {
    snapshot = parseActivitySnapshot(raw)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid activity snapshot' },
      { status: 400 },
    )
  }

  try {
    const client = createServiceClient() as unknown as AgentEventsClientLike
    const recent = await listAgentEvents(client, founderId, 200)
    if (isReplayOrOldBoot(recent, deviceId, snapshot)) {
      return NextResponse.json(
        { error: 'Snapshot replay or out-of-order sequence' },
        { status: 409 },
      )
    }

    const events = toMachineActivityEvents(deviceId, snapshot)
    const inserted = await insertAgentEvents(client, founderId, events)
    if (inserted.length !== events.length) {
      return NextResponse.json(
        { error: 'Ingest did not persist the complete snapshot' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { ingested: inserted.length, deviceId, acceptedSequence: snapshot.sequence },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Failed to ingest machine activity') },
      { status: 500 },
    )
  }
}
