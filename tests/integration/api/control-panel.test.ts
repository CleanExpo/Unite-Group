jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: jest.fn(),
}));

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GET } from '@/app/api/command-center/control-panel/route';
import { requireAdmin } from '@/lib/security/require-admin';
import { getAdminClient } from '@/lib/supabase/admin';

const mockedRequireAdmin = requireAdmin as jest.Mock;
const mockedGetAdminClient = getAdminClient as jest.Mock;

function req(): NextRequest {
  return new Request('https://unite-group.in/api/command-center/control-panel') as NextRequest;
}

describe('GET /api/command-center/control-panel', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...oldEnv,
      UNITE_CRM_WORKSPACE_ID: 'workspace-1',
    };
    mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'service-role' });
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('returns local fallback data without admin auth only when local preview is enabled', async () => {
    process.env.COMMAND_CENTER_LOCAL_PREVIEW = 'true';

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe('fallback:local_preview');
    expect(body.workstreams).toHaveLength(7);
    expect(mockedRequireAdmin).not.toHaveBeenCalled();
    expect(mockedGetAdminClient).not.toHaveBeenCalled();
  });

  it('keeps the route admin-gated when local preview is disabled', async () => {
    mockedRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    );

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
  });
});
