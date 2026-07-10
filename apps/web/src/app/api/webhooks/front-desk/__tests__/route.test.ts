import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

vi.mock('@/lib/supabase/service', () => ({
  hasSupabaseServiceConfig: vi.fn(() => true),
  createServiceClient: vi.fn(),
}));

import { hasSupabaseServiceConfig, createServiceClient } from '@/lib/supabase/service';
import { POST } from '../route';

const SECRET = 'witness-secret-at-least-16-chars';

function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('base64url');
}

function req(body: string, signature?: string | null): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signature) headers['x-nexus-signature'] = signature;
  return new NextRequest('http://localhost/api/webhooks/front-desk', { method: 'POST', headers, body });
}

function mockSupabase(result: { data?: unknown; error?: unknown }) {
  const captured: { insert?: any } = {};
  const chain: any = {
    insert: vi.fn((payload: unknown) => {
      captured.insert = payload;
      return chain;
    }),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  (createServiceClient as any).mockReturnValue({ from: vi.fn(() => chain) });
  return captured;
}

const EVENT = {
  type: 'lead.captured',
  brand: 'carsi',
  reference: 'REF001',
  occurredAt: '2026-07-10T00:00:00.000Z',
  data: { email: 'dana@example.com' },
};

describe('POST /api/webhooks/front-desk (witness receiver)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasSupabaseServiceConfig as any).mockReturnValue(true);
    process.env.WITNESS_SECRET = SECRET;
  });

  it('is dark without a secret (404)', async () => {
    delete process.env.WITNESS_SECRET;
    const body = JSON.stringify(EVENT);
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(404);
  });

  it('rejects a bad / missing signature (401)', async () => {
    const body = JSON.stringify(EVENT);
    expect((await POST(req(body, 'wrong-sig'))).status).toBe(401);
    expect((await POST(req(body, null))).status).toBe(401);
  });

  it('rejects a tampered body (401)', async () => {
    const sig = sign(JSON.stringify(EVENT));
    const tampered = JSON.stringify({ ...EVENT, reference: 'HACKED' });
    expect((await POST(req(tampered, sig))).status).toBe(401);
  });

  it('rejects an unsupported event type (422)', async () => {
    const body = JSON.stringify({ ...EVENT, type: 'something.else' });
    expect((await POST(req(body, sign(body)))).status).toBe(422);
  });

  it('rejects an event missing required fields (422)', async () => {
    const body = JSON.stringify({ type: 'lead.captured', brand: '', reference: '', occurredAt: '' });
    expect((await POST(req(body, sign(body)))).status).toBe(422);
  });

  it('degrades honestly to 501 not_connected when Supabase is unconfigured', async () => {
    (hasSupabaseServiceConfig as any).mockReturnValue(false);
    const body = JSON.stringify(EVENT);
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ received: true, persisted: false, reason: 'not_connected' });
  });

  it('degrades to 501 not_connected when agent_actions is not migrated (drift)', async () => {
    mockSupabase({ data: null, error: { code: '42P01', message: 'relation "agent_actions" does not exist' } });
    const body = JSON.stringify(EVENT);
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(501);
    expect((await res.json()).reason).toBe('not_connected');
  });

  it('persists a verified lead.captured and strips PII from the stored payload', async () => {
    const captured = mockSupabase({ data: { id: 'aa-123' }, error: null });
    const body = JSON.stringify(EVENT);
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, persisted: true, id: 'aa-123' });

    // The email must NOT reach agent_actions — the CRM builder sanitizes it out.
    expect(captured.insert.action_type).toBe('crm_timeline_lead_captured');
    expect(JSON.stringify(captured.insert)).not.toContain('dana@example.com');
    expect(captured.insert.payload.metadata).toHaveProperty('reference', 'REF001');
  });
});
