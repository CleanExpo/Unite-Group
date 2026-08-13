import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SixMonitorCanvas } from '../SixMonitorCanvas'

describe('SixMonitorCanvas North Star distillation', () => {
  const props = {
    actionQueue: { total_rows: 3, shown_rows: 3, read_error: null },
    blockedLanes: { total_lanes: 5, blocked_count: 1, read_error: null },
    projectCount: 12,
    activeProjectCount: 8,
    toolCount: 24,
    sourceCount: 4,
  }

  it('renders one selected inspector followed by six operational domains', () => {
    const { container } = render(<SixMonitorCanvas {...props} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Work from verified truth first.' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.getByRole('link', { name: /Operations/ })).toHaveAttribute('href', '/founder/command-centre/operations')
    expect(screen.getByRole('link', { name: /Portfolio/ })).toHaveAttribute('href', '/founder/command-centre/portfolio')
    expect(screen.getByRole('link', { name: /Providers/ })).toHaveAttribute('href', '/founder/command-centre/providers')
    expect(screen.getByRole('link', { name: /Knowledge/ })).toHaveAttribute('href', '/founder/command-centre/knowledge')
    expect(screen.getByRole('link', { name: /Evidence/ })).toHaveAttribute('href', '/founder/command-centre/operations#evidence-stream')
    expect(screen.getByRole('link', { name: /Machines/ })).toHaveAttribute('href', '/founder/command-centre/six-zone')
    expect(container.querySelector('#portfolio')).toBe(screen.getByRole('link', { name: /Portfolio/ }))
    expect(container.querySelector('#capability-bus')).toBe(screen.getByRole('link', { name: /Knowledge/ }))
  })

  it('removes the nested sidebar and decorative monitor language', () => {
    render(<SixMonitorCanvas {...props} />)

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument()
    expect(screen.queryByText(/PC pair|Mac Mini pair|MacBook pair/)).not.toBeInTheDocument()
    expect(screen.queryByText('Command Matrix')).not.toBeInTheDocument()
  })

  it('shows source counts without inventing machine ownership', () => {
    render(<SixMonitorCanvas {...props} />)

    expect(screen.getByRole('link', { name: /Operations/ })).toHaveTextContent('3 proposed actions · 1 blocked of 5 lanes')
    expect(screen.getByRole('link', { name: /Portfolio/ })).toHaveTextContent('12 projects · 8 active')
    expect(screen.getByRole('link', { name: /Providers/ })).toHaveTextContent('4 sources · 24 tool entries')
    expect(screen.getByRole('link', { name: /Machines/ })).toHaveTextContent('No host mapping is inferred')
  })

  it('fails visibly when queue and lane sources are unavailable', () => {
    render(
      <SixMonitorCanvas
        {...props}
        actionQueue={{ ...props.actionQueue, read_error: 'queue failed' }}
        blockedLanes={{ ...props.blockedLanes, read_error: 'lanes failed' }}
      />,
    )

    expect(screen.getByText('Restore the queue source before making a delivery decision.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Operations/ })).toHaveTextContent('Queue source unavailable · Lane source unavailable')
  })
})
