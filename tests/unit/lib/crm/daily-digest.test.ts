import { createCrmDailyDigest } from '@/lib/crm/daily-digest';

describe('createCrmDailyDigest', () => {
  it('summarizes leads, opportunities, tasks, blockers, and verification without external calls', () => {
    const digest = createCrmDailyDigest({
      generatedAt: '2026-05-23T09:00:00+10:00',
      leads: [
        {
          id: 'lead-1',
          name: 'Ada Lovelace',
          company: 'Analytical Engines',
          email: 'ada@analyticalengines.co',
          status: 'new',
          qualificationBand: 'qualified',
          score: 92,
          nextAction: 'Review identity match before conversion',
        },
        {
          id: 'lead-2',
          name: 'Grace Hopper',
          email: 'grace@gmail.com',
          status: 'nurture',
          qualificationBand: 'needs_review',
          nextAction: 'Ask for company context',
        },
      ],
      opportunities: [
        {
          id: 'opp-1',
          name: 'CRM automation buildout',
          stage: 'discovery',
          valueEstimate: 25000,
          probability: 0.4,
          requiresApproval: true,
          nextAction: 'Draft scope for Phill review',
        },
      ],
      tasks: [
        { id: 'task-1', title: 'Run CRM regression tests', owner: 'Margot', status: 'done', priority: 'normal' },
        { id: 'task-2', title: 'Approve lead conversion policy', owner: 'Phill', status: 'blocked', priority: 'high' },
      ],
      blockers: [
        { area: 'Mac Mini recovery', detail: 'No authenticated SMB mount or SSH session available', neededFrom: 'Transport/access' },
      ],
      verification: [
        { command: 'npx jest tests/unit/lib/crm/daily-digest.test.ts --runInBand', status: 'passed' },
      ],
    });

    expect(digest.summary).toEqual({
      leadCount: 2,
      qualifiedLeadCount: 1,
      opportunityCount: 1,
      approvalRequiredCount: 2,
      blockedTaskCount: 1,
      blockerCount: 1,
      staleIntegrationCount: 0,
    });
    expect(digest.sections.operatorPriorities[0]).toContain('lead-1');
    expect(digest.sections.operatorPriorities[0]).toContain('Review identity match before conversion');
    expect(digest.sections.approvals).toEqual([
      'Opportunity opp-1 (CRM automation buildout): approval required before commercial commitment. Next: Draft scope for Phill review',
      'Task task-2 (Approve lead conversion policy): blocked for Phill. Priority: high',
    ]);
    expect(digest.sections.blockers).toEqual([
      'Mac Mini recovery: No authenticated SMB mount or SSH session available. Needed: Transport/access',
    ]);
    expect(digest.markdown).toContain('# Daily CRM Digest');
    expect(digest.markdown).toContain('Generated: 2026-05-23T09:00:00+10:00');
    expect(digest.markdown).toContain('No production DB writes, deploys, env mutations, secret printing, GitHub push, or client-facing sends are implied by this digest.');
  });

  it('does not expose raw lead email as fallback label in operator-facing digest copy', () => {
    const digest = createCrmDailyDigest({
      generatedAt: '2026-05-23T09:05:00+10:00',
      leads: [
        {
          id: 'lead-email-only',
          email: 'private.contact@example.com',
          status: 'new',
          nextAction: 'Review inbound enquiry',
        },
      ],
    });

    expect(digest.sections.operatorPriorities).toHaveLength(1);
    expect(digest.sections.operatorPriorities[0]).toContain('Lead lead-email-only (lead lead-email-only)');
    expect(digest.sections.operatorPriorities[0]).not.toContain('private.contact@example.com');
    expect(digest.markdown).toContain('Lead lead-email-only (lead lead-email-only)');
    expect(digest.markdown).not.toContain('private.contact@example.com');
  });

  it('uses explicit empty-state copy when no CRM inputs exist', () => {
    const digest = createCrmDailyDigest({ generatedAt: '2026-05-23T09:10:00+10:00' });

    expect(digest.summary).toEqual({
      leadCount: 0,
      qualifiedLeadCount: 0,
      opportunityCount: 0,
      approvalRequiredCount: 0,
      blockedTaskCount: 0,
      blockerCount: 0,
      staleIntegrationCount: 0,
    });
    expect(digest.sections.operatorPriorities).toEqual(['No CRM priorities supplied for this digest window.']);
    expect(digest.sections.approvals).toEqual(['No approval-required items supplied for this digest window.']);
    expect(digest.sections.blockers).toEqual(['No blockers supplied for this digest window.']);
    expect(digest.sections.staleIntegrations).toEqual(['All integration mirrors are within their sync cadence.']);
  });

  it('surfaces stale integrations with operator-readable reason labels and source-state semantics', () => {
    const digest = createCrmDailyDigest({
      generatedAt: '2026-05-23T09:15:00+10:00',
      staleIntegrations: [
        { integration: 'linear', reason: 'missed_cadence', minutesOverdue: 25 },
        { integration: 'vercel', reason: 'last_error', minutesOverdue: 0 },
        { integration: 'stripe', reason: 'never_synced', minutesOverdue: 0 },
      ],
    });

    expect(digest.summary.staleIntegrationCount).toBe(3);
    expect(digest.sections.staleIntegrations).toEqual([
      'linear: missed cadence (25 min overdue)',
      'vercel: last error (active error; cadence not yet overdue)',
      'stripe: never synced (no completed sync recorded)',
    ]);
    expect(digest.markdown).toContain('## Stale Integration Mirrors');
    expect(digest.markdown).toContain('linear: missed cadence (25 min overdue)');
    expect(digest.markdown).toContain('vercel: last error (active error; cadence not yet overdue)');
  });

  it('does not leak NaN overdue copy when stale integration minutes are malformed', () => {
    const digest = createCrmDailyDigest({
      generatedAt: '2026-05-23T09:20:00+10:00',
      staleIntegrations: [
        { integration: 'github', reason: 'missed_cadence', minutesOverdue: Number.NaN },
      ],
    });

    expect(digest.sections.staleIntegrations).toEqual([
      'github: missed cadence (0 min overdue)',
    ]);
    expect(digest.markdown).not.toContain('NaN');
  });

  it('redacts secret-shaped values from verification command copy', () => {
    const digest = createCrmDailyDigest({
      generatedAt: '2026-05-23T09:25:00+10:00',
      verification: [
        {
          command: 'SUPABASE_SERVICE_ROLE_KEY=super-secret-service-role-token npm run security:routes-check',
          status: 'blocked',
        },
      ],
    });

    expect(digest.sections.verification).toEqual([
      'blocked: SUPABASE_SERVICE_ROLE_KEY=[REDACTED] npm run security:routes-check',
    ]);
    expect(digest.markdown).toContain('SUPABASE_SERVICE_ROLE_KEY=[REDACTED]');
    expect(digest.markdown).not.toContain('super-secret-service-role-token');
  });
});
