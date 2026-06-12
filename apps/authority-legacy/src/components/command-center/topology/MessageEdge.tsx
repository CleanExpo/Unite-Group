'use client';

// MessageEdge — custom xyflow edge for the Zone 3 agent topology.
//
// Two visual states:
//   - dormant  → hairline `--cc-grid-strong` stroke, no animation
//   - active   → Candy Red `--cc-signal` stroke with animated dash-offset
//                so the eye reads a packet flowing from source → target
//
// Per the redesign proposal: "edges PULSE Candy Red when data flows".
// We use SVG stroke-dasharray + a SMIL <animate> on stroke-dashoffset —
// CSS keyframes can't animate dashoffset on <path> reliably across browsers,
// and SMIL is the lightest dependency-free option.

import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';

type EdgeAppData = {
  active?: boolean;
  label?: string;
};

type FlowMessageEdge = Edge<EdgeAppData>;

export function MessageEdge(props: EdgeProps<FlowMessageEdge>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const active = data?.active === true;
  const stroke = active ? 'var(--cc-signal)' : 'var(--cc-grid-strong)';
  const opacity = active ? 0.9 : 0.55;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: active ? 1.5 : 1,
          strokeDasharray: active ? '4 6' : 'none',
          opacity,
          fill: 'none',
        }}
      />
      {active && (
        // SMIL animate the dash-offset so the dashes slide source → target.
        // 1.2s loop feels live without being frenetic; respects
        // prefers-reduced-motion via the parent CSS scope (cc-breathe disabled).
        <path
          d={edgePath}
          fill="none"
          stroke="var(--cc-signal)"
          strokeWidth={1.5}
          strokeDasharray="4 6"
          style={{ pointerEvents: 'none' }}
          opacity={0.9}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-20"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </path>
      )}
    </>
  );
}
