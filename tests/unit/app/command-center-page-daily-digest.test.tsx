import React from 'react';

const mockCheckAdminSession = jest.fn();
const mockRedirect = jest.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
const mockCommandCenterShell = jest.fn(() => <div data-testid="command-center-shell" />);
const mockAccessDenied = jest.fn(() => <div data-testid="access-denied" />);
const mockReadPortfolioSummary = jest.fn();
const mockReadGlobalStatus = jest.fn();
const mockReadActivityFeed = jest.fn();
const mockReadBusiness360 = jest.fn();
const mockReadAgentTopology = jest.fn();
const mockReadDataRoomHealth = jest.fn();
const mockReadDailyCrmDigest = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}));

jest.mock('@/lib/security/require-admin', () => ({
  checkAdminSession: () => mockCheckAdminSession(),
}));

jest.mock('@/components/command-center/CommandCenterShell', () => ({
  CommandCenterShell: (props: Record<string, unknown>) => mockCommandCenterShell(props),
}));

jest.mock('@/components/command-center/AccessDenied', () => ({
  AccessDenied: (props: Record<string, unknown>) => mockAccessDenied(props),
}));

jest.mock('@/lib/empire/read-portfolio-summary', () => ({
  readPortfolioSummary: () => mockReadPortfolioSummary(),
}));

jest.mock('@/lib/empire/read-global-status', () => ({
  readGlobalStatus: () => mockReadGlobalStatus(),
}));

jest.mock('@/lib/empire/read-activity-feed', () => ({
  readActivityFeed: () => mockReadActivityFeed(),
}));

jest.mock('@/lib/empire/read-business-360', () => ({
  readBusiness360: () => mockReadBusiness360(),
}));

jest.mock('@/lib/empire/read-agent-topology', () => ({
  readAgentTopology: () => mockReadAgentTopology(),
}));

jest.mock('@/lib/empire/read-data-room-health', () => ({
  readDataRoomHealth: () => mockReadDataRoomHealth(),
}));

jest.mock(
  '@/lib/crm/read-daily-digest',
  () => ({
    readDailyCrmDigest: () => mockReadDailyCrmDigest(),
  }),
  { virtual: true },
);

import CommandCenterPage from '@/app/[locale]/command-center/page';

const digest = {
  generatedAt: '2026-05-23T06:07:08.000Z',
  summary: { leadCount: 1, qualifiedLeadCount: 1, opportunityCount: 0 },
  operatorPriorities: ['Review Ada Lovelace'],
  approvals: [],
  blockers: [],
  sourceLiveAt: '2026-05-23T06:07:08.000Z',
};

function seedSuccessfulReads() {
  mockReadPortfolioSummary.mockResolvedValue({
    total_arr_cents: 12345,
    at_risk_count: 1,
    fetched_at: '2026-05-23T06:00:00.000Z',
  });
  mockReadGlobalStatus.mockResolvedValue({
    agentsAlive: 3,
    alerts: [],
    buildSha: 'abc123',
    fetchedAt: '2026-05-23T06:01:00.000Z',
  });
  mockReadActivityFeed.mockResolvedValue({ events: [{ id: 'event-1' }], fetchedAt: '2026-05-23T06:02:00.000Z' });
  mockReadBusiness360.mockResolvedValue({
    liveBusinessCount: 1,
    tiles: [{ id: 'business-1' }],
    fetchedAt: '2026-05-23T06:03:00.000Z',
  });
  mockReadAgentTopology.mockResolvedValue({
    liveNodeCount: 1,
    nodes: [{ id: 'agent-1' }],
    edges: [],
    fetchedAt: '2026-05-23T06:04:00.000Z',
  });
  mockReadDataRoomHealth.mockResolvedValue({ health: 'healthy' });
  mockReadDailyCrmDigest.mockResolvedValue(digest);
}

describe('/[locale]/command-center daily CRM digest SSR wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedSuccessfulReads();
  });

  it('reads the daily CRM digest for an allowed admin and passes it to CommandCenterShell', async () => {
    mockCheckAdminSession.mockResolvedValue({ ok: true, actorEmail: 'admin@unite.test' });

    const result = await CommandCenterPage({ params: Promise.resolve({ locale: 'en' }) });

    expect(mockReadDailyCrmDigest).toHaveBeenCalledTimes(1);
    expect((result as React.ReactElement).props).toEqual(
      expect.objectContaining({
        locale: 'en',
        dailyDigestInitial: digest,
      }),
    );
  });

  it('redirects anonymous callers before reading the daily CRM digest', async () => {
    mockCheckAdminSession.mockResolvedValue({ ok: false, reason: 'anonymous' });

    await expect(CommandCenterPage({ params: Promise.resolve({ locale: 'en' }) })).rejects.toThrow(
      'redirect:/en/login?next=/en/command-center',
    );

    expect(mockReadDailyCrmDigest).not.toHaveBeenCalled();
    expect(mockCommandCenterShell).not.toHaveBeenCalled();
  });

  it('renders AccessDenied for forbidden callers before reading the daily CRM digest', async () => {
    mockCheckAdminSession.mockResolvedValue({
      ok: false,
      reason: 'forbidden',
      actorEmail: 'non-admin@unite.test',
    });

    const result = await CommandCenterPage({ params: Promise.resolve({ locale: 'en' }) });

    expect((result as React.ReactElement).props).toEqual({ actorEmail: 'non-admin@unite.test', locale: 'en' });
    expect(mockReadDailyCrmDigest).not.toHaveBeenCalled();
    expect(mockCommandCenterShell).not.toHaveBeenCalled();
  });
});
