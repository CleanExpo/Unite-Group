// Turns the broker's /status payload into the small view the browser may see.
// Named fields are copied across; anything the broker adds later stays out by default.
import { isIP } from 'node:net';
import { MACHINE_IDS } from '../shared/types.ts';
import { JOB_PHASES } from '../shared/types.ts';
import type { ClaimedJobView, JobPhase, JobView, MachineHealth, MachineView, RepoView } from '../shared/types.ts';
import { redactDeep } from './redact.ts';

// Matches the broker's own 45-second freshness window, so the two never disagree.
export const STALE_AFTER_MS = 45_000;
export const OFFLINE_AFTER_MS = 300_000;
export const MAX_JOBS = 50;
// The broker stamps lastSeen with its own clock, on the same Mini as this server. A time
// further ahead than this means a clock moved, so it cannot prove the machine is fresh.
export const CLOCK_SKEW_MS = 5_000;

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
// The broker's own vocabulary, from ~/.unite-fleet/broker.mjs and live /status on 02/11/2026.
// Only these exact words reach the browser, so no token shape can get through as a name.
// A word the broker adds later shows as "unknown" (or is left off) until it is added here.
const STATES = new Set(['idle', 'working']);
const JOB_STATUSES = new Set(['pending', 'running', 'completed', 'failed', 'blocked']);
// From broker.mjs: POST /claim moves pending to running and stamps claimedAt; /complete
// sets completed or failed with completedAt; a lease that expires twice sets blocked.
const PHASE: Record<string, JobPhase> = {
  pending: 'queued',
  running: 'claimed',
  completed: 'done',
  failed: 'done',
  blocked: 'done',
};
const JOB_TYPES = new Set(['probe', 'spm-harness']);
const CAPABILITIES = new Set(['buildCapacity', 'claude', 'codex', 'jev', 'verify', 'workspaceGuard']);
const REPOS = new Set(['unite-group', 'pi-dev-ops']);
const MACHINES: ReadonlySet<string> = new Set(MACHINE_IDS);
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f-]{1,27}$|^[0-9a-f]{8}$/i;
const known = (v: unknown, words: ReadonlySet<string>): string =>
  typeof v === 'string' && words.has(v) ? v : 'unknown';
const time = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
const age = (at: number | null, now: number): number | null =>
  at === null ? null : Math.max(0, now - at);

export function healthFor(ageMs: number | null): MachineHealth {
  if (ageMs === null) return 'not-reporting';
  if (ageMs >= OFFLINE_AFTER_MS) return 'offline';
  return ageMs >= STALE_AFTER_MS ? 'stale' : 'online';
}

function shortSha(v: unknown): string | null {
  return typeof v === 'string' && /^[0-9a-f]{7,64}$/i.test(v) ? v.slice(0, 8) : null;
}

function repoViews(v: unknown): RepoView[] {
  if (!isDict(v)) return [];
  return Object.entries(v).filter(([name]) => REPOS.has(name)).map(([name, repo]) => ({
    name,
    available: isDict(repo) && repo.available === true,
    headSha: isDict(repo) ? shortSha(repo.headSha) : null,
  }));
}

/** A heartbeat time in the future is not a heartbeat: it would read as fresh for as long as it stays ahead. */
function heartbeat(v: unknown, now: number): number | null {
  const at = time(v);
  return at !== null && at > now + CLOCK_SKEW_MS ? null : at;
}

function machineView(
  raw: Dict,
  now: number,
  showIp: boolean,
  claimed: readonly JobRow[],
): MachineView {
  const lastSeenAt = heartbeat(raw.lastSeen, now);
  const ageMs = age(lastSeenAt, now);
  const health = healthFor(ageMs);
  const id = known(raw.machineId, MACHINES);
  const mine = claimed.filter((j) => j.view.machineId === id);
  const view: MachineView = {
    id,
    // The broker keeps the last word it was sent, so an offline machine still reads "idle".
    // Only a fresh heartbeat lets that word through.
    state: health === 'online' ? known(raw.state, STATES) : null,
    health,
    lastSeenAt,
    ageMs,
    currentJob: mine[0] ? claimedJob(mine[0], now) : null,
    claimedJobs: mine.length,
    capabilities: isDict(raw.capabilities)
      ? Object.entries(raw.capabilities)
          .filter(([name]) => CAPABILITIES.has(name))
          .map(([name, on]) => ({ name, enabled: on === true }))
      : [],
    repos: repoViews(raw.repos),
  };
  // Only a bare IP address qualifies, because this value is exempt from the scrubber below.
  if (showIp && typeof raw.tailscaleIp === 'string' && isIP(raw.tailscaleIp) !== 0) {
    view.tailscaleIp = raw.tailscaleIp;
  }
  return view;
}

