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
}

export function buildClientLaunchPacket(
  client: ClientLaunchPacketClient,
): ClientLaunchPacket {
  const portalPath = `/portal/${client.slug}`;
  const tasks: ClientLaunchTask[] = [
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

  return {
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
}
