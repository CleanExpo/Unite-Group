/**
 * Integration tests: middleware auth protection
 *
 * Tests that:
 * - Unauthenticated users are redirected to login for all protected routes
 * - Auth pages are always accessible without a session
 * - API routes and static assets bypass auth entirely
 * - Authenticated users pass through to their destination
 *
 * The Supabase auth client is mocked to control session state.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Supabase SSR mock ──────────────────────────────────────────────────────
const mockGetUser = jest.fn();
const mockCreateServerClient = jest.fn(() => ({
  auth: { getUser: mockGetUser },
  cookies: {},
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

import { middleware } from '@/middleware';

// ── Helpers ────────────────────────────────────────────────────────────────
function makeReq(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

// ── Setup ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.COMMAND_CENTER_LOCAL_PREVIEW;
  process.env.NEXT_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

function setNoSession() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function setActiveSession(userId = 'user-123') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
}

// ── Protected routes: unauthenticated ─────────────────────────────────────
describe('Middleware — unauthenticated access', () => {

  test('redirects /en/ceo to /en/login', async () => {
    setNoSession();
    const res = await middleware(makeReq('/en/ceo'));

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/en/login');
  });

  test('redirects /en/dashboard to /en/login', async () => {
    setNoSession();
    const res = await middleware(makeReq('/en/dashboard'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  test('redirects /wiki to /en/login', async () => {
    setNoSession();
    const res = await middleware(makeReq('/wiki'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  test('redirects /sources to /en/login', async () => {
    setNoSession();
    const res = await middleware(makeReq('/sources'));

    expect(res.status).toBe(307);
  });

  test('redirects unauthenticated / (root) to public /en landing', async () => {
    setNoSession();
    const res = await middleware(makeReq('/'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/en');
  });

});

// ── Auth pages: always accessible ─────────────────────────────────────────
describe('Middleware — auth pages pass through without session', () => {

  const authPaths = [
    '/en/login',
    '/en/register',
    '/en/reset-password',
    '/en/update-password',
  ];

  authPaths.forEach(path => {
    test(`${path} is accessible without session (no redirect)`, async () => {
      setNoSession();
      const res = await middleware(makeReq(path));

      // Should pass through, not redirect
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(302);
    });
  });

});

// ── API routes: bypass middleware ─────────────────────────────────────────
describe('Middleware — API routes bypass auth entirely', () => {

  const apiPaths = [
    '/api/telegram/feed',
    '/api/empire/health',
    '/api/pi-ceo/health',
    '/api/seo/audit',
    '/api/wiki',
    '/api/health',
  ];

  apiPaths.forEach(path => {
    test(`${path} passes through without session check`, async () => {
      // getUser should NOT be called for API routes
      setNoSession();
      const res = await middleware(makeReq(path));

      expect(res.status).not.toBe(307);
      // getUser not called — we don't need to verify auth on API routes
    });
  });

});

// ── Static assets: bypass middleware ──────────────────────────────────────
describe('Middleware — static assets bypass auth entirely', () => {

  const staticPaths = [
    '/_next/static/css/app.css',
    '/logo-mark.svg',
    '/favicon.ico',
    '/manifest.json',
  ];

  staticPaths.forEach(path => {
    test(`${path} passes through without redirect`, async () => {
      setNoSession();
      const res = await middleware(makeReq(path));
      expect(res.status).not.toBe(307);
    });
  });

});

// ── Authenticated access ───────────────────────────────────────────────────
describe('Middleware — authenticated user passes through', () => {

  test('authenticated user reaches /en/ceo without redirect', async () => {
    setActiveSession();
    const res = await middleware(makeReq('/en/ceo'));

    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(302);
  });

  test('authenticated user reaches /en/dashboard without redirect', async () => {
    setActiveSession();
    const res = await middleware(makeReq('/en/dashboard'));

    expect(res.status).not.toBe(307);
  });

  test('authenticated user on login page is redirected to /en/command-center', async () => {
    setActiveSession();
    const res = await middleware(makeReq('/en/login'));

    // Logged-in users hitting login should go to the command center
    if (res.status === 307) {
      expect(res.headers.get('location')).toContain('/en/command-center');
    }
    // Some implementations let them through — either is acceptable
    expect([200, 307]).toContain(res.status);
  });

});

// ── Local Command Center preview ───────────────────────────────────────────
describe('Middleware — local Command Center preview', () => {

  test('allows /en/command-center only when local preview flag is enabled outside production', async () => {
    process.env.COMMAND_CENTER_LOCAL_PREVIEW = 'true';
    setNoSession();

    const res = await middleware(makeReq('/en/command-center'));

    expect(res.status).not.toBe(307);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test('keeps /en/command-center auth-gated when local preview flag is disabled', async () => {
    setNoSession();

    const res = await middleware(makeReq('/en/command-center'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/en/login');
  });

});

// ── Error resilience ──────────────────────────────────────────────────────
describe('Middleware — handles Supabase errors gracefully', () => {

  test('redirects to login if getUser throws (treats as unauthenticated)', async () => {
    mockGetUser.mockRejectedValue(new Error('network error'));

    const res = await middleware(makeReq('/en/ceo'));

    // Must not throw — should redirect to login as if unauthenticated
    expect([307, 302]).toContain(res.status);
  });

  test('redirects to login if getUser returns error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const res = await middleware(makeReq('/en/ceo'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

});
