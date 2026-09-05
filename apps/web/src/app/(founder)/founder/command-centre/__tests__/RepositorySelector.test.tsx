import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MargotMissionConsole } from '../MargotMissionConsole'

const repo = (fullName: string, archived = false) => ({ fullName, private: true, archived })
function page(repositories: ReturnType<typeof repo>[], nextCursor: string | null = null, incomplete = false) {
  return { repositories, nextCursor, incomplete, status: nextCursor || incomplete ? 'partial' : 'complete', message: '', observedAt: '2026-09-05T00:00:00Z', coverage: 'Repositories visible to the connected GitHub account.' }
}
const response = (body: unknown, ok = true) => ({ ok, json: async () => body })
const trigger = () => screen.getByRole('button', { name: /^Business or project/ })
function mount() {
  const prepare = vi.fn()
  render(<MargotMissionConsole projects={[{ name: 'Registered business' }]} presets={[]} busy={false} onPrepare={prepare} />)
  return prepare
}
beforeEach(() => vi.restoreAllMocks())

describe('GitHub repository selection', () => {
  it('explains the usable fallback after authorisation failure and prepares the selected registered business', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ ...page([]), status: 'auth_error', message: 'GitHub authorisation failed.', incomplete: true }, false)))
    const prepare = mount()
    fireEvent.click(trigger())
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('GitHub authorisation failed.')
    expect(error).toHaveTextContent('You can still prepare your idea. Choose a registered business below, or let Margot help you place it.')
    expect(screen.queryByRole('list', { name: 'GitHub repositories' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Or choose a registered business'), { target: { value: 'Registered business' } })
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'Improve the customer handover' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    expect(prepare).toHaveBeenCalledWith('Improve the customer handover', 'Registered business', [])
  })

  it('loads only when opened, searches full owner/name, and prepares the selected repository unchanged', async () => {
    const fetchMock = vi.fn(async () => response(page([repo('OwnerA/shared'), repo('OwnerB/shared', true)])))
    vi.stubGlobal('fetch', fetchMock)
    const prepare = mount()
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(trigger())
    await screen.findByRole('button', { name: 'OwnerB/shared Private · Archived' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ownerb/SHARED' } })
    expect(screen.queryByRole('button', { name: 'OwnerA/shared Private' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'OwnerB/shared Private · Archived' }))
    expect(trigger()).toHaveTextContent('OwnerB/shared')
    expect(trigger()).toHaveFocus()
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'Give customers a useful new portal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    expect(prepare).toHaveBeenCalledWith('Give customers a useful new portal', 'OwnerB/shared', [])
  })

  it('finds a repository beyond page one and keeps search and accumulated entries through pagination', async () => {
    const first = Array.from({ length: 100 }, (_, index) => repo(`Owner/repository-${index}`))
    const fetchMock = vi.fn().mockResolvedValueOnce(response(page(first, '2'))).mockResolvedValueOnce(response(page([repo('Other/rare-project')])))
    vi.stubGlobal('fetch', fetchMock)
    mount()
    fireEvent.click(trigger())
    await screen.findByText('100 repositories loaded · list may be incomplete')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'rare-project' } })
    expect(screen.getByText(/No loaded repositories match/)).toHaveTextContent('More repositories may be available.')
    fireEvent.click(screen.getByRole('button', { name: 'Load more repositories' }))
    await screen.findByRole('button', { name: 'Other/rare-project Private' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/command-centre/missions/repositories?cursor=2')
    expect(screen.getByRole('status')).toHaveTextContent('101 repositories loaded · connected account list complete · 1 matching')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Owner/repository-0 Private' })).toBeInTheDocument()
  })

  it('retains selection and loaded entries after a failed page and retries that page', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(page([repo('Owner/kept')], '2')))
      .mockResolvedValueOnce(response({ error: 'GitHub is unavailable.' }, false))
      .mockResolvedValueOnce(response(page([repo('Owner/next')])))
    vi.stubGlobal('fetch', fetchMock)
    mount()
    fireEvent.click(trigger())
    fireEvent.click(await screen.findByRole('button', { name: 'Owner/kept Private' }))
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('button', { name: 'Load more repositories' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub is unavailable.')
    expect(trigger()).toHaveTextContent('Owner/kept')
    expect(screen.getByRole('button', { name: 'Owner/kept Private' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Retry repositories' }))
    await screen.findByRole('button', { name: 'Owner/next Private' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/command-centre/missions/repositories?cursor=2')
    expect(trigger()).toHaveTextContent('Owner/kept')
  })

  it('does not claim complete coverage after a damaged page followed by the last page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(page([repo('Owner/first')], '2', true))).mockResolvedValueOnce(response(page([repo('Owner/last')]))))
    mount()
    fireEvent.click(trigger())
    fireEvent.click(await screen.findByRole('button', { name: 'Load more repositories' }))
    await screen.findByRole('button', { name: 'Owner/last Private' })
    expect(screen.getByRole('status')).toHaveTextContent('list may be incomplete')
    expect(screen.queryByText(/connected account list complete/)).not.toBeInTheDocument()
    expect(screen.getByText('Some repositories could not be included. This list is incomplete.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh repository list' })).toBeInTheDocument()
  })

  it('shows a connection error without fabricating repository options and leaves automatic placement available', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ ...page([]), status: 'not_connected', message: 'GitHub account is not connected.', incomplete: true })))
    const prepare = mount()
    fireEvent.click(trigger())
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub account is not connected.')
    expect(screen.queryByRole('list', { name: 'GitHub repositories' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Or choose a registered business')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Let Margot help me place it', exact: true }))
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'Make our customer journey clearer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my mission' }))
    expect(prepare).toHaveBeenCalledWith('Make our customer journey clearer', '', [])
  })

  it('distinguishes a complete empty account and closes the chooser with Escape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(page([]))))
    mount()
    fireEvent.click(trigger())
    await screen.findByText('0 repositories loaded · connected account list complete')
    expect(screen.getByText('No repositories have been returned.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more repositories' })).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveFocus()
  })

  it('shows the GitHub retry delay when the catalogue is rate limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ ...page([]), status: 'rate_limited', message: 'GitHub request limit reached.', retryAfterSeconds: 90, incomplete: true }, false)))
    mount()
    fireEvent.click(trigger())
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub request limit reached. Wait 90 seconds before retrying.')
    expect(screen.queryByRole('list', { name: 'GitHub repositories' })).not.toBeInTheDocument()
  })

  it('refreshes a complete list to discover newly accessible repositories without clearing selection', async () => {
    let finish: (value: ReturnType<typeof response>) => void = () => {}
    const fetchMock = vi.fn().mockResolvedValueOnce(response(page([repo('Owner/existing')]))).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    mount()
    fireEvent.click(trigger())
    fireEvent.click(await screen.findByRole('button', { name: 'Owner/existing Private' }))
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('button', { name: 'Refresh repository list' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading GitHub repositories…')
    expect(screen.getByRole('button', { name: 'Refresh repository list' })).toBeDisabled()
    finish(response(page([repo('Owner/newly-accessible')])))
    await screen.findByRole('button', { name: 'Owner/newly-accessible Private' })
    expect(trigger()).toHaveTextContent('Owner/existing')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/command-centre/missions/repositories')
  })
})
