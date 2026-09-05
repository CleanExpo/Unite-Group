import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MissionObservations } from '../MissionObservations'

const version = 'a'.repeat(64)
const snapshot = {
  taskId: 'mission-1', projectKey: 'RestoreAssist', specRevision: 1, specVersion: version,
  source: 'github', observedAt: '2026-09-05T01:00:00Z', state: 'observed', headSha: 'b'.repeat(40),
  pr: { reference: 'https://github.com/example/product/pull/1', draft: false, state: 'closed', merged: true },
  checks: { state: 'observed', items: [{ receiptId: 'check-1', name: 'Build', status: 'completed', conclusion: 'success' }] },
  statuses: { state: 'observed', items: [] },
  reviews: { state: 'observed', items: [{ receiptId: 'review-1', reviewer: 'Reviewer', state: 'APPROVED', currentHead: false }] },
  deployments: { state: 'observed', items: [{ receiptId: 'deploy-1', environment: 'Preview', state: 'success' }] },
  limitations: ['Provider observations do not prove a working user journey.'], liveVerification: 'not_connected',
}

beforeEach(() => vi.restoreAllMocks())

describe('MissionObservations', () => {
  it('reads only on request and does not call successful provider signals live delivery', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => snapshot }))
    vi.stubGlobal('fetch', fetchMock)
    render(<MissionObservations taskId="mission-1" specVersion={version} />)
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh build evidence' }))
    await waitFor(() => expect(screen.getByText('Build: success')).toBeInTheDocument())
    expect(screen.getByText('Reviewer: approved (older code version)')).toBeInTheDocument()
    expect(screen.getByText('Live user verification is not connected.')).toBeInTheDocument()
    expect(screen.queryByText('Live and verified')).not.toBeInTheDocument()
  })

  it('rejects evidence for another spec version', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...snapshot, specVersion: 'c'.repeat(64) }) })))
    render(<MissionObservations taskId="mission-1" specVersion={version} />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh build evidence' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be matched'))
    expect(screen.queryByText('Build: success')).not.toBeInTheDocument()
  })

  it('marks the previous snapshot stale when refresh fails', async () => {
    let reads = 0
    vi.stubGlobal('fetch', vi.fn(async () => ++reads === 1 ? { ok: true, json: async () => snapshot } : { ok: false, json: async () => ({ error: 'Provider temporarily unavailable' }) }))
    const { container } = render(<MissionObservations taskId="mission-1" specVersion={version} />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh build evidence' }))
    await waitFor(() => screen.getByText('Build: success'))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh build evidence' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('previous snapshot is out of date'))
    expect(container.querySelector('[data-stale="true"]')).not.toBeNull()
  })

  it('shows a failed commit-status context beside a successful check run and names partial coverage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...snapshot, state: 'partial', statuses: { state: 'partial', detail: 'Provider pagination limit reached.', items: [{ receiptId: 'status-1', context: 'Security review', state: 'failure' }] } }) })))
    render(<MissionObservations taskId="mission-1" specVersion={version} />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh build evidence' }))
    await waitFor(() => screen.getByText('Build: success'))
    expect(screen.getByText('Security review: failure')).toBeInTheDocument()
    expect(screen.getByText('Commit status coverage is incomplete.')).toBeInTheDocument()
    expect(screen.getByText('Provider pagination limit reached.')).toBeInTheDocument()
  })

  it('does not call unavailable commit-status coverage empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...snapshot, state: 'partial', statuses: { state: 'unavailable', detail: 'Status access failed.', items: [] } }) })))
    render(<MissionObservations taskId="mission-1" specVersion={version} />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh build evidence' }))
    await waitFor(() => screen.getByText('Commit statuses unavailable.'))
    expect(screen.queryByText('No commit statuses observed.')).not.toBeInTheDocument()
    expect(screen.getByText('Status access failed.')).toBeInTheDocument()
  })
})
