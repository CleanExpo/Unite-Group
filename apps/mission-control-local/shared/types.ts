// The contract between the local server and the browser. Everything the browser
// can learn about the fleet is in these types, so adding a field here is the
// decision to expose it.

export const SCREENS = ['1', '2'] as const;
export type ScreenId = (typeof SCREENS)[number];

export const MACHINE_IDS = ['mac-mini', 'macbook-pro', 'windows-pc'] as const;
export type MachineId = (typeof MACHINE_IDS)[number];

export type MachineHealth = 'online' | 'stale' | 'offline' | 'not-reporting';

export interface RepoView {
  name: string;
  available: boolean;
  /** First 8 characters only, or null when the broker gave no usable SHA. */
  headSha: string | null;
}

export interface MachineView {
  id: string;
  state: string;
  health: MachineHealth;
  lastSeenAt: number | null;
  ageMs: number | null;
  capabilities: { name: string; enabled: boolean }[];
  repos: RepoView[];
  /** Present only when the operator opted in with MC_SHOW_TAILSCALE_IP=1. */
  tailscaleIp?: string;
}

export interface JobView {
  id: string;
  type: string;
  status: string;
  machineId: string | null;
  createdAt: number | null;
  ageMs: number | null;
}

export type BrokerFailure = 'unreachable' | 'timeout' | 'bad-status' | 'bad-payload' | 'too-large';

/** A failed read is a distinct shape, so it can never render as an empty fleet. */
export type FleetSnapshot =
  | {
      status: 'live';
      source: 'broker' | 'fixture';
      fetchedAt: number;
      machines: MachineView[];
      jobs: JobView[];
      jobsTotal: number;
    }
  | {
      status: 'down';
      reason: BrokerFailure;
      fetchedAt: number;
      lastGoodAt: number | null;
    };

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutResponse {
  screen: ScreenId;
  /** Grows by one on every save or reset. 0 means nothing was ever saved. Sent back as If-Match. */
  revision: number;
  items: LayoutItem[];
  source: 'saved' | 'default';
  /** Set when a saved file exists but could not be read, so defaults are not mistaken for it. */
  warning?: 'layout-file-unreadable';
}

/** The 409 body: the write was based on an old revision, so it changed nothing. */
export interface LayoutConflict {
  error: 'layout-changed';
  current: LayoutResponse;
}
