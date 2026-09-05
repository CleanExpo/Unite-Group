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

function readyMission(blockers: DeliveryMissionView['blockers'] = []): DeliveryMissionView {
  return {
    ...questioning([]),
    stage: 'ready_for_review',
    specVersion: 'a'.repeat(64),
    spec: { title: 'Customer workspace', summary: 'A customer workspace', requirements: ['Show job progress'], acceptanceCriteria: ['Customers can see their own jobs'], steps: ['Build', 'Verify'], presetIds: [] },
    nextAction: { kind: 'approve', owner: 'You', label: blockers.some(blocker => blocker.code === 'board_concern') ? 'Review Board concerns before deciding on a branch build' : 'Approve this specification for a branch build' },
    blockers,
  }
}

describe('MissionDetail Board concerns and consent', () => {
  it.each(['HOLD', 'REJECTED'])('shows the actual %s rationale before branch consent without inventing an override action', verdict => {
    const onAction = vi.fn()
    const message = `Board ${verdict}: Confirm who owns customer data before building.`
    const mission = readyMission([{ code: 'board_concern', message }, { code: 'delivery_spm_unassigned', message: 'SPM assignment still required.' }])
    render(<MissionDetail mission={mission} busy={false} stale={false} onAction={onAction} />)
    const concerns = screen.getByRole('region', { name: 'Board concerns' })
    const consent = screen.getByRole('button', { name: 'Approve this build' })
    expect(concerns).toBeVisible()
    expect(concerns).toHaveTextContent(message)
    expect(screen.getAllByText(message)).toHaveLength(1)
    expect(concerns.compareDocumentPosition(consent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(concerns).toHaveTextContent('Branch build consent does not resolve these Board concerns.')
    expect(screen.getByRole('status')).toHaveTextContent('Review Board concerns before deciding on a branch build')
    expect(screen.getByRole('region', { name: 'Delivery blockers' })).toHaveTextContent('SPM assignment still required.')
    expect(screen.queryByRole('button', { name: /override|re-review|revise/i })).not.toBeInTheDocument()
    expect(onAction).not.toHaveBeenCalled()
    fireEvent.click(consent)
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ action: 'approve', taskId: mission.taskId, specVersion: mission.specVersion })
  })

  it.each([{ busy: true, stale: false }, { busy: false, stale: true }])('keeps consent disabled while busy=$busy and stale=$stale despite visible concerns', state => {
    const onAction = vi.fn()
    render(<MissionDetail mission={readyMission([{ code: 'board_concern', message: 'Board HOLD: Confirm data ownership.' }])} {...state} onAction={onAction} />)
    expect(screen.getByRole('region', { name: 'Board concerns' })).toBeVisible()
    const consent = screen.getByRole('button', { name: state.busy ? 'Recording your decision…' : 'Approve this build' })
    expect(consent).toBeDisabled()
    fireEvent.click(consent)
    expect(onAction).not.toHaveBeenCalled()
  })

  it('keeps ordinary ready consent and unrelated blockers unchanged when there are no Board concerns', () => {
    const onAction = vi.fn()
    const mission = readyMission([{ code: 'delivery_spm_unassigned', message: 'SPM assignment still required.' }])
    render(<MissionDetail mission={mission} busy={false} stale={false} onAction={onAction} />)
    expect(screen.queryByRole('region', { name: 'Board concerns' })).not.toBeInTheDocument()
    expect(screen.queryByText('Branch build consent does not resolve these Board concerns.')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Approve this specification for a branch build')
    expect(screen.getByRole('region', { name: 'Delivery blockers' })).toHaveTextContent('SPM assignment still required.')
    fireEvent.click(screen.getByRole('button', { name: 'Approve this build' }))
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ action: 'approve', taskId: mission.taskId, specVersion: mission.specVersion })
  })
})

describe('MissionDetail question identity', () => {
  it('can resume the same failed mission after an operator repairs its AI connection', () => {
    const onAction = vi.fn()
    const mission: DeliveryMissionView = { ...questioning([]), stage: 'failed', nextAction: { kind: 'connect', owner: 'Delivery operator', label: 'Repair the AI connection' }, blockers: [{ code: 'preparation_provider_authentication', message: 'Connection needs attention' }] }
    const { rerender } = render(<MissionDetail mission={mission} busy={false} stale={false} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue after connection repair' }))
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ action: 'resume', taskId: 'mission-1' })
    rerender(<MissionDetail mission={mission} busy={false} stale={true} onAction={onAction} />)
    expect(screen.getByRole('button', { name: 'Continue after connection repair' })).toBeDisabled()
    rerender(<MissionDetail mission={{ ...mission, blockers: [{ code: 'delivery_spm_unassigned', message: 'SPM required' }] }} busy={false} stale={false} onAction={onAction} />)
    expect(screen.queryByRole('button', { name: 'Continue after connection repair' })).not.toBeInTheDocument()
  })
  it('shows the actual next-step owner and updates it when responsibility changes', () => {
    const mission = questioning([])
    const { rerender } = render(<MissionDetail mission={mission} busy={false} stale={false} onAction={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Next step')
    expect(screen.getByRole('status')).toHaveTextContent('Responsible: You')
    rerender(<MissionDetail mission={{ ...mission, nextAction: { kind: 'wait', owner: 'Margot', label: 'Preparing the brief' } }} busy={false} stale={false} onAction={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Responsible: Margot')
    expect(screen.getByRole('status')).not.toHaveTextContent('Responsible: You')
    expect(screen.getByText('SPM assignment pending')).toBeInTheDocument()
  })

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
