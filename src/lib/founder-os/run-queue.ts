import type {
  FounderContextPack,
  FounderRunQueueAction,
  FounderRunQueueItem,
  FounderRunQueueReceipt,
  FounderRunQueueStatus,
  FounderRunQueueSummary,
  FounderTaskPacket,
  MachineAssignment,
} from './types'

export interface EnqueueRunQueueInput {
  taskPacket: FounderTaskPacket
  contextPack: FounderContextPack
  machineAssignment: MachineAssignment
  now?: string
}

export interface TransitionRunQueueInput {
  id: string
  action: FounderRunQueueAction
  actor: string
  note?: string
  evidenceLink?: string
  now?: string
}

export interface RunQueueStore {
  enqueue(input: EnqueueRunQueueInput): FounderRunQueueItem
  transition(input: TransitionRunQueueInput): FounderRunQueueItem
  get(id: string): FounderRunQueueItem | null
  list(): FounderRunQueueItem[]
  summary(): FounderRunQueueSummary
  clear(): void
}

export function createRunQueueStore(initialItems: FounderRunQueueItem[] = []): RunQueueStore {
  const itemsById = new Map<string, FounderRunQueueItem>()

  for (const item of initialItems) {
    itemsById.set(item.id, item)
  }

  return {
    enqueue(input) {
      const now = input.now ?? new Date().toISOString()
      const id = buildRunQueueId(input.taskPacket.id)
      const existing = itemsById.get(id)
      const item: FounderRunQueueItem = {
        id,
        status: statusFor(input.taskPacket, input.machineAssignment),
        taskPacket: input.taskPacket,
        contextPack: input.contextPack,
        machineAssignment: input.machineAssignment,
        approvals: existing?.approvals ?? [],
        blockers: existing?.blockers ?? [],
        receipts: existing?.receipts ?? [],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }

      itemsById.set(id, item)
      return item
    },
    transition(input) {
      const existing = itemsById.get(input.id)
      if (!existing) throw new Error('queue item not found')

      const now = input.now ?? new Date().toISOString()
      const receipt = buildReceipt(input, now)
      const item = applyTransition(existing, input, receipt, now)
      itemsById.set(item.id, item)
      return item
    },
    get(id) {
      return itemsById.get(id) ?? null
    },
    list() {
      return Array.from(itemsById.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    summary() {
      return summarizeRunQueue(Array.from(itemsById.values()))
    },
    clear() {
      itemsById.clear()
    },
  }
}

export function summarizeRunQueue(items: FounderRunQueueItem[]): FounderRunQueueSummary {
  return {
    total: items.length,
    queued: countStatus(items, 'queued'),
    waitingForApproval: countStatus(items, 'waiting_for_approval'),
    waitingForDevice: countStatus(items, 'waiting_for_device'),
    inProgress: countStatus(items, 'in_progress'),
    blocked: countStatus(items, 'blocked'),
    completed: countStatus(items, 'completed'),
  }
}

export const founderRunQueueStore = createRunQueueStore()

function applyTransition(
  item: FounderRunQueueItem,
  input: TransitionRunQueueInput,
  receipt: FounderRunQueueReceipt,
  now: string,
): FounderRunQueueItem {
  switch (input.action) {
    case 'approve':
      return {
        ...item,
        status: item.machineAssignment.status === 'waiting_for_device' ? 'waiting_for_device' : 'queued',
        approvals: [...item.approvals, { actor: input.actor, note: input.note, at: now }],
        receipts: [...item.receipts, receipt],
        updatedAt: now,
      }
    case 'start':
      return {
        ...item,
        status: 'in_progress',
        receipts: [...item.receipts, receipt],
        updatedAt: now,
      }
    case 'block':
      return {
        ...item,
        status: 'blocked',
        blockers: input.note ? [...item.blockers, input.note] : item.blockers,
        receipts: [...item.receipts, receipt],
        updatedAt: now,
      }
    case 'complete':
      if (!input.evidenceLink?.trim()) throw new Error('completion requires evidenceLink')
      return {
        ...item,
        status: 'completed',
        contextPack: {
          ...item.contextPack,
          evidenceLinks: [...item.contextPack.evidenceLinks, input.evidenceLink],
          receiptIds: [...item.contextPack.receiptIds, receipt.id],
          updatedAt: now,
        },
        receipts: [...item.receipts, receipt],
        updatedAt: now,
      }
  }
}

function buildReceipt(input: TransitionRunQueueInput, now: string): FounderRunQueueReceipt {
  if (input.action === 'complete' && !input.evidenceLink?.trim()) throw new Error('completion requires evidenceLink')

  return {
    id: `receipt_${input.id}_${input.action}_${simpleHash(`${input.actor}:${input.note ?? ''}:${input.evidenceLink ?? ''}:${now}`)}`,
    type: receiptTypeFor(input.action),
    actor: input.actor,
    note: input.note,
    evidenceLink: input.evidenceLink,
    at: now,
  }
}

function receiptTypeFor(action: FounderRunQueueAction): FounderRunQueueReceipt['type'] {
  switch (action) {
    case 'approve':
      return 'approval'
    case 'start':
      return 'start'
    case 'block':
      return 'blocker'
    case 'complete':
      return 'completion'
  }
}

function statusFor(taskPacket: FounderTaskPacket, machineAssignment: MachineAssignment): FounderRunQueueStatus {
  if (taskPacket.requiresHumanApproval || taskPacket.riskLevel === 'human_only') return 'waiting_for_approval'
  if (machineAssignment.status === 'waiting_for_device') return 'waiting_for_device'
  if (machineAssignment.status === 'requires_human_only') return 'waiting_for_approval'
  return 'queued'
}

function countStatus(items: FounderRunQueueItem[], status: FounderRunQueueStatus): number {
  return items.filter((item) => item.status === status).length
}

function buildRunQueueId(taskId: string): string {
  return `run_${taskId}`
}

function simpleHash(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
