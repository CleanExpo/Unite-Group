// src/lib/founder-chat/__tests__/mission-receipt.test.ts
import { describe, expect, it } from 'vitest'
import {
  isMissionReceipt,
  RECEIPT_COPY,
  readbackReceipt,
  readbackStatus,
  receiptCopy,
  receiptFrom,
} from '../mission-receipt'

const row = {
  id: 'task-1',
  external_ref: 'delivery:chat:7b0c2f1e-3a4d-4c5e-8f60-1a2b3c4d5e6f',
  status: 'proposed' as const,
  title: 'Build a dashboard',
  project_key: 'Synthex',
  human_approval_required: true,
}

describe('mission receipt', () => {
  it('maps the full status enum and anything unmapped to unknown', () => {
    for (const status of ['proposed', 'queued', 'running', 'blocked', 'awaiting_approval', 'done', 'failed']) {
      expect(readbackStatus(status)).toBe(status)
    }
    expect(readbackStatus('draft')).toBe('unknown')
    expect(readbackStatus(null)).toBe('unknown')
    expect(readbackStatus({ status: 'proposed' })).toBe('unknown')
  })

  it('says recorded only when the created event result came back', () => {
    expect(receiptFrom(row, { event: null, created: false }).kind).toBe('recorded')
    expect(receiptFrom(row, null).kind).toBe('recorded_unaudited')
  })

  it('builds the readback receipt from the row it is given', () => {
    expect(readbackReceipt({ ...row, status: 'awaiting_approval' })).toEqual({
      kind: 'mission',
      taskId: 'task-1',
      externalRef: row.external_ref,
      status: 'awaiting_approval',
      title: 'Build a dashboard',
      projectKey: 'Synthex',
      humanApprovalRequired: true,
    })
  })

  it('carries the agreed founder copy in Australian English', () => {
    expect(receiptCopy({ kind: 'needs_project' })).toBe('Which project is this for?')
    expect(RECEIPT_COPY.recorded).toBe('Draft recorded. Needs preparation before approval. No worker assigned.')
    expect(RECEIPT_COPY.unsupported_action).toBe('That needs the approval gate. Nothing was recorded or started.')
    expect(RECEIPT_COPY.not_confirmed).toBe('Could not confirm. Check Missions.')
  })

  it('accepts only known receipt kinds with the fields they need', () => {
    expect(isMissionReceipt({ kind: 'needs_project' })).toBe(true)
    expect(isMissionReceipt(readbackReceipt(row))).toBe(true)
    expect(isMissionReceipt({ kind: 'recorded' })).toBe(false)
    expect(isMissionReceipt({ kind: 'running' })).toBe(false)
    expect(isMissionReceipt('recorded')).toBe(false)
    expect(isMissionReceipt(null)).toBe(false)
  })
})
