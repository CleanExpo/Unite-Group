import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NexusStatusPage from '../page'

describe('NexusStatusPage', () => {
  it('renders the empty Nexus status cockpit sections without live data claims', () => {
    render(<NexusStatusPage />)

    expect(screen.getByRole('heading', { name: 'Nexus Status', level: 1 })).toBeInTheDocument()

    for (const label of ['Active Tickets', 'Open PRs', 'Approval Queue']) {
      const section = screen.getByRole('region', { name: label })
      expect(within(section).getByRole('heading', { name: label })).toBeInTheDocument()
      expect(within(section).getByText('No data yet')).toBeInTheDocument()
    }
  })
})
