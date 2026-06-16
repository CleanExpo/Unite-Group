// src/lib/branding/__tests__/getPortalContent.test.ts
// UNI-1947 Pillar 2: tests for the server-side portal_content fetcher.
// Mocks @/lib/supabase/admin so no real DB is hit.

import { getPortalContent, invalidatePortalContentCache } from '../getPortalContent';

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
  portal_content: {
    welcome_text: 'Welcome, Duncan',
    deliverables: [
      { category: 'Discovery', status: 'in-progress', detail: 'Scope lock' },
    ],
    touchpoints: [
      { name: 'Home Loan Essentials', domain: 'homeloanessentials.com.au', status: 'active' },
    ],
    quick_links: [],
    stray_key: 'should be stripped',
  },
};

beforeEach(() => {
  invalidatePortalContentCache();
  from.mockClear();
  select.mockClear();
  eq.mockClear();
  maybeSingle.mockReset();
});

describe('getPortalContent', () => {
  it('returns the row when slug exists, normalised', async () => {
    maybeSingle.mockResolvedValueOnce({ data: dimitriRow, error: null });

    const result = await getPortalContent('dimitri-itr');

    expect(result).not.toBeNull();
    expect(result!.slug).toBe('dimitri-itr');
    expect(result!.portal_content.welcome_text).toBe('Welcome, Duncan');
    expect(result!.portal_content.deliverables).toHaveLength(1);
    expect(result!.portal_content.touchpoints).toHaveLength(1);
    // Unknown top-level key was stripped by normalisePortalContent.
    expect('stray_key' in result!.portal_content).toBe(false);
  });

  it('returns null when slug does not exist', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await getPortalContent('does-not-exist');

    expect(result).toBeNull();
  });

  it('uses the cache on the second call within TTL', async () => {
    maybeSingle.mockResolvedValueOnce({ data: dimitriRow, error: null });

    await getPortalContent('dimitri-itr');
    await getPortalContent('dimitri-itr');

    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('caches negative results too', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const first = await getPortalContent('ghost');
    const second = await getPortalContent('ghost');

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('invalidatePortalContentCache(slug) forces a re-fetch for that slug only', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: dimitriRow, error: null })
      .mockResolvedValueOnce({ data: dimitriRow, error: null });

    await getPortalContent('dimitri-itr');
    invalidatePortalContentCache('dimitri-itr');
    await getPortalContent('dimitri-itr');

    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('invalidatePortalContentCache() with no args clears everything', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: dimitriRow, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: dimitriRow, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await getPortalContent('dimitri-itr');
    await getPortalContent('ghost');
    invalidatePortalContentCache();
    await getPortalContent('dimitri-itr');
    await getPortalContent('ghost');

    expect(maybeSingle).toHaveBeenCalledTimes(4);
  });

  it('dedupes concurrent in-flight requests for the same slug', async () => {
    let resolveFetch: (v: { data: typeof dimitriRow; error: null }) => void;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    maybeSingle.mockReturnValueOnce(pending);

    const calls = Promise.all([
      getPortalContent('dimitri-itr'),
      getPortalContent('dimitri-itr'),
      getPortalContent('dimitri-itr'),
      getPortalContent('dimitri-itr'),
      getPortalContent('dimitri-itr'),
    ]);

    resolveFetch!({ data: dimitriRow, error: null });
    const results = await calls;

    expect(maybeSingle).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r!.slug).toBe('dimitri-itr'));
  });
});
