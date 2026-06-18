// src/app/api/webhooks/stripe/__tests__/route.test.ts
// Tests for the Stripe webhook receiver — signature verification, idempotency,
// and honest 503 when unconfigured.

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Env must be set before the SUT module loads. vi.hoisted runs before the
// hoisted ESM imports below, so the module-level `const stripe = ...` sees them.
vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
});

// ---------------------------------------------------------------------------
// Mocks — declared before SUT import
// ---------------------------------------------------------------------------

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

// Stripe mock — constructEvent is the signature gate. Defined via vi.hoisted so
// it exists before the SUT's module-level `new Stripe()` runs.
const { mockConstructEvent } = vi.hoisted(() => ({ mockConstructEvent: vi.fn() }));
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = { constructEvent: mockConstructEvent };
      constructor() {}
    },
  };
});

// receipt-handler is exercised separately; stub it here.
vi.mock('../receipt-handler', () => ({
  handleInvoicePaymentSucceeded: vi.fn().mockResolvedValue(false),
}));

import { POST } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(opts: { signature?: string | null; body?: string } = {}) {
  const headers = new Headers();
  if (opts.signature !== null) {
    headers.set('stripe-signature', opts.signature ?? 't=1,v1=abc');
  }
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body: opts.body ?? '{}',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: insert succeeds, update chain resolves.
  mockInsert.mockResolvedValue({ error: null });
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ insert: mockInsert, update: mockUpdate });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/stripe', () => {
  it('returns 400 when the stripe-signature header is missing', async () => {
    const res = await POST(makeRequest({ signature: null }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('missing signature');
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_signature');
  });

  it('persists the event and returns 200 on a verified, novel event', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'customer.created',
      api_version: '2026-05-27.dahlia',
      livemode: false,
      data: { object: {} },
    });
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('stripe_events');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_event_id: 'evt_1', type: 'customer.created' }),
    );
  });

  it('treats a duplicate (23505) as idempotent success', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_dup',
      type: 'customer.created',
      api_version: '2026-05-27.dahlia',
      livemode: false,
      data: { object: {} },
    });
    mockInsert.mockResolvedValue({ error: { code: '23505' } });
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.idempotent).toBe(true);
  });

  it('dispatches customer.subscription.updated and calls businesses update', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_sub',
      type: 'customer.subscription.updated',
      api_version: '2026-05-27.dahlia',
      livemode: false,
      data: { object: { id: 'sub_123', status: 'active', current_period_end: 1893456000 } },
    });
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('businesses');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'active' }),
    );
    expect(mockEq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_123');
  });

  it('handles subscription sync gracefully when businesses columns are missing (42703)', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_sub2',
      type: 'customer.subscription.created',
      api_version: '2026-05-27.dahlia',
      livemode: false,
      data: { object: { id: 'sub_456', status: 'trialing' } },
    });
    mockEq.mockResolvedValue({ error: { code: '42703', message: 'column does not exist' } });
    const res = await POST(makeRequest() as never);
    // Degrades honestly — still 200, not a 500
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
