import type {
  FounderContextPack,
  FounderRunQueueItem,
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

export interface RunQueueStore {
  enqueue(input: EnqueueRunQueueInput): FounderRunQueueItem
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
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }

      itemsById.set(id, item)
      return item
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
