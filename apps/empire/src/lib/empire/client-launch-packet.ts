export type ClientLaunchTaskStatus = 'queued' | 'blocked' | 'ready';
export type ClientLaunchTaskOwner = 'mission-control' | 'rana' | 'hermes' | 'phill';

export interface ClientLaunchPacketClient {
  id: string;
  slug: string;
  company_name: string;
  status: string;
}

export interface ClientLaunchTask {
  id: string;
  title: string;
  owner: ClientLaunchTaskOwner;
  status: ClientLaunchTaskStatus;
  acceptanceCriteria: string[];
  nextAction: string;
  /**
   * Set on client-facing or production-activating steps. The packet is a
   * recommendation only — nothing here triggers a live send. Phill approves
   * before anything leaves Mission Control. Omitted (undefined) on the legacy
   * no-signals packet so the #249 byte-identical contract holds.
   */
  approvalRequired?: boolean;
}

/**
 * Presence-only readiness signals. UNI-2148 hard rule: BOOLEANS/enums ONLY —
 * never a raw secret, token, env VALUE, or provider secret-name. Each field is
 * the answer to "is this dependency satisfied?", computed server-side from env
 * presence + existing nexus_clients columns (see client-onboarding-readiness).
 */
export interface ClientReadinessSignals {
  /** TELEGRAM_BOT_TOKEN is present in the environment. */
  telegramBotTokenPresent: boolean;
  /** A chat destination is linked for this client (chat id configured). */
  telegramDestinationLinked: boolean;
  /** LINEAR_API_KEY is present in the environment. */
  linearApiKeyPresent: boolean;
  /** The client has a Linear team linked (linear_team_id set). */
  linearTeamLinked: boolean;
  /** A source repo is linked (github_repo set). */
  repoLinked: boolean;
  /** A Vercel project is linked (vercel_project set). */
  vercelLinked: boolean;
  /** A Supabase project ref is linked (supabase_project_ref set). */
  supabaseLinked: boolean;
  /** A Railway service is linked (railway_service_id set). */
  railwayLinked: boolean;
  /** The Hermes route for this client is configured. */
  hermesRouteConfigured: boolean;
  /** The first seven-day work plan has been drafted. */
  firstPlanDrafted: boolean;
}

/**
 * One row of the source-adapters matrix — repo / Vercel / Railway / Supabase /
 * Linear / Telegram / Hermes route. Derived from signals only; carries no
 * secret, token, or env-name. `nextAction` is present only when not linked.
 */
export interface ClientSourceAdapter {
  name: string;
  linked: boolean;
  nextAction?: string;
}

export interface ClientLaunchPacket {
  id: string;
  source: 'empire:client-onboarding';
  client: ClientLaunchPacketClient;
  summary: {
    total: number;
    ready: number;
    queued: number;
    blocked: number;
  };
  tasks: ClientLaunchTask[];
  /**
   * Present only on the signals-driven packet. The structured source-adapter
   * matrix the Mission Control checklist renders alongside the tasks.
   */
  sourceAdapters?: ClientSourceAdapter[];
}

// ── Legacy packet (#249) ──────────────────────────────────────────────────
// Built when buildClientLaunchPacket is called with NO signals. MUST stay
// byte-identical to the original four-task packet — the #249 unit test asserts
// the exact id list, summary counts, and copy.
function buildLegacyTasks(client: ClientLaunchPacketClient): ClientLaunchTask[] {
  const portalPath = `/portal/${client.slug}`;
  return [
    {
      id: 'portal-ready',
      title: 'Portal shell ready',
      owner: 'mission-control',
      status: client.status === 'onboarding' ? 'ready' : 'queued',
      acceptanceCriteria: [
        `Client ${client.company_name} has a portal route at ${portalPath}.`,
        'Brand configuration is present enough for the founder preview.',
        'Founder can open the portal without a missing-client response.',
      ],
      nextAction: `Open ${portalPath} and confirm the first-view portal renders.`,
    },
    {
      id: 'linear-work-queue',
      title: 'Linear launch queue',
      owner: 'rana',
      status: 'queued',
      acceptanceCriteria: [
        'Create one Linear issue for the client launch plan.',
        'Include an Acceptance Criteria heading so the autonomous claim loop can pick it up.',
        'Link the issue back to the Empire client slug.',
      ],
      nextAction: `Create a claimable Linear packet for ${client.slug}.`,
    },
    {
      id: 'provider-readiness',
      title: 'Provider readiness',
      owner: 'hermes',
      status: 'queued',
      acceptanceCriteria: [
        'Check website, contact email, billing, publishing, and analytics provider references.',
        'Record missing credentials as blockers instead of attempting live provider actions.',
        'Route any approval-needed step to Phill before production activation.',
      ],
      nextAction: 'Run the provider readiness review and mark blockers before activation.',
    },
    {
      id: 'first-work-plan',
      title: 'First work plan',
      owner: 'rana',
      status: 'queued',
      acceptanceCriteria: [
        'Draft the first seven-day execution plan for the new client.',
        'Identify the first deliverable, approval gate, and evidence path.',
        'Post the plan to Mission Control for review.',
      ],
      nextAction: `Draft ${client.company_name}'s first seven-day work plan.`,
    },
  ];
}

