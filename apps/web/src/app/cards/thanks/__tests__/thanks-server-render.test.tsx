import { Children, createElement, isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Live /cards/thanks returned 500 for every buyer (25/10/2026): the Server Component page called a function
// exported from a 'use client' module, and Next throws "Attempted to call X() from the server but X is on the
// client". This test renders the page the way the server does: every export of intake-form.tsx (the page's one
// client module) becomes a client reference that throws when CALLED from server code but is fine as an element
// type. Any route to it counts, because the stub sits on the module itself: a direct import, a re-export barrel
// (`export { x } from './intake-form'`), `export *`, an alias or a dynamic call all hit the same throwing stub.
const clientRefs = vi.hoisted(() => new Map<string, unknown>())

vi.mock('../intake-form', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>()
  const stubbed: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(actual)) {
    if (typeof value !== 'function') {
      stubbed[name] = value
      continue
    }
    const stub = new Proxy(function clientReference() {}, {
      apply() {
        throw new Error(
          `Attempted to call ${name}() from the server but ${name} is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.`,
        )
      },
    })
    clientRefs.set(name, stub)
    stubbed[name] = stub
  }
  return stubbed
})

import ThanksPage from '../page'

/** What the browser side does with a client reference: swap the stub for the real component, then render to HTML. */
async function renderLikeNext(searchParams: Record<string, string | string[] | undefined>): Promise<string> {
  const actual = await vi.importActual<Record<string, unknown>>('../intake-form')
  const real = new Map<unknown, unknown>([...clientRefs].map(([name, stub]) => [stub, actual[name]]))
  const tree = await ThanksPage({ searchParams: Promise.resolve(searchParams) })
  const swap = (node: ReactNode): ReactNode => {
    if (!isValidElement(node)) return node
    const props = node.props as { children?: ReactNode }
    const kids = Children.toArray(props.children).map(swap)
    const type = (real.get(node.type) ?? node.type) as Parameters<typeof createElement>[0]
    return createElement(type, { ...props, key: node.key }, ...kids)
  }
  return renderToStaticMarkup(swap(tree) as never)
}

describe('/cards/thanks server render', () => {
  it('renders the intake form for a buyer who arrives with a Stripe session id', async () => {
    const html = await renderLikeNext({ session_id: 'cs_test_a1B2' })
    expect(html).toContain('Thank you')
    expect(html).toContain('Order reference: cs_test_a1B2')
    expect(html).toContain('<form')
  })

  it('renders the fallback message, not an error, when the session id is missing', async () => {
    const html = await renderLikeNext({})
    expect(html).toContain('this page did not get your order reference')
    expect(html).not.toContain('<form')
  })

  it('shows nothing from a forged session id', async () => {
    const html = await renderLikeNext({ session_id: '<script>alert(1)</script>' })
    expect(html).not.toContain('alert(1)')
    expect(html).toContain('this page did not get your order reference')
  })
})
