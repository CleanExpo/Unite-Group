// Server-only helper for AgentTopology (UNI-2024 follow-up).
//
// Strategy: keep the seed nodes + edges (positions and topology shape are
// design decisions, not data). Overlay each node's `state` from the latest
// 24h of agent_actions rows:
//
//   - failed (recent)              → blocked-on-you
//   - in_progress / pending        → running
//   - done                         → done
//   - no recent activity           → idle (unchanged from seed)
//
// Node id → agent_actions.source map: the seed uses agent identifiers like
// 'margot', 'pi-ceo-board', 'pm-core'. agent_actions.source is one of
// {margot, board, pm, orchestrator, hermes, system}. We resolve via a
// small mapping table; nodes without a mapping keep their seed state.

import { getAdminClient } from '@/lib/supabase/admin';
import {
  seedAgents,
  seedEdges,
  type AgentNodeData,
  type AgentEdgeData,
  type AgentState,
} from '@/components/command-center/topology/topology-data';

const NODE_TO_SOURCE: Record<string, string> = {
  margot: 'margot',
  'pi-ceo-board': 'board',
  'pm-core': 'pm',
  hermes: 'hermes',
  // deepsec / qa-lead / brand-guardian / ceo-board don't have a 1:1
  // agent_actions.source yet — they stay on seed state until they do.
};

export interface AgentTopologyResult {
  nodes: AgentNodeData[];
  edges: AgentEdgeData[];
  fetchedAt: string;
  liveNodeCount: number;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function readAgentTopology(): Promise<AgentTopologyResult | null> {
  try {
    const supabase = getAdminClient();
    const sinceIso = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
    const { data, error } = await supabase
      .from('agent_actions')
      .select('source, status, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(5_000);

    if (error) return null;
    const rows = data ?? [];

    // For each source, derive the live state from the newest row.
    const stateBySource = new Map<string, AgentState>();
    for (const row of rows) {
      if (typeof row.source !== 'string') continue;
      if (stateBySource.has(row.source)) continue; // newest wins (rows are DESC)
      stateBySource.set(row.source, statusToState(row.status));
    }

    let liveNodeCount = 0;
    const nodes: AgentNodeData[] = seedAgents.map((node) => {
      const sourceKey = NODE_TO_SOURCE[node.id];
      if (!sourceKey) return node;
      const liveState = stateBySource.get(sourceKey);
      if (!liveState) return node;
      liveNodeCount += 1;
      return { ...node, state: liveState };
    });

    return {
      nodes,
      edges: seedEdges,
      fetchedAt: new Date().toISOString(),
      liveNodeCount,
    };
  } catch {
    return null;
  }
}

function statusToState(status: unknown): AgentState {
  if (status === 'failed') return 'blocked-on-you';
  if (status === 'done') return 'done';
  if (status === 'in_progress' || status === 'pending') return 'running';
  return 'idle';
}
