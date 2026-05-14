'use client';

// AgentTopology — Zone 3 of /command-center.
//
// Renders the Pi-CEO agent swarm as a live graph: Margot at the top, the
// Pi-CEO Board mid-tier, six senior agents fanned along the bottom row.
// Custom node + edge components carry the Gun-Metal/Candy-Red signal
// vocabulary; xyflow handles layout + viewport.
//
// PR-2 ships with a static seed (topology-data.ts). Live wiring to
// /api/empire/senior-agents + /api/empire/integrations is a later PR per
// [[command-center-redesign-proposal-2026-05-14]].
//
// Anti-AI-slop checks: no Lucide, no gradient, no glass-morphism, no emoji,
// single-accent Candy Red signal only.

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Edge,
  type Node,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { AgentNode } from './AgentNode';
import { MessageEdge } from './MessageEdge';
import {
  seedAgents,
  seedEdges,
  type AgentNodeData,
  type AgentEdgeData,
} from './topology-data';

export interface AgentTopologyProps {
  /** Override seed nodes for tests / live wiring. */
  agents?: AgentNodeData[];
  /** Override seed edges for tests / live wiring. */
  edges?: AgentEdgeData[];
}

const nodeTypes = {
  agent: AgentNode,
};

const edgeTypes = {
  message: MessageEdge,
};

export function AgentTopology({
  agents = seedAgents,
  edges = seedEdges,
}: AgentTopologyProps) {
  const flowNodes = useMemo<Node[]>(
    () =>
      agents.map((a) => ({
        id: a.id,
        type: 'agent',
        position: a.position,
        data: a,
        // Disable drag in PR-2 — the static seed is the design statement;
        // freedom to drag would let the user wreck the layout.
        draggable: false,
        selectable: false,
      })),
    [agents],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'message',
        data: { active: e.active, label: e.label },
      })),
    [edges],
  );

  const aliveCount = agents.filter((a) => a.state === 'running').length;
  const blockedCount = agents.filter((a) => a.state === 'blocked-on-you').length;

  return (
    <section
      aria-label="Agent topology — Pi-CEO swarm"
      style={{
        position: 'relative',
        height: 600,
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
        borderBottom: '1px solid var(--cc-grid)',
        overflow: 'hidden',
      }}
    >
      {/* Zone header — mono caps, hush ink. Matches Zone 4/5 placeholder style. */}
      <header
        style={{
          position: 'absolute',
          top: 16,
          left: 24,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--cc-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--cc-ink-dim)',
          }}
        >
          Zone 3 — Agent topology
        </span>
        <span
          style={{
            fontFamily: 'var(--cc-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--cc-ink-hush)',
          }}
        >
          {agents.length} agents · {aliveCount} running ·{' '}
          <span
            style={{
              color: blockedCount > 0 ? 'var(--cc-signal)' : 'var(--cc-ink-hush)',
            }}
          >
            {blockedCount} blocked
          </span>
        </span>
      </header>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, includeHiddenNodes: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="var(--cc-grid)"
        />
      </ReactFlow>
    </section>
  );
}
