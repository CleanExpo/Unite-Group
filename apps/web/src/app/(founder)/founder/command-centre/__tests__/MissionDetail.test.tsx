import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { DeliveryMissionView } from '@/lib/command-centre/delivery-types'
import { MissionDetail } from '../MissionDetail'

function questioning(questions: DeliveryMissionView['questions']): DeliveryMissionView {
  return {
    taskId: 'mission-1', title: 'Customer workspace', objective: 'A customer workspace', projectKey: 'Unite-Group',
    status: 'proposed', stage: 'needs_clarification', lane: 'software', summary: 'A customer workspace',
    specVersion: null, spec: null, questions, answers: { project: 'Unite-Group' }, harness: [],
    owner: { label: 'SPM', status: 'required' }, buildOwner: null,
    nextAction: { kind: 'answer', owner: 'You', label: 'Answer the business questions' },
    blockers: [], previewUrl: null, updatedAt: '2026-09-05T03:00:00Z', receipts: [], sourceRefs: [],
  }
}

describe('MissionDetail question identity', () => {
  it('preserves relevant unsaved answers and discards a changed question even when its ID is reused', () => {
    const onAction = vi.fn()
    const { rerender } = render(<MissionDetail mission={questioning([{ id: 'q1', label: 'Who will use this?' }, { id: 'q2', label: 'What deadline matters?' }])} busy={false} stale={false} onAction={onAction} />)
    fireEvent.change(screen.getByLabelText('Who will use this?'), { target: { value: 'Our customers' } })
    fireEvent.change(screen.getByLabelText('What deadline matters?'), { target: { value: 'Friday' } })
    rerender(<MissionDetail mission={questioning([{ id: 'q1', label: 'Who will use this?' }, { id: 'q2', label: 'What result should we measure?' }])} busy={false} stale={false} onAction={onAction} />)
    expect(screen.getByLabelText('Who will use this?')).toHaveValue('Our customers')
    expect(screen.getByLabelText('What result should we measure?')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('What result should we measure?'), { target: { value: 'Fewer status calls' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save answers and continue' }))
    expect(onAction).toHaveBeenCalledWith({ action: 'resume', taskId: 'mission-1', answers: { q1: 'Our customers', q2: 'Fewer status calls' } })
  })

  it.each([
    ['available', 'Relevant saved knowledge found'],
    ['partial', 'Some knowledge sources were unavailable'],
    ['empty', 'No relevant saved knowledge found'],
    ['unavailable', 'Saved knowledge search unavailable'],
  ] as const)('shows the actual %s knowledge coverage and observation time', (state, label) => {
    const mission = { ...questioning([]), knowledgeContext: { state, observedAt: '2026-09-05T03:00:00Z', coverage: 'Searched saved project notes only; conversation archives were not searched.' } }
    const { container } = render(<MissionDetail mission={mission} busy={false} stale={false} onAction={vi.fn()} />)
    fireEvent.click(screen.getByText('Sources and delivery evidence'))
    expect(screen.getByRole('region', { name: 'Knowledge search coverage' })).toHaveTextContent(label)
    expect(screen.getByText(mission.knowledgeContext.coverage)).toBeInTheDocument()
    expect(container.querySelector('time')).toHaveAttribute('datetime', mission.knowledgeContext.observedAt)
  })

  it('keeps older missions without a recorded knowledge search neutral', () => {
    render(<MissionDetail mission={questioning([])} busy={false} stale={false} onAction={vi.fn()} />)
    fireEvent.click(screen.getByText('Sources and delivery evidence'))
    expect(screen.queryByRole('region', { name: 'Knowledge search coverage' })).not.toBeInTheDocument()
    expect(screen.queryByText('Relevant saved knowledge found')).not.toBeInTheDocument()
  })
})
