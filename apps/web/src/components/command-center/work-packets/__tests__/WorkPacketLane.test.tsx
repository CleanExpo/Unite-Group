import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkPacketLane } from '../WorkPacketLane'
import type { PacketStatus, WorkPacket } from '@/lib/command-centre/work-packet'

vi.stubGlobal('fetch', vi.fn())
const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>

function packet(overrides: Partial<WorkPacket> & { id: string; status: PacketStatus }): WorkPacket {
  return {
    outcome: `Outcome for ${overrides.id}`,
    projectKey: 'synthex',
    clientId: null,
    lane: 'ops',
    riskLevel: 'low',
    nextActionOwner: 'hermes',
    approvalRequired: false,
    approvedBy: null,
    labels: ['pi-dev:autonomous', 'mesh:auto'],
    linearIssueId: null,
    evidencePath: null,
    createdAt: '2026-06-16T12:00:00.000Z',
    ...overrides,
  }
}

const samplePackets: WorkPacket[] = [
  packet({ id: 'wp-draft-1', status: 'draft', outcome: 'Draft a launch brief' }),
  packet({ id: 'wp-routed-1', status: 'routed', outcome: 'Route the coding job', lane: 'coding', nextActionOwner: 'senior_agent' }),
  packet({ id: 'wp-running-1', status: 'running', outcome: 'Run the render pipeline' }),
  packet({ id: 'wp-blocked-1', status: 'blocked', outcome: 'Blocked on credentials' }),
  packet({
    id: 'wp-approval-1',
    status: 'awaiting_approval',
    outcome: 'Push CRM write needing sign-off',
    approvalRequired: true,
    nextActionOwner: 'phill',
  }),
  packet({ id: 'wp-done-1', status: 'completed', outcome: 'Shipped the digest' }),
]

describe('WorkPacketLane', () => {
  beforeEach(() => mockFetch.mockReset())

  it('renders a column per status with packets grouped into them', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ packets: samplePackets }) })
    render(<WorkPacketLane />)

    // All six status columns are present.
    expect(await screen.findByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Routed')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()

    // Cards render their outcomes.
    expect(screen.getByText('Draft a launch brief')).toBeInTheDocument()
    expect(screen.getByText('Shipped the digest')).toBeInTheDocument()
  })

  it('shows an Approve action only on an awaiting_approval card and posts the approve transition', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ packets: samplePackets }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ packets: samplePackets }) })

    render(<WorkPacketLane />)

    const approveButton = await screen.findByRole('button', { name: /approve/i })
    expect(approveButton).toBeInTheDocument()
    // Only one Approve action exists (the awaiting_approval card).
    expect(screen.getAllByRole('button', { name: /approve/i })).toHaveLength(1)

    // The approval-required marker is present on that card.
    expect(screen.getByLabelText('Approval required')).toBeInTheDocument()

    approveButton.click()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/command-center/work-packet/wp-approval-1/transition',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const transitionCall = mockFetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/transition'),
    )
    expect(transitionCall).toBeDefined()
    const body = JSON.parse((transitionCall?.[1] as RequestInit).body as string)
    expect(body).toMatchObject({ type: 'approve' })
  })

  it('shows the degraded banner when the fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    render(<WorkPacketLane />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
