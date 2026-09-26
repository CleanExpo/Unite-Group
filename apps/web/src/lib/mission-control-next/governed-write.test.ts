import { describe, it, expect, vi } from 'vitest';
import { performGovernedToggle, toggleTargetFor } from './governed-write';

const plainTask = (status: string) => ({ id: 't1', status, external_ref: null, metadata: {} });
const deliveryTask = (status: string) => ({
  id: 't2',
  status,
  external_ref: null,
  metadata: { delivery: { kind: 'software_delivery' } },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('toggleTargetFor', () => {
  it('toggles only between proposed and awaiting_approval', () => {
    expect(toggleTargetFor(plainTask('proposed'))).toBe('awaiting_approval');
    expect(toggleTargetFor(plainTask('awaiting_approval'))).toBe('proposed');
    for (const s of ['queued', 'running', 'blocked', 'done', 'failed']) {
      expect(toggleTargetFor(plainTask(s))).toBeNull();
    }
  });

  it('refuses delivery missions', () => {
    expect(toggleTargetFor(deliveryTask('proposed'))).toBeNull();
  });
});

describe('performGovernedToggle', () => {
  it('PATCHes the existing queue route, then confirms by read-back', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(200, { task: { id: 't1', status: 'awaiting_approval' } }))
      .mockResolvedValueOnce(json(200, { task: { id: 't1', status: 'awaiting_approval', updated_at: 'T' } }));

    const out = await performGovernedToggle(plainTask('proposed'), fetchImpl);

    expect(out).toEqual({ kind: 'confirmed', status: 'awaiting_approval', updatedAt: 'T' });
    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/command-centre/queue/t1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'awaiting_approval' }),
    }));
    expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/command-centre/queue/t1', expect.objectContaining({ cache: 'no-store' }));
  });

  it('reports a server refusal as rejected, never confirmed', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json(409, { error: 'Task changed' }));
    const out = await performGovernedToggle(plainTask('proposed'), fetchImpl);
    expect(out).toEqual({ kind: 'rejected', httpStatus: 409, message: 'Task changed' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports unconfirmed when the read-back disagrees', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, { task: { id: 't1', status: 'proposed' } }));
    const out = await performGovernedToggle(plainTask('proposed'), fetchImpl);
    expect(out.kind).toBe('unconfirmed');
  });

  it('reports unconfirmed when the read-back fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(500, { error: 'down' }));
    const out = await performGovernedToggle(plainTask('proposed'), fetchImpl);
    expect(out.kind).toBe('unconfirmed');
  });

  it('never calls the server for a task it may not toggle', async () => {
    const fetchImpl = vi.fn();
    const out = await performGovernedToggle(deliveryTask('proposed'), fetchImpl);
    expect(out.kind).toBe('rejected');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends one PATCH when the same task is toggled twice at once', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, { task: { id: 't1', status: 'awaiting_approval' } }));
    const [first, second] = await Promise.all([
      performGovernedToggle(plainTask('proposed'), fetchImpl),
      performGovernedToggle(plainTask('proposed'), fetchImpl),
    ]);
    expect(first.kind).toBe('confirmed');
    expect(second.kind).toBe('rejected');
    expect(fetchImpl.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1);
  });
});
