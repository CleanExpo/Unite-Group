// The only code that talks to the fleet broker. One verb, one path, loopback only.
// A short cache means two screens polling together cost the broker one request.
import { readFile } from 'node:fs/promises';
import type { BrokerFailure, FleetSnapshot } from '../shared/types.ts';
import { toFleetView } from './fleet.ts';

export const BROKER_HOST = '127.0.0.1';
export const BROKER_PORT = 42137;
export const BROKER_PATH = '/status';
export const CACHE_MS = 2_000;
const TIMEOUT_MS = 1_500;
const MAX_BYTES = 8 * 1024 * 1024;

export interface FleetSourceOptions {
  /** Overridden by tests only. The host and path are not configurable. */
  brokerPort?: number;
  fixturePath?: string;
  showTailscaleIp?: boolean;
  now?: () => number;
}

class ReadFailure extends Error {
  reason: BrokerFailure;
  constructor(reason: BrokerFailure) {
    super(reason);
    this.reason = reason;
  }
}

async function readBroker(port: number): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`http://${BROKER_HOST}:${port}${BROKER_PATH}`, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new ReadFailure((err as Error).name === 'TimeoutError' ? 'timeout' : 'unreachable');
  }
  if (!res.ok) throw new ReadFailure('bad-status');
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new ReadFailure('too-large');
  let body: string;
  try {
    body = await res.text();
  } catch (err) {
    throw new ReadFailure((err as Error).name === 'TimeoutError' ? 'timeout' : 'unreachable');
  }
  if (Buffer.byteLength(body) > MAX_BYTES) throw new ReadFailure('too-large');
  try {
    return JSON.parse(body);
  } catch {
    throw new ReadFailure('bad-payload');
  }
}

/**
 * Fixture timestamps are written relative to `capturedAt` and moved to now on
 * every read, so a fixture always shows the ages it was written to show.
 */
async function readFixture(path: string, now: number): Promise<unknown> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as {
    capturedAt: number;
    machines: Record<string, unknown>[];
    jobs: Record<string, unknown>[];
  };
  const shift = now - parsed.capturedAt;
  const moved = (v: unknown): unknown => (typeof v === 'number' ? v + shift : v);
  return {
    ...parsed,
    machines: parsed.machines.map((m) => ({ ...m, lastSeen: moved(m.lastSeen) })),
    jobs: parsed.jobs.map((j) => ({
      ...j,
      createdAt: moved(j.createdAt),
      claimedAt: moved(j.claimedAt),
      completedAt: moved(j.completedAt),
    })),
  };
}

type BrokerRead = { readAt: number } & ({ ok: true; payload: unknown } | { ok: false; reason: BrokerFailure });

export function createFleetSource(options: FleetSourceOptions = {}): () => Promise<FleetSnapshot> {
  const now = options.now ?? Date.now;
  const port = options.brokerPort ?? BROKER_PORT;
  const source = options.fixturePath ? ('fixture' as const) : ('broker' as const);
  let cached: { at: number; read: BrokerRead } | null = null;
  let inflight: Promise<BrokerRead> | null = null;
  let lastGoodAt: number | null = null;

  async function read(): Promise<BrokerRead> {
    const readAt = now();
    try {
      const payload = options.fixturePath
        ? await readFixture(options.fixturePath, readAt)
        : await readBroker(port);
      return { readAt, ok: true, payload };
    } catch (err) {
      // The class of failure only: broker bodies and error text never reach the browser.
      return { readAt, ok: false, reason: err instanceof ReadFailure ? err.reason : 'bad-payload' };
    }
  }

  // Only the broker's reply is cached. Ages and health are worked out each time this
  // answers, so a cached reply can never hold a machine Online past 45 seconds.
  function answer(r: BrokerRead): FleetSnapshot {
    const at = now();
    if (r.ok) {
      const view = toFleetView(r.payload, at, { showTailscaleIp: options.showTailscaleIp });
      if (view) {
        lastGoodAt = Math.max(lastGoodAt ?? r.readAt, r.readAt);
        return { status: 'live', source, fetchedAt: at, ...view };
      }
    }
    return { status: 'down', reason: r.ok ? 'bad-payload' : r.reason, fetchedAt: at, lastGoodAt };
  }

  return async () => {
    if (!cached || now() - cached.at >= CACHE_MS) {
      inflight ??= read().then((r) => {
        cached = { at: now(), read: r };
        inflight = null;
        return r;
      });
      return answer(await inflight);
    }
    return answer(cached.read);
  };
}
