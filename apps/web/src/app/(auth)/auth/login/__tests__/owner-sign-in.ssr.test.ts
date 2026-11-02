import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: vi.fn() }))

import { renderedFindings } from '@/__tests__/portal-forbidden-words'

import LoginPage from '../page'

// The server-rendered first paint (node, no window, effects never run) cannot know the return path. An owner on
// the way to /portal sees that paint before the page hydrates, so it must not show the founder's email fallback.
// (Codex review, 02/11/2026: the first paint showed "Use email instead" to owners until the effect ran.)
describe('sign-in first paint, before the browser has read the address', () => {
  it('shows Google only: no founder fallback, no password field, no owner link form yet', () => {
    expect(typeof window).toBe('undefined')
    const html = renderToStaticMarkup(createElement(LoginPage))
    expect(html).toContain('Continue with Google')
    expect(html).not.toContain('Use email instead')
    expect(html).not.toContain('type="password"')
    expect(html).not.toContain('Email me a sign-in link')
    expect(renderedFindings(html)).toEqual([])
  })
})
