// topology-data.ts — static seed for Zone 3 agent topology.
//
// PR-2 ships the SHAPE of the swarm topology with a hand-curated seed of
// 8 nodes (Margot + Pi-CEO Board + 6 Senior Agents) and their canonical
// dispatch edges. Live wiring to /api/empire/senior-agents +
// /api/empire/integrations is deferred to a later PR per
// [[command-center-redesign-proposal-2026-05-14]].
//
// Node states use the universal vocabulary from the redesign proposal:
//   - running        → calm, breathing pulse, monochrome
//   - blocked-on-you → Candy Red border, attention-demanding
//   - done           → hush fade, archived
//   - idle           → hush, no pulse, awaiting dispatch

export type AgentState = 'running' | 'blocked-on-you' | 'done' | 'idle';

export type AgentKind = 'router' | 'board' | 'senior' | 'utility';

// `Record<string, unknown>` index signature is required so xyflow's
// generic `Node<TData>` constraint accepts this shape.
export interface AgentNodeData extends Record<string, unknown> {
  /** Stable id — used by xyflow + as edge endpoint. */
  id: string;
  /** Display label (UPPER-CASE looks best in mono). */
  label: string;
  /** Short role tag rendered under the label. */
  role: string;
  /** Where the node sits in the topology. */
  kind: AgentKind;
  /** Universal state vocabulary. */
  state: AgentState;
  /** xy position; manual layout, no auto-layout to keep render deterministic. */
  position: { x: number; y: number };
}

export interface AgentEdgeData {
  id: string;
  source: string;
  target: string;
  /** Animate the edge to show live message flow. */
  active?: boolean;
  /** Short label for the message lane (e.g. "dispatch", "synthesis"). */
  label?: string;
}

// Manual layout — three rows, mirroring the redesign proposal mock:
//   row 1 (y=32):   Margot
//   row 2 (y=200):  Pi-CEO Board
//   row 3 (y=380):  the six senior agents, evenly spaced
//
// xyflow uses absolute positions; container height is 600px.

export const seedAgents: AgentNodeData[] = [
  {
    id: 'margot',
    label: 'MARGOT',
    role: 'chief of staff',
    kind: 'router',
    state: 'running',
    position: { x: 460, y: 32 },
  },
  {
    id: 'pi-ceo-board',
    label: 'PI-CEO BOARD',
    role: '9 personas · synthesis',
    kind: 'board',
    state: 'running',
    position: { x: 440, y: 200 },
  },
  {
    id: 'pm-core',
    label: 'PM-CORE',
    role: 'execution agent',
    kind: 'senior',
    state: 'running',
    position: { x: 40, y: 380 },
  },
  {
    id: 'deepsec',
    label: 'DEEPSEC',
    role: 'security scanner',
    kind: 'senior',
    state: 'running',
    position: { x: 220, y: 380 },
  },
  {
    id: 'hermes',
    label: 'HERMES',
    role: 'cron + dispatch',
    kind: 'senior',
    state: 'running',
    position: { x: 400, y: 380 },
  },
  {
    id: 'qa-lead',
    label: 'QA-LEAD',
    role: 'quality gate',
    kind: 'senior',
    state: 'idle',
    position: { x: 580, y: 380 },
  },
  {
    id: 'brand-guardian',
    label: 'BRAND-GUARDIAN',
    role: 'editorial gate',
    kind: 'senior',
    state: 'idle',
    position: { x: 760, y: 380 },
  },
  {
    id: 'ceo-board',
    label: 'CEO-BOARD',
    role: 'decision oracle',
    kind: 'senior',
    state: 'blocked-on-you',
    position: { x: 940, y: 380 },
  },
];

export const seedEdges: AgentEdgeData[] = [
  // Margot → Pi-CEO Board (synthesis hand-off)
  {
    id: 'e-margot-board',
    source: 'margot',
    target: 'pi-ceo-board',
    active: true,
    label: 'synthesis',
  },
  // Pi-CEO Board → 6 senior agents (dispatch fan-out)
  {
    id: 'e-board-pm-core',
    source: 'pi-ceo-board',
    target: 'pm-core',
    active: true,
    label: 'dispatch',
  },
  {
    id: 'e-board-deepsec',
    source: 'pi-ceo-board',
    target: 'deepsec',
    active: true,
    label: 'dispatch',
  },
  {
    id: 'e-board-hermes',
    source: 'pi-ceo-board',
    target: 'hermes',
    active: true,
    label: 'dispatch',
  },
  {
    id: 'e-board-qa-lead',
    source: 'pi-ceo-board',
    target: 'qa-lead',
    label: 'dispatch',
  },
  {
    id: 'e-board-brand-guardian',
    source: 'pi-ceo-board',
    target: 'brand-guardian',
    label: 'dispatch',
  },
  {
    id: 'e-board-ceo-board',
    source: 'pi-ceo-board',
    target: 'ceo-board',
    active: true,
    label: 'escalation',
  },
];
