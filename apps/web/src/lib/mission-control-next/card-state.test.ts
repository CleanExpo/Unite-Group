import { describe, it, expect } from 'vitest';
import {
  CARD_STATES,
  classifyFleet,
  classifyMissions,
  classifyQueue,
  classifyRevenue,
  isSyntheticSource,
  toneFor,
  type ReadResult,
} from './card-state';

const NOW = Date.parse('2026-09-27T00:00:00Z');
const fetchedAt = new Date(NOW).toISOString();
const ok = (body: unknown): ReadResult => ({ ok: true, status: 200, body, fetchedAt });
const failed = (status: number): ReadResult => ({ ok: false, status, body: { error: 'x' }, fetchedAt });
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe('toneFor — only live may be green', () => {
  it('maps live to good', () => {
    expect(toneFor('live')).toBe('good');
  });

  it('never maps any non-live state to good', () => {
    for (const s of CARD_STATES.filter((s) => s !== 'live')) {
      expect(toneFor(s)).not.toBe('good');
    }
  });
});

describe('isSyntheticSource', () => {
  it('flags mock, seed, fallback, test, synthetic and demo sources', () => {
    for (const s of ['mock', 'seed v1', 'fallback:no_tasks', 'test', 'synthetic', 'demo']) {
      expect(isSyntheticSource(s)).toBe(true);
    }
  });

  it('does not flag real sources or non-strings', () => {
    for (const s of ['supabase', 'pi_ceo_live', 'xero', undefined, 42]) {
      expect(isSyntheticSource(s)).toBe(false);
    }
  });
});

describe('classifyMissions', () => {
  it('is live for a successful supabase read', () => {
    expect(classifyMissions(ok({ source: 'supabase', missions: [] }), NOW).state).toBe('live');
  });

  it('is unavailable when the read failed', () => {
    expect(classifyMissions(failed(503), NOW).state).toBe('unavailable');
  });

  it('is test when the source is synthetic', () => {
    expect(classifyMissions(ok({ source: 'fallback:seed', missions: [] }), NOW).state).toBe('test');
  });

  it('is unknown for an unrecognised shape', () => {
    expect(classifyMissions(ok({ nope: true }), NOW).state).toBe('unknown');
  });
});

describe('classifyQueue', () => {
  it('is live for a task array and unavailable on failure', () => {
    expect(classifyQueue(ok({ tasks: [] }), NOW).state).toBe('live');
    expect(classifyQueue(failed(500), NOW).state).toBe('unavailable');
  });

  it('is test, never live, when the source is synthetic', () => {
    for (const source of ['seed', 'fallback:no_tasks', 'mock']) {
      expect(classifyQueue(ok({ source, tasks: [{ id: 1 }] }), NOW).state).toBe('test');
    }
  });
});

describe('classifyFleet', () => {
  const machine = (last_seen: string, is_stale: boolean) => ({ host: 'mini', last_seen, is_stale });

  it('is live when every machine is fresh', () => {
    const r = classifyFleet(ok({ source: 'pi_ceo_live', machines: [machine(minsAgo(1), false)] }), NOW);
    expect(r.state).toBe('live');
    expect(r.observedAt).toBe(minsAgo(1));
  });

  it('is partial when some machines are stale', () => {
    const body = { source: 'pi_ceo_live', machines: [machine(minsAgo(1), false), machine(minsAgo(90), true)] };
    expect(classifyFleet(ok(body), NOW).state).toBe('partial');
  });

  it('is stale when every machine is stale', () => {
    const body = { source: 'pi_ceo_live', machines: [machine(minsAgo(90), true)] };
    expect(classifyFleet(ok(body), NOW).state).toBe('stale');
  });

  it('is unavailable for non-live sources and empty fleets', () => {
    for (const source of ['not_configured', 'no_key', 'upstream_error', 'timeout', 'error']) {
      expect(classifyFleet(ok({ source, machines: [] }), NOW).state).toBe('unavailable');
    }
    expect(classifyFleet(ok({ source: 'pi_ceo_live', machines: [] }), NOW).state).toBe('unavailable');
  });
});

describe('classifyRevenue', () => {
  const account = (status: 'ok' | 'not_connected', truncated = false) =>
    status === 'ok'
      ? { status, readAt: minsAgo(1), truncated, mrr: { rows: [], totalCents: 0 } }
      : { status, reason: 'missing_key', readAt: minsAgo(1) };
  const body = (accounts: unknown[], complete: boolean, cachedAt = minsAgo(1)) => ({
    accounts,
    combined: { weekNetCents: 0, complete },
    cachedAt,
  });

  it('is live when every account read and totals are complete', () => {
    expect(classifyRevenue(ok(body([account('ok'), account('ok')], true)), NOW).state).toBe('live');
  });

  it('is partial when an account is not connected or totals are incomplete', () => {
    expect(classifyRevenue(ok(body([account('ok'), account('not_connected')], false)), NOW).state).toBe('partial');
    expect(classifyRevenue(ok(body([account('ok', true)], true)), NOW).state).toBe('partial');
  });

  it('is unavailable when no account is connected or the read failed', () => {
    expect(classifyRevenue(ok(body([account('not_connected')], false)), NOW).state).toBe('unavailable');
    expect(classifyRevenue(failed(500), NOW).state).toBe('unavailable');
  });

  it('is test, never live, when the source is synthetic', () => {
    expect(classifyRevenue(ok({ ...body([account('ok')], true), source: 'mock' }), NOW).state).toBe('test');
  });

  it('is stale when the snapshot is older than the freshness window', () => {
    expect(classifyRevenue(ok(body([account('ok')], true, minsAgo(30))), NOW).state).toBe('stale');
  });
});
