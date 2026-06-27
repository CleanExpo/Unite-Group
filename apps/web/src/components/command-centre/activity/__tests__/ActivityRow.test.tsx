import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityRow } from '../ActivityRow'
import type { ActivityDatum } from '../activity-data'

function makeDatum(overrides: Partial<ActivityDatum> = {}): ActivityDatum {
  return {
    id: 'evt-1',
    ts: '2026-06-16T02:00:00.000Z',
    agent: 'Hermes',
    verb: 'working on',
    target: 'Build the activity feed',
    severity: 'running',
    origin: 'cc',
    ...overrides,
  }
}

describe('ActivityRow source chip', () => {
  it('renders the origin chip with the origin label and data attribute', () => {
    render(<ActivityRow data={makeDatum({ origin: 'linear' })} />)
    const chip = document.querySelector('[data-activity-origin="linear"]')
    expect(chip).not.toBeNull()
    expect(screen.getByText('linear')).toBeInTheDocument()
  })

  it('renders the cc origin chip for an internal task', () => {
    render(<ActivityRow data={makeDatum({ origin: 'cc' })} />)
    expect(document.querySelector('[data-activity-origin="cc"]')).not.toBeNull()
    expect(screen.getByText('cc')).toBeInTheDocument()
  })

  it('wraps the row in an external link when a url is present', () => {
    render(
      <ActivityRow
        data={makeDatum({ origin: 'linear', url: 'https://linear.app/unite-group/issue/UNI-2137' })}
      />,
    )
    const link = screen.getByTestId('activity-row-link-evt-1')
    expect(link).toHaveAttribute('href', 'https://linear.app/unite-group/issue/UNI-2137')
    // The origin chip still renders inside the linked row.
    expect(document.querySelector('[data-activity-origin="linear"]')).not.toBeNull()
  })
})
