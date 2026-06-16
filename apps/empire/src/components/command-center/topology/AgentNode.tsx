'use client';

// AgentNode — custom xyflow node for the Zone 3 agent topology.
//
// Visual grammar (locked to [[nexus-design-system]] + the redesign proposal):
//   - Gun-Metal `--cc-bg-soft` tile, hairline `--cc-grid` border
//   - Candy Red `--cc-signal` border + breathing pulse when `blocked-on-you`
//   - Monospace label + hush role tag, status pip top-right
//   - Custom geometric mark (inline SVG) on the left edge — NO Lucide
//
// xyflow wraps this in a `<div class="react-flow__node">` so we keep the
// component lean and rely on the data prop for state.

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { AgentNodeData, AgentState, AgentKind } from './topology-data';

export type FlowAgentNode = Node<AgentNodeData, 'agent'>;

const pipColorFor = (state: AgentState): string => {
  if (state === 'blocked-on-you') return 'var(--cc-signal)';
  if (state === 'running') return 'var(--cc-ink)';
  if (state === 'done') return 'var(--cc-ink-hush)';
  return 'var(--cc-ink-hush)';
};

const borderColorFor = (state: AgentState): string => {
  if (state === 'blocked-on-you') return 'var(--cc-signal)';
  return 'var(--cc-grid)';
};

const widthFor = (kind: AgentKind): number => {
  if (kind === 'router') return 180;
  if (kind === 'board') return 220;
  return 160;
};

// Geometric mark — inline SVG stencil, matches the Option B
// monogeometric direction from [[feedback-design-preferences]].
function AgentMark({ kind, state }: { kind: AgentKind; state: AgentState }) {
  const stroke =
    state === 'blocked-on-you' ? 'var(--cc-signal)' : 'var(--cc-ink-dim)';
  const fill =
    state === 'blocked-on-you' ? 'var(--cc-signal-soft)' : 'transparent';
  // Three variants by kind — hex for router, square-rotated for board, dot for senior.
  if (kind === 'router') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <polygon
          points="7,1 13,4 13,10 7,13 1,10 1,4"
          fill={fill}
          stroke={stroke}
          strokeWidth="1"
        />
      </svg>
    );
  }
  if (kind === 'board') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <rect
          x="2"
          y="2"
          width="10"
          height="10"
          fill={fill}
          stroke={stroke}
          strokeWidth="1"
          transform="rotate(45 7 7)"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r="4.5" fill={fill} stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

export function AgentNode({ data }: NodeProps<FlowAgentNode>) {
  const { label, role, kind, state } = data;
  const borderColor = borderColorFor(state);
  const pipColor = pipColorFor(state);
  const width = widthFor(kind);
  const pulse =
    state === 'running' || state === 'blocked-on-you'
      ? 'cc-breathe var(--cc-pulse-duration) ease-in-out infinite'
      : 'none';

  return (
    <div
      data-cc-state={state}
      data-cc-kind={kind}
      style={{
        position: 'relative',
        width,
        padding: '10px 12px 10px 14px',
        background: 'var(--cc-bg-soft)',
        borderLeft: `2px solid ${borderColor}`,
        border: `1px solid ${borderColor}`,
        fontFamily: 'var(--cc-mono)',
        color: 'var(--cc-ink)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow:
          state === 'blocked-on-you'
            ? '0 0 0 1px var(--cc-signal-soft), 0 0 18px var(--cc-signal-hush)'
            : 'none',
      }}
    >
      {/* Status pip — top-right */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: pipColor,
          animation: pulse,
        }}
      />

      {/* Label row: geometric mark + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AgentMark kind={kind} state={state} />
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color:
              state === 'done' ? 'var(--cc-ink-hush)' : 'var(--cc-ink)',
          }}
        >
          {label}
        </span>
      </div>

      {/* Role tag */}
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--cc-ink-hush)',
        }}
      >
        {role}
      </span>

      {/* xyflow handles — invisible, sit on top + bottom edges */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
    </div>
  );
}
