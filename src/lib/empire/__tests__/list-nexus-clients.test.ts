import { makeMockSupabase, type ReaderMockState } from './_mock-supabase';

const mockState: { current: ReaderMockState } = { current: { rows: {} } };

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => makeMockSupabase(mockState.current),
}));

import { listNexusClients } from '../list-nexus-clients';

beforeEach(() => {
  mockState.current = { rows: {} };
});

describe('listNexusClients', () => {
  it('returns an empty list with no rows', async () => {
    const out = await listNexusClients();
    expect(out).not.toBeNull();
    expect(out?.clients).toEqual([]);
    expect(out?.fetchedAt).toMatch(/T.*Z$/);
  });

  it('normalises brand_config on every row', async () => {
    mockState.current = {
      rows: {
        nexus_clients: [
          {
            id: 'c1',
            slug: 'acme',
            company_name: 'Acme',
            status: 'active',
            contact_email: null,
            website_url: null,
            onboarded_at: null,
            created_at: '2026-05-18T00:00:00Z',
            brand_config: {
              primary_color: '#D62828',
              accent_color: '#E62128',
              // legacy keys preserved by normalizeBrandConfig (per UNI-1991)
              working_name: 'Acme Restoration',
              // junk key — stripped by normalize
              random_garbage: 'ignored',
            },
          },
        ],
      },
    };
    const out = await listNexusClients();
    expect(out?.clients).toHaveLength(1);
    expect(out?.clients[0].brand_config.primary_color).toBe('#D62828');
    expect(out?.clients[0].brand_config.working_name).toBe('Acme Restoration');
    expect(out?.clients[0].brand_config.random_garbage).toBeUndefined();
  });

  it('returns null on Supabase error', async () => {
    mockState.current = { rows: {}, errors: new Set(['nexus_clients']) };
    const out = await listNexusClients();
    expect(out).toBeNull();
  });
});
