import { describe, expect, it } from 'vitest'

import type { AgentEvent } from '../agent-events'
import {
  buildMachineActivityView,
  parseActivitySnapshot,
  toMachineActivityEvents,
} from '../machine-activity'

const observedAt = '2026-07-18T10:00:00.000Z'

function snapshot() {
  return {
    schemaVersion: 1,
    bootId: '11111111-1111-4111-8111-111111111111',
    sequence: 7,
    observedAt,
    screens: [
      {
        screenId: 'primary',
        state: 'active',
        activity: 'coding',
        tool: 'hermes',
        agent: 'default',
        projectKey: 'unite-group',
        taskRef: 'UNI-2403',
      },
      {
        screenId: 'secondary',
        state: 'blocked',
        activity: 'reviewing',
        tool: 'codex',
        agent: 'empire',
        projectKey: 'pi-ceo',
        taskRef: 'RA-2404',
      },
    ],
  }
}

function storedEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    id: 'event-1',
    founder_id: 'founder-1',
    session_id: 'mission-control:v1:11111111-1111-4111-8111-111111111111:7:primary',
    agent_name: 'default',
    surface: 'local',
    machine: 'unite-mac-mini',
    repo: null,
    project_key: 'unite-group',
    plan_key: null,
    event_type: 'status',
    tool_name: 'mc:active:coding:hermes',
    target: 'UNI-2403',
    created_at: observedAt,
    ...overrides,
  }
}

describe('parseActivitySnapshot — strict privacy boundary', () => {
  it('accepts exactly the bounded two-screen contract', () => {
    expect(parseActivitySnapshot(snapshot(), Date.parse(observedAt))).toMatchObject({ sequence: 7 })
  })

  it.each(['windowTitle', 'prompt', 'command', 'path', 'url', 'clipboard', 'processes'])(
    'rejects forbidden free-text field %s',
    (field) => {
      const dirty = { ...snapshot(), [field]: 'must never persist' }
      expect(() => parseActivitySnapshot(dirty)).toThrow(/invalid activity snapshot/i)
    },
  )

  it('rejects partial, duplicate, or third-screen snapshots', () => {
    const base = snapshot()
    expect(() => parseActivitySnapshot({ ...base, screens: [base.screens[0]] })).toThrow()
    expect(() => parseActivitySnapshot({ ...base, screens: [base.screens[0], base.screens[0]] })).toThrow()
    expect(() => parseActivitySnapshot({
      ...base,
      screens: [...base.screens, { ...base.screens[0], screenId: 'third' }],
    })).toThrow()
  })

  it('rejects arbitrary task text, unknown projects, and large future clock skew', () => {
    const base = snapshot()
    expect(() => parseActivitySnapshot({
      ...base,
      screens: [{ ...base.screens[0], taskRef: 'Call private client now' }, base.screens[1]],
    })).toThrow()
    expect(() => parseActivitySnapshot({
      ...base,
      screens: [{ ...base.screens[0], projectKey: 'secret-client' }, base.screens[1]],
    })).toThrow()
    expect(() => parseActivitySnapshot(base, Date.parse(observedAt) - 11_000)).toThrow(/clock/i)
  })
})

describe('toMachineActivityEvents', () => {
  it('maps a credential-bound device to exactly two fixed-column redacted events', () => {
    const events = toMachineActivityEvents(
      'unite-mac-mini',
      parseActivitySnapshot(snapshot(), Date.parse(observedAt)),
    )
    expect(events).toHaveLength(2)
    expect(events.map((event) => event.machine)).toEqual(['unite-mac-mini', 'unite-mac-mini'])
    expect(events.map((event) => event.sessionId)).toEqual([
      'mission-control:v1:11111111-1111-4111-8111-111111111111:7:primary',
      'mission-control:v1:11111111-1111-4111-8111-111111111111:7:secondary',
    ])
    expect(JSON.stringify(events)).not.toMatch(/window|prompt|command|path|url|clipboard|process/i)
  })
})

describe('buildMachineActivityView — honest fixed topology', () => {
  it('always returns three trusted machines and two screen slots each', () => {
    const view = buildMachineActivityView([], Date.parse(observedAt))
    expect(view.machines).toHaveLength(3)
    expect(view.machines.flatMap((machine) => machine.screens)).toHaveLength(6)
    expect(view.machines.every((machine) => machine.connection === 'not_reporting')).toBe(true)
  })

  it('uses server receipt freshness boundaries and never leaves stale/offline active', () => {
    const event = storedEvent()
    const connected = buildMachineActivityView([event], Date.parse(observedAt) + 29_999)
    const stale = buildMachineActivityView([event], Date.parse(observedAt) + 30_000)
    const offline = buildMachineActivityView([event], Date.parse(observedAt) + 300_000)

    expect(connected.machines[0].connection).toBe('connected')
    expect(connected.machines[0].screens[0].state).toBe('active')
    expect(stale.machines[0].connection).toBe('stale')
    expect(stale.machines[0].screens[0].state).toBe('stale')
    expect(offline.machines[0].connection).toBe('offline')
    expect(offline.machines[0].screens[0].state).toBe('offline')
  })

  it('ignores untrusted hostnames, arbitrary tool text, malformed correlations, and large future timestamps', () => {
    const events = [
      storedEvent({ machine: 'raw-private-hostname', target: 'secret client', tool_name: 'Bash rm -rf /' }),
      storedEvent({ session_id: 'not-mission-control', created_at: observedAt }),
      storedEvent({ created_at: '2026-07-18T11:00:00.000Z' }),
    ]
    const view = buildMachineActivityView(events, Date.parse(observedAt))
    expect(view.machines.every((machine) => machine.connection === 'not_reporting')).toBe(true)
    expect(JSON.stringify(view)).not.toContain('raw-private-hostname')
    expect(JSON.stringify(view)).not.toContain('secret client')
    expect(JSON.stringify(view)).not.toContain('rm -rf')
  })
})
