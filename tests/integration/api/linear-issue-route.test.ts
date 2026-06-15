import { NextRequest } from 'next/server';

import { POST } from '@/app/api/linear/issue/route';

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
    process.env = oldEnv;
  });

  it('returns invalid_json for malformed POST payloads before Linear requests', async () => {
    const res = await POST(invalidJsonRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_json' });
  });
});
