// src/app/api/webhooks/github/__tests__/route.test.ts
// Tests for the GitHub PR-merge webhook — HMAC verification, event filtering,
// and honest degradation when video_production_queue is absent.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

vi.hoisted(() => {
  process.env.GITHUB_WEBHOOK_SECRET = 'gh_test_secret';
});

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

const WEBHOOK_SECRET = 'gh_test_secret';

import { POST } from '../route';

function sign(body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body, 'utf8').digest('hex');
}

function makeRequest(body: string, opts: { event?: string; sign?: boolean } = {}) {
  const headers = new Headers();
  headers.set('x-github-event', opts.event ?? 'pull_request');
  headers.set('x-github-delivery', 'delivery-1');
  headers.set('x-hub-signature-256', opts.sign === false ? 'sha256=wrong' : sign(body));
  return new Request('http://localhost/api/webhooks/github', { method: 'POST', headers, body });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSingle.mockResolvedValue({ data: { id: 'q1', client_slug: 'ccw', composition_type: 'weekly-proof' }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });
});

describe('POST /api/webhooks/github', () => {
  it('rejects an invalid signature with 401', async () => {
    const body = JSON.stringify({ action: 'closed' });
    const res = await POST(makeRequest(body, { sign: false }) as never);
    expect(res.status).toBe(401);
  });

  it('skips non-pull_request events', async () => {
    const body = JSON.stringify({});
    const res = await POST(makeRequest(body, { event: 'push' }) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe('not-pr-event');
  });

  it('skips a merged PR without the client-visible label', async () => {
    const body = JSON.stringify({
      action: 'closed',
      pull_request: { merged: true, labels: [{ name: 'chore' }], number: 1, title: 't', html_url: 'u' },
      repository: { full_name: 'cleanexpo/ccw-crm' },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe('no-client-visible-label');
  });

  it('skips a repo not in the routing table', async () => {
    const body = JSON.stringify({
      action: 'closed',
      pull_request: { merged: true, labels: [{ name: 'client-visible' }], number: 1, title: 't', html_url: 'u', body: '' },
      repository: { full_name: 'someone/unknown' },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toContain('repo-not-in-routing');
  });

  it('degrades to 501 not_connected when the queue table is missing', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: '42P01' } });
    const body = JSON.stringify({
      action: 'closed',
      pull_request: { merged: true, labels: [{ name: 'client-visible' }], number: 7, title: 'Ship it', html_url: 'https://github.com/cleanexpo/ccw-crm/pull/7', body: 'Closes UNI-12' },
      repository: { full_name: 'cleanexpo/ccw-crm' },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(501);
    const json = await res.json();
    expect(json.error).toBe('not_connected');
    expect(json.brief).toBeDefined();
  });

  it('returns 201 when the queue insert succeeds', async () => {
    const body = JSON.stringify({
      action: 'closed',
      pull_request: { merged: true, labels: [{ name: 'client-visible' }], number: 7, title: 'Ship it', html_url: 'https://github.com/cleanexpo/ccw-crm/pull/7', body: 'no ticket' },
      repository: { full_name: 'cleanexpo/ccw-crm' },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(201);
    expect((await res.json()).queued).toBe(true);
  });
});
