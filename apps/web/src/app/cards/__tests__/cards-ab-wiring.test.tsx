// @vitest-environment jsdom
import { isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const seen: { control: unknown; treatment: unknown }[] = []
vi.mock('../cards-ab-gate', () => ({
  CardsAbGate: (props: { control: unknown; treatment?: unknown }) => {
    seen.push({ control: props.control, treatment: props.treatment })
    return props.control as never
  },
}))

import CardsShowroomPage from '../page'

afterEach(() => {
  vi.unstubAllEnvs()
  seen.length = 0
})

describe('/cards wiring of the experiment gate', () => {
  it('passes no treatment while the flag is off, so B is never even serialised', () => {
    vi.stubEnv('NEXT_PUBLIC_CARDS_AB_ENABLED', '')
    renderToStaticMarkup(<CardsShowroomPage />)
    expect(seen).toHaveLength(1)
    expect(seen[0].treatment).toBeUndefined()
  })

  it('passes the product-first treatment while the flag is on, and the showroom stays the control', () => {
    vi.stubEnv('NEXT_PUBLIC_CARDS_AB_ENABLED', '1')
    const html = renderToStaticMarkup(<CardsShowroomPage />)
    expect(seen).toHaveLength(1)
    expect(isValidElement(seen[0].treatment)).toBe(true)
    expect(html).toContain('id="editions"')
    expect(html).toContain('Nine editions')
  })
})
