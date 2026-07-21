/**
 * Fractional-index ordering for the own Kanban board (WS2 P3). Moving a card to
 * any slot in a column computes ONE new `position` (the midpoint between its
 * neighbours) — O(1), no reindexing of the other cards. Pure + tested.
 *
 * Positions are doubles; after many midpoint splits neighbours can converge —
 * `needsRebalance` flags a column that should be re-spaced (a rare maintenance
 * op), so we surface it rather than let ordering silently degrade.
 */

import { COLUMNS, type TaskStatus } from '@/types/kanban';

const GAP = 1000;
const MIN_SPACING = 1e-4;

const STATUS_ORDER: TaskStatus[] = COLUMNS.map(c => c.id);

/** The status one step left/right of `status`, or null at the ends. */
export function adjacentStatus(
  status: TaskStatus,
  dir: 'prev' | 'next'
): TaskStatus | null {
  const i = STATUS_ORDER.indexOf(status);
  if (i < 0) return null;
  return STATUS_ORDER[dir === 'next' ? i + 1 : i - 1] ?? null;
}

/**
 * A new position that places a card at `index` (0..n) within a column whose
 * cards are already sorted by `orderedPositions` ascending.
 */
export function positionForIndex(
  orderedPositions: number[],
  index: number
): number {
  const n = orderedPositions.length;
  const at = Math.max(0, Math.min(index, n));
  if (n === 0) return GAP;
  if (at === 0) return orderedPositions[0] - GAP;
  if (at >= n) return orderedPositions[n - 1] + GAP;
  return (orderedPositions[at - 1] + orderedPositions[at]) / 2;
}

/** True if any two adjacent positions are too close and the column should be re-spaced. */
export function needsRebalance(orderedPositions: number[]): boolean {
  for (let i = 1; i < orderedPositions.length; i++) {
    if (orderedPositions[i] - orderedPositions[i - 1] < MIN_SPACING) return true;
  }
  return false;
}

/** Evenly re-space a column's cards, preserving their order. Returns id → new position. */
export function rebalance(
  cards: { id: string; position: number }[]
): Record<string, number> {
  const sorted = [...cards].sort((a, b) => a.position - b.position);
  const out: Record<string, number> = {};
  sorted.forEach((c, i) => {
    out[c.id] = (i + 1) * GAP;
  });
  return out;
}
