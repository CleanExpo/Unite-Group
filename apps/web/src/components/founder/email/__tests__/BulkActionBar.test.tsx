import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionBar } from '../BulkActionBar'

describe('BulkActionBar — Mark Unread', () => {
  it('wires the Mark Unread button to onMarkUnread', () => {
    const onMarkUnread = vi.fn()
    render(
      <BulkActionBar
        selectedCount={3}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={onMarkUnread}
        onTriage={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Mark Unread'))
    expect(onMarkUnread).toHaveBeenCalledTimes(1)
  })

  it('renders both Mark Read and Mark Unread', () => {
    render(
      <BulkActionBar
        selectedCount={1}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onTriage={vi.fn()}
      />,
    )
    expect(screen.getByText('Mark Read')).toBeInTheDocument()
    expect(screen.getByText('Mark Unread')).toBeInTheDocument()
  })
})
