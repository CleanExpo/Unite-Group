import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LiveAgentOperationsPayload, OperationNode, OperationNodeState } from '@/lib/command-centre/live-agent-operations'
import { LiveAgentOperationsHubMap, computeHubMapLayout, HUB_LABEL } from './LiveAgentOperationsHubMap'
import { LiveAgentOperationsMap } from './LiveAgentOperationsMap'

const STATES: OperationNodeState[] = ['working', 'queued', 'blocked', 'idle']

// Declarations for each selector inside the reduced-motion media block of the map's own <style>.
// jsdom does not apply media queries, so the rules are read from the rendered stylesheet text.
function reducedMotionRules(styleText: string): Record<string, Record<string, string>> {
  const start = styleText.indexOf('@media (prefers-reduced-motion: reduce)')
  if (start < 0) return {}
  const open = styleText.indexOf('{', start)
  let depth = 0
  let end = open
  for (; end < styleText.length; end++) {
    if (styleText[end] === '{') depth++
    else if (styleText[end] === '}' && --depth === 0) break
  }
  const rules: Record<string, Record<string, string>> = {}
  for (const [, selector, body] of styleText.slice(open + 1, end).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules[selector.trim()] = Object.fromEntries(
      body.split(';').filter((d) => d.includes(':')).map((d) => {
        const i = d.indexOf(':')
        return [d.slice(0, i).trim(), d.slice(i + 1).trim()]
      }),
    )
  }
  return rules
}

function node(i: number, overrides: Partial<OperationNode> = {}): OperationNode {
  const state = STATES[i % STATES.length]
  return {
    id: `agent-${i}`,
    // Long names on purpose: the layout must truncate, never spill past the viewBox.
    label: i % 3 === 0 ? `Senior Research And Delivery Agent Number ${i}` : `Agent ${i}`,
    state,
    activeSessions: state === 'working' || state === 'blocked' ? (i % 2) + 1 : 0,
    openTasks: 12,
    blockedTasks: state === 'blocked' ? 3 : 0,
    surfaces: [],
    currentTasks: [],
    lastUpdatedAt: null,
    ...overrides,
  }
}

const nodes = (n: number) => Array.from({ length: n }, (_, i) => node(i))

type Box = { x: number; y: number; w: number; h: number }
const inside = (b: Box, W: number, H: number) => b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('computeHubMapLayout', () => {
  it.each([1, 5, 10])('is deterministic and keeps every node, label and the hub inside the viewBox for %i nodes', (n) => {
    const a = computeHubMapLayout(nodes(n))!
    const b = computeHubMapLayout(nodes(n))!
    expect(a).toEqual(b)
    expect(a.nodes).toHaveLength(n)
    expect(a.links).toHaveLength(n)
    expect(inside(a.hub.box, a.width, a.height)).toBe(true)
    for (const nd of a.nodes) {
      expect(inside({ x: nd.x - nd.haloR, y: nd.y - nd.haloR, w: nd.haloR * 2, h: nd.haloR * 2 }, a.width, a.height)).toBe(true)
      expect(inside(nd.labelBox, a.width, a.height)).toBe(true)
    }
  })

  it.each([1, 5, 10])('no two labels overlap each other or the hub for %i nodes', (n) => {
    const g = computeHubMapLayout(nodes(n))!
    const boxes = [g.hub.box, ...g.nodes.map((nd) => nd.labelBox)]
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        expect(overlaps(boxes[i], boxes[j]), `boxes ${i} and ${j} overlap`).toBe(false)
      }
    }
  })

  it('labels the hub "Mission Control" — the payload names no orchestrator', () => {
    expect(HUB_LABEL).toBe('Mission Control')
    expect(computeHubMapLayout(nodes(2))!.hub.label).toBe('Mission Control')
  })

  it('colours by the component status: working success, queued/blocked caution, idle muted', () => {
    const g = computeHubMapLayout(nodes(4))!
    expect(g.nodes.map((nd) => nd.tone)).toEqual(['success', 'caution', 'caution', 'muted'])
  })

  it('draws no map for an empty node list', () => {
    expect(computeHubMapLayout([])).toBeNull()
  })
})

describe('LiveAgentOperationsHubMap', () => {
  afterEach(cleanup)

  it('puts the flowing class ONLY on links whose agent has a live session', () => {
    const input = [
      node(0, { state: 'working', activeSessions: 2 }),
      // `working` from a running task with no live session: not animated.
      node(1, { state: 'working', activeSessions: 0 }),
      node(2, { state: 'queued', activeSessions: 0 }),
      node(3, { state: 'blocked', activeSessions: 1, blockedTasks: 1 }),
      node(4, { state: 'idle', activeSessions: 0 }),
    ]
    const { container } = render(<LiveAgentOperationsHubMap nodes={input} />)
    const links = Array.from(container.querySelectorAll('[data-testid="lao-link"]'))
    expect(links).toHaveLength(5)
    const flowing = links.filter((l) => l.getAttribute('class')?.includes('lao-flow')).map((l) => l.getAttribute('data-node'))
    expect(flowing).toEqual(['agent-0', 'agent-3'])
    expect(container.textContent).toContain('Mission Control')
    expect(container.textContent).toContain('working · 2 sessions')
  })

  it('reduced motion stops the flowing links', () => {
    const { container } = render(<LiveAgentOperationsHubMap nodes={[node(0, { state: 'working', activeSessions: 1 })]} />)
    const rules = reducedMotionRules(container.querySelector('style')?.textContent ?? '')
    expect(rules['.lao-flow']).toMatchObject({ animation: 'none' })
    // The animated class is in use, so the rule above governs a real link
    expect(container.querySelectorAll('.lao-flow').length).toBeGreaterThan(0)
  })

  it('renders nothing for an empty node list', () => {
    const { container } = render(<LiveAgentOperationsHubMap nodes={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})

function payload(n: number): LiveAgentOperationsPayload {
  return {
    source: 'cc:operations',
    generatedAt: '2026-09-25T00:00:00.000Z',
    summary: { agents: n, activeSessions: 1, openTasks: 3, blockedTasks: 0, approvalRequired: 0, recentShips: 0 },
    nodes: nodes(n),
    workQueue: [],
    shipFeed: [],
    nextAction: 'Monitor active sessions.',
  }
}

describe('LiveAgentOperationsMap hub map wiring', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('draws the map on a good read and removes it when a later poll does not succeed, keeping the text rows', async () => {
    let poll: (() => void) | undefined
    // Capture the component's own 15 s poll; other intervals (badge clocks) are ignored.
    vi.spyOn(window, 'setInterval').mockImplementation(((fn: () => void, ms?: number) => {
      if (ms === 15000) poll = fn
      return 1
    }) as unknown as typeof window.setInterval)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload(3) })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<LiveAgentOperationsMap />)
    await waitFor(() => expect(container.querySelector('[data-testid="lao-hub-map"]')).not.toBeNull())

    fetchMock.mockRejectedValue(new Error('network down'))
    await act(async () => {
      poll?.()
    })
    await waitFor(() => expect(container.querySelector('[data-stale-read="true"]')).not.toBeNull())
    expect(container.querySelector('[data-testid="lao-hub-map"]')).toBeNull()
    // The retained text rows stay; the map only summarises them.
    expect(container.textContent).toContain('Agent 1')
  })

  it('draws no map when the first read does not succeed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }))
    const { container } = render(<LiveAgentOperationsMap />)
    await waitFor(() => expect(container.textContent).toContain('operations read failed'))
    expect(container.querySelector('[data-testid="lao-hub-map"]')).toBeNull()
  })
})
