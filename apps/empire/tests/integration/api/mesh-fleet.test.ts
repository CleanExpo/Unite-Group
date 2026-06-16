// /api/mesh/fleet is the poll proxy that lets the Mission Control browser
// read the Nexus Mesh fleet without ever holding PI_CEO_API_KEY. The route
// is intentionally narrow: it is admin-gated, passes readFleet's result
// through unchanged, and takes no client-influenced arguments. These tests
// pin that narrow contract with mocked checkAdminSession + mocked readFleet.

jest.mock('server-only', () => ({}), { virtual: true });

const mockCheckAdminSession = jest.fn();
const mockReadFleet = jest.fn();

jest.mock('@/lib/security/require-admin', () => ({
  checkAdminSession: () => mockCheckAdminSession(),
}));

jest.mock('@/lib/mesh/read-fleet', () => ({
  readFleet: () => mockReadFleet(),
}));

import { GET } from '@/app/api/mesh/fleet/route';

beforeEach(() => {
  mockCheckAdminSession.mockReset();
  mockReadFleet.mockReset();
});

describe('GET /api/mesh/fleet', () => {
  it('returns 401 with { error: "forbidden" } when checkAdminSession reports an anonymous caller (no Supabase session)', async () => {
    mockCheckAdminSession.mockResolvedValueOnce({ ok: false, reason: 'anonymous' });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'forbidden' });
    // The route must NOT call readFleet when the admin gate is closed.
    expect(mockReadFleet).not.toHaveBeenCalled();
  });

  it('returns 401 with { error: "forbidden" } when checkAdminSession reports a forbidden caller (logged in but not on the allow-list)', async () => {
    mockCheckAdminSession.mockResolvedValueOnce({
      ok: false,
      reason: 'forbidden',
      actorEmail: 'random@example.com',
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'forbidden' });
    expect(mockReadFleet).not.toHaveBeenCalled();
  });

  it('passes the readFleet result through unchanged when checkAdminSession returns an ok session', async () => {
    const fleet = {
      machines: [{ host: 'phill-mac', status: 'online' }],
      agents: [],
      ships: [],
      claims: [],
      fetchedAt: '2026-06-12T01:00:00.000Z',
      ok: true,
    };
    mockCheckAdminSession.mockResolvedValueOnce({ ok: true, actorEmail: 'contact@unite-group.in' });
    mockReadFleet.mockResolvedValueOnce(fleet);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fleet);
    expect(mockReadFleet).toHaveBeenCalledTimes(1);
  });

  it('forwards a degraded readFleet result (ok=false with error) to the browser unchanged so the dashboard can render a degraded card', async () => {
    const degraded = {
      machines: [],
      agents: [],
      ships: [],
      claims: [],
      fetchedAt: '2026-06-12T01:00:00.000Z',
      ok: false,
      error: 'pi-ceo 503',
    };
    mockCheckAdminSession.mockResolvedValueOnce({ ok: true, actorEmail: 'contact@unite-group.in' });
    mockReadFleet.mockResolvedValueOnce(degraded);

    const res = await GET();

    // The route does NOT auto-rewrite ok=false into an HTTP error — the
    // Mission Control wrapper renders the degraded card from the body.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(degraded);
  });
});
