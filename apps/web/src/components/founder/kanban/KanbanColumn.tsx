'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'

interface Card {
  id: string
  title: string
  businessKey: string
  businessColor: string
}

interface KanbanColumnProps {
  id: string
  title: string
  cards: Card[]
  isDone?: boolean
  onCardClick?: (cardId: string) => void
  /** Generates CRM proposals for review; never queues or mutates a projection. */
  onPropose?: () => void
  applying?: boolean
}

export function KanbanColumn({ id, title, cards, isDone, onCardClick, onPropose, applying }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className="flex flex-col gap-2 min-w-[240px] rounded-sm p-3 transition-colors duration-150"
      style={{
        background: isOver ? 'var(--color-accent-dim)' : 'var(--surface-sidebar)',
        border: isOver ? '1px solid var(--color-accent-border)' : '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {onPropose && (
            <button
              type="button"
              onClick={onPropose}
              disabled={applying}
              title="Generate CRM proposals for founder review; does not queue or create Hermes/Linear work."
              className="text-[10px] font-semibold px-2 py-0.5 rounded-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-text)', border: '1px solid var(--color-accent-border)' }}
            >
              {applying ? 'Proposing…' : 'Propose'}
            </button>
          )}
          <span
            className="text-xs rounded-sm px-1.5 py-0.5"
            style={{ background: 'var(--surface-elevated)', color: 'var(--color-text-muted)' }}
          >
            {cards.length}
          </span>
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[120px]">
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              id={card.id}
              title={card.title}
              businessKey={card.businessKey}
              businessColor={card.businessColor}
              isDone={isDone}
              onClick={onCardClick}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
