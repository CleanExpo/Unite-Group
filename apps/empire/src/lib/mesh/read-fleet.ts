// Server-only reader for the Nexus Mesh fleet.
//
// Reads the whole-fleet snapshot from the Pi-CEO Railway API (/api/mesh/fleet),
// which is the single authority over the mesh_* Supabase tables. The dashboard
// never touches Supabase directly for fleet data — same plumbing the Empire
// dashboard uses (PI_CEO_API_URL + PI_CEO_API_KEY → X-Pi-CEO-Secret).
//
// Spec: Pi-CEO docs/superpowers/specs/2026-06-11-nexus-mesh-design.md
import 'server-only';

const DEFAULT_PI_CEO_API_URL = 'https://pi-dev-ops-production.up.railway.app';

export interface MeshRuntime {
  runtime: string;
  present: boolean;
}
export interface MeshMachine {
  host: string;
  os: string | null;
  tailnet_ip: string | null;
  status: string; // online | idle | working | offline
  cpu_pct: number | null;
  mem_pct: number | null;
  load1: number | null;
  agent_runtimes: MeshRuntime[];
  version: string | null;
  last_seen: string;
  is_stale: boolean;
  active_agents: number;
}
export interface MeshAgent {
  machine: string;
  runtime: string;
  repo: string | null;
  branch: string | null;
  current_task: string | null;
  state: string;
}
export interface MeshShip {
  machine: string;
  repo: string;
  branch: string | null;
  subject: string | null;
  files_changed: number;
  shipped_at: string;
}
export interface MeshClaim {
  linear_id: string;
  machine: string | null;
  branch: string | null;
  state: string;
}
export interface Fleet {
  machines: MeshMachine[];
  agents: MeshAgent[];
  ships: MeshShip[];
  claims: MeshClaim[];
  fetchedAt: string;
  ok: boolean;
  error?: string;
}

export async function readFleet(): Promise<Fleet> {
  const base: Omit<Fleet, 'ok' | 'error'> = {
    machines: [],
    agents: [],
    ships: [],
    claims: [],
    fetchedAt: new Date().toISOString(),
  };
  const piCeoApiKey = process.env.PI_CEO_API_KEY?.trim();
  if (!piCeoApiKey) {
    return { ...base, ok: false, error: 'pi-ceo api key not configured' };
  }

  const piCeoApiUrl = process.env.PI_CEO_API_URL?.trim() || DEFAULT_PI_CEO_API_URL;

  try {
    const res = await fetch(`${piCeoApiUrl.replace(/\/$/, '')}/api/mesh/fleet`, {
      headers: { 'X-Pi-CEO-Secret': piCeoApiKey },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ...base, ok: false, error: `pi-ceo ${res.status}` };
    }
    const d = (await res.json()) as Partial<Fleet>;
    return {
      machines: d.machines ?? [],
      agents: d.agents ?? [],
      ships: d.ships ?? [],
      claims: d.claims ?? [],
      fetchedAt: new Date().toISOString(),
      ok: true,
    };
  } catch (e) {
    return { ...base, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
