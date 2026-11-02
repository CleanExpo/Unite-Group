import { CHECKLIST } from './items'
import { ACCESS_KINDS, CONNECTION_STATUSES, type ConnectionKind, type ConnectionStatus } from './types'

// How far the owner is through the checklist. Pure, and presence-only: it reads each item's status, never a value.
// An item is done when the owner has finished her part:
//   GSC, Bing, GBP  -> she said she added our account (access_granted), or we verified it (verified);
//   socials         -> a link is saved (link_saved or later).
// A missing row, or a status we do not know, counts as not started. The next step is the first unfinished item in
// checklist order.

export type NextStep = { kind: ConnectionKind; action: 'save_link' | 'grant_access' }
export type Readiness = { percent: number; done: number; total: number; next: NextStep | null }

const RANK: Record<ConnectionStatus, number> = { not_started: 0, link_saved: 1, access_granted: 2, verified: 3 }

export function itemDone(kind: ConnectionKind, status: ConnectionStatus): boolean {
  return RANK[status] >= (ACCESS_KINDS.includes(kind) ? RANK.access_granted : RANK.link_saved)
}

export function computeReadiness(items: ReadonlyArray<{ kind: string; status: string }>): Readiness {
  const statusOf = new Map<string, ConnectionStatus>()
  for (const item of items) {
    if ((CONNECTION_STATUSES as readonly string[]).includes(item.status)) statusOf.set(item.kind, item.status as ConnectionStatus)
  }
  let done = 0
  let next: NextStep | null = null
  for (const { kind } of CHECKLIST) {
    const status = statusOf.get(kind) ?? 'not_started'
    if (itemDone(kind, status)) {
      done += 1
    } else if (!next) {
      next = { kind, action: status === 'not_started' ? 'save_link' : 'grant_access' }
    }
  }
  const total = CHECKLIST.length
  return { percent: Math.floor((done / total) * 100), done, total, next }
}
