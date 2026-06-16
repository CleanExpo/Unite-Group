const mockEmbeddingCreate = jest.fn();
const mockRpc = jest.fn();
const mockCreateClient = jest.fn(() => ({
  rpc: mockRpc,
}));

jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    embeddings: {
      create: mockEmbeddingCreate,
    },
  }))
);

import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';
import { createClient } from '@supabase/supabase-js';

const mockedRequireAdmin = requireAdmin as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;

function req(body: unknown): NextRequest {
  return new Request('https://unite-group.in/api/search/nexus', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/search/nexus', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockEmbeddingCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    mockRpc.mockResolvedValue({ data: [], error: null });
    process.env = { ...oldEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'service-role' });
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('does not instantiate Supabase at import/build time when Supabase env is absent', async () => {
    const { POST } = await import('@/app/api/search/nexus/route');

    expect(mockedCreateClient).not.toHaveBeenCalled();

    const res = await POST(req({ query: 'portfolio health' }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe('Semantic search is not configured (OPENAI_API_KEY missing)');
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it('returns missing Supabase config before calling OpenAI embeddings', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const { POST } = await import('@/app/api/search/nexus/route');

    const res = await POST(req({ query: 'portfolio health' }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe('Semantic search is not configured (Supabase env missing)');
    expect(mockEmbeddingCreate).not.toHaveBeenCalled();
  });

  it('creates the request-time service-role Supabase client with non-persistent auth before RPC use', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    const { POST } = await import('@/app/api/search/nexus/route');

    expect(mockedCreateClient).not.toHaveBeenCalled();

    const res = await POST(req({ query: 'portfolio health', limit: 3, min_similarity: 0.82 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      query: 'portfolio health',
      count: 0,
      results: [],
    });
    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    expect(mockedCreateClient).toHaveBeenCalledWith(
      'https://supabase.example.test',
      'test-service-role-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    expect(mockedCreateClient.mock.invocationCallOrder[0]).toBeLessThan(
      mockRpc.mock.invocationCallOrder[0]
    );
    expect(mockRpc).toHaveBeenCalledWith('semantic_search_chunks', {
      query_embedding: [0.1, 0.2, 0.3],
      match_threshold: 0.82,
      match_count: 3,
    });
  });
});