// ── Canonical packet (UNI-2148) ──────────────────────────────────────────—
// Built when signals are supplied. Adds first-class tasks and computes each
// status honestly: 'ready' when the signal is satisfied, 'blocked' when a
// required dependency is missing (with an exact, actionable nextAction), else
// 'queued'. No secret/token/env-name ever lands in any field.
function buildSignalTasks(
  client: ClientLaunchPacketClient,
  signals: ClientReadinessSignals,
): ClientLaunchTask[] {
  const portalPath = `/portal/${client.slug}`;
  const telegramReady = signals.telegramBotTokenPresent && signals.telegramDestinationLinked;

  return [
    {
      id: 'crm-record',
      title: 'CRM record created',
      owner: 'mission-control',
      status: 'ready',
      acceptanceCriteria: [
        `nexus_clients row exists for ${client.company_name} (slug ${client.slug}).`,
        `Portal route is reachable at ${portalPath}.`,
        'Create event is recorded on the audit log.',
      ],
      nextAction: `Open ${portalPath} and confirm the first-view portal renders.`,
    },
    {
      id: 'telegram-destination',
      title: 'Telegram destination',
      owner: 'hermes',
      status: telegramReady ? 'ready' : 'blocked',
      acceptanceCriteria: [
        'A Telegram bot credential is present in the environment.',
        'A chat destination is linked so approvals can route to a human.',
        'No live message is sent without Phill approving the step.',
      ],
      nextAction: telegramReady
        ? `Telegram destination linked for ${client.slug}.`
        : !signals.telegramBotTokenPresent
          ? `Set TELEGRAM_BOT_TOKEN and link a chat destination for ${client.slug}.`
          : `Link a Telegram chat destination for ${client.slug}.`,
      approvalRequired: true,
    },
    {
      id: 'linear-work-queue',
      title: 'Linear launch queue',
      owner: 'rana',
      status:
        signals.linearApiKeyPresent && signals.linearTeamLinked
          ? 'ready'
          : signals.linearApiKeyPresent || signals.linearTeamLinked
            ? 'queued'
            : 'blocked',
      acceptanceCriteria: [
        'Create one Linear issue for the client launch plan.',
        'Include an Acceptance Criteria heading so the autonomous claim loop can pick it up.',
        'Link the issue back to the Empire client slug.',
      ],
      nextAction:
        signals.linearApiKeyPresent && signals.linearTeamLinked
          ? `Create a claimable Linear packet for ${client.slug}.`
          : !signals.linearApiKeyPresent
            ? `Set LINEAR_API_KEY and link a Linear team for ${client.slug}.`
            : `Link a Linear team for ${client.slug}.`,
    },
    {
      id: 'source-adapters',
      title: 'Source adapters linked',
      owner: 'hermes',
      status: allAdaptersLinked(signals)
        ? 'ready'
        : anyAdapterLinked(signals)
          ? 'queued'
          : 'blocked',
      acceptanceCriteria: [
        'Repo, Vercel, Railway, Supabase, Linear, Telegram, and Hermes route are reviewed.',
        'Each unlinked adapter carries an exact next action, never a secret.',
        'Missing credentials are recorded as blockers, not attempted live.',
      ],
      nextAction: allAdaptersLinked(signals)
        ? `All source adapters linked for ${client.slug}.`
        : `Link the remaining source adapters for ${client.slug}.`,
    },
    {
      id: 'provider-readiness',
      title: 'Provider readiness',
      owner: 'hermes',
      status: signals.vercelLinked && signals.supabaseLinked ? 'ready' : 'queued',
      acceptanceCriteria: [
        'Check website, contact email, billing, publishing, and analytics provider references.',
        'Record missing credentials as blockers instead of attempting live provider actions.',
        'Route any approval-needed step to Phill before production activation.',
      ],
      nextAction: 'Run the provider readiness review and mark blockers before activation.',
    },
    {
      id: 'first-work-plan',
      title: 'First work plan',
      owner: 'rana',
      status: signals.firstPlanDrafted ? 'ready' : 'queued',
      acceptanceCriteria: [
        'Draft the first seven-day execution plan for the new client.',
        'Identify the first deliverable, approval gate, and evidence path.',
        'Post the plan to Mission Control for review.',
      ],
      nextAction: signals.firstPlanDrafted
        ? `Submit ${client.company_name}'s first seven-day work plan for approval.`
        : `Draft ${client.company_name}'s first seven-day work plan.`,
      approvalRequired: true,
    },
    {
      id: 'approval-status',
      title: 'Approval gate',
      owner: 'phill',
      status: signals.firstPlanDrafted ? 'queued' : 'blocked',
      acceptanceCriteria: [
        'No client-facing message is sent until Phill approves it.',
        'The first work plan is presented for review before any production activation.',
        'Every approval-gated step is recommendation-only until cleared.',
      ],
      nextAction: signals.firstPlanDrafted
        ? `Review and approve the launch plan for ${client.company_name}.`
        : `Draft the first work plan before requesting approval for ${client.company_name}.`,
      approvalRequired: true,
    },
  ];
}

