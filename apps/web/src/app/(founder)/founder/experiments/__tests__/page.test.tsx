import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../page';
const { getUser, from, order, variantsIn } = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), order: vi.fn(), variantsIn: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ getUser }));
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock('@/components/founder/experiments/ExperimentsPageClient', () => ({ ExperimentsPageClient: () => null }));
const experiment = { id: 'experiment-1', founder_id: 'founder-1', title: 'Existing experiment', status: 'draft' };
describe('experiment variant count reads', () => {
  beforeEach(() => {
    vi.clearAllMocks(); getUser.mockResolvedValue({ id: 'founder-1' });
    from.mockImplementation((table: string) => table === 'experiments' ? { select: () => ({ eq: () => ({ order }) }) } : { select: () => ({ in: variantsIn }) });
    order.mockResolvedValue({ data: [experiment], error: null });
  });
  it.each([null, [experiment]])('reports only safe primary-query diagnostics and rejects partial data (%j)', async data => {
    const privateError = {
      message: 'private-db-message', details: 'private-db-details',
      hint: 'private-db-hint', code: 'private-db-code',
    };
    order.mockResolvedValue({ data, error: privateError });
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const failure = await Page().catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe('Experiments could not be loaded. Please try again.');
      expect(logged).toHaveBeenCalledExactlyOnceWith('[API Error]', failure, {
        route: '/founder/experiments', operation: 'load_experiments',
      });
      const diagnostics = JSON.stringify([failure, logged.mock.calls], (_key, value) =>
        value instanceof Error ? Object.fromEntries(Object.getOwnPropertyNames(value).map(key => [key, Reflect.get(value, key)])) : value);
      for (const marker of Object.values(privateError)) expect(diagnostics).not.toContain(marker);
      expect(failure).not.toHaveProperty('cause');
      expect(variantsIn).not.toHaveBeenCalled();
      expect(from).toHaveBeenCalledExactlyOnceWith('experiments');
    } finally {
      logged.mockRestore();
    }
  });
  it('throws a safe error rather than returning zero counts on variant lookup failure', async () => {
    variantsIn.mockResolvedValue({ data: null, error: { message: 'private database detail' } });
    await expect(Page()).rejects.toThrow('Experiment variant counts could not be loaded. Please try again.');
  });
  it('preserves genuine zero counts on a successful empty variant result', async () => {
    variantsIn.mockResolvedValue({ data: [], error: null });
    const page = await Page();
    expect(page.props.experiments[0].variantCount).toBe(0);
    expect(variantsIn).toHaveBeenCalledWith('experiment_id', ['experiment-1']);
  });
  it('does not query variants for a genuinely empty founder experiment list', async () => {
    order.mockResolvedValue({ data: [], error: null });
    await Page(); expect(variantsIn).not.toHaveBeenCalled();
  });
});
