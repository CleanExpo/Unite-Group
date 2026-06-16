import type { CrmDailyDigest } from '@/lib/crm/daily-digest';

const shellMock = jest.fn(() => null);
const redirectMock = jest.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
const checkAdminSessionMock = jest.fn();
const readPortfolioSummaryMock = jest.fn();
const readGlobalStatusMock = jest.fn();
const readActivityFeedMock = jest.fn();
const readBusiness360Mock = jest.fn();
const readAgentTopologyMock = jest.fn();
const readDataRoomHealthMock = jest.fn();
const readCrmDailyDigestForCommandCenterMock = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock('@/components/command-center/CommandCenterShell', () => ({
  CommandCenterShell: (props: unknown) => shellMock(props),
}));

jest.mock('@/components/command-center/AccessDenied', () => ({
  AccessDenied: ({ actorEmail, locale }: { actorEmail?: string; locale: string }) => ({
    type: 'AccessDenied',
    actorEmail,
    locale,
  }),
}));

jest.mock('@/lib/security/require-admin', () => ({
  checkAdminSession: () => checkAdminSessionMock(),
}));

jest.mock('@/lib/empire/read-portfolio-summary', () => ({
  readPortfolioSummary: () => readPortfolioSummaryMock(),
}));

jest.mock('@/lib/empire/read-global-status', () => ({
  readGlobalStatus: () => readGlobalStatusMock(),
}));

jest.mock('@/lib/empire/read-activity-feed', () => ({
  readActivityFeed: () => readActivityFeedMock(),
}));

jest.mock('@/lib/empire/read-business-360', () => ({
  readBusiness360: () => readBusiness360Mock(),
}));

jest.mock('@/lib/empire/read-agent-topology', () => ({
  readAgentTopology: () => readAgentTopologyMock(),
}));

jest.mock('@/lib/empire/read-data-room-health', () => ({
  readDataRoomHealth: () => readDataRoomHealthMock(),
}));

jest.mock('@/lib/crm/read-daily-digest', () => ({
  readCrmDailyDigestForCommandCenter: () => readCrmDailyDigestForCommandCenterMock(),
}));

import CommandCenterPage from '@/app/[locale]/command-center/page';

describe('/[locale]/command-center daily digest server slice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkAdminSessionMock.mockResolvedValue({ ok: true, actorEmail: 'admin@example.com' });
    readPortfolioSummaryMock.mockResolvedValue(null);
    readGlobalStatusMock.mockResolvedValue(null);
    readActivityFeedMock.mockResolvedValue(null);
    readBusiness360Mock.mockResolvedValue(null);
    readAgentTopologyMock.mockResolvedValue(null);
    readDataRoomHealthMock.mockResolvedValue(null);
  });

  it('passes only a minimized CRM daily digest DTO to the client shell', async () => {
    const digest: CrmDailyDigest = {
      generatedAt: '2026-05-23T06:07:08.000Z',
      summary: {
        leadCount: 2,
        qualifiedLeadCount: 1,
        opportunityCount: 0,
        approvalRequiredCount: 1,
        blockedTaskCount: 1,
        blockerCount: 0,
      },
      sections: {
        operatorPriorities: [
          'Task task-1 (Follow up): owner Phill, status blocked, priority high.',
          'Priority 2',
          'Priority 3',
          'Priority 4',
          'Priority 5',
          'Priority 6 SHOULD NOT SERIALIZE',
        ],
        approvals: ['Task task-1 (Follow up): blocked for Phill. Priority: high'],
        blockers: ['No blockers supplied for this digest window.'],
        verification: ['passed: command-center CRM daily digest read'],
      },
      markdown: '# Daily CRM Digest',
    };
    readCrmDailyDigestForCommandCenterMock.mockResolvedValue(digest);

    const result = await CommandCenterPage({ params: Promise.resolve({ locale: 'en' }) });

    expect(readCrmDailyDigestForCommandCenterMock).toHaveBeenCalledTimes(1);
    expect((result as any).props).toEqual(
      expect.objectContaining({
        locale: 'en',
        dailyDigestInitial: {
          generatedAt: digest.generatedAt,
          summary: digest.summary,
          operatorPriorities: digest.sections.operatorPriorities.slice(0, 5),
          approvals: digest.sections.approvals.slice(0, 5),
          blockers: digest.sections.blockers.slice(0, 5),
          sourceLiveAt: digest.generatedAt,
        },
      }),
    );
    expect(JSON.stringify((result as any).props.dailyDigestInitial)).not.toContain('markdown');
    expect(JSON.stringify((result as any).props.dailyDigestInitial)).not.toContain('Daily CRM Digest');
    expect(JSON.stringify((result as any).props.dailyDigestInitial)).not.toContain('Priority 6 SHOULD NOT SERIALIZE');
  });

  it('passes no daily digest when the server digest read degrades safely', async () => {
    readCrmDailyDigestForCommandCenterMock.mockResolvedValue(undefined);

    const result = await CommandCenterPage({ params: Promise.resolve({ locale: 'en' }) });

    expect((result as any).props).toEqual(
      expect.objectContaining({
        locale: 'en',
        dailyDigestInitial: undefined,
      }),
    );
  });
});
