/**
 * Idempotency for the AIW drip queue.
 *
 * `pg_net` is fire-and-forget, and client re-renders / double submits can double-fire,
 * so each (lead, step) enrolment is keyed uniquely and the `aiw_drip_queue` table
 * enforces `unique(lead_id, drip_step)` with `on conflict do nothing`. This helper
 * builds the canonical key so app-side dedup matches the DB constraint exactly.
 */
export function dripQueueKey(leadId: string, dripStep: number): string {
  if (!leadId) throw new Error('leadId required');
  if (!Number.isInteger(dripStep) || dripStep < 0) {
    throw new Error('dripStep must be a non-negative integer');
  }
  return `${leadId}:${dripStep}`;
}
