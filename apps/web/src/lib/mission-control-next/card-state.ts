/**
 * Card state for Mission Control vNext (UNI-2776).
 *
 * Every card classifies the raw result of an EXISTING route into one state. Only
 * `live` renders green: a stale, partial, failed, synthetic or unrecognised read
 * must never look like a healthy one.
 */

export const CARD_STATES = ['live', 'stale', 'partial', 'unavailable', 'test', 'unknown'] as const;
export type CardState = (typeof CARD_STATES)[number];
export type CardTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface ReadResult {
  ok: boolean;
  status: number;
  body: unknown;
  /** When this client made the read. */
  fetchedAt: string;
}

export interface CardStatus {
  state: CardState;
  /** Route the value came from, e.g. "/api/command-centre/missions · supabase". */
  source: string;
  /** When the underlying data was observed, if the route says; otherwise the read time. */
  observedAt: string | null;
  detail: string;
}

export const REVENUE_FRESH_FOR_MS = 10 * 60_000;

export function toneFor(state: CardState): CardTone {
  switch (state) {
    case 'live':
      return 'good';
    case 'stale':
    case 'partial':
      return 'warn';
    case 'unavailable':
      return 'bad';
    default:
      return 'neutral';
  }
}

export function isSyntheticSource(source: unknown): boolean {
  return typeof source === 'string' && /mock|seed|fallback|test|synthetic|demo/i.test(source);
}

function record(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

function failedRead(route: string, r: ReadResult): CardStatus {
  return { state: 'unavailable', source: route, observedAt: null, detail: `Read failed (HTTP ${r.status})` };
}

export function classifyMissions(r: ReadResult, _nowMs: number): CardStatus {
  const route = '/api/command-centre/missions';
  if (!r.ok) return failedRead(route, r);
  const body = record(r.body);
  if (isSyntheticSource(body?.source)) {
    return { state: 'test', source: `${route} · ${String(body?.source)}`, observedAt: r.fetchedAt, detail: 'Synthetic data' };
  }
  if (body?.source === 'supabase' && Array.isArray(body.missions)) {
    return { state: 'live', source: `${route} · supabase`, observedAt: r.fetchedAt, detail: `${body.missions.length} missions` };
  }
  return { state: 'unknown', source: route, observedAt: null, detail: 'Unrecognised response' };
}

export function classifyQueue(r: ReadResult, _nowMs: number): CardStatus {
  const route = '/api/command-centre/queue';
  if (!r.ok) return failedRead(route, r);
  const body = record(r.body);
  if (isSyntheticSource(body?.source)) {
    return { state: 'test', source: `${route} · ${String(body?.source)}`, observedAt: r.fetchedAt, detail: 'Synthetic data' };
  }
  if (Array.isArray(body?.tasks)) {
    return { state: 'live', source: `${route} · supabase`, observedAt: r.fetchedAt, detail: `${body.tasks.length} tasks` };
  }
  return { state: 'unknown', source: route, observedAt: null, detail: 'Unrecognised response' };
}

export function classifyFleet(r: ReadResult, _nowMs: number): CardStatus {
  const route = '/api/command-centre/mesh-fleet';
  if (!r.ok) return failedRead(route, r);
  const body = record(r.body);
  const source = String(body?.source ?? 'unknown');
  if (isSyntheticSource(source)) {
    return { state: 'test', source: `${route} · ${source}`, observedAt: null, detail: 'Synthetic data' };
  }
  if (source !== 'pi_ceo_live') {
    return { state: 'unavailable', source: `${route} · ${source}`, observedAt: null, detail: `Fleet not readable (${source})` };
  }
  const machines = Array.isArray(body?.machines) ? (body.machines as Array<Record<string, unknown>>) : [];
  if (machines.length === 0) {
    return { state: 'unavailable', source: `${route} · ${source}`, observedAt: null, detail: 'No machines reported' };
  }
  const staleCount = machines.filter((m) => m.is_stale === true).length;
  const lastSeen = machines
    .map((m) => (typeof m.last_seen === 'string' ? m.last_seen : ''))
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  const state: CardState = staleCount === 0 ? 'live' : staleCount === machines.length ? 'stale' : 'partial';
  return {
    state,
    source: `${route} · ${source}`,
    observedAt: lastSeen,
    detail: `${machines.length - staleCount} of ${machines.length} machines reporting`,
  };
}

export function classifyRevenue(r: ReadResult, nowMs: number): CardStatus {
  const route = '/api/command-centre/revenue';
  if (!r.ok) return failedRead(route, r);
  const body = record(r.body);
  if (isSyntheticSource(body?.source)) {
    return { state: 'test', source: `${route} · ${String(body?.source)}`, observedAt: null, detail: 'Synthetic data' };
  }
  const accounts = Array.isArray(body?.accounts) ? (body.accounts as Array<Record<string, unknown>>) : null;
  const combined = record(body?.combined);
  if (!accounts || !combined) {
    return { state: 'unknown', source: route, observedAt: null, detail: 'Unrecognised response' };
  }
  const cachedAt = typeof body?.cachedAt === 'string' ? body.cachedAt : null;
  const source = `${route} · stripe`;
  const connected = accounts.filter((a) => a.status === 'ok');
  if (connected.length === 0) {
    return { state: 'unavailable', source, observedAt: cachedAt, detail: 'No Stripe account connected' };
  }
  if (connected.length < accounts.length || combined.complete !== true || connected.some((a) => a.truncated === true)) {
    return { state: 'partial', source, observedAt: cachedAt, detail: `${connected.length} of ${accounts.length} accounts read; totals incomplete` };
  }
  const age = cachedAt ? nowMs - Date.parse(cachedAt) : Number.POSITIVE_INFINITY;
  if (!(age <= REVENUE_FRESH_FOR_MS)) {
    return { state: 'stale', source, observedAt: cachedAt, detail: 'Snapshot older than 10 minutes' };
  }
  return { state: 'live', source, observedAt: cachedAt, detail: `${connected.length} accounts read` };
}
