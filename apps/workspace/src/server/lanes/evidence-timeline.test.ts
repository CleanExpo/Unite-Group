import { describe, expect, it } from 'vitest'
import { CONTRACT_SCHEMA_VERSION } from '../../../../../contracts/control-plane/v1'
import { EVENT_STREAM_SOURCE } from './event-stream'
import {
  buildTimeline,
  filterRecords,
  normaliseEvidence,
  recordsFromEvents,
  RETENTION_DAYS,
  safeUri,
  summariseTimeline,
  TIMELINE_STAGES,
} from './evidence-timeline'
import type { TimelineRecord, TimelineStageName } from './evidence-timeline'
import type { LaneStreamEvent } from './event-stream'

const IDENTITY = {
  founderRequestId: 'fr-1',
  linearTaskId: 'UNI-1',
  operatorJobId: 'job-1',
  laneId: 'lane-1',
  machineId: 'macbook',
  processId: 'pid-1',
  toolCallId: 'toolu_1',
}

function event(sequence: number, overrides: Partial<LaneStreamEvent> = {}): LaneStreamEvent {
  return {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    source: EVENT_STREAM_SOURCE,
    occurredAt: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)).toISOString(),
    sequence,
    runId: 'run_1',
    kind: 'output',
    message: `line ${sequence}`,
    laneId: 'lane-1',
    machineId: 'macbook',
    agent: 'claude-code',
    ...overrides,
  }
}

/** A record for every stage, so a test can remove exactly one. */
function fullRecords(): TimelineRecord[] {
  return TIMELINE_STAGES.map((stage) => ({
    stage,
    source: `surface:${stage}`,
    owner: 'phill',
    machineId: 'macbook',
    model: 'claude-code',
    durationMs: 100,
    evidence: [
      {
        kind: 'log' as const,
        uri: `https://evidence.test/${stage}`,
        status: 'verified' as const,
        verifiedBy: 'ci',
      },
    ],
  }))
}

describe('a missing stage is reported, never omitted', () => {
  it('reports a complete timeline when every stage is present', () => {
    const timeline = buildTimeline(IDENTITY, fullRecords())
    expect(timeline.stages).toHaveLength(TIMELINE_STAGES.length)
    expect(timeline.integrity.complete).toBe(true)
    expect(timeline.integrity.missingStages).toEqual([])
  })

  it.each(TIMELINE_STAGES)('detects a deliberately removed %s stage', (removed) => {
    // This is the ticket's verification step. A timeline that only lists what it
    // found renders a skipped stage as one fewer row, and nobody notices a row
    // that was never drawn.
    const records = fullRecords().filter((record) => record.stage !== removed)
    const timeline = buildTimeline(IDENTITY, records)

    expect(timeline.integrity.complete).toBe(false)
    expect(timeline.integrity.missingStages).toEqual([removed])
    // The stage is still THERE, marked missing — not absent from the list.
    expect(timeline.stages).toHaveLength(TIMELINE_STAGES.length)
    const stage = timeline.stages.find((candidate) => candidate.stage === removed)
    expect(stage?.state).toBe('missing')
    expect(stage?.note).toMatch(/no evidence recorded/i)
  })

  it('names the missing stages first when summarising', () => {
    const records = fullRecords().filter((record) => record.stage !== 'review')
    expect(summariseTimeline(buildTimeline(IDENTITY, records))[0]).toContain('missing: review')
  })

  it('says so plainly when nothing is missing', () => {
    expect(summariseTimeline(buildTimeline(IDENTITY, fullRecords()))[0]).toMatch(/^complete:/)
  })
})

