// src/lib/branding/__tests__/getBrandConfig.test.ts
// UNI-1992: tests for the server-side brand_config fetcher.
// Mocks @/lib/supabase/admin so no real DB is hit.

import { getBrandConfig, invalidateBrandConfigCache } from '../getBrandConfig';

// Mock the admin client. The default mock returns a not-found result;
// individual tests override `maybeSingle` to shape the response.
const maybeSingle = jest.fn();
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from }),
}));

const dimitriRow = {
  id: 'uuid-dimitri',
  slug: 'dimitri-itr',
  company_name: 'Dimitri ITR',
  contact_name: 'Duncan Perkins',
  contact_email: 'duncan@example.com',
  brand_config: {
    working_name: 'Otto',
    candidates: ['Otto', 'Sorted'],
    primary_color: '#b30000',
    foobar: 'should be stripped',
  },
};

beforeEach(() => {
  // Clear cache + reset all mocks between tests so each starts cold.
  invalidateBrandConfigCache();
  from.mockClear();
  select.mockClear();
  eq.mockClear();
  maybeSingle.mockReset();
});

describe('getBrandConfig', () => {
  it('returns the row when slug exists, normalised', async () => {
    maybeSingle.mockResolvedValueOnce({ data: dimitriRow, error: null });

    const result = await getBrandConfig('dimitri-itr');

    expect(result).not.toBeNull();
    expect(result!.slug).toBe('dimitri-itr');
    expect(result!.company_name).toBe('Dimitri ITR');
    // Normalised: legacy keys preserved, typed key passed, unknown key stripped.
    expect(result!.brand_config.working_name).toBe('Otto');
    expect(result!.brand_config.primary_color).toBe('#b30000');
    expect('foobar' in result!.brand_config).toBe(false);
  });

  it('returns null when slug does not exist', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await getBrandConfig('does-not-exist');

    expect(result).toBeNull();
  });

  it('uses the cache on the second call within TTL', async () => {
    maybeSingle.mockResolvedValueOnce({ data: dimitriRow, error: null });

    await getBrandConfig('dimitri-itr');
    await getBrandConfig('dimitri-itr');

    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('caches negative results too', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const first = await getBrandConfig('ghost');
    const second = await getBrandConfig('ghost');

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('invalidateBrandConfigCache(slug) forces a re-fetch', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: dimitriRow, error: null })
      .mockResolvedValueOnce({ data: dimitriRow, error: null });

    await getBrandConfig('dimitri-itr');
    invalidateBrandConfigCache('dimitri-itr');
    await getBrandConfig('dimitri-itr');

    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('invalidateBrandConfigCache() with no args clears everything', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: dimitriRow, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: dimitriRow, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await getBrandConfig('dimitri-itr');
    await getBrandConfig('ghost');
    invalidateBrandConfigCache();
    await getBrandConfig('dimitri-itr');
    await getBrandConfig('ghost');

    expect(maybeSingle).toHaveBeenCalledTimes(4);
  });

  it('dedupes concurrent in-flight requests for the same slug', async () => {
    // Hold the promise open until we have all 5 callers waiting.
    let resolveFetch: (v: { data: typeof dimitriRow; error: null }) => void;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    maybeSingle.mockReturnValueOnce(pending);

    const calls = Promise.all([
      getBrandConfig('dimitri-itr'),
      getBrandConfig('dimitri-itr'),
      getBrandConfig('dimitri-itr'),
      getBrandConfig('dimitri-itr'),
      getBrandConfig('dimitri-itr'),
    ]);

    resolveFetch!({ data: dimitriRow, error: null });
    const results = await calls;

    expect(maybeSingle).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r!.slug).toBe('dimitri-itr'));
  });
});
