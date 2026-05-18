// Pins the contract: invalidateBrandConfigCache(slug) and
// invalidatePortalContentCache(slug) clear the per-slug entry so the
// next call to the getter re-fetches from Supabase. Without this, the
// PATCH route would leave the in-memory cache serving stale data for up
// to 5 minutes after every client edit.

import {
  getBrandConfig,
  invalidateBrandConfigCache,
} from '../getBrandConfig';
import {
  getPortalContent,
  invalidatePortalContentCache,
} from '../getPortalContent';

const supabaseRows: {
  nexus_clients: Array<Record<string, unknown>>;
} = { nexus_clients: [] };

const queryCount = { current: 0 };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    slug: 'test-client',
    company_name: 'Test Client',
    contact_name: null,
    contact_email: null,
    brand_config: { primary_color: '#D62828' },
    portal_content: { welcome_text: 'Hello' },
    ...overrides,
  };
}

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => {
            queryCount.current += 1;
            return Promise.resolve({
              data: supabaseRows.nexus_clients[0] ?? null,
              error: null,
            });
          },
        }),
      }),
    }),
  }),
}));

beforeEach(() => {
  supabaseRows.nexus_clients = [row()];
  queryCount.current = 0;
  invalidateBrandConfigCache();
  invalidatePortalContentCache();
});

describe('cache invalidation — brand_config', () => {
  it('serves from cache on the second call without invalidation', async () => {
    await getBrandConfig('test-client');
    await getBrandConfig('test-client');
    expect(queryCount.current).toBe(1);
  });

  it('re-fetches after invalidateBrandConfigCache(slug)', async () => {
    await getBrandConfig('test-client');
    invalidateBrandConfigCache('test-client');
    await getBrandConfig('test-client');
    expect(queryCount.current).toBe(2);
  });

  it('global invalidate (no arg) clears every entry', async () => {
    await getBrandConfig('test-client');
    invalidateBrandConfigCache();
    await getBrandConfig('test-client');
    expect(queryCount.current).toBe(2);
  });
});

describe('cache invalidation — portal_content', () => {
  it('serves from cache on the second call without invalidation', async () => {
    await getPortalContent('test-client');
    await getPortalContent('test-client');
    expect(queryCount.current).toBe(1);
  });

  it('re-fetches after invalidatePortalContentCache(slug)', async () => {
    await getPortalContent('test-client');
    invalidatePortalContentCache('test-client');
    await getPortalContent('test-client');
    expect(queryCount.current).toBe(2);
  });
});
