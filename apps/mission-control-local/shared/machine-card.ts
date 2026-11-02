// Every word a machine card shows comes from here, so tests can check what the screen
// says without a browser. The rule: a machine without a fresh heartbeat never reads as
// online, idle or working, because the broker is only repeating what it last heard.
import { formatAge } from './format.ts';
import { healthFor, worseHealth } from './health.ts';
import type { MachineHealth, MachineView } from './types.ts';

export type CardTone = 'go' | 'amber' | 'abort';

export interface MachineCardText {
  health: string;
  tone: CardTone;
  /** True only while the heartbeat, aged to now, is under 45 seconds. */
  fresh: boolean;
  /** The broker's state word when the heartbeat is fresh, otherwise why it is not shown. */
  state: string;
  heartbeat: string;
  job: string;
  /** Set when the broker shows more than one claimed job for this machine. */
  warning: string | null;
}

const HEALTH: Record<MachineHealth, { label: string; tone: CardTone; hidden: string }> = {
  online: { label: 'Online', tone: 'go', hidden: '' },
  stale: { label: 'Stale', tone: 'amber', hidden: 'State not shown: last heartbeat is over 45s old.' },
  offline: { label: 'Offline', tone: 'abort', hidden: 'State not shown: no heartbeat for over 5 minutes.' },
  'not-reporting': { label: 'Not reporting', tone: 'abort', hidden: 'State not shown: no usable heartbeat.' },
};

/**
 * shownForMs is how long this reading has been on screen (since the request began). The
 * heartbeat keeps ageing while it is shown, so the card works health out again and keeps
 * the worse of that and what the server said: a reading can only get staler, never fresher.
 */
export function machineCardText(machine: MachineView, shownForMs = 0): MachineCardText {
  const ageMs = machine.ageMs === null ? null : machine.ageMs + Math.max(0, shownForMs);
  const now = worseHealth(machine.health, healthFor(ageMs));
  const health = HEALTH[now];
  const fresh = now === 'online';
  const state = fresh ? `State: ${machine.state ?? 'unknown'}` : health.hidden;
  const heartbeat = ageMs === null ? 'No usable heartbeat' : `Heartbeat ${formatAge(ageMs)}`;
  let job = 'No claimed job';
  if (machine.currentJob) {
    const { id, type, claimedAgeMs } = machine.currentJob;
    const claimed = claimedAgeMs === null ? 'claim time unknown' : `claimed ${formatAge(claimedAgeMs)}`;
    job = fresh
      ? `Current job: ${type} ${id}, ${claimed}`
      : `Claimed job, not confirmed running: ${type} ${id}, ${claimed}`;
  }
  const warning =
    machine.claimedJobs > 1 ? `The broker shows ${machine.claimedJobs} claimed jobs for this machine.` : null;
  return { health: health.label, tone: health.tone, fresh, state, heartbeat, job, warning };
}
