const mockEmbeddingCreate = jest.fn();

jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
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

const mockedRequireAdmin = requireAdmin as jest.Mock;

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

    const res = await POST(req({ query: 'portfolio health' }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe('Semantic search is not configured (OPENAI_API_KEY missing)');
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
});
