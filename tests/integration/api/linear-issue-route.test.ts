import { NextRequest } from 'next/server';

import { POST } from '@/app/api/linear/issue/route';

function linearIssueRequest(body: unknown): NextRequest {
  return new NextRequest('https://unite-group.in/api/linear/issue', {
    method: 'POST',
    headers: {
      authorization: 'Bearer service-role-test',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(): NextRequest {
  return new NextRequest('https://unite-group.in/api/linear/issue', {
    method: 'POST',
    headers: {
      authorization: 'Bearer service-role-test',
      'content-type': 'application/json',
    },
    body: '{',
  });
}

describe('POST /api/linear/issue', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...oldEnv,
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = oldEnv;
  });

  it('returns invalid_json for malformed POST payloads before Linear requests', async () => {
    const res = await POST(invalidJsonRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_json' });
  });

  it('rejects update payloads with no mutable fields before Linear requests', async () => {
    process.env['LINEAR' + '_API_KEY'] = 'linear-test-key';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ data: { issueUpdate: { success: true } } }),
    } as Response);

    const res = await POST(linearIssueRequest({
      action: 'update',
      issueId: 'LIN-123',
      teamId: 'team-123',
      state: { name: 'Done' },
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_update_payload' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects create payloads without required title or team before Linear requests', async () => {
    process.env['LINEAR' + '_API_KEY'] = 'linear-test-key';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ data: { issueCreate: { success: true } } }),
    } as Response);

    const res = await POST(linearIssueRequest({
      action: 'create',
      title: '   ',
      description: 'Should not dispatch to Linear without a teamId',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_create_payload' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
