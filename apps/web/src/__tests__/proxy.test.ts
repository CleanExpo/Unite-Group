import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => null),
}));

vi.mock('@/lib/auth/private-access', () => ({
  hasPrivateAccess: vi.fn(() => true),
  isPrivateAccessConfigured: vi.fn(() => false),
}));

import { updateSession } from '@/lib/supabase/middleware';
import { proxy } from '../proxy';

const mockedUpdateSession = vi.mocked(updateSession);

describe('proxy auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: null,
      supabase: {} as Awaited<ReturnType<typeof updateSession>>['supabase'],
    });
  });

  it('returns a 401 JSON response for unauthenticated API requests instead of redirecting to login', async () => {
    const request = new NextRequest('http://localhost/api/strategy/analyze', { method: 'POST' });

    const response = await proxy(request);

    expect(response.status).toBe(401);
    expect(response.headers.get('location')).toBeNull();
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorised' });
  });
});
