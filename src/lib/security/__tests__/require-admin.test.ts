import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../require-admin';

// Mock the supabase server client so we can drive the session-auth path
// without spinning up Supabase. The default mock returns "no user"; individual
// tests override it via `mockGetUser.mockResolvedValueOnce`.
const mockGetUser = vi.fn(async () => ({ data: { user: null }, error: null }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const SERVICE_KEY = 'svc_role_secret_value_with_enough_length_1234567890';

function mkReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://example.test/api/wiki', { headers });
}

describe('requireAdmin', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('admits an allow-listed admin email via Supabase session', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { email: 'contact@unite-group.in' } },
      error: null,
    });
    const result = await requireAdmin(mkReq());
    expect(result).toEqual({ ok: true, actorEmail: 'contact@unite-group.in' });
  });

  it('admits the service-role bearer (constant-time match)', async () => {
    const result = await requireAdmin(
      mkReq({ authorization: `Bearer ${SERVICE_KEY}` }),
    );
    expect(result).toEqual({ ok: true, actorEmail: 'service-role' });
    // Bearer path must short-circuit before touching the DB.
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns 401 when neither bearer nor session is present', async () => {
    const result = await requireAdmin(mkReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 403 when the session email is not allow-listed', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { email: 'random@example.com' } },
      error: null,
    });
    const result = await requireAdmin(mkReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 401 when the bearer is malformed (random string, no session)', async () => {
    // A garbage Authorization header — neither matches the service key nor
    // resolves a Supabase session. Must fall through to the 401 fail-closed.
    const result = await requireAdmin(
      mkReq({ authorization: 'Bearer not-the-real-key' }),
    );
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('fails closed (401) when SUPABASE_SERVICE_ROLE_KEY env is unset', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await requireAdmin(
      mkReq({ authorization: `Bearer ${SERVICE_KEY}` }),
    );
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('rejects a bearer of the right shape but wrong value', async () => {
    const tampered = SERVICE_KEY.slice(0, -1) + 'X';
    const result = await requireAdmin(
      mkReq({ authorization: `Bearer ${tampered}` }),
    );
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});
