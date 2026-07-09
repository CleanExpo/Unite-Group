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
})
