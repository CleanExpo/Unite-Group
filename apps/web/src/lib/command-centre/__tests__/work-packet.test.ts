import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildWorkPacket,
  transitionPacket,
  toLinearIssueInput,
  createPacketLinearWork,
  routeOwner,
  PACKET_LABELS,
  type WorkPacket,
} from '@/lib/command-centre/work-packet'

const NOW = '2026-06-16T12:00:00.000Z'
const build = (req = {}) => buildWorkPacket({ outcome: 'Ship the onboarding flow', projectKey: 'synthex', ...req }, { now: NOW })

const originalEnv = process.env.CC_LINEAR_LIVE
beforeEach(() => delete process.env.CC_LINEAR_LIVE)
afterEach(() => {
  if (originalEnv === undefined) delete process.env.CC_LINEAR_LIVE
  else process.env.CC_LINEAR_LIVE = originalEnv
})

describe('buildWorkPacket — packet creation', () => {
  it('creates a durable packet with contract labels + draft status', () => {
    const p = build()
    expect(p.status).toBe('draft')
    expect(p.outcome).toBe('Ship the onboarding flow')
    expect(p.projectKey).toBe('synthex')
    expect(p.labels).toEqual([...PACKET_LABELS])
    expect(p.approvalRequired).toBe(false)
    expect(p.nextActionOwner).toBe('hermes') // default lane = ops
  })

  it('forces approval (owner → phill) when it touches CRM writes or is high risk', () => {
    expect(build({ touchesCrmWrite: true }).approvalRequired).toBe(true)
    expect(build({ touchesCrmWrite: true }).nextActionOwner).toBe('phill')
    expect(build({ riskLevel: 'high' }).approvalRequired).toBe(true)
  })

  it('routes the next-action owner by lane', () => {
    expect(routeOwner('deep_reasoning', false)).toBe('pi-ceo')
    expect(routeOwner('coding', false)).toBe('senior_agent')
    expect(routeOwner('video_media', false)).toBe('external_provider')
    expect(routeOwner('ops', false)).toBe('hermes')
    expect(routeOwner('coding', true)).toBe('phill') // approval overrides
  })
})

describe('toLinearIssueInput — claimable metadata', () => {
  it('maps to a Linear issue with autonomous labels + team routing', () => {
    const input = toLinearIssueInput(build({ projectKey: 'dr' }))
    expect(input.teamKey).toBe('DR') // dr → DR via BUSINESS_TO_TEAM
    expect(input.labelNames).toEqual(['pi-dev:autonomous', 'mesh:auto'])
    expect(input.title).toBe('Ship the onboarding flow')
    expect(input.description).toContain('## Acceptance Criteria')
    expect(input.description).toContain('- [ ] Implement the smallest production-safe slice')
    expect(input.description).toContain('Next action owner')
  })

  it('high-risk packets map to urgent priority', () => {
    expect(toLinearIssueInput(build({ riskLevel: 'high' })).priority).toBe(1)
  })
})

describe('transitionPacket — guarded status machine', () => {
  it('routes draft → routed → running → completed for a safe packet', () => {
    let p = build()
    p = transitionPacket(p, { type: 'route' }).packet
    expect(p.status).toBe('routed')
    p = transitionPacket(p, { type: 'start' }).packet
    expect(p.status).toBe('running')
    const done = transitionPacket(p, { type: 'complete', evidencePath: 'evidence/x.md' })
    expect(done.ok).toBe(true)
    expect(done.packet.status).toBe('completed')
    expect(done.packet.evidencePath).toBe('evidence/x.md')
  })

  it('an approval-required packet goes to awaiting_approval on start and cannot complete unapproved', () => {
    let p: WorkPacket = transitionPacket(build({ touchesCrmWrite: true }), { type: 'route' }).packet
    p = transitionPacket(p, { type: 'start' }).packet
    expect(p.status).toBe('awaiting_approval')
    // attempting to complete before approval is refused
    p = transitionPacket(p, { type: 'start' }).packet // still awaiting
    const blockedComplete = transitionPacket({ ...p, status: 'running' }, { type: 'complete' })
    expect(blockedComplete.ok).toBe(false)
    expect(blockedComplete.reason).toMatch(/approval required/)
  })

  it('approve unblocks execution; then complete succeeds', () => {
    let p = transitionPacket(build({ touchesCrmWrite: true }), { type: 'route' }).packet
    p = transitionPacket(p, { type: 'start' }).packet // awaiting_approval
    const approved = transitionPacket(p, { type: 'approve', by: 'phill' })
    expect(approved.ok).toBe(true)
    expect(approved.packet.status).toBe('running')
    expect(approved.packet.approvedBy).toBe('phill')
    expect(transitionPacket(approved.packet, { type: 'complete' }).ok).toBe(true)
  })

  it('block / unblock transitions and rejects invalid transitions', () => {
    let p = transitionPacket(build(), { type: 'route' }).packet
    p = transitionPacket(p, { type: 'block' }).packet
    expect(p.status).toBe('blocked')
    expect(transitionPacket(p, { type: 'complete' }).ok).toBe(false) // can't complete from blocked
    p = transitionPacket(p, { type: 'unblock' }).packet
    expect(p.status).toBe('routed')
  })
})

describe('createPacketLinearWork — dry-run by default', () => {
  const deps = { createIssue: vi.fn(async () => ({ id: 'SYN-99', url: 'https://linear.app/x/SYN-99' })) }
  beforeEach(() => deps.createIssue.mockClear())

  it('does not create a Linear issue by default', async () => {
    const r = await createPacketLinearWork(build(), deps)
    expect(r.mode).toBe('dry-run')
    expect(r.created).toBeNull()
    expect(deps.createIssue).not.toHaveBeenCalled()
    expect(r.linearInput.labelNames).toEqual(['pi-dev:autonomous', 'mesh:auto'])
  })

  it('creates the issue only when live AND env flag set', async () => {
    process.env.CC_LINEAR_LIVE = '1'
    const r = await createPacketLinearWork(build(), deps, { live: true })
    expect(r.mode).toBe('live')
    expect(deps.createIssue).toHaveBeenCalledOnce()
    expect(r.packet.linearIssueId).toBe('SYN-99')
  })
})
