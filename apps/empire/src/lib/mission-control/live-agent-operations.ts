import type { Fleet, MeshAgent, MeshClaim, MeshMachine, MeshShip } from '@/lib/mesh/read-fleet';

export type OperationNodeState = 'working' | 'idle' | 'blocked' | 'offline';

export interface OperationNode {
  id: string;
  label: string;
  state: OperationNodeState;
  runtimeLabels: string[];
  activeAgents: number;
  openClaims: number;
  currentTasks: string[];
  lastSeen: string | null;
  utilizationPct: number | null;
}

export interface OperationWorkItem {
  id: string;
  state: string;
  owner: string;
  branch: string | null;
  blocked: boolean;
}

export interface OperationShip {
  id: string;
  machine: string;
  repo: string;
  branch: string | null;
  subject: string;
  shippedAt: string;
  filesChanged: number;
}

export interface LiveAgentOperations {
  generatedAt: string;
  ok: boolean;
  error: string | null;
  summary: {
    machines: number;
    activeAgents: number;
    openClaims: number;
    blockedClaims: number;
    offlineMachines: number;
    recentShips: number;
  };
  nodes: OperationNode[];
  workQueue: OperationWorkItem[];
  shipFeed: OperationShip[];
  nextAction: string;
}

function isBlockedClaim(claim: MeshClaim): boolean {
  const state = claim.state.toLowerCase();
  return state.includes('block') || state.includes('fail') || state.includes('error');
}

function activeAgentsFor(machine: MeshMachine, agents: MeshAgent[]): MeshAgent[] {
  return agents.filter((agent) => agent.machine === machine.host && agent.state !== 'idle');
}

function claimsFor(machine: MeshMachine, claims: MeshClaim[]): MeshClaim[] {
  return claims.filter((claim) => claim.machine === machine.host);
}

function stateFor(machine: MeshMachine, agents: MeshAgent[], claims: MeshClaim[]): OperationNodeState {
  if (machine.is_stale || machine.status === 'offline') return 'offline';
  if (claims.some(isBlockedClaim)) return 'blocked';
  if (agents.length > 0 || machine.status === 'working' || machine.active_agents > 0) return 'working';
  return 'idle';
}

function utilizationFor(machine: MeshMachine): number | null {
  if (machine.cpu_pct !== null) return Math.max(0, Math.min(100, Math.round(machine.cpu_pct)));
  if (machine.mem_pct !== null) return Math.max(0, Math.min(100, Math.round(machine.mem_pct)));
  return null;
}

function buildNextAction(args: {
  ok: boolean;
  error: string | null;
  blockedClaims: number;
  openClaims: number;
  activeAgents: number;
  offlineMachines: number;
}) {
  if (!args.ok) return `Restore Pi-CEO mesh link: ${args.error ?? 'fleet unavailable'}`;
  if (args.blockedClaims > 0) return `Clear ${args.blockedClaims} blocked Linear claim${args.blockedClaims === 1 ? '' : 's'}`;
  if (args.openClaims > args.activeAgents) return 'Assign queued Linear work to an available agent';
  if (args.offlineMachines > 0) return 'Check offline mesh nodes before scaling more work';
  if (args.activeAgents > 0) return 'Monitor active agents through build, test, commit, and review';
  return 'Ready for the next Linear task intake';
}

export function buildLiveAgentOperations(fleet: Fleet, now = new Date()): LiveAgentOperations {
  const nodes = fleet.machines.map((machine) => {
    const agents = activeAgentsFor(machine, fleet.agents);
    const claims = claimsFor(machine, fleet.claims);
    const runtimeLabels = (machine.agent_runtimes ?? [])
      .filter((runtime) => runtime.present)
      .map((runtime) => runtime.runtime);

    return {
      id: machine.host,
      label: machine.host,
      state: stateFor(machine, agents, claims),
      runtimeLabels,
      activeAgents: agents.length,
      openClaims: claims.length,
      currentTasks: agents
        .map((agent) => agent.current_task)
        .filter((task): task is string => Boolean(task)),
      lastSeen: machine.last_seen,
      utilizationPct: utilizationFor(machine),
    };
  });

  const workQueue = fleet.claims.map((claim) => ({
    id: claim.linear_id,
    state: claim.state,
    owner: claim.machine ?? 'unassigned',
    branch: claim.branch,
    blocked: isBlockedClaim(claim),
  }));

  const shipFeed = fleet.ships.slice(0, 8).map((ship: MeshShip, index) => ({
    id: `${ship.machine}-${ship.repo}-${ship.shipped_at}-${index}`,
    machine: ship.machine,
    repo: ship.repo,
    branch: ship.branch,
    subject: ship.subject ?? '(no subject)',
    shippedAt: ship.shipped_at,
    filesChanged: ship.files_changed,
  }));

  const summary = {
    machines: fleet.machines.length,
    activeAgents: nodes.reduce((total, node) => total + node.activeAgents, 0),
    openClaims: fleet.claims.length,
    blockedClaims: workQueue.filter((claim) => claim.blocked).length,
    offlineMachines: nodes.filter((node) => node.state === 'offline').length,
    recentShips: fleet.ships.length,
  };

  return {
    generatedAt: now.toISOString(),
    ok: fleet.ok,
    error: fleet.error ?? null,
    summary,
    nodes,
    workQueue,
    shipFeed,
    nextAction: buildNextAction({
      ok: fleet.ok,
      error: fleet.error ?? null,
      blockedClaims: summary.blockedClaims,
      openClaims: summary.openClaims,
      activeAgents: summary.activeAgents,
      offlineMachines: summary.offlineMachines,
    }),
  };
}
