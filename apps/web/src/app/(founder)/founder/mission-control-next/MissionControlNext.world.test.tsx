import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MissionControlNext } from './MissionControlNext'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

it('keeps live World unavailable while the separate local playtest runs', async () => {
  const fetchSpy = vi.fn(() => new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', fetchSpy)
  render(<MissionControlNext tab="world" />)
  const live = await screen.findByRole('region', { name: 'Restoration World', exact: true })
  expect(live).toHaveAttribute('data-state', 'unavailable')
  expect(within(live).getByText('UNAVAILABLE')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Start fictional playtest' }))
  fireEvent.click(screen.getByRole('button', { name: 'Request qualified support and explain the delay' }))
  expect(live).toHaveAttribute('data-state', 'unavailable')
  const simulation = screen.getByRole('region', { name: 'Fictional Restoration World playtest' })
  expect(simulation).toHaveAttribute('data-state', 'test')
  expect(simulation).toHaveAttribute('data-tone', 'neutral')
  expect(within(simulation).getByText('Fictional playtest · not saved')).toBeInTheDocument()
  expect(fetchSpy).not.toHaveBeenCalled()
})

it('restores other-tab polling and stops it again when returning to World or unmounting', async () => {
  vi.useFakeTimers()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const fetchSpy = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
  vi.stubGlobal('fetch', fetchSpy)
  const view = render(<MissionControlNext tab="world" />)
  expect(fetchSpy).not.toHaveBeenCalled()
  await act(async () => { view.rerender(<MissionControlNext tab="home" />) })
  expect(fetchSpy).toHaveBeenCalledTimes(4)
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(fetchSpy).toHaveBeenCalledTimes(8)
  view.rerender(<MissionControlNext tab="world" />)
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(fetchSpy).toHaveBeenCalledTimes(8)
  await act(async () => { view.rerender(<MissionControlNext tab="missions" />) })
  expect(fetchSpy).toHaveBeenCalledTimes(12)
  view.unmount()
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(fetchSpy).toHaveBeenCalledTimes(12)
})
