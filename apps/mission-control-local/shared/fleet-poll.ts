// One read of /api/fleet for the browser. It always settles within the timeout, so a
// server that stops answering mid-request shows as unreachable instead of leaving the
// last snapshot on screen with its frozen "Online" and heartbeat age.
import { monotonicNow } from './clock.ts';
import type { FleetSnapshot } from './types.ts';

export const FLEET_TIMEOUT_MS = 8_000;

export type FleetRead =
  | { kind: 'server-unreachable' }
  | { kind: 'signed-out' }
  /** startedAt: the monotonic clock (shared/clock.ts) when the request began. Ages grow from there. */
  | { kind: 'snapshot'; snapshot: FleetSnapshot; startedAt: number };

type FetchLike = (url: string, init: { cache: 'no-store'; signal: AbortSignal }) => Promise<{
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
}>;

const UNREACHABLE: FleetRead = { kind: 'server-unreachable' };

function isSnapshot(v: unknown): v is FleetSnapshot {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as { status?: unknown; machines?: unknown; jobs?: unknown };
  if (s.status === 'down') return true;
  return s.status === 'live' && Array.isArray(s.machines) && Array.isArray(s.jobs);
}

export async function readFleet(
  fetchFn: FetchLike,
  timeoutMs = FLEET_TIMEOUT_MS,
  clock: () => number = monotonicNow,
): Promise<FleetRead> {
  // Taken before the request, so time spent waiting counts as age: it errs towards stale.
  const startedAt = clock();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Does not rely on fetch honouring the signal: the race settles either way.
  const timedOut = new Promise<FleetRead>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(UNREACHABLE);
    }, timeoutMs);
  });
  const read = (async (): Promise<FleetRead> => {
    const res = await fetchFn('/api/fleet', { cache: 'no-store', signal: controller.signal });
    if (res.status === 401) return { kind: 'signed-out' };
    if (!res.ok) return UNREACHABLE;
    const body = await res.json();
    return isSnapshot(body) ? { kind: 'snapshot', snapshot: body, startedAt } : UNREACHABLE;
  })().catch(() => UNREACHABLE);
  try {
    return await Promise.race([read, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}
