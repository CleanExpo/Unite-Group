import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookkeeperWorkbench } from '../BookkeeperWorkbench'

const { replace, query } = vi.hoisted(() => ({ replace: vi.fn(), query: { value: '' } }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }), usePathname: () => '/founder/bookkeeper',
  useSearchParams: () => new URLSearchParams(query.value),
}))
vi.mock('../tabs/OverviewTab', () => ({ OverviewTab: () => <p>Overview data view</p> }))
vi.mock('../tabs/RunHistoryTab', () => ({ RunHistoryTab: () => <p>Run history data view</p> }))
vi.mock('../tabs/ReconciliationTab', () => ({ ReconciliationTab: () => <p>Reconciliation data view</p> }))
vi.mock('../tabs/ReceivablesTab', () => ({ ReceivablesTab: () => <p>Receivables data view</p> }))
vi.mock('../tabs/PayablesTab', () => ({ PayablesTab: () => <p>Payables data view</p> }))
vi.mock('../tabs/ExpensesTab', () => ({ ExpensesTab: () => <p>Expenses data view</p> }))
vi.mock('../tabs/BASTab', () => ({ BASTab: () => <p>BAS data view</p> }))
vi.mock('../tabs/PLTab', () => ({ PLTab: () => <p>P&L data view</p> }))
vi.mock('../tabs/AIAnalysisTab', () => ({ AIAnalysisTab: () => <p>AI analysis data view</p> }))

beforeEach(() => { replace.mockClear(); query.value = '' })
describe('bookkeeper route tabs', () => {
  it('keeps every finance subview linked through the existing tab query parameter', async () => {
    render(<BookkeeperWorkbench />)
    const tabs = { Overview: 'overview', 'Run History': 'runs', Reconciliation: 'reconciliation', Receivables: 'receivables', Payables: 'payables', Expenses: 'expenses', BAS: 'bas', 'P&L': 'pl', 'AI Analysis': 'ai-analysis' }
    for (const [name, key] of Object.entries(tabs)) {
      await userEvent.click(screen.getByRole('button', { name }))
      expect(replace).toHaveBeenLastCalledWith(`/founder/bookkeeper?tab=${key}`, { scroll: false })
    }
  })
  it('renders the requested existing subview and falls back safely for unknown tabs', () => {
    query.value = 'tab=bas'
    const { unmount } = render(<BookkeeperWorkbench />)
    expect(screen.getByText('BAS data view')).toBeInTheDocument()
    unmount()
    query.value = 'tab=unknown'
    render(<BookkeeperWorkbench />)
    expect(screen.getByText('Overview data view')).toBeInTheDocument()
  })
})
