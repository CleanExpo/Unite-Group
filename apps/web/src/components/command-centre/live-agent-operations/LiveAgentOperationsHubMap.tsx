// src/components/command-centre/live-agent-operations/LiveAgentOperationsHubMap.tsx
//
// Hub-and-spoke summary of the agent nodes LiveAgentOperationsMap already
// reads (UNI-2772). Pure SVG + CSS: no hooks, no chart library, server-safe.
//
// `computeHubMapLayout` places nodes deterministically in two columns either
// side of the hub (even indices left, odd right), so for any N the labels sit
// in their own row band and cannot collide. Names are truncated to the width
// the column allows, so nothing spills past the viewBox.
//
// A link flows ONLY when its agent has a live session (`activeSessions > 0`).
// `working` alone is not enough: it also fires on a running task with no
// session attached. Colour carries the node state; motion carries activity.

import type { OperationNode, OperationNodeState } from '@/lib/command-centre/live-agent-operations'

// The payload names no orchestrator (the 'Pi-CEO' fallback in
// live-agent-operations.ts is an owner node, not the hub), so the hub carries
// the surface's own name.
export const HUB_LABEL = 'Mission Control'

export const MAP = {
  width: 640,
  minHeight: 140,
  padY: 24,
  rowPitch: 48,
  hubW: 120,
  hubH: 30,
  leftX: 196,
  rightX: 444,
  nodeR: 6,
  haloR: 13,
  labelGap: 18,
  edge: 12,
  nameSize: 11,
  statusSize: 10,
  // Monospace advance is ~0.6em; used to size boxes and truncate.
  charEm: 0.6,
} as const

export type HubTone = 'success' | 'caution' | 'muted'

const TONE: Record<OperationNodeState, HubTone> = {
  working: 'success',
  queued: 'caution',
  blocked: 'caution',
  idle: 'muted',
}

// Fill tokens only (marks). Fallbacks are the deck values in command-deck.module.css.
const TONE_FILL: Record<HubTone, string> = {
  success: 'var(--deck-go, #00d97e)',
  caution: 'var(--deck-amber, #ff8a1f)',
  muted: 'var(--deck-muted, #a7adba)',
}

type Box = { x: number; y: number; w: number; h: number }

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function statusText(node: OperationNode): string {
  if (node.state === 'working') return node.activeSessions > 0 ? `working · ${plural(node.activeSessions, 'session')}` : 'working'
  if (node.state === 'queued') return `queued · ${plural(node.openTasks, 'task')}`
  if (node.state === 'blocked') return `blocked · ${plural(node.blockedTasks, 'task')}`
  return 'idle'
}

