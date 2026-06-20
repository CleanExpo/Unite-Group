import { describe, it, expect } from 'vitest'
import {
  parsePacket,
  parseHandoffResponse,
  fetchPacket,
  type LinearExecutionPacket,
} from './packet'

const validPacket: LinearExecutionPacket = {
  source: 'command-centre:linear-claim',
  runId: 'handoff-2026-06-21T00:00:00Z',
  runner: 'rana-cli',
  issue: {
    id: 'abc',
    identifier: 'UNI-2143',
    title: 'Autonomous Linear claim-loop core',
    url: 'https://linear.app/unite-group/issue/UNI-2143',
    priority: 2,
  },
  branchName: 'pidev/auto-uni-2143',
  prompt: 'You are pi-dev-autopilot. Continue the autonomous build...',
  steps: [{ id: 'read-linear-issue', title: 'Read the issue', command: 'linear issue view UNI-2143' }],
}

/** Build a fake `fetch` that yields the given JSON body / status. */
function fakeFetch(body: unknown, init: { status?: number; ok?: boolean; throws?: boolean; nonJson?: boolean } = {}): typeof fetch {
  const status = init.status ?? 200
  return (async () => {
    if (init.throws) throw new Error('network down')
    return {
      status,
      ok: init.ok ?? (status >= 200 && status < 300),
      json: async () => {
        if (init.nonJson) throw new Error('Unexpected token')
        return body
      },
    } as Response
  }) as unknown as typeof fetch
}

describe('parsePacket', () => {
  it('accepts a well-formed packet', () => {
    expect(parsePacket(validPacket)).toEqual(validPacket)
  })

  it('treats url as optional', () => {
    const { url: _url, ...issueNoUrl } = validPacket.issue
    const noUrl = { ...validPacket, issue: issueNoUrl }
    expect(parsePacket(noUrl)).toEqual(noUrl)
  })

  it('rejects the wrong source', () => {
    expect(parsePacket({ ...validPacket, source: 'something-else' })).toBeNull()
  })

  it.each([
    ['missing runId', { runId: undefined }],
    ['non-string branchName', { branchName: 42 }],
    ['missing issue', { issue: undefined }],
    ['non-numeric priority', { issue: { ...validPacket.issue, priority: 'high' } }],
    ['steps not an array', { steps: 'nope' }],
  ])('rejects %s', (_label, patch) => {
    expect(parsePacket({ ...validPacket, ...(patch as object) })).toBeNull()
  })

  it('rejects a malformed step', () => {
    expect(parsePacket({ ...validPacket, steps: [{ id: 'x', title: 'y' }] })).toBeNull()
  })

  it.each([null, undefined, 'string', 42, []])('rejects non-object input: %s', (v) => {
    expect(parsePacket(v)).toBeNull()
  })
})

describe('parseHandoffResponse', () => {
  it('returns the packet when ok + execution_packet present', () => {
    const r = parseHandoffResponse({ ok: true, execution_packet: validPacket, next_action: 'claim_and_build' })
    expect(r).toEqual({ status: 'packet', packet: validPacket })
  })

  it('returns idle when execution_packet is null', () => {
    expect(parseHandoffResponse({ ok: true, execution_packet: null, next_action: 'idle' })).toEqual({ status: 'idle' })
  })

  it('returns idle when execution_packet is absent', () => {
    expect(parseHandoffResponse({ ok: true })).toEqual({ status: 'idle' })
  })

  it('surfaces an ok=false error message', () => {
    expect(parseHandoffResponse({ ok: false, error: 'Unauthorised' })).toEqual({ status: 'error', error: 'Unauthorised' })
  })

  it('errors on a malformed execution_packet', () => {
    const r = parseHandoffResponse({ ok: true, execution_packet: { source: 'wrong' } })
    expect(r).toEqual({ status: 'error', error: 'malformed execution_packet' })
  })

  it('errors on a non-object body', () => {
    expect(parseHandoffResponse('nope').status).toBe('error')
  })
})

describe('fetchPacket', () => {
  const base = { endpoint: 'https://unite-group.in/api/cron/linear-handoff', cronSecret: 's3cr3t' }

  it('returns a packet on 200 + claim_and_build', async () => {
    const r = await fetchPacket({ ...base, fetchFn: fakeFetch({ ok: true, execution_packet: validPacket }) })
    expect(r).toEqual({ status: 'packet', packet: validPacket })
  })

  it('returns idle on 200 + idle', async () => {
    const r = await fetchPacket({ ...base, fetchFn: fakeFetch({ ok: true, execution_packet: null }) })
    expect(r).toEqual({ status: 'idle' })
  })

  it('errors on 401', async () => {
    const r = await fetchPacket({ ...base, fetchFn: fakeFetch({ ok: false, error: 'Unauthorised' }, { status: 401, ok: false }) })
    expect(r).toEqual({ status: 'error', error: 'unauthorised — check CRON_SECRET' })
  })

  it('errors on a 500', async () => {
    const r = await fetchPacket({ ...base, fetchFn: fakeFetch({ ok: false }, { status: 500, ok: false }) })
    expect(r).toEqual({ status: 'error', error: 'handoff HTTP 500' })
  })

  it('errors when fetch throws', async () => {
    const r = await fetchPacket({ ...base, fetchFn: fakeFetch(null, { throws: true }) })
    expect(r.status).toBe('error')
    expect(r).toMatchObject({ error: expect.stringContaining('fetch failed') })
  })

  it('errors on non-JSON body', async () => {
    const r = await fetchPacket({ ...base, fetchFn: fakeFetch(null, { nonJson: true }) })
    expect(r).toEqual({ status: 'error', error: 'handoff returned non-JSON' })
  })

  it('sends the CRON_SECRET as a bearer token', async () => {
    let seenAuth: string | undefined
    const spyFetch = (async (_url: string, opts: RequestInit) => {
      seenAuth = (opts.headers as Record<string, string>).authorization
      return { status: 200, ok: true, json: async () => ({ ok: true, execution_packet: null }) } as Response
    }) as unknown as typeof fetch
    await fetchPacket({ ...base, fetchFn: spyFetch })
    expect(seenAuth).toBe('Bearer s3cr3t')
  })
})
