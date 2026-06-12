// src/app/api/billing/cancel/__tests__/route.test.ts
// Tests the cancel route auth gate and honest not_connected degradation when
// the profiles table is absent.

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
});

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  getUser: () => mockGetUser(),
}));

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

vi.mock('stripe', () => ({
  default: class MockStripe {
    subscriptions = { update: vi.fn() };
    constructor() {}
  },
}));

import { POST } from '../route';

function makeRequest(body: unknown = {}) {
  return new Request('http://localhost/api/billing/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect, update: vi.fn().mockReturnValue({ eq: vi.fn() }) });
});

describe('POST /api/billing/cancel', () => {
  it('returns 401 when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it('returns 503 not_connected when the profiles table is absent', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    mockSingle.mockResolvedValue({ data: null, error: { code: '42P01' } });
    const res = await POST(makeRequest({ reason: 'too_expensive' }) as never);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('not_connected');
  });
});
