import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch so the board resolves past the loading skeleton
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      columns: { today: [], hot: [], pipeline: [], someday: [], done: [] },
      stateMap: {},
    }),
  } as unknown as Response)
})

// Mock dnd-kit — JSDOM doesn't support pointer events or drag
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: () => null,
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}))

import { KanbanBoard } from '../KanbanBoard'

describe('KanbanBoard', () => {
  it('renders 5 column headers', async () => {
    render(<KanbanBoard />)
    await waitFor(() => expect(screen.getByText('TODAY')).toBeInTheDocument())
    expect(screen.getByText('HOT')).toBeInTheDocument()
    expect(screen.getByText('PIPELINE')).toBeInTheDocument()
    expect(screen.getByText('SOMEDAY')).toBeInTheDocument()
    expect(screen.getByText('DONE')).toBeInTheDocument()
  })

  it('proposes CRM tasks without refreshing or mutating the Linear projection', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          columns: { today: [], hot: [], pipeline: [], someday: [], done: [] },
          stateMap: {},
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          createdCount: 2,
          skippedExistingCount: 0,
          failedCount: 0,
          partial: false,
        }),
      } as unknown as Response)

    render(<KanbanBoard />)
    const proposeButtons = await screen.findAllByRole('button', { name: 'Propose' })
    fireEvent.click(proposeButtons[0])

    await screen.findByText(
      'Created 2 CRM proposals for review — nothing was queued or sent to Hermes or Linear.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]).toEqual([
      '/api/kanban/generate-next',
      expect.objectContaining({ method: 'POST' }),
    ])
  })
})