function buildSourceAdapters(
  client: ClientLaunchPacketClient,
  signals: ClientReadinessSignals,
): ClientSourceAdapter[] {
  const adapter = (
    name: string,
    linked: boolean,
    nextAction: string,
  ): ClientSourceAdapter => (linked ? { name, linked } : { name, linked, nextAction });

  return [
    adapter('repo', signals.repoLinked, `Link a source repo for ${client.slug}.`),
    adapter('vercel', signals.vercelLinked, `Link a Vercel project for ${client.slug}.`),
    adapter('railway', signals.railwayLinked, `Link a Railway service for ${client.slug}.`),
    adapter('supabase', signals.supabaseLinked, `Link a Supabase project for ${client.slug}.`),
    adapter(
      'linear',
      signals.linearApiKeyPresent && signals.linearTeamLinked,
      !signals.linearApiKeyPresent
        ? `Set LINEAR_API_KEY and link a Linear team for ${client.slug}.`
        : `Link a Linear team for ${client.slug}.`,
    ),
    adapter(
      'telegram',
      signals.telegramBotTokenPresent && signals.telegramDestinationLinked,
      !signals.telegramBotTokenPresent
        ? `Set TELEGRAM_BOT_TOKEN and link a chat destination for ${client.slug}.`
        : `Link a Telegram chat destination for ${client.slug}.`,
    ),
    adapter(
      'hermes-route',
      signals.hermesRouteConfigured,
      `Configure the Hermes route for ${client.slug}.`,
    ),
  ];
}

function adapterLinkedFlags(signals: ClientReadinessSignals): boolean[] {
  return [
    signals.repoLinked,
    signals.vercelLinked,
    signals.railwayLinked,
    signals.supabaseLinked,
    signals.linearApiKeyPresent && signals.linearTeamLinked,
    signals.telegramBotTokenPresent && signals.telegramDestinationLinked,
    signals.hermesRouteConfigured,
  ];
}

function allAdaptersLinked(signals: ClientReadinessSignals): boolean {
  return adapterLinkedFlags(signals).every(Boolean);
}

function anyAdapterLinked(signals: ClientReadinessSignals): boolean {
  return adapterLinkedFlags(signals).some(Boolean);
}

/**
 * Build the client onboarding packet.
 *
 * - No `signals` → the legacy four-task #249 packet, byte-identical.
 * - With `signals` → the canonical UNI-2148 packet: first-class tasks
 *   (crm-record, telegram-destination, linear-work-queue, source-adapters,
 *   provider-readiness, first-work-plan, approval-status) with honest,
 *   signal-derived statuses plus the source-adapter matrix. No secret, token,
 *   or env-name ever appears in any field.
 */
export function buildClientLaunchPacket(
  client: ClientLaunchPacketClient,
  signals?: ClientReadinessSignals,
): ClientLaunchPacket {
  const tasks = signals ? buildSignalTasks(client, signals) : buildLegacyTasks(client);

  const packet: ClientLaunchPacket = {
    id: `launch-${client.slug}`,
    source: 'empire:client-onboarding',
    client,
    summary: {
      total: tasks.length,
      ready: tasks.filter(task => task.status === 'ready').length,
      queued: tasks.filter(task => task.status === 'queued').length,
      blocked: tasks.filter(task => task.status === 'blocked').length,
    },
    tasks,
  };

  if (signals) {
    packet.sourceAdapters = buildSourceAdapters(client, signals);
  }

  return packet;
}
