import {
  buildClientLaunchPacket,
  type ClientReadinessSignals,
} from '../client-launch-packet';

const CLIENT = {
  id: 'client-9',
  slug: 'restore-co',
  company_name: 'Restore Co',
  status: 'onboarding',
};

// All-false baseline — nothing is wired up yet.
const NO_SIGNALS: ClientReadinessSignals = {
  telegramBotTokenPresent: false,
  telegramDestinationLinked: false,
  linearApiKeyPresent: false,
  linearTeamLinked: false,
  repoLinked: false,
  vercelLinked: false,
  supabaseLinked: false,
  railwayLinked: false,
  hermesRouteConfigured: false,
  firstPlanDrafted: false,
};

const ALL_SIGNALS: ClientReadinessSignals = {
  telegramBotTokenPresent: true,
  telegramDestinationLinked: true,
  linearApiKeyPresent: true,
  linearTeamLinked: true,
  repoLinked: true,
  vercelLinked: true,
  supabaseLinked: true,
  railwayLinked: true,
  hermesRouteConfigured: true,
  firstPlanDrafted: true,
};

describe('buildClientLaunchPacket', () => {
  it('creates deterministic launch tasks for a newly onboarded client', () => {
    const packet = buildClientLaunchPacket({
      id: 'client-1',
      slug: 'acme-restoration',
      company_name: 'Acme Restoration',
      status: 'onboarding',
    });

    expect(packet).toMatchObject({
      id: 'launch-acme-restoration',
      source: 'empire:client-onboarding',
      client: {
        id: 'client-1',
        slug: 'acme-restoration',
        company_name: 'Acme Restoration',
      },
      summary: {
        total: 4,
        ready: 1,
        queued: 3,
        blocked: 0,
      },
    });
    expect(packet.tasks.map(task => task.id)).toEqual([
      'portal-ready',
      'linear-work-queue',
      'provider-readiness',
      'first-work-plan',
    ]);
    expect(packet.tasks[1].acceptanceCriteria).toContain(
      'Include an Acceptance Criteria heading so the autonomous claim loop can pick it up.',
    );
    expect(packet.tasks[3].nextAction).toBe("Draft Acme Restoration's first seven-day work plan.");
  });

  it('does not expose credentials or provider secret names', () => {
    const packet = buildClientLaunchPacket({
      id: 'client-2',
      slug: 'secure-client',
      company_name: 'Secure Client',
      status: 'onboarding',
    });

    const body = JSON.stringify(packet);
    expect(body).not.toContain('sk-');
    expect(body).not.toContain('Bearer ');
    expect(body).not.toContain('SUPABASE_');
    expect(body).not.toContain('postgres://');
  });
});

describe('buildClientLaunchPacket — signals path (UNI-2148)', () => {
  it('produces the canonical seven-task packet in order', () => {
    const packet = buildClientLaunchPacket(CLIENT, NO_SIGNALS);
    expect(packet.tasks.map(t => t.id)).toEqual([
      'crm-record',
      'telegram-destination',
      'linear-work-queue',
      'source-adapters',
      'provider-readiness',
      'first-work-plan',
      'approval-status',
    ]);
    expect(packet.summary.total).toBe(7);
  });

  it('blocks telegram with the exact next action when the bot token is missing', () => {
    const packet = buildClientLaunchPacket(CLIENT, NO_SIGNALS);
    const telegram = packet.tasks.find(t => t.id === 'telegram-destination')!;
    expect(telegram.status).toBe('blocked');
    expect(telegram.nextAction).toBe(
      'Set TELEGRAM_BOT_TOKEN and link a chat destination for restore-co.',
    );
    expect(telegram.approvalRequired).toBe(true);
  });

  it('blocks telegram with a link-destination action when the token is present but unlinked', () => {
    const packet = buildClientLaunchPacket(CLIENT, {
      ...NO_SIGNALS,
      telegramBotTokenPresent: true,
    });
    const telegram = packet.tasks.find(t => t.id === 'telegram-destination')!;
    expect(telegram.status).toBe('blocked');
    expect(telegram.nextAction).toBe(
      'Link a Telegram chat destination for restore-co.',
    );
  });

  it('marks telegram ready when both token and destination are present', () => {
    const packet = buildClientLaunchPacket(CLIENT, ALL_SIGNALS);
    const telegram = packet.tasks.find(t => t.id === 'telegram-destination')!;
    expect(telegram.status).toBe('ready');
  });

  it('keeps the linear-work-queue acceptance-criteria heading for the claim loop', () => {
    const packet = buildClientLaunchPacket(CLIENT, NO_SIGNALS);
    const linear = packet.tasks.find(t => t.id === 'linear-work-queue')!;
    expect(linear.acceptanceCriteria).toContain(
      'Include an Acceptance Criteria heading so the autonomous claim loop can pick it up.',
    );
    // Both signals missing → blocked with a set-the-key action.
    expect(linear.status).toBe('blocked');
    expect(linear.nextAction).toBe(
      'Set LINEAR_API_KEY and link a Linear team for restore-co.',
    );
  });

  it('exposes a structured source-adapters matrix with no secrets', () => {
    const packet = buildClientLaunchPacket(CLIENT, NO_SIGNALS);
    expect(packet.sourceAdapters).toBeDefined();
    expect(packet.sourceAdapters!.map(a => a.name)).toEqual([
      'repo',
      'vercel',
      'railway',
      'supabase',
      'linear',
      'telegram',
      'hermes-route',
    ]);
    // Unlinked adapters carry an exact nextAction; the shape is { name, linked, nextAction? }.
    const repo = packet.sourceAdapters!.find(a => a.name === 'repo')!;
    expect(repo).toEqual({
      name: 'repo',
      linked: false,
      nextAction: 'Link a source repo for restore-co.',
    });
    // A linked adapter omits nextAction.
    const linkedPacket = buildClientLaunchPacket(CLIENT, ALL_SIGNALS);
    const linkedRepo = linkedPacket.sourceAdapters!.find(a => a.name === 'repo')!;
    expect(linkedRepo).toEqual({ name: 'repo', linked: true });
  });

  it('marks every client-facing task approval-required and never auto-sends', () => {
    const packet = buildClientLaunchPacket(CLIENT, ALL_SIGNALS);
    const firstPlan = packet.tasks.find(t => t.id === 'first-work-plan')!;
    expect(firstPlan.approvalRequired).toBe(true);
    const approval = packet.tasks.find(t => t.id === 'approval-status')!;
    expect(approval.approvalRequired).toBe(true);
  });

  it('does not expose credentials in the signals packet', () => {
    const body = JSON.stringify(buildClientLaunchPacket(CLIENT, ALL_SIGNALS));
    expect(body).not.toContain('sk-');
    expect(body).not.toContain('Bearer ');
    expect(body).not.toContain('SUPABASE_');
    expect(body).not.toContain('postgres://');
  });

  it('stays byte-identical to the legacy packet when signals are omitted', () => {
    const withArg = buildClientLaunchPacket(CLIENT);
    const sameNoArg = buildClientLaunchPacket(CLIENT, undefined);
    expect(JSON.stringify(withArg)).toBe(JSON.stringify(sameNoArg));
    expect(withArg.tasks.map(t => t.id)).toEqual([
      'portal-ready',
      'linear-work-queue',
      'provider-readiness',
      'first-work-plan',
    ]);
    expect(withArg.sourceAdapters).toBeUndefined();
  });
});
