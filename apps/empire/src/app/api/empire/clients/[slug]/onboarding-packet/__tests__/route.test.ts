// GET /api/empire/clients/[slug]/onboarding-packet — UNI-2148 route tests.

import { NextResponse } from 'next/server';

// requireAdmin calls createClient() → cookies(), which throws outside a Next.js
// request scope. Mock it so each test controls the gate result.
jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

const supabaseMaybeSingle = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: supabaseMaybeSingle,
        }),
      }),
    }),
  }),
}));

import { GET } from '../route';
import { requireAdmin } from '@/lib/security/require-admin';

const mockedRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  supabaseMaybeSingle.mockReset();
  mockedRequireAdmin.mockReset();
  mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'test@unite-group.in' });
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.LINEAR_API_KEY;
});

describe('GET /api/empire/clients/[slug]/onboarding-packet', () => {
  it('returns 401 NextResponse when the admin gate fails', async () => {
    mockedRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    );
    const res = await GET(new Request('http://x') as never, makeParams('restore-co'));
    expect(res.status).toBe(401);
  });

  it('returns 404 client_not_found when the slug has no row', async () => {
    supabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET(new Request('http://x') as never, makeParams('ghost'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('client_not_found');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 200 with the signals-driven packet and a blocked telegram task', async () => {
    supabaseMaybeSingle.mockResolvedValue({
      data: {
        id: 'client-1',
        slug: 'restore-co',
        company_name: 'Restore Co',
        status: 'onboarding',
        linear_project_id: null,
        brand_config: {},
        portal_content: {},
      },
      error: null,
    });

    const res = await GET(new Request('http://x') as never, makeParams('restore-co'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.packet.tasks.map((t: { id: string }) => t.id)).toEqual([
      'crm-record',
      'telegram-destination',
      'linear-work-queue',
      'source-adapters',
      'provider-readiness',
      'first-work-plan',
      'approval-status',
    ]);
    const telegram = body.packet.tasks.find(
      (t: { id: string }) => t.id === 'telegram-destination',
    );
    expect(telegram.status).toBe('blocked');
    expect(telegram.nextAction).toBe(
      'Set TELEGRAM_BOT_TOKEN and link a chat destination for restore-co.',
    );

    // No secret leaks into the response body.
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('sk-');
    expect(raw).not.toContain('Bearer ');
    expect(raw).not.toContain('postgres://');
  });

  it('returns 500 when the lookup errors', async () => {
    supabaseMaybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await GET(new Request('http://x') as never, makeParams('restore-co'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('client_lookup_failed');
  });
});
