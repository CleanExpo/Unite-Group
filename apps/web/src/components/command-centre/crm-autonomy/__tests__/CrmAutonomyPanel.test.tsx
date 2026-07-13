import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrmAutonomyPanel } from '../CrmAutonomyPanel'

describe('CrmAutonomyPanel', () => {
  const original = process.env.CRM_AUTO_EXECUTE
  afterEach(() => {
    if (original === undefined) delete process.env.CRM_AUTO_EXECUTE
    else process.env.CRM_AUTO_EXECUTE = original
  })

  it('shows DORMANT when the kill switch is off, and never claims a mutation runs', () => {
    delete process.env.CRM_AUTO_EXECUTE
    render(<CrmAutonomyPanel />)
    expect(screen.getByText('DORMANT')).toBeInTheDocument()
    expect(screen.getByText(/No CRM mutation runs/i)).toBeInTheDocument()
  })

  it('shows ARMED when the kill switch is on', () => {
    process.env.CRM_AUTO_EXECUTE = '1'
    render(<CrmAutonomyPanel />)
    expect(screen.getByText('ARMED')).toBeInTheDocument()
  })

  it('surfaces all six Mission Control states', () => {
    render(<CrmAutonomyPanel />)
    for (const label of ['Queued', 'Approved', 'Executing', 'Executed', 'Failed', 'Needs review']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows the per-subject risk tiers with L2 opportunity_commitment deferred', () => {
    render(<CrmAutonomyPanel />)
    expect(screen.getByText(/L1 · Lead conversion/)).toBeInTheDocument()
    expect(screen.getByText(/L2 · Opportunity commitment \(deferred\)/)).toBeInTheDocument()
    expect(screen.getByText(/L3 · Client merge/)).toBeInTheDocument()
    expect(screen.getByText(/Live dispatch of a real CRM mutation is a separate Board gate/i)).toBeInTheDocument()
  })

  it('omits the Recent CRM jobs section when no recentJobs prop is passed', () => {
    render(<CrmAutonomyPanel />)
    expect(screen.queryByText('Recent CRM jobs')).not.toBeInTheDocument()
  })

  it('renders recorded CRM jobs with their mission-control state and subject', () => {
    render(
      <CrmAutonomyPanel
        recentJobs={{
          source: 'connected',
          jobs: [
            { id: 'job_1', subjectType: 'lead_conversion', missionControlState: 'needs_review', reason: 'kill_switch_off', admitted: false, createdAt: '2026-07-10T00:00:00.000Z' },
          ],
        }}
      />,
    )
    expect(screen.getByText('Recent CRM jobs')).toBeInTheDocument()
    expect(screen.getByText(/Needs review · Lead conversion/)).toBeInTheDocument()
    expect(screen.getByText('kill_switch_off')).toBeInTheDocument()
  })

  it('shows an honest empty state when connected but there are no jobs', () => {
    render(<CrmAutonomyPanel recentJobs={{ source: 'connected', jobs: [] }} />)
    expect(screen.getByText('No CRM jobs recorded yet.')).toBeInTheDocument()
  })

  it('never fabricates jobs when the read is not connected', () => {
    render(<CrmAutonomyPanel recentJobs={{ source: 'not_connected', jobs: [] }} />)
    expect(screen.getByText(/Sign in to view recorded CRM jobs/i)).toBeInTheDocument()
  })
})
