/**
 * Integration tests: /api/wiki
 *
 * Tests that the wiki route correctly queries Supabase and returns
 * the right data for slug lookups, searches, and full listings.
 */

import { NextRequest } from 'next/server';

// ── Supabase mock ──────────────────────────────────────────────────────────
const mockSingle  = jest.fn();
const mockIlike   = jest.fn();
const mockEq      = jest.fn();
const mockOrder   = jest.fn();
const mockSelect  = jest.fn();
const mockFrom    = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { GET } from '@/app/api/wiki/route';

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/wiki');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const MOCK_WIKI_PAGE = {
  id: 'exit-thesis',
  title: 'Exit Thesis — $2B by June 2028',
  content: 'The single non-negotiable filter for every strategic decision.',
  word_count: 842,
  tags: ['strategy', 'exits'],
  updated_at: '2026-05-10T08:00:00Z',
};

const MOCK_WIKI_LIST = [
  { id: 'exit-thesis',              title: 'Exit Thesis — $2B by June 2028',           word_count: 842, tags: ['strategy'], updated_at: '2026-05-10T08:00:00Z' },
  { id: 'pi-ceo-architecture',      title: 'Pi-CEO Architecture',                       word_count: 1204, tags: ['system'], updated_at: '2026-05-09T12:00:00Z' },
  { id: 'unite-group-nexus-architecture', title: 'Unite-Group Nexus — Product Architecture', word_count: 3100, tags: ['product'], updated_at: '2026-05-10T06:00:00Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL  = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  // Default chain: from().select().order() → list
  mockOrder.mockResolvedValue({ data: MOCK_WIKI_LIST, error: null });
  mockIlike.mockReturnValue({ data: [], error: null });  // search returns filtered
  mockEq.mockReturnValue({ single: mockSingle });
  mockSingle.mockResolvedValue({ data: MOCK_WIKI_PAGE, error: null });
  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, ilike: mockIlike });
  mockFrom.mockReturnValue({ select: mockSelect });
});

describe('/api/wiki GET', () => {

  test('returns list of pages when no params provided', async () => {
    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);
  });

  test('list items have the correct abbreviated shape (no content field)', async () => {
    const res = await GET(makeReq());
    const body = await res.json();

    const page = body[0];
    expect(page).toHaveProperty('id');
    expect(page).toHaveProperty('title');
    expect(page).toHaveProperty('word_count');
    expect(page).toHaveProperty('updated_at');
    // Full content not returned in list — would be too large
    expect(page).not.toHaveProperty('content');
  });

  test('returns single page when slug param is provided', async () => {
    const res = await GET(makeReq({ slug: 'exit-thesis' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe('exit-thesis');
    expect(body.title).toContain('Exit Thesis');
  });

  test('passes slug to Supabase .eq() filter', async () => {
    await GET(makeReq({ slug: 'exit-thesis' }));
    expect(mockEq).toHaveBeenCalledWith('id', 'exit-thesis');
  });

  test('returns empty object (not error) when slug not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await GET(makeReq({ slug: 'does-not-exist' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({});
  });

  test('passes search term to Supabase .ilike() filter', async () => {
    // Set up chain for search path
    mockIlike.mockResolvedValue({ data: MOCK_WIKI_LIST.slice(0, 1), error: null });
    mockOrder.mockReturnValue({ ilike: mockIlike });
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, ilike: mockIlike });

    await GET(makeReq({ search: 'exit' }));

    expect(mockIlike).toHaveBeenCalledWith('title', '%exit%');
  });

  test('returns empty array (not error) when Supabase list fails', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'timeout' } });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  test('updated_at is a valid ISO date string in list results', async () => {
    const res = await GET(makeReq());
    const body = await res.json();

    body.forEach((page: { updated_at: string }) => {
      const date = new Date(page.updated_at);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  test('returns nexus architecture page when queried by slug', async () => {
    const nexusPage = {
      id: 'unite-group-nexus-architecture',
      title: 'Unite-Group Nexus — Product Architecture',
      content: 'Engineering brief...',
      word_count: 3100,
      tags: ['product'],
      updated_at: '2026-05-10T06:00:00Z',
    };
    mockSingle.mockResolvedValueOnce({ data: nexusPage, error: null });

    const res = await GET(makeReq({ slug: 'unite-group-nexus-architecture' }));
    const body = await res.json();

    expect(body.id).toBe('unite-group-nexus-architecture');
    expect(body.word_count).toBe(3100);
  });

});