function fit(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, Math.max(1, maxChars - 1))}…`
}

export function computeHubMapLayout(nodes: OperationNode[]) {
  if (nodes.length === 0) return null

  const leftCount = Math.ceil(nodes.length / 2)
  const rightCount = Math.floor(nodes.length / 2)
  const height = Math.max(MAP.minHeight, leftCount * MAP.rowPitch + MAP.padY * 2)
  const hub = {
    x: MAP.width / 2,
    y: height / 2,
    label: HUB_LABEL,
    box: { x: MAP.width / 2 - MAP.hubW / 2, y: height / 2 - MAP.hubH / 2, w: MAP.hubW, h: MAP.hubH } as Box,
  }

  // Label band on each side: from the viewBox edge to the node's halo.
  const band = MAP.leftX - MAP.labelGap - MAP.edge
  const nameChars = Math.floor(band / (MAP.nameSize * MAP.charEm))
  const statusChars = Math.floor(band / (MAP.statusSize * MAP.charEm))

  const placed = nodes.map((node, i) => {
    const left = i % 2 === 0
    const row = Math.floor(i / 2)
    const count = left ? leftCount : rightCount
    const x = left ? MAP.leftX : MAP.rightX
    const y = round(hub.y + (row - (count - 1) / 2) * MAP.rowPitch)
    const name = fit(node.label, nameChars)
    const status = fit(statusText(node), statusChars)
    const labelX = left ? x - MAP.labelGap : x + MAP.labelGap
    const nameY = y - 2
    const statusY = y + 12
    const w = round(Math.max(name.length * MAP.nameSize, status.length * MAP.statusSize) * MAP.charEm)
    const labelBox: Box = { x: left ? round(labelX - w) : labelX, y: nameY - MAP.nameSize, w, h: statusY + 3 - (nameY - MAP.nameSize) }
    return {
      id: node.id,
      x,
      y,
      r: MAP.nodeR,
      haloR: MAP.haloR,
      tone: TONE[node.state],
      flow: node.activeSessions > 0,
      name,
      status,
      anchor: (left ? 'end' : 'start') as 'end' | 'start',
      labelX,
      nameY,
      statusY,
      labelBox,
    }
  })

  const links = placed.map((nd) => {
    const sx = nd.x < hub.x ? hub.box.x : hub.box.x + hub.box.w
    const mx = round((sx + nd.x) / 2)
    return { id: nd.id, tone: nd.tone, flow: nd.flow, d: `M${sx},${hub.y} C${mx},${hub.y} ${mx},${nd.y} ${nd.x},${nd.y}` }
  })

  return { width: MAP.width, height, hub, nodes: placed, links }
}

const CSS = `
.lao-flow{stroke-dasharray:4 6;animation:lao-flow 1.6s linear infinite}
@keyframes lao-flow{to{stroke-dashoffset:-20}}
@media (prefers-reduced-motion: reduce){.lao-flow{animation:none}}
`

export function LiveAgentOperationsHubMap({ nodes }: { nodes: OperationNode[] }) {
  const g = computeHubMapLayout(nodes)
  if (!g) return null
  const live = g.nodes.filter((nd) => nd.flow).length
  return (
    <svg
      data-testid="lao-hub-map"
      viewBox={`0 0 ${g.width} ${g.height}`}
      width="100%"
      role="img"
      aria-label={`Agent map: ${plural(g.nodes.length, 'agent')}, ${live} with a live session`}
      style={{ display: 'block', maxWidth: g.width, margin: '0 auto' }}
    >
      <style>{CSS}</style>
      {g.links.map((l) => (
        <path
          key={l.id}
          data-testid="lao-link"
          data-node={l.id}
          className={l.flow ? 'lao-flow' : undefined}
          d={l.d}
          fill="none"
          stroke={TONE_FILL[l.tone]}
          strokeWidth={1.6}
          strokeOpacity={l.flow ? 0.9 : 0.4}
        />
      ))}
      <rect
        x={g.hub.box.x}
        y={g.hub.box.y}
        width={g.hub.box.w}
        height={g.hub.box.h}
        rx={4}
        fill="var(--cc-bg, #191e26)"
        stroke="var(--cc-signal, #ff3b5c)"
        strokeWidth={1.5}
      />
      <text
        x={g.hub.x}
        y={g.hub.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={MAP.nameSize}
        fontWeight={600}
        fill="var(--cc-ink, #f4f5f7)"
      >
        {g.hub.label}
      </text>
      {g.nodes.map((nd) => (
        <g key={nd.id} data-testid="lao-node" data-tone={nd.tone}>
          <circle cx={nd.x} cy={nd.y} r={nd.haloR} fill={TONE_FILL[nd.tone]} fillOpacity={0.16} />
          <circle cx={nd.x} cy={nd.y} r={nd.r} fill={TONE_FILL[nd.tone]} />
          <text x={nd.labelX} y={nd.nameY} textAnchor={nd.anchor} fontSize={MAP.nameSize} fontWeight={600} fill="var(--cc-ink, #f4f5f7)">
            {nd.name}
          </text>
          <text x={nd.labelX} y={nd.statusY} textAnchor={nd.anchor} fontSize={MAP.statusSize} fill="var(--cc-ink-dim, #a7adba)">
            {nd.status}
          </text>
        </g>
      ))}
    </svg>
  )
}
