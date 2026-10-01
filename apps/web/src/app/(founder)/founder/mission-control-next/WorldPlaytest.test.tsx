import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorldPlaytest } from './WorldPlaytest'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

function start() {
  fireEvent.click(screen.getByRole('button', { name: 'Start fictional playtest' }))
}

describe('WorldPlaytest — optional simulation with no persistence', () => {
  it('requires an explicit start and labels its limits before interaction', () => {
    render(<WorldPlaytest />)
    expect(screen.getByText('Fictional playtest · not saved')).toBeInTheDocument()
    expect(screen.queryByText('A water-loss call under pressure')).not.toBeInTheDocument()
    expect(screen.getByText(/using another device starts over/)).toBeInTheDocument()
    expect(screen.getByRole('region')).toHaveAttribute('data-state', 'test')
  })

  it('shows the decision consequence and identical inspectable snapshot', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<WorldPlaytest />)
    start()
    fireEvent.click(screen.getByRole('button', { name: 'Request qualified support and explain the delay' }))
    expect(screen.getByText(/Available capacity: 60/)).toBeInTheDocument()
    expect(screen.getByText(/Inspect the same world snapshot · revision 1/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge the reflection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finish fictional scenario' }))
    expect(screen.getByText('Fictional scenario complete')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Nothing was saved or certified')
    expect(screen.getByText(/Professional evidence: not assessed/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Browse CARSI/ })).toHaveAttribute('href', 'https://carsi.com.au/courses')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
  })

  it('makes the rushed consequence explicit and resets the fictional snapshot', () => {
    render(<WorldPlaytest />)
    start()
    fireEvent.click(screen.getByRole('button', { name: 'Explore the consequence of rushing' }))
    expect(screen.getByRole('status')).toHaveTextContent('response is stopped')
    expect(screen.getByText(/Available capacity: 20/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restart fictional playtest' }))
    expect(screen.getByText(/Available capacity: 100/)).toBeInTheDocument()
    expect(screen.getByText(/Inspect the same world snapshot · revision 0/)).toBeInTheDocument()
    expect(screen.getByText(/Simulation only: 0 reflection, 0 completed scenario/)).toBeInTheDocument()
  })

  it('has a keyboard path and returns focus after closing', async () => {
    const user = userEvent.setup()
    render(<WorldPlaytest />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Start fictional playtest' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'Warehouse playtest' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Request qualified support and explain the delay' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('qualified support')
    fireEvent.click(screen.getByRole('button', { name: 'Close playtest' }))
    expect(screen.getByRole('button', { name: 'Start fictional playtest' })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('Nothing was saved')
  })

  it('does not imply resume after unmounting and reopening', () => {
    const first = render(<WorldPlaytest />)
    start()
    fireEvent.click(screen.getByRole('button', { name: 'Explore the consequence of rushing' }))
    first.unmount()
    render(<WorldPlaytest />)
    expect(screen.getByRole('button', { name: 'Start fictional playtest' })).toBeInTheDocument()
    expect(screen.queryByText(/Available capacity:/)).not.toBeInTheDocument()
  })
})
