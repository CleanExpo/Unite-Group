/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpportunitiesPageClient } from '../OpportunitiesPageClient'
import { acceptedBundle } from '@/lib/synthex/__tests__/import-fixture'
import { SynthexImportAssociationSchema } from '@/lib/synthex/import-association'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function resp(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response)
}

function association(projectId = 'alpha', repository = 'CleanExpo/Alpha') {
  return { version: 1, projectId, repository, packetId: 'packet-fixture', revision: 1, digest: 'a'.repeat(64), executionBlocked: true }
}

function assigned(id: string, projectId = 'alpha', stage = 'blocked_review', repository = 'CleanExpo/Alpha') {
  return { id, name: id, source: 'synthex', stage, status: 'blocked_review', value_amount: null, probability: null, additional_data: { synthexImport: association(projectId, repository) } }
}

function windowResponse(opportunities: unknown[], nextCursor: string | null = null) {
  return { opportunities, summary: { total: opportunities.length, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 }, sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' }, readiness: { queueWindow: 'latest_500_created_at', pagination: 'cursor_by_created_at', nextCursor } }
}

async function chooseProject(name: string) {
  await userEvent.selectOptions(screen.getByLabelText('Filter by project'), screen.getByRole('option', { name, exact: true }))
}

async function saveImportedProposal() {
  await userEvent.click(screen.getByRole('button', { name: 'Import Synthex proposal' }))
  await screen.findByRole('option', { name: /CleanExpo\/Synthex/ })
  await userEvent.selectOptions(screen.getByLabelText('Target repository'), 'CleanExpo/Synthex')
  await userEvent.click(screen.getByLabelText('Synthex export JSON'))
  await userEvent.paste(JSON.stringify(acceptedBundle()))
  await userEvent.click(screen.getByRole('button', { name: 'Preview import' }))
  await screen.findByRole('button', { name: 'Save blocked review' })
  await userEvent.click(screen.getByRole('button', { name: 'Save blocked review' }))
}

describe('OpportunitiesPageClient', () => {
  it('renders only the persisted canonical planning reference after a fresh reload', async () => {
    const row = { ...assigned('Persisted proposal'), name: 'Spoofed project name', source_detail: 'target Fake/Repository', additional_data: { synthexImport: association(), unrelated: { projectId: 'forged' } } }
    fetchMock.mockReturnValue(resp(windowResponse([row])))
    const first = render(<OpportunitiesPageClient />)
    const firstRow = await screen.findByRole('article', { name: 'Spoofed project name' })
    expect(within(firstRow).getByText('Project planning reference: alpha')).toBeInTheDocument()
    expect(within(firstRow).getByText('Repository: CleanExpo/Alpha')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Fake/Repository')
    first.unmount()
    render(<OpportunitiesPageClient />)
    expect(within(await screen.findByRole('article', { name: 'Spoofed project name' })).getByText('Repository: CleanExpo/Alpha')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['missing', undefined], ['null', null], ['array', []], ['string', 'alpha'],
    ['namespace null', { synthexImport: null }], ['unknown key', { synthexImport: { ...association(), unexpected: true } }],
    ['wrong version', { synthexImport: { ...association(), version: 2 } }],
    ['unblocked', { synthexImport: { ...association(), executionBlocked: false } }],
    ['oversized', { synthexImport: { ...association(), projectId: 'a'.repeat(1024) } }],
  ])('shows %s metadata as unassigned rather than guessing from source prose', async (_case, metadata) => {
    fetchMock.mockReturnValue(resp(windowResponse([{ ...assigned('Legacy planning row'), source_detail: 'target CleanExpo/Alpha', additional_data: metadata }])))
    render(<OpportunitiesPageClient />)
    const row = await screen.findByRole('article', { name: 'Legacy planning row' })
    expect(within(row).getByText('Unassigned planning reference')).toBeInTheDocument()
    expect(within(row).queryByText(/Repository:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'alpha', exact: true })).not.toBeInTheDocument()
  })

  it('keeps coincidental valid metadata on ordinary manual rows unassigned', async () => {
    fetchMock.mockReturnValue(resp(windowResponse([{ ...assigned('Manual planning row'), source: 'manual' }])))
    render(<OpportunitiesPageClient />)
    expect(within(await screen.findByRole('article', { name: 'Manual planning row' })).getByText('Unassigned planning reference')).toBeInTheDocument()
    await chooseProject('Unassigned planning references')
    expect(screen.getByRole('article', { name: 'Manual planning row' })).toBeInTheDocument()
  })

  it('composes project and stage filters without network calls or changing window economics', async () => {
    fetchMock.mockReturnValue(resp(windowResponse([assigned('Alpha discovery', 'alpha', 'discovery'), assigned('Alpha blocked'), assigned('Beta discovery', 'beta', 'discovery')], '2026-07-04T00:00:00.000Z')))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'Alpha discovery' })
    await chooseProject('alpha')
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'discovery')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Alpha discovery' })).toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 3 loaded opportunities for Discovery and project alpha · older opportunities available')).toBeInTheDocument()
    expect(screen.getByText('$7,200')).toBeInTheDocument()
    expect(screen.getByText('$12,000')).toBeInTheDocument()
    await chooseProject('beta')
    expect(screen.getByRole('article', { name: 'Beta discovery' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'blocked_review')
    expect(screen.getByText('No matching opportunities in the loaded window')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load older opportunities' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps canonical all and unassigned project IDs distinct from filter controls', async () => {
    fetchMock.mockReturnValue(resp(windowResponse([assigned('Canonical all row', 'all'), assigned('Canonical unassigned row', 'unassigned'), { ...assigned('Ordinary unassigned row'), additional_data: null }])))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'Canonical all row' })
    await chooseProject('all')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Canonical all row' })).toBeInTheDocument()
    await chooseProject('unassigned')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Canonical unassigned row' })).toBeInTheDocument()
    await chooseProject('Unassigned planning references')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Ordinary unassigned row' })).toBeInTheDocument()
    await chooseProject('All projects')
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('redacts assigned references with stable distinct labels and canonical selections across pagination', async () => {
    const first = association('board-2026-crm-777', 'CleanExpo/BOARD-2026-777')
    const second = association('board-2026-crm-888', 'CleanExpo/BOARD-2026-888')
    expect(SynthexImportAssociationSchema.safeParse(first).success).toBe(true)
    expect(SynthexImportAssociationSchema.safeParse(second).success).toBe(true)
    fetchMock.mockReturnValueOnce(resp(windowResponse([assigned('First private planning row', first.projectId, 'blocked_review', first.repository), assigned('Second private planning row', second.projectId, 'discovery', second.repository)], '2026-07-04T00:00:00.000Z')))
      .mockReturnValueOnce(resp(windowResponse([assigned('Earlier sorting private row', 'board-2026-crm-111', 'blocked_review', 'CleanExpo/BOARD-2026-111')])))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'First private planning row' })
    const firstOption = screen.getByRole('option', { name: '[REDACTED] · Reference 1', exact: true }) as HTMLOptionElement
    const secondOption = screen.getByRole('option', { name: '[REDACTED] · Reference 2', exact: true }) as HTMLOptionElement
    expect(firstOption.value).not.toBe(secondOption.value)
    for (const raw of [first.projectId, second.projectId, first.repository, second.repository]) {
      expect(document.body.textContent).not.toContain(raw)
      expect(Array.from(document.querySelectorAll('[aria-label], [title]')).some(element => (element.getAttribute('aria-label') ?? '').includes(raw) || (element.getAttribute('title') ?? '').includes(raw))).toBe(false)
    }
    expect(within(screen.getByRole('article', { name: 'First private planning row' })).getByText('Repository: CleanExpo/[REDACTED]')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by project'), firstOption)
    expect(screen.queryByRole('article', { name: 'Second private planning row' })).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 2 loaded opportunities for project [REDACTED] · Reference 1 · older opportunities available')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Load older opportunities' }))
    await screen.findByRole('option', { name: '[REDACTED] · Reference 3', exact: true })
    expect(screen.getByLabelText('Filter by project')).toHaveValue(firstOption.value)
    expect(screen.getByRole('option', { name: '[REDACTED] · Reference 1', exact: true })).toHaveValue(firstOption.value)
    await chooseProject('[REDACTED] · Reference 2')
    expect(screen.getByRole('article', { name: 'Second private planning row' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'blocked_review')
    expect(screen.getByText('No matching opportunities in the loaded window')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'discovery')
    expect(screen.getByRole('article', { name: 'Second private planning row' })).toBeInTheDocument()
  })

  it('renders an older assigned reference inside disclosure and after filtering into the initial list', async () => {
    fetchMock.mockReturnValue(resp(windowResponse([...Array.from({ length: 10 }, (_, i) => assigned(`Initial row ${i}`)), assigned('Disclosure project row', 'beta', 'blocked_review', 'CleanExpo/Beta')])))
    render(<OpportunitiesPageClient />)
    await screen.findByText('Initial row 0')
    const disclosure = screen.getByTestId('opportunities-older-loaded')
    await userEvent.click(within(disclosure).getByText('Older loaded opportunities'))
    const olderRow = within(disclosure).getByRole('article', { name: 'Disclosure project row' })
    expect(within(olderRow).getByText('Project planning reference: beta')).toBeInTheDocument()
    expect(within(olderRow).getByText('Repository: CleanExpo/Beta')).toBeInTheDocument()
    await chooseProject('beta')
    expect(screen.queryByTestId('opportunities-older-loaded')).not.toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Disclosure project row' })).getByText('Repository: CleanExpo/Beta')).toBeInTheDocument()
  })

  it('derives strict associations only when the loaded window changes, not for filters', async () => {
    const parse = vi.spyOn(SynthexImportAssociationSchema, 'safeParse')
    fetchMock.mockReturnValue(resp(windowResponse([assigned('Memo alpha'), assigned('Memo beta', 'beta', 'discovery')])))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'Memo alpha' })
    const calls = parse.mock.calls.length
    expect(calls).toBeGreaterThan(0)
    await chooseProject('beta')
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'discovery')
    await chooseProject('All projects')
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'all')
    expect(parse).toHaveBeenCalledTimes(calls)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retains both filters and unique project options through an older-page failure and overlapping retry', async () => {
    const retained = assigned('Retained assigned row', 'alpha', 'discovery')
    fetchMock.mockReturnValueOnce(resp(windowResponse([retained], '2026-07-04T00:00:00.000Z')))
      .mockReturnValueOnce(resp({ error: 'Older page failed' }, false))
      .mockReturnValueOnce(resp(windowResponse([
        { ...retained, additional_data: { synthexImport: association('forged') } },
        assigned('New older project', 'beta', 'blocked_review'),
      ])))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'Retained assigned row' })
    await chooseProject('alpha')
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'discovery')
    await userEvent.click(screen.getByRole('button', { name: 'Load older opportunities' }))
    await screen.findByText('Older opportunities failed to load. Current page is still visible.')
    expect(screen.getByRole('article', { name: 'Retained assigned row' })).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by project')).toHaveValue('project:alpha')
    expect(screen.getByLabelText('Filter by stage')).toHaveValue('discovery')
    await userEvent.click(screen.getByRole('button', { name: 'Load older opportunities' }))
    await screen.findByRole('option', { name: 'beta', exact: true })
    expect(screen.getAllByRole('option', { name: 'alpha', exact: true })).toHaveLength(1)
    expect(screen.queryByRole('option', { name: 'forged', exact: true })).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByLabelText('Filter by project')).toHaveValue('project:alpha')
    expect(screen.getByLabelText('Filter by stage')).toHaveValue('discovery')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each(['alpha', 'Unassigned planning references'])('explains a saved import excluded by %s without changing either filter', async selected => {
    const imported = assigned('Saved project B', 'synthex', 'blocked_review', 'CleanExpo/Synthex')
    fetchMock.mockReturnValueOnce(resp(windowResponse([assigned('Selected alpha row'), { ...assigned('Legacy row'), additional_data: null }])))
      .mockReturnValueOnce(resp({ projects: [{ name: 'synthex', repository: 'CleanExpo/Synthex' }] }))
      .mockReturnValueOnce(resp({ preview: { proposal: acceptedBundle().proposal, packetId: acceptedBundle().packetId, revision: 2, project: { name: 'synthex', repository: 'CleanExpo/Synthex' }, executionBlocked: true } }))
      .mockReturnValueOnce(resp({ opportunity: imported }))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'Selected alpha row' })
    await chooseProject(selected)
    const projectValue = (screen.getByLabelText('Filter by project') as HTMLSelectElement).value
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'discovery')
    await saveImportedProposal()
    const excluded = await screen.findByText(/saved blocked review is outside the current project filter/i)
    expect(excluded.closest('[role="status"]')).toHaveAttribute('role', 'status')
    expect(screen.getByLabelText('Filter by project')).toHaveValue(projectValue)
    expect(screen.getByLabelText('Filter by stage')).toHaveValue('discovery')
    expect(screen.queryByRole('article', { name: 'Saved project B' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear project filter' }))
    expect(screen.getByLabelText('Filter by stage')).toHaveValue('discovery')
    expect(screen.queryByRole('article', { name: 'Saved project B' })).not.toBeInTheDocument()
    expect(screen.queryByText(/saved blocked review is outside the current project filter/i)).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'blocked_review')
    expect(screen.getByRole('article', { name: 'Saved project B' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('does not claim a saved excluded import when the existing import fails', async () => {
    fetchMock.mockReturnValueOnce(resp(windowResponse([assigned('Selected alpha row')])))
      .mockReturnValueOnce(resp({ projects: [{ name: 'synthex', repository: 'CleanExpo/Synthex' }] }))
      .mockReturnValueOnce(resp({ preview: { proposal: acceptedBundle().proposal, packetId: acceptedBundle().packetId, revision: 2, project: { name: 'synthex', repository: 'CleanExpo/Synthex' }, executionBlocked: true } }))
      .mockReturnValueOnce(resp({ error: 'Import rejected' }, false))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'Selected alpha row' })
    await chooseProject('alpha')
    await saveImportedProposal()
    expect(await screen.findByText('Import rejected')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear project filter' })).not.toBeInTheDocument()
  })

  it('clears stale saved-row feedback when its project is manually included', async () => {
    fetchMock.mockReturnValueOnce(resp(windowResponse([assigned('Selected alpha row')])))
      .mockReturnValueOnce(resp({ projects: [{ name: 'synthex', repository: 'CleanExpo/Synthex' }] }))
      .mockReturnValueOnce(resp({ preview: { proposal: acceptedBundle().proposal, packetId: acceptedBundle().packetId, revision: 2, project: { name: 'synthex', repository: 'CleanExpo/Synthex' }, executionBlocked: true } }))
      .mockReturnValueOnce(resp({ opportunity: assigned('Manually included saved row', 'synthex', 'blocked_review', 'CleanExpo/Synthex') }))
    render(<OpportunitiesPageClient />)
    await screen.findByRole('article', { name: 'Selected alpha row' })
    await chooseProject('alpha')
    await saveImportedProposal()
    await screen.findByText(/saved blocked review is outside the current project filter/i)
    await chooseProject('synthex')
    expect(screen.getByRole('article', { name: 'Manually included saved row' })).toBeInTheDocument()
    expect(screen.queryByText(/saved blocked review is outside the current project filter/i)).not.toBeInTheDocument()
    await chooseProject('alpha')
    expect(screen.queryByText(/saved blocked review is outside the current project filter/i)).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('keeps an absent selected canonical reference and its ordinal through an existing retry reload', async () => {
    let failInitialRead!: (reason: Error) => void
    fetchMock.mockReturnValueOnce(new Promise((_resolve, reject) => { failInitialRead = reject }))
      .mockReturnValueOnce(resp({ projects: [{ name: 'board-2026-crm-777', repository: 'CleanExpo/Synthex' }] }))
      .mockReturnValueOnce(resp({ preview: { proposal: acceptedBundle().proposal, packetId: acceptedBundle().packetId, revision: 2, project: { name: 'board-2026-crm-777', repository: 'CleanExpo/Synthex' }, executionBlocked: true } }))
      .mockReturnValueOnce(resp({ opportunity: assigned('Saved before read completed', 'board-2026-crm-777', 'blocked_review', 'CleanExpo/Synthex') }))
      .mockReturnValueOnce(resp(windowResponse([assigned('Reloaded earlier sorting project', 'board-2026-crm-111')])))
    render(<OpportunitiesPageClient />)
    await saveImportedProposal()
    await screen.findByRole('option', { name: '[REDACTED] · Reference 1', exact: true })
    await chooseProject('[REDACTED] · Reference 1')
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'blocked_review')
    failInitialRead(new Error('Initial read failed after the authorised import'))
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    await screen.findByText('No matching opportunities in the loaded window')
    expect(screen.getByLabelText('Filter by project')).toHaveValue('project:board-2026-crm-777')
    expect(screen.getByLabelText('Filter by stage')).toHaveValue('blocked_review')
    expect(screen.getByRole('option', { name: '[REDACTED] · Reference 1', exact: true })).toHaveValue('project:board-2026-crm-777')
    await chooseProject('[REDACTED] · Reference 2')
    expect(within(screen.getByRole('article', { name: 'Reloaded earlier sorting project' })).getByText('Project planning reference: [REDACTED] · Reference 2')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it.each([null, '2026-07-04T00:00:00.000Z'])('offers honest filtered-empty guidance after an empty retry reload with cursor %s', async cursor => {
    let failInitialRead!: (reason: Error) => void
    fetchMock.mockReturnValueOnce(new Promise((_resolve, reject) => { failInitialRead = reject }))
      .mockReturnValueOnce(resp({ projects: [{ name: 'synthex', repository: 'CleanExpo/Synthex' }] }))
      .mockReturnValueOnce(resp({ preview: { proposal: acceptedBundle().proposal, packetId: acceptedBundle().packetId, revision: 2, project: { name: 'synthex', repository: 'CleanExpo/Synthex' }, executionBlocked: true } }))
      .mockReturnValueOnce(resp({ opportunity: assigned('Saved before empty reload', 'synthex', 'blocked_review', 'CleanExpo/Synthex') }))
      .mockReturnValueOnce(resp(windowResponse([], cursor)))
    render(<OpportunitiesPageClient />)
    await saveImportedProposal()
    await screen.findByRole('option', { name: 'synthex', exact: true })
    await chooseProject('synthex')
    failInitialRead(new Error('Initial read failed after the authorised import'))
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    await screen.findByText('No matching opportunities in the loaded window')
    expect(screen.getByLabelText('Filter by project')).toHaveValue('project:synthex')
    expect(screen.getByRole('option', { name: 'synthex', exact: true })).toHaveValue('project:synthex')
    expect(screen.queryByText('No opportunities yet')).not.toBeInTheDocument()
    if (cursor) expect(screen.getByRole('button', { name: 'Load older opportunities' })).toBeInTheDocument()
    else expect(screen.queryByRole('button', { name: 'Load older opportunities' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByLabelText('Filter by project')).toHaveValue('all')
    expect(screen.getByText('No opportunities yet')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
  it('offers the Synthex import and adds a saved blocked review without increasing forecast economics', async () => {
    fetchMock.mockReturnValueOnce(resp({ opportunities: [], summary: { total: 0, open: 0, won: 0, lost: 0, openValue: 0, weightedPipeline: 0 } }))
      .mockReturnValueOnce(resp({ projects: [{ name: 'synthex', repository: 'CleanExpo/Synthex' }] }))
      .mockReturnValueOnce(resp({ preview: { proposal: acceptedBundle().proposal, packetId: acceptedBundle().packetId, revision: 2, project: { name: 'synthex', repository: 'CleanExpo/Synthex' }, executionBlocked: true } }))
      .mockReturnValueOnce(resp({ opportunity: { id: 'imported-review', name: 'Operator captured proposal', stage: 'blocked_review', status: 'blocked_review', value_amount: null, probability: null } }))
    render(<OpportunitiesPageClient />)
    await screen.findByText('No opportunities yet')
    await userEvent.click(screen.getByRole('button', { name: 'Import Synthex proposal' }))
    await screen.findByRole('option', { name: /CleanExpo\/Synthex/ })
    await userEvent.selectOptions(screen.getByLabelText('Target repository'), 'CleanExpo/Synthex')
    await userEvent.click(screen.getByLabelText('Synthex export JSON'))
    await userEvent.paste(JSON.stringify(acceptedBundle()))
    await userEvent.click(screen.getByRole('button', { name: 'Preview import' }))
    await screen.findByRole('button', { name: 'Save blocked review' })
    await userEvent.click(screen.getByRole('button', { name: 'Save blocked review' }))
    expect(await screen.findByText('Blocked Review · blocked_review')).toBeInTheDocument()
    expect(screen.getByText('Showing 1 loaded opportunity')).toBeInTheDocument()
    expect(screen.getAllByText('$0')).toHaveLength(2)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the pipeline list + weighted-pipeline KPI from the API', async () => {
    fetchMock.mockReturnValue(resp({
      opportunities: [
        { id: 'o1', name: 'CARSI annual deal', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60, next_action: 'send quote' },
      ],
      summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
      sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
      readiness: {
        queueWindow: 'latest_500_created_at',
        pagination: 'cursor_by_created_at',
        latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
        nextCursor: null,
      },
    }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('CARSI annual deal')).toBeInTheDocument()
    expect(screen.getByText('$7,200')).toBeInTheDocument() // weighted pipeline KPI
    expect(screen.getByText('CRM source: crm_opportunities')).toBeInTheDocument()
    expect(screen.getByText('Forecast only · Billing truth stays in Stripe')).toBeInTheDocument()
    expect(screen.getByText('Queue window: latest 500 by created date · Cursor pagination available for older opportunities')).toBeInTheDocument()
    expect(screen.getByText('Latest opportunity update: 05/07/2026, 06:45 pm AEST')).toBeInTheDocument()
    expect(screen.getByText(/Proposal Sent · open/)).toBeInTheDocument() // the list row, not the filter <option>
    expect(fetchMock).toHaveBeenCalledWith('/api/founder/opportunities', {
      credentials: 'include',
      cache: 'no-store',
    })
  })

  it('redacts sensitive opportunity names and next actions before rendering pipeline rows', async () => {
    const email = ['lead', 'restoreassist.example'].join('@')
    const boardRef = ['BOARD', '2026', '06', '29', 'CRM', '777'].join('-')
    const apiKeyAssignment = ['CRM', 'API', 'KEY'].join('_') + '=' + ['sk', 'test', 'opportunity'].join('_')
    const bearer = ['Bearer ', 'eyJheader', '.', 'eyJpayload', '.', 'signature'].join('')
    const phone = ['+61', '400', '123', '456'].join(' ')
    const card = ['card ending', '4242'].join(' ')

    fetchMock.mockReturnValue(resp({
      opportunities: [
        {
          id: 'o-sensitive',
          name: `Approve ${email} against ${boardRef}`,
          stage: 'proposal_sent',
          status: 'open',
          value_amount: 12000,
          probability: 60,
          next_action: `Call ${phone}; ${apiKeyAssignment}; ${bearer}; ${card}`,
        },
      ],
      summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
      sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
    }))

    render(<OpportunitiesPageClient />)

    await screen.findByText(/Approve \[REDACTED\] against \[REDACTED\]/)
    const pageText = document.body.textContent ?? ''

    expect(pageText).not.toContain(email)
    expect(pageText).not.toContain(boardRef)
    expect(pageText).not.toContain(apiKeyAssignment)
    expect(pageText).not.toContain(bearer)
    expect(pageText).not.toContain(phone)
    expect(pageText).not.toContain(card)
    expect(pageText).toContain('[REDACTED]')
  })

  it('loads older opportunities when a next cursor is available', async () => {
    fetchMock
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'newer', name: 'Newer retained opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
          nextCursor: '2026-07-04T00:00:00.000Z',
        },
      }))
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'older', name: 'Older fetched opportunity', stage: 'discovery', status: 'open', value_amount: 4000, probability: 25 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 4000, weightedPipeline: 1000 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-04T07:00:00.000Z',
          nextCursor: null,
        },
      }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Newer retained opportunity')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /load older opportunities/i }))

    expect(await screen.findByText('Older fetched opportunity')).toBeInTheDocument()
    expect(screen.getByText('Newer retained opportunity')).toBeInTheDocument()
    expect(screen.getByText('Latest opportunity update: 05/07/2026, 06:45 pm AEST')).toBeInTheDocument()
    expect(screen.getByText('$8,200')).toBeInTheDocument()
    expect(screen.getByText('$16,000')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/founder/opportunities?before=2026-07-04T00%3A00%3A00.000Z', {
      credentials: 'include',
      cache: 'no-store',
    })
    expect(screen.queryByRole('button', { name: /load older opportunities/i })).not.toBeInTheDocument()
  })

  it('explains filtered counts against the currently loaded opportunity window', async () => {
    fetchMock.mockReturnValue(resp({
      opportunities: [
        { id: 'proposal', name: 'Proposal-stage opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        { id: 'discovery', name: 'Discovery-stage opportunity', stage: 'discovery', status: 'open', value_amount: 4000, probability: 25 },
      ],
      summary: { total: 2, open: 2, won: 0, lost: 0, openValue: 16000, weightedPipeline: 8200 },
      sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
      readiness: {
        queueWindow: 'latest_500_created_at',
        pagination: 'cursor_by_created_at',
        latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
        nextCursor: '2026-07-04T00:00:00.000Z',
      },
    }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Showing 2 loaded opportunities · older opportunities available')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'proposal_sent')

    expect(screen.getByText('Showing 1 of 2 loaded opportunities for Proposal Sent · older opportunities available')).toBeInTheDocument()
  })

  it('does not render duplicate opportunity rows when an older page overlaps the current window', async () => {
    fetchMock
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'overlap', name: 'Retained overlap opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
          nextCursor: '2026-07-04T00:00:00.000Z',
        },
      }))
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'overlap', name: 'Retained overlap opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
          { id: 'older', name: 'Older unique opportunity', stage: 'discovery', status: 'open', value_amount: 4000, probability: 25 },
        ],
        summary: { total: 2, open: 2, won: 0, lost: 0, openValue: 16000, weightedPipeline: 8200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-04T07:00:00.000Z',
          nextCursor: null,
        },
      }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Retained overlap opportunity')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /load older opportunities/i }))

    expect(await screen.findByText('Older unique opportunity')).toBeInTheDocument()
    expect(screen.getAllByText('Retained overlap opportunity')).toHaveLength(1)
    expect(screen.getByText('Showing 2 loaded opportunities')).toBeInTheDocument()
    expect(screen.getByText('$8,200')).toBeInTheDocument()
    expect(screen.getByText('$16,000')).toBeInTheDocument()
  })

  it('keeps the current opportunity window visible when loading older opportunities fails', async () => {
    fetchMock
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'newer', name: 'Newer retained opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
          nextCursor: '2026-07-04T00:00:00.000Z',
        },
      }))
      .mockReturnValueOnce(resp({ error: 'Failed to load older opportunities' }, false))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Newer retained opportunity')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /load older opportunities/i }))

    expect(await screen.findByText('Older opportunities failed to load. Current page is still visible.')).toBeInTheDocument()
    expect(screen.getByText('Newer retained opportunity')).toBeInTheDocument()
    expect(screen.queryByText(/opportunity pipeline failed to load/i)).not.toBeInTheDocument()
  })

  it('shows an honest empty state when there are no opportunities', async () => {
    fetchMock.mockReturnValue(resp({ opportunities: [], summary: { total: 0, open: 0, won: 0, lost: 0, openValue: 0, weightedPipeline: 0 } }))
    render(<OpportunitiesPageClient />)
    expect(await screen.findByText('No opportunities yet')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /new opportunity/i }).length).toBeGreaterThan(0)
  })

  it('creates an opportunity via POST and prepends it to the pipeline', async () => {
    fetchMock
      .mockReturnValueOnce(resp({
        opportunities: [],
        summary: { total: 0, open: 0, won: 0, lost: 0, openValue: 0, weightedPipeline: 0 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: null,
          nextCursor: null,
        },
      }))
      .mockReturnValueOnce(resp({
        opportunity: {
          id: 'o-created',
          name: 'RestoreAssist expansion',
          stage: 'qualified',
          status: 'open',
          value_amount: 25000,
          probability: 55,
          next_action: 'book discovery',
          updated_at: '2026-08-06T04:00:00.000Z',
          created_at: '2026-08-06T04:00:00.000Z',
        },
      }))

    render(<OpportunitiesPageClient />)
    expect(await screen.findByText('No opportunities yet')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: /new opportunity/i })[0])
    await userEvent.type(screen.getByLabelText(/^Name$/i), 'RestoreAssist expansion')
    await userEvent.selectOptions(screen.getByLabelText(/^Stage$/i), 'qualified')
    await userEvent.type(screen.getByLabelText(/Value \(AUD\)/i), '25000')
    await userEvent.type(screen.getByLabelText(/Probability \(%\)/i), '55')
    await userEvent.type(screen.getByLabelText(/Next action/i), 'book discovery')
    await userEvent.click(screen.getByRole('button', { name: /create opportunity/i }))

    expect(await screen.findByText('RestoreAssist expansion')).toBeInTheDocument()
    expect(screen.getByText('$13,750')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/founder/opportunities', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })

  it('shows an honest error state (never a fake-empty pipeline) when the fetch fails', async () => {
    fetchMock.mockReturnValue(resp({ error: 'Failed to load opportunities' }, false))
    render(<OpportunitiesPageClient />)
    await waitFor(() =>
      expect(screen.getByText(/opportunity pipeline failed to load/i)).toBeInTheDocument(),
    )
  })
})
