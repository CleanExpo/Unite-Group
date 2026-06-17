import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HermesControlPanel } from './HermesControlPanel'
import { ADD_ON_GATES, CONTROL_WORKSTREAMS } from './control-panel-data'

function payload() {
  return {
    source: 'cc:tasks',
    taskCount: 7,
    generatedAt: '2026-06-17T00:00:00.000Z',
    summary: { green: 2, yellow: 4, red: 1, approvalRequired: 1 },
    workstreams: CONTROL_WORKSTREAMS,
    addOns: ADD_ON_GATES,
  }
}

describe('HermesControlPanel', () => {
  it('uses a sidebar rail to switch between Hermes operating lanes', () => {
    render(<HermesControlPanel initialPayload={payload()} />)

    expect(screen.getByLabelText('Mission Control navigation')).toBeInTheDocument()
    expect(screen.getByLabelText('Selected Hermes lane')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plaud intake to Margot brief' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'task write: Margot brief to command-centre task' }))

    expect(screen.getByText('cc_tasks insert')).toBeInTheDocument()
    expect(screen.getByText('Founder approval if risk is high')).toBeInTheDocument()
    expect(screen.getByText('Approval Queue')).toBeInTheDocument()
  })
})
