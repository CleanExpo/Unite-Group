import { buildClientLaunchPacket } from '../client-launch-packet';

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
