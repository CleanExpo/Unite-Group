import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InboxView, formatBrisbane } from '../InboxView'
import type { InboxItem, InboxResult } from '@/lib/crm/inbox'

const item = (over: Partial<InboxItem>): InboxItem => ({
  id: 'website_lead:1', source: 'website_lead', receivedAt: '2026-10-20T00:00:00Z', name: 'Ann Lee',
  email: 'ann@example.com', origin: 'dr', preview: 'Need a quote', contactId: null, ...over,
})
const result = (over: Partial<InboxResult> = {}): InboxResult => ({
  items: [], failedSources: [], contactLinksFailed: false, truncated: [], ...over,
})

describe('InboxView', () => {
  it('shows the empty state only when every read succeeded and nothing exists', () => {
    render(<InboxView result={result()} source={null} />)
    expect(screen.getByText('No enquiries yet')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('names the failed source in an error banner and never shows the empty state', () => {
    render(<InboxView result={result({ failedSources: ['card_enquiry'] })} source={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Card enquiry')
    expect(screen.queryByText('No enquiries yet')).toBeNull()
  })

  it('keeps the banner and the surviving items when only some sources fail', () => {
    render(<InboxView result={result({ items: [item({})], failedSources: ['card_feedback'] })} source={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Card feedback')
    expect(screen.getByText('Need a quote')).toBeInTheDocument()
  })

  it('renders badge, Brisbane time, preview and a contact link', () => {
    render(<InboxView result={result({ items: [item({ contactId: 'c-1' })] })} source={null} />)
    expect(screen.getAllByText('Website lead').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Ann Lee' })).toHaveAttribute('href', '/founder/contacts/c-1')
    expect(screen.getByText(/10:00 am AEST/i)).toBeInTheDocument()
  })

  it('applies the source filter and says so when the filtered list is empty', () => {
    render(<InboxView result={result({ items: [item({})] })} source="card_feedback" />)
    expect(screen.queryByText('Need a quote')).toBeNull()
    expect(screen.getByText(/No enquiries from this source/)).toBeInTheDocument()
  })

  it('formats times in Australia/Brisbane and tolerates bad input', () => {
    expect(formatBrisbane('2026-10-24T15:30:00Z')).toBe('25/10/2026, 1:30 am AEST')
    expect(formatBrisbane('nope')).toBe('Unknown time')
  })
})