/** A job as sent to the browser, plus the claim time the server needs but does not send. */
interface JobRow {
  view: JobView;
  claimedAt: number | null;
}

function jobRow(raw: Dict, now: number): JobRow {
  const createdAt = time(raw.createdAt);
  const claimedAt = time(raw.claimedAt);
  const status = known(raw.status, JOB_STATUSES);
  const phase = PHASE[status] ?? 'unknown';
  const phaseStart =
    phase === 'queued' ? createdAt
    : phase === 'claimed' ? claimedAt
    : phase === 'done' ? time(raw.completedAt)
    : null;
  return {
    claimedAt,
    view: {
      id: typeof raw.id === 'string' && JOB_ID.test(raw.id) ? raw.id.slice(0, 8) : 'unknown',
      type: known(raw.type, JOB_TYPES),
      status,
      phase,
      machineId: typeof raw.machineId === 'string' && MACHINES.has(raw.machineId) ? raw.machineId : null,
      createdAt,
      ageMs: age(createdAt, now),
      phaseAgeMs: age(phaseStart, now),
    },
  };
}

function claimedJob(row: JobRow, now: number): ClaimedJobView {
  return { id: row.view.id, type: row.view.type, claimedAgeMs: age(row.claimedAt, now) };
}

/** A present capabilities or repos field of the wrong shape must fail the read, not show as empty. */
function nestedFieldsValid(machine: Dict): boolean {
  const { capabilities, repos } = machine;
  if (capabilities !== undefined) {
    if (!isDict(capabilities)) return false;
    if (!Object.values(capabilities).every((on) => typeof on === 'boolean')) return false;
  }
  if (repos !== undefined) {
    if (!isDict(repos) || !Object.values(repos).every(isDict)) return false;
  }
  return true;
}

/** Returns null when the payload is not the broker's shape, so it reads as a failure, not an empty fleet. */
export function toFleetView(
  payload: unknown,
  now: number,
  options: { showTailscaleIp?: boolean } = {},
): {
  machines: MachineView[];
  jobs: JobView[];
  jobsTotal: number;
  jobCounts: Record<JobPhase, number>;
} | null {
  if (!isDict(payload) || !Array.isArray(payload.machines) || !Array.isArray(payload.jobs)) {
    return null;
  }
  // One malformed record makes the whole read a failure, so it cannot pass as an empty fleet.
  const reported = payload.machines;
  const rawJobs = payload.jobs;
  if (!reported.every((m) => isDict(m) && typeof m.machineId === 'string' && m.machineId)) return null;
  if (!(reported as Dict[]).every(nestedFieldsValid)) return null;
  if (!rawJobs.every((j) => isDict(j) && typeof j.id === 'string' && j.id)) return null;
  const showIp = options.showTailscaleIp === true;
  const rows = (rawJobs as Dict[])
    .map((j) => jobRow(j, now))
    .sort((a, b) => (b.view.createdAt ?? 0) - (a.view.createdAt ?? 0));
  // Every claimed job, newest claim first, before the list is cut to MAX_JOBS, so a
  // long-running job older than the newest 50 still shows on its machine.
  const claimed = rows
    .filter((r) => r.view.phase === 'claimed')
    .sort((a, b) => (b.claimedAt ?? b.view.createdAt ?? 0) - (a.claimedAt ?? a.view.createdAt ?? 0));
  const known = MACHINE_IDS.map((id) => {
    const raw = (reported as Dict[]).find((m) => m.machineId === id);
    return raw
      ? machineView(raw, now, showIp, claimed)
      : machineView({ machineId: id }, now, false, claimed);
  });
  const jobs = rows.map((r) => r.view);
  const jobCounts = Object.fromEntries(JOB_PHASES.map((p) => [p, 0])) as Record<JobPhase, number>;
  for (const j of jobs) jobCounts[j.phase] += 1;
  // The opted-in IP is the one value the scrubber must leave alone.
  const ips = new Map(known.map((m) => [m.id, m.tailscaleIp]));
  const clean = redactDeep({
    machines: known,
    jobs: jobs.slice(0, MAX_JOBS),
    jobsTotal: jobs.length,
    jobCounts,
  });
  for (const m of clean.machines) {
    const ip = ips.get(m.id);
    if (ip === undefined) delete m.tailscaleIp;
    else m.tailscaleIp = ip;
  }
  return clean;
}
