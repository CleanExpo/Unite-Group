import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { GmailThread } from '@/lib/integrations/google'
import { ThreadList } from '../ThreadList'

function thread(id: string): GmailThread {
  return { id, subject: `Subject ${id}`, from: 'a@b.com', snippet: 's', date: '2026-07-16', unread: false, businessKey: 'k', email: 'me@biz.com' }
}

const base = {
  activeThreadId: null,
  triageMap: {},
  hasMore: false,
  loading: false,
  onCheck: vi.fn(),
  onThreadClick: vi.fn(),
  onLoadMore: vi.fn(),
}

describe('ThreadList — select all', () => {
  it('checks every loaded thread when none are selected', () => {
    const onToggleAll = vi.fn()
    render(
      <ThreadList
        {...base}
        threads={[thread('a'), thread('b'), thread('c')]}
        checkedIds={new Set()}
        onToggleAll={onToggleAll}
      />,
    )
    fireEvent.click(screen.getByLabelText('Select all threads'))
    expect(onToggleAll).toHaveBeenCalledWith(['a', 'b', 'c'], true)
  })

  it('unchecks all when every thread is already selected', () => {
    const onToggleAll = vi.fn()
    render(
      <ThreadList
        {...base}
        threads={[thread('a'), thread('b')]}
        checkedIds={new Set(['a', 'b'])}
        onToggleAll={onToggleAll}
      />,
    )
    const box = screen.getByLabelText('Select all threads')
    expect(box).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(box)
    expect(onToggleAll).toHaveBeenCalledWith(['a', 'b'], false)
  })
})
