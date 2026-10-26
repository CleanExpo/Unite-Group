import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/design-feedback/preferred', () => ({ loadPreferredEdition: vi.fn() }))
vi.mock('../order-view', () => ({ OrderView: (props: unknown) => ({ props }) }))

import { loadPreferredEdition } from '@/lib/design-feedback/preferred'
import CardOrderPage from '../page'

const render = async (params: Record<string, string>) =>
  ((await CardOrderPage({ searchParams: Promise.resolve(params) })) as unknown as { props: { edition: string | null } }).props

describe('/cards/order default film', () => {
  it('starts on the learned edition when there is no ?edition=', async () => {
    vi.mocked(loadPreferredEdition).mockResolvedValue('blueprint')
    expect((await render({})).edition).toBe('blueprint')
  })

  it('an explicit ?edition= always wins and skips the lesson read', async () => {
    vi.mocked(loadPreferredEdition).mockClear()
    vi.mocked(loadPreferredEdition).mockResolvedValue('blueprint')
    expect((await render({ edition: 'forge' })).edition).toBe('forge')
    expect(loadPreferredEdition).not.toHaveBeenCalled()
  })

  it('keeps today’s behaviour (nothing chosen) without a lesson', async () => {
    vi.mocked(loadPreferredEdition).mockResolvedValue(null)
    expect((await render({})).edition).toBeNull()
  })
})
