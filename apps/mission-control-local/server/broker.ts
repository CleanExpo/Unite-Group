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

export function createFleetSource(options: FleetSourceOptions = {}): () => Promise<FleetSnapshot> {
  const now = options.now ?? Date.now;
  const port = options.brokerPort ?? BROKER_PORT;
  let cached: { at: number; snapshot: FleetSnapshot } | null = null;
  let inflight: Promise<FleetSnapshot> | null = null;
  let lastGoodAt: number | null = null;

  async function read(): Promise<FleetSnapshot> {
    const at = now();
    try {
      const payload = options.fixturePath
        ? await readFixture(options.fixturePath, at)
        : await readBroker(port);
      const view = toFleetView(payload, at, { showTailscaleIp: options.showTailscaleIp });
      if (!view) throw new ReadFailure('bad-payload');
      lastGoodAt = at;
      const source = options.fixturePath ? ('fixture' as const) : ('broker' as const);
      return { status: 'live', source, fetchedAt: at, ...view };
    } catch (err) {
      // The class of failure only: broker bodies and error text never reach the browser.
      const reason = err instanceof ReadFailure ? err.reason : 'bad-payload';
      return { status: 'down', reason, fetchedAt: at, lastGoodAt };
    }
  }

  return () => {
    if (cached && now() - cached.at < CACHE_MS) return Promise.resolve(cached.snapshot);
    inflight ??= read().then((snapshot) => {
      cached = { at: now(), snapshot };
      inflight = null;
      return snapshot;
    });
    return inflight;
  };
}
