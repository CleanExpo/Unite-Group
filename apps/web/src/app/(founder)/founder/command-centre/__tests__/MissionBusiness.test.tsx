import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MissionBusiness } from '../MissionBusiness'
import type { DeliveryMissionView } from '@/lib/command-centre/delivery-types'
const mission = { taskId: 'mission', updatedAt: '2026-10-20T00:00:00Z', businessKey: null } as DeliveryMissionView
afterEach(() => vi.unstubAllGlobals())
describe('MissionBusiness', () => {
  it('waits for explicit save, shows the confirmed destination and permits clearing it', async () => {
    const onSaved = vi.fn()
    const fetchMock = vi.fn(async (_url, init) => {
      const input = JSON.parse(init.body)
      return { ok: true, json: async () => ({ source: 'supabase', mission: { ...mission, businessKey: input.businessKey, updatedAt: '2026-10-20T01:00:00Z' } }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MissionBusiness mission={mission} disabled={false} onSaved={onSaved} />)
    fireEvent.change(screen.getByLabelText('Business for this mission'), { target: { value: 'unite-group' } })
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Save business assignment' }))
    await screen.findByText(/Filed under Unite-Group/)
    expect(onSaved).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Business for this mission'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save business assignment' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2))
    expect(screen.queryByText(/Filed under/)).not.toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).expectedUpdatedAt).toBe('2026-10-20T01:00:00Z')
  })
  it('keeps an unsuccessful assignment out of the confirmed filing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Refresh this mission.' }) })))
    render(<MissionBusiness mission={mission} disabled={false} />)
    fireEvent.change(screen.getByLabelText('Business for this mission'), { target: { value: 'carsi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save business assignment' }))
    await screen.findByRole('alert')
    expect(screen.queryByText(/Filed under/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Business for this mission')).toHaveValue('carsi')
  })
})
