// src/app/api/billing/webhook/__tests__/route.test.ts
// Tests for the raw-HMAC Stripe billing webhook — signature verification and
// honest not_connected sync when businesses subscription columns are absent.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

vi.hoisted(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

const SECRET = 'whsec_test';

import { POST } from '../route';

function signedHeader(body: string, ts = Math.floor(Date.now() / 1000)): string {
  const sig = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

function makeRequest(body: string, sigHeader?: string | null) {
  const headers = new Headers();
  if (sigHeader !== null) headers.set('stripe-signature', sigHeader ?? signedHeader(body));
  return new Request('http://localhost/api/billing/webhook', { method: 'POST', headers, body });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
});

describe('POST /api/billing/webhook', () => {
  it('returns 400 when the signature header is missing', async () => {
    const res = await POST(makeRequest('{}', null) as never);
    expect(res.status).toBe(400);
  });

  it('returns 401 when the signature does not verify', async () => {
    const res = await POST(makeRequest('{"id":"evt"}', 't=1,v1=deadbeef') as never);
    expect(res.status).toBe(401);
  });

  it('acknowledges a verified subscription event', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', current_period_end: 1700000000 } },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.event_id).toBe('evt_1');
  });

  it('reports not_connected when the businesses columns are missing (42703)', async () => {
    mockEq.mockResolvedValue({ error: { code: '42703', message: 'column missing' } });
    const body = JSON.stringify({
      id: 'evt_2',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_2', customer: 'cus_2', status: 'active' } },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sync).toBe('not_connected');
  });
});
