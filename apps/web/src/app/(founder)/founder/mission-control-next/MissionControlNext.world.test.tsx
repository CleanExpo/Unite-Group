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

it('an older refresh that finishes late cannot overwrite newer reads after a tab switch', async () => {
  const held: Array<() => void> = []
  const reply = (n: number) => ({
    ok: true, status: 200,
    json: async () => ({ source: 'supabase', missions: Array.from({ length: n }, (_, i) => ({ id: `m${i}`, title: `Mission ${i}`, status: 'done', updatedAt: '2026-11-17T00:00:00Z' })) }),
  })
  let calls = 0
  vi.stubGlobal('fetch', vi.fn(() => {
    calls++
    // Refresh A (Home) is held open; refresh B (Missions, after passing through World) answers at once.
    if (calls <= 4) return new Promise(resolve => { held.push(() => resolve(reply(5))) })
    return Promise.resolve(reply(2))
  }))
  const view = render(<MissionControlNext tab="home" />)
  await act(async () => { view.rerender(<MissionControlNext tab="world" />) })
  await act(async () => { view.rerender(<MissionControlNext tab="missions" />) })
  expect((await screen.findAllByText('2 missions')).length).toBeGreaterThan(0)
  await act(async () => { held.forEach(release => release()) })
  expect(screen.getAllByText('2 missions').length).toBeGreaterThan(0)
  expect(screen.queryByText('5 missions')).toBeNull()
})

it('a refresh that outlasts the poll interval still shows its reads when nothing newer has finished', async () => {
  vi.useFakeTimers()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const held: Array<{ n: number; release: () => void }> = []
  const reply = (n: number) => ({
    ok: true, status: 200,
    json: async () => ({ source: 'supabase', missions: Array.from({ length: n }, (_, i) => ({ id: `m${i}`, title: `Mission ${i}`, status: 'done', updatedAt: '2026-11-17T00:00:00Z' })) }),
  })
  let calls = 0
  // Every read is slow: refresh A (first 4 reads, 3 missions) and the poll's refresh B (next 4, 4 missions) both stay open.
  vi.stubGlobal('fetch', vi.fn(() => {
    const n = ++calls <= 4 ? 3 : 4
    return new Promise(resolve => { held.push({ n, release: () => resolve(reply(n)) }) })
  }))
  render(<MissionControlNext tab="missions" />)
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(held).toHaveLength(8)
  await act(async () => { held.filter(h => h.n === 3).forEach(h => h.release()); await vi.advanceTimersByTimeAsync(0) })
  expect(screen.getAllByText('3 missions').length).toBeGreaterThan(0)
  // B then finishes and, being newer, replaces A.
  await act(async () => { held.filter(h => h.n === 4).forEach(h => h.release()); await vi.advanceTimersByTimeAsync(0) })
  expect(screen.getAllByText('4 missions').length).toBeGreaterThan(0)
  expect(screen.queryByText('3 missions')).toBeNull()
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
