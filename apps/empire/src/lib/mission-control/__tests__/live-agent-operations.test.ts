import { buildLiveAgentOperations } from '../live-agent-operations';
import type { Fleet } from '@/lib/mesh/read-fleet';

const baseFleet: Fleet = {
  ok: true,
  fetchedAt: '2026-06-16T08:00:00.000Z',
  machines: [
    {
      host: 'mission-control-01',
      os: 'darwin',
      tailnet_ip: '100.64.0.1',
      status: 'working',
      cpu_pct: 42,
      mem_pct: 71,
      load1: 1.4,
      agent_runtimes: [{ runtime: 'claude', present: true }],
      version: '1.0.0',
      last_seen: '2026-06-16T08:00:00.000Z',
      is_stale: false,
      active_agents: 1,
    },
    {
      host: 'builder-02',
      os: 'linux',
      tailnet_ip: '100.64.0.2',
      status: 'idle',
      cpu_pct: null,
      mem_pct: 33,
      load1: 0.2,
      agent_runtimes: [{ runtime: 'openai', present: true }],
      version: '1.0.0',
      last_seen: '2026-06-16T07:59:00.000Z',
      is_stale: false,
      active_agents: 0,
    },
  ],
  agents: [
    {
      machine: 'mission-control-01',
      runtime: 'claude',
      repo: 'Unite-Group',
      branch: 'pidev/auto-12345678',
      current_task: 'Build Live Agent Operations Map',
      state: 'working',
    },
  ],
  claims: [
    {
      linear_id: 'UNI-2152',
      machine: 'mission-control-01',
      branch: 'pidev/auto-12345678',
      state: 'in_progress',
    },
  ],
  ships: [
    {
      machine: 'mission-control-01',
      repo: 'Unite-Group',
      branch: 'main',
      subject: 'Add provider cockpit',
      files_changed: 9,
      shipped_at: '2026-06-16T07:58:00.000Z',
    },
  ],
};

describe('buildLiveAgentOperations', () => {
  it('summarizes machines, active agents, claims, and ships', () => {
    const payload = buildLiveAgentOperations(baseFleet, new Date('2026-06-16T08:01:00.000Z'));

    expect(payload.summary).toEqual({
      machines: 2,
      activeAgents: 1,
      openClaims: 1,
      blockedClaims: 0,
      offlineMachines: 0,
      recentShips: 1,
    });
    expect(payload.nodes[0]).toMatchObject({
      id: 'mission-control-01',
      state: 'working',
      runtimeLabels: ['claude'],
      currentTasks: ['Build Live Agent Operations Map'],
      utilizationPct: 42,
    });
    expect(payload.nextAction).toBe('Monitor active agents through build, test, commit, and review');
  });

  it('surfaces blocked claims as the first operator action', () => {
    const payload = buildLiveAgentOperations(
      {
        ...baseFleet,
        claims: [
          {
            linear_id: 'UNI-9999',
            machine: 'builder-02',
            branch: null,
            state: 'blocked',
          },
        ],
      },
      new Date('2026-06-16T08:01:00.000Z'),
    );

    expect(payload.summary.blockedClaims).toBe(1);
    expect(payload.nodes.find((node) => node.id === 'builder-02')?.state).toBe('blocked');
    expect(payload.nextAction).toBe('Clear 1 blocked Linear claim');
  });
});
