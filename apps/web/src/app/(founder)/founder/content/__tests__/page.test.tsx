import { render, screen } from '@testing-library/react'
import Page from '../page'
const { results } = vi.hoisted(() => ({ results: {} as Record<string, { data: unknown[]; error: { message: string } | null }> }))
function client() {
  return { from: (table: string) => {
    const query: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'is', 'order', 'limit']) query[method] = () => query
    query.then = (resolve: (value: unknown) => unknown) => resolve(results[table])
    return query
  } }
}
vi.mock('@/lib/supabase/server', () => ({ getUser: async () => ({ id: 'founder' }), createClient: async () => client() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => client() }))
vi.mock('@/lib/error-reporting', () => ({ sanitiseError: (_error: unknown, message: string) => message }))
beforeEach(() => {
  for (const table of ['wiki_pages', 'nexus_pages', 'businesses', 'margot_email_draft']) results[table] = { data: [], error: null }
})
async function show(source = 'all') { render(await Page({ searchParams: Promise.resolve({ source }) })) }
it('keeps good rows while exposing unavailable drafts and partial counts, ignoring data with error', async () => {
  results.wiki_pages.data = [{ id: 'wiki1', title: 'Known wiki', tags: [] }]
  results.nexus_pages.data = [{ id: 'page1', title: 'Known page', business_id: 'biz' }]
  results.businesses.data = [{ id: 'biz', slug: 'dr', name: 'Disaster Recovery' }]
  results.margot_email_draft = { data: [{ id: 'bad', subject: 'Untrusted partial draft', body: '', status: 'draft' }], error: { message: 'private' } }
  await show()
  expect(screen.getByText('Known wiki')).toBeVisible()
  expect(screen.getByRole('link', { name: /Known page/ })).toHaveAttribute('href', '/founder/dr/page/page1')
  expect(screen.getByRole('alert')).toHaveTextContent('Margot drafts could not be loaded')
  expect(screen.getByRole('link', { name: 'Drafts (unavailable)' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'All (2 available)' })).toBeVisible()
  expect(screen.queryByText('Untrusted partial draft')).not.toBeInTheDocument()
})
it('uses neutral draft-only failure wording', async () => {
  results.margot_email_draft.error = { message: 'private' }
  await show('drafts')
  expect(screen.getByRole('alert')).toHaveTextContent('Margot drafts could not be loaded')
  expect(screen.queryByText(/store not migrated/)).not.toBeInTheDocument()
  expect(screen.queryByText('No Margot drafts yet.')).not.toBeInTheDocument()
})
it('preserves successful empty drafts as zero', async () => {
  await show('drafts')
  expect(screen.getByRole('link', { name: 'Drafts (0)' })).toBeVisible()
  expect(screen.getByText('No Margot drafts yet.')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('fails safely when business labels cannot be read', async () => {
  results.businesses.error = { message: 'private database detail' }
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('Failed to load businesses')
})
it('preserves a successful nonzero draft and complete count', async () => {
  results.margot_email_draft.data = [{ id: 'draft1', subject: 'Real draft', body: 'Known body', status: 'draft' }]
  await show()
  expect(screen.getByText('Real draft')).toBeVisible()
  expect(screen.getByRole('link', { name: 'All (1)' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Drafts (1)' })).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('keeps a wiki-only filter usable without a draft alert', async () => {
  results.wiki_pages.data = [{ id: 'wiki1', title: 'Known wiki', tags: [] }]
  results.margot_email_draft.error = { message: 'private' }
  await show('wiki')
  expect(screen.getByText('Known wiki')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Drafts (unavailable)' })).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
