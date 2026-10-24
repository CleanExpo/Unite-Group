import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('../../lib/supabase/server', () => ({
  getUser: vi.fn(),
}));

import { redirect } from 'next/navigation';
import { getUser } from '../../lib/supabase/server';
import RootPage from '../page';

describe('root page redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Phill 25/10/2026: signed-out visitors see the public Nexus landing page (landing.test.tsx covers its content)
  it('shows unauthenticated users the public landing page instead of redirecting', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    await expect(RootPage()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects authenticated users to the founder dashboard', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-123' } as any);

    await expect(RootPage()).rejects.toThrow('REDIRECT:/founder/command-centre');
    expect(redirect).toHaveBeenCalledWith('/founder/command-centre');
  });
});
