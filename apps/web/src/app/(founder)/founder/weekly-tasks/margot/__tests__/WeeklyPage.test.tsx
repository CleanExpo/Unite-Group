import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { getUser } from '@/lib/supabase/server'
import FounderLayout from '@/app/(founder)/layout'
import Page from '../page'
import Loading from '../loading'
import ErrorBoundary from '../error'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`Redirect:${path}`) } }))
vi.mock('@/components/layout/FounderShell', () => ({ FounderShell: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('@/app/(founder)/founder/command-centre/MissionControlShell', () => ({ MissionControlShell: ({ children }: { children: ReactNode }) => <>{children}</> }))

describe('weekly page inherits founder authentication', () => {
  it('redirects an unauthenticated request before returning the weekly page', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    await expect(FounderLayout({ children: <Page /> })).rejects.toThrow('Redirect:/auth/login')
  })
  it('keeps the production page unconfigured for an authenticated founder, without shipping the local pack', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'owner', user_metadata: {} } as Awaited<ReturnType<typeof getUser>>)
    render(await FounderLayout({ children: <Page /> }))
    expect(screen.getByText('Weekly packet not connected')).toBeVisible()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText('One clearer tomorrow')).not.toBeInTheDocument()
  })
  it('distinguishes loading from a failed page without asserting approval', () => {
    const { unmount } = render(<Loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading weekly review')
    unmount()
    render(<ErrorBoundary reset={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No decision has been recorded')
  })
})
