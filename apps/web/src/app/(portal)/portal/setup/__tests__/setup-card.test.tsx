import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../actions', () => ({ saveConnectionAction: vi.fn(), markAccessGrantedAction: vi.fn() }))

import { CHECKLIST, NO_PASSWORD_LINE } from '@/lib/portal/setup/items'

import { SetupCard } from '../setup-card'

const item = (kind: string) => {
  const found = CHECKLIST.find((i) => i.kind === kind)
  if (!found) throw new Error(`no checklist item ${kind}`)
  return found
}

afterEach(cleanup)

describe('a setup card', () => {
  it('links its how-to video on youtube-nocookie, in a new tab, never autoplaying, and embeds no player', () => {
    const { container } = render(<SetupCard item={item('gsc')} connection={null} />)
    const link = screen.getByRole('link', { name: /Watch how/ })
    expect(link.getAttribute('href')).toBe('https://www.youtube-nocookie.com/embed/AHnZPN60paA')
    expect(link.getAttribute('href')).not.toMatch(/autoplay/i)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('uses the three verified how-to videos and no others', () => {
    expect(CHECKLIST.filter((i) => i.video).map((i) => [i.kind, i.video?.id])).toEqual([
      ['gsc', 'AHnZPN60paA'], ['bing', '4v4I25z0HV0'], ['gbp', 'SqqqOF3AJo8'],
    ])
  })

  it('offers the "I have added you" button only after a link is saved, and only for GSC, Bing and GBP', () => {
    render(<SetupCard item={item('gbp')} connection={null} />)
    expect(screen.queryByRole('button', { name: 'I have added you as Manager' })).toBeNull()
    cleanup()
    render(<SetupCard item={item('gbp')} connection={{ kind: 'gbp', status: 'link_saved', value: 'https://maps.app.goo.gl/a', notes: null, updatedAt: null }} />)
    expect(screen.getByRole('button', { name: 'I have added you as Manager' })).toBeTruthy()
    cleanup()
    render(<SetupCard item={item('facebook')} connection={{ kind: 'facebook', status: 'link_saved', value: 'https://www.facebook.com/a', notes: null, updatedAt: null }} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Save'])
  })

  it('the GBP steps tell her to add us as Manager, so she stays the owner', () => {
    expect(item('gbp').steps.join(' ')).toMatch(/choose Manager, not Owner/)
    expect(NO_PASSWORD_LINE).toBe("You never give us your password. You click Allow on Google's or Microsoft's own screen.")
  })

  it('has no password field anywhere', () => {
    const { container } = render(<SetupCard item={item('bing')} connection={null} />)
    expect(container.querySelector('input[type="password"]')).toBeNull()
  })
})
