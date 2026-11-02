// The one heartbeat rule, used by the server when it answers and by the browser while it
// shows that answer, so a machine cannot stay Online on screen after it has gone stale.
import type { MachineHealth } from './types.ts';

// Matches the broker's own 45-second freshness window, so the two never disagree.
export const STALE_AFTER_MS = 45_000;
export const OFFLINE_AFTER_MS = 300_000;

export function healthFor(ageMs: number | null): MachineHealth {
  if (ageMs === null) return 'not-reporting';
  if (ageMs >= OFFLINE_AFTER_MS) return 'offline';
  return ageMs >= STALE_AFTER_MS ? 'stale' : 'online';
}

const RANK: Record<MachineHealth, number> = { online: 0, stale: 1, offline: 2, 'not-reporting': 3 };

/** The less healthy of two readings. Time only moves a heartbeat towards stale. */
export function worseHealth(a: MachineHealth, b: MachineHealth): MachineHealth {
  return RANK[a] >= RANK[b] ? a : b;
}