describe('claimed is never laundered into verified', () => {
  it('keeps a claimed link claimed', () => {
    const link = normaliseEvidence({
      kind: 'pull_request',
      uri: 'https://github.test/pr/1',
      status: 'claimed',
    })
    expect(link.status).toBe('claimed')
    expect(link.verifiedBy).toBeUndefined()
  })

  it('demotes a verified claim that names no verifier', () => {
    // "Verified by nobody" is the exact shape of a laundered assertion.
    for (const verifiedBy of [undefined, '', '   ']) {
      const link = normaliseEvidence({
        kind: 'test_output',
        uri: 'https://ci.test/run/1',
        status: 'verified',
        ...(verifiedBy === undefined ? {} : { verifiedBy }),
      })
      expect(link.status).toBe('claimed')
    }
  })

  it('honours a verified claim that names its verifier', () => {
    const link = normaliseEvidence({
      kind: 'test_output',
      uri: 'https://ci.test/run/1',
      status: 'verified',
      verifiedBy: 'github-actions',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(link).toMatchObject({ status: 'verified', verifiedBy: 'github-actions' })
  })

  it('counts unverified evidence rather than hiding it', () => {
    const records = fullRecords().map((record) => ({
      ...record,
      evidence: [{ kind: 'log' as const, uri: 'https://x.test', status: 'claimed' as const }],
    }))
    const timeline = buildTimeline(IDENTITY, records)
    expect(timeline.integrity.unverifiedEvidence).toBe(TIMELINE_STAGES.length)
    expect(summariseTimeline(timeline).join(' ')).toMatch(/claimed but not verified/)
  })

  it('marks a stage recorded, not verified, when its evidence is only claimed', () => {
    const records: TimelineRecord[] = [
      {
        stage: 'tests',
        source: 'ci',
        evidence: [{ kind: 'test_output', uri: 'https://ci.test/1', status: 'claimed' }],
      },
    ]
    const stage = buildTimeline(IDENTITY, records).stages.find((s) => s.stage === 'tests')
    expect(stage?.state).toBe('recorded')
    expect(stage?.note).toMatch(/not independently verified/i)
  })
})

describe('identity chain', () => {
  it('reports a link that skipped its parent', () => {
    // A laneId with no operatorJobId above it means work entered the fleet
    // through a second door.
    const timeline = buildTimeline(
      { founderRequestId: 'fr-1', laneId: 'lane-1' },
      fullRecords(),
    )
    expect(timeline.integrity.identityGaps.length).toBeGreaterThan(0)
    expect(timeline.integrity.complete).toBe(false)
  })

  it('accepts a whole chain', () => {
    expect(buildTimeline(IDENTITY, fullRecords()).integrity.identityGaps).toEqual([])
  })
})

describe('failures are not smoothed over', () => {
  it('marks a failed stage and refuses to call the timeline complete', () => {
    const records = fullRecords().map((record) =>
      record.stage === 'tests' ? { ...record, failed: true } : record,
    )
    const timeline = buildTimeline(IDENTITY, records)
    const stage = timeline.stages.find((candidate) => candidate.stage === 'tests')
    expect(stage?.state).toBe('failed')
    expect(timeline.integrity.complete).toBe(false)
  })
})

describe('derivation from the live event stream', () => {
  it('derives the lane run with its real duration', () => {
    const records = recordsFromEvents([
      event(1, { kind: 'lifecycle', message: 'Run started' }),
      event(5, { kind: 'lifecycle', message: 'Run succeeded' }),
    ])
    const laneRun = records.find((record) => record.stage === 'lane_run')
    expect(laneRun?.durationMs).toBe(4_000)
    expect(laneRun?.machineId).toBe('macbook')
    expect(laneRun?.agent).toBe('claude-code')
    expect(laneRun?.failed).toBe(false)
  })

  it('marks the lane run failed when the stream carried an error', () => {
    const records = recordsFromEvents([
      event(1, { kind: 'lifecycle' }),
      event(2, { kind: 'error', message: 'Run failed' }),
    ])
    expect(records.find((record) => record.stage === 'lane_run')?.failed).toBe(true)
  })

  it('derives tool calls and records them as claimed, not verified', () => {
    // A tool result is the CLI's own report of itself, not an independent check.
    const records = recordsFromEvents([
      event(1, { kind: 'lifecycle' }),
      event(2, {
        kind: 'tool_call',
        tool: { name: 'Bash', argumentSummary: 'npm test', status: 'succeeded', durationMs: 10 },
      }),
    ])
    const tools = records.find((record) => record.stage === 'tool_calls')
    expect(tools?.evidence?.[0]).toMatchObject({ status: 'claimed' })
    expect(tools?.failed).toBe(false)
  })

  it('marks tool_calls failed when any tool failed', () => {
    const records = recordsFromEvents([
      event(1, { kind: 'lifecycle' }),
      event(2, {
        kind: 'tool_call',
        tool: { name: 'Bash', argumentSummary: '', status: 'failed' },
      }),
    ])
    expect(records.find((record) => record.stage === 'tool_calls')?.failed).toBe(true)
  })

  it('returns nothing for an empty stream rather than inventing a run', () => {
    expect(recordsFromEvents([])).toEqual([])
  })

  it('omits a duration it cannot compute instead of reporting zero', () => {
    const records = recordsFromEvents([
      event(1, { occurredAt: 'not-a-date' }),
      event(2, { occurredAt: 'also-not-a-date' }),
    ])
    expect(records.find((record) => record.stage === 'lane_run')?.durationMs).toBeUndefined()
  })

  it('fills the lane_run stage of a real timeline', () => {
    const timeline = buildTimeline(IDENTITY, [], [
      event(1, { kind: 'lifecycle' }),
      event(2, { kind: 'lifecycle' }),
    ])
    const laneRun = timeline.stages.find((stage) => stage.stage === 'lane_run')
    expect(laneRun?.state).toBe('recorded')
    // Everything else is still honestly missing.
    expect(timeline.integrity.missingStages).toContain('review')
  })
})

describe('filtering', () => {
  const records: TimelineRecord[] = [
    { stage: 'lane_run', source: 'a', business: 'carsi', project: 'p1', taskId: 'T1', machineId: 'macbook', agent: 'claude-code' },
    { stage: 'lane_run', source: 'b', business: 'ccw', project: 'p2', taskId: 'T2', machineId: 'mini', agent: 'codex' },
  ]

  it.each([
    ['business', { business: 'carsi' }],
    ['project', { project: 'p1' }],
    ['taskId', { taskId: 'T1' }],
    ['machineId', { machineId: 'macbook' }],
    ['agent', { agent: 'claude-code' }],
  ] as const)('filters by %s', (_label, filter) => {
    const filtered = filterRecords(records, filter)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.source).toBe('a')
  })

  it('requires every provided field to match, not any', () => {
    expect(filterRecords(records, { business: 'carsi', agent: 'codex' })).toEqual([])
  })

  it('returns everything when no filter is given', () => {
    expect(filterRecords(records)).toHaveLength(2)
  })

  it('a filter that excludes a stage makes it missing, not invisible', () => {
    const timeline = buildTimeline(IDENTITY, records, [], { machineId: 'mini' })
    // Filtering must not quietly produce a timeline that looks complete.
    expect(timeline.integrity.missingStages.length).toBeGreaterThan(0)
  })
})

describe('redaction and retention', () => {
  it('redacts a credential-shaped URI before it enters the view', () => {
    const uri = safeUri('https://user:sk_live_abcdefghijklmnop123456@evidence.test/run/1')
    expect(uri).not.toContain('sk_live_abcdefghijklmnop123456')
    expect(uri).toContain('[REDACTED]')
  })

  it('redacts a home directory out of a file URI', () => {
    expect(safeUri('file:///Users/phill/secret/out.txt')).toContain('[REDACTED_PATH]')
  })

  it('bounds an oversized URI', () => {
    expect(safeUri(`https://evidence.test/${'x'.repeat(5_000)}`).length).toBeLessThanOrEqual(500)
  })

  it('returns an empty string for a non-string URI rather than throwing', () => {
    for (const value of [undefined, null, 42, {}, '']) {
      expect(safeUri(value)).toBe('')
    }
  })

  it('keeps a secret out of an evidence link that reaches the timeline', () => {
    const records: TimelineRecord[] = [
      {
        stage: 'tests',
        source: 'ci',
        evidence: [
          {
            kind: 'test_output',
            uri: 'https://ci.test/?token=sk_live_abcdefghijklmnop123456',
            status: 'claimed',
          },
        ],
      },
    ]
    const rendered = JSON.stringify(buildTimeline(IDENTITY, records))
    expect(rendered).not.toContain('sk_live_abcdefghijklmnop123456')
  })

  it('states the retention policy rather than leaving it implied', () => {
    expect(buildTimeline(IDENTITY, fullRecords()).retentionDays).toBe(RETENTION_DAYS)
    expect(RETENTION_DAYS).toBeGreaterThan(0)
  })
})

describe('reconstructing a run from the ledger alone', () => {
  it('answers who, where, on what, how long and whether it was verified', () => {
    // The ticket's real test: can a reader reconstruct what happened using only
    // the ledger and its links?
    const records: TimelineRecord[] = [
      {
        stage: 'founder_input',
        source: 'command-centre',
        owner: 'phill',
        evidence: [{ kind: 'log', uri: 'https://ledger.test/input/1', status: 'claimed' }],
      },
      {
        stage: 'pull_request',
        source: 'github',
        owner: 'phill',
        machineId: 'macbook',
        durationMs: 4_000,
        evidence: [
          {
            kind: 'pull_request',
            uri: 'https://github.test/pr/9',
            status: 'verified',
            verifiedBy: 'github-actions',
          },
        ],
      },
    ]
    const timeline = buildTimeline(IDENTITY, records)

    const pr = timeline.stages.find((stage) => stage.stage === 'pull_request')!
    expect(pr.owner).toBe('phill')
    expect(pr.machineId).toBe('macbook')
    expect(pr.durationMs).toBe(4_000)
    expect(pr.state).toBe('verified')
    expect(pr.evidence[0]?.uri).toBe('https://github.test/pr/9')

    // And it refuses to pretend the rest happened.
    expect(timeline.integrity.complete).toBe(false)
    expect(timeline.integrity.missingStages).toContain('review')
  })
})
