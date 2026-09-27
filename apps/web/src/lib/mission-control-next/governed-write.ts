/**
 * The one governed write in Mission Control vNext (UNI-2776).
 *
 * Toggles a non-delivery task between `proposed` and `awaiting_approval` — the only
 * founder transition pair that is fully reversible — through the EXISTING
 * PATCH /api/command-centre/queue/[id] route, which enforces ownership, the
 * transition matrix and a status-guarded update. Success is only ever reported
 * after a GET read-back shows the new status.
 */
import { isDeliveryMission } from '@/lib/command-centre/delivery-types';
import type { CommandCentreTask } from '@/lib/command-centre/tasks';

export type ToggleTarget = 'proposed' | 'awaiting_approval';

export type ToggleableTask = Pick<CommandCentreTask, 'id' | 'external_ref' | 'metadata'> & { status: string };

export type WriteOutcome =
  | { kind: 'confirmed'; status: ToggleTarget; updatedAt: string | null }
  | { kind: 'rejected'; httpStatus: number | null; message: string }
  | { kind: 'unconfirmed'; reason: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Tasks with a toggle in flight. The PATCH route has no idempotency key, so a double
 * tap would write a second audit event; one toggle per task at a time prevents it.
 */
const inFlight = new Set<string>();

export function toggleTargetFor(task: ToggleableTask): ToggleTarget | null {
  if (isDeliveryMission(task)) return null;
  if (task.status === 'proposed') return 'awaiting_approval';
  if (task.status === 'awaiting_approval') return 'proposed';
  return null;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await res.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function performGovernedToggle(
  task: ToggleableTask,
  fetchImpl: FetchLike = fetch,
): Promise<WriteOutcome> {
  const target = toggleTargetFor(task);
  if (!target) {
    return { kind: 'rejected', httpStatus: null, message: 'This task cannot be toggled from here' };
  }
  if (inFlight.has(task.id)) {
    return { kind: 'rejected', httpStatus: null, message: 'A change to this task is already in progress' };
  }
  inFlight.add(task.id);
  try {
    return await toggleAndReadBack(task.id, target, fetchImpl);
  } finally {
    inFlight.delete(task.id);
  }
}

async function toggleAndReadBack(id: string, target: ToggleTarget, fetchImpl: FetchLike): Promise<WriteOutcome> {
  const url = `/api/command-centre/queue/${encodeURIComponent(id)}`;

  let write: Response;
  try {
    write = await fetchImpl(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: target }),
    });
  } catch {
    return { kind: 'unconfirmed', reason: 'The request did not complete; reload to see the current status' };
  }
  if (!write.ok) {
    const body = await readJson(write);
    return {
      kind: 'rejected',
      httpStatus: write.status,
      message: typeof body.error === 'string' ? body.error : `Server refused (HTTP ${write.status})`,
    };
  }

  try {
    const readBack = await fetchImpl(url, { cache: 'no-store' });
    if (!readBack.ok) {
      return { kind: 'unconfirmed', reason: `Read-back failed (HTTP ${readBack.status})` };
    }
    const saved = (await readJson(readBack)).task as Record<string, unknown> | undefined;
    if (saved?.status !== target) {
      return { kind: 'unconfirmed', reason: `Read-back shows "${String(saved?.status)}", expected "${target}"` };
    }
    return { kind: 'confirmed', status: target, updatedAt: typeof saved.updated_at === 'string' ? saved.updated_at : null };
  } catch {
    return { kind: 'unconfirmed', reason: 'Read-back did not complete' };
  }
}
