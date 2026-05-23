import {
  buildCrmActivityTimelineEvent,
  type CrmActivityTimelineEventInput,
} from '@/lib/crm/activity-timeline';

describe('buildCrmActivityTimelineEvent', () => {
  it('normalizes lead/contact/opportunity/approval/task/integration events into safe CRM timeline entries', () => {
    const inputs: CrmActivityTimelineEventInput[] = [
      {
        type: 'lead_captured',
        actor: 'website_form',
        subjectId: 'lead-1',
        subjectLabel: 'Ada / Analytical Engines',
        occurredAt: '2026-05-23T12:20:00+10:00',
        source: 'marketing_leads_route',
        clientSlug: 'analytical-engines',
        metadata: { email: 'ada@example.com', token: 'should-not-survive' },
      },
      {
        type: 'lead_qualified',
        actor: 'Margot',
        subjectId: 'lead-1',
        subjectLabel: 'Ada / Analytical Engines',
        occurredAt: '2026-05-23T12:21:00+10:00',
        source: 'qualify_lead_helper',
        metadata: { score: 92, band: 'qualified' },
      },
      {
        type: 'lead_converted',
        actor: 'Margot',
        subjectId: 'lead-1',
        subjectLabel: 'Ada / Analytical Engines',
        occurredAt: '2026-05-23T12:22:00+10:00',
        source: 'crm_lead_conversion_route',
        requiresApproval: true,
        boardApprovalId: 'BOARD-123',
      },
      {
        type: 'contact_created',
        actor: 'Margot',
        subjectId: 'contact-1',
        subjectLabel: 'Ada Lovelace',
        occurredAt: '2026-05-23T12:23:00+10:00',
        source: 'crm_contacts_route',
      },
      {
        type: 'opportunity_created',
        actor: 'Margot',
        subjectId: 'opp-1',
        subjectLabel: 'CRM automation buildout',
        occurredAt: '2026-05-23T12:24:00+10:00',
        source: 'crm_opportunities_route',
        metadata: { valueEstimate: 25000 },
      },
      {
        type: 'approval_requested',
        actor: 'Margot',
        subjectId: 'opp-1',
        subjectLabel: 'CRM automation buildout',
        occurredAt: '2026-05-23T12:25:00+10:00',
        source: 'crm_opportunities_route',
        requiresApproval: true,
        metadata: { secret: 'redact me', reason: 'Won-stage opportunity requires Board approval' },
      },
      {
        type: 'task_completed',
        actor: 'Margot',
        subjectId: 'task-1',
        subjectLabel: 'Run CRM regression tests',
        occurredAt: '2026-05-23T12:26:00+10:00',
        source: 'crm_daily_digest_route',
      },
      {
        type: 'integration_stale',
        actor: 'system',
        subjectId: 'linear-sync',
        subjectLabel: 'Linear mirror',
        occurredAt: '2026-05-23T12:27:00+10:00',
        source: 'integration_sync_state',
        metadata: { provider: 'linear', staleMinutes: 180 },
      },
    ];

    const events = inputs.map(buildCrmActivityTimelineEvent);

    expect(events.map((event) => event.type)).toEqual([
      'lead_captured',
      'lead_qualified',
      'lead_converted',
      'contact_created',
      'opportunity_created',
      'approval_requested',
      'task_completed',
      'integration_stale',
    ]);
    expect(events[0]).toMatchObject({
      category: 'lead',
      severity: 'normal',
      actionClass: 'auto',
      clientSlug: 'analytical-engines',
    });
    expect(events[2]).toMatchObject({
      category: 'lead',
      severity: 'high',
      actionClass: 'approval_required',
      requiresApproval: true,
    });
    expect(events[5]).toMatchObject({
      category: 'approval',
      severity: 'high',
      actionClass: 'approval_required',
    });
    expect(events[7]).toMatchObject({
      category: 'integration',
      severity: 'warning',
      actionClass: 'investigate',
    });
    expect(events[0].summary).toBe('Lead captured: Ada / Analytical Engines via marketing_leads_route.');
    expect(events[5].summary).toBe('Approval requested: CRM automation buildout via crm_opportunities_route.');
    expect(events[0].metadata).toEqual({ email: 'ada@example.com' });
    expect(events[5].metadata).toEqual({ reason: 'Won-stage opportunity requires Board approval' });
    const leadConvertedEvent = events.find((event) => event.type === 'lead_converted');
    expect(leadConvertedEvent).toBeDefined();
    if (!leadConvertedEvent) throw new Error('Expected lead_converted event');
    expect(leadConvertedEvent).not.toHaveProperty('boardApprovalId');
  });

  it('removes sensitive metadata key variants before building CRM timeline events', () => {
    const event = buildCrmActivityTimelineEvent({
      type: 'lead_captured',
      actor: 'website_form',
      subjectId: 'lead-2',
      subjectLabel: 'Grace / Compiler Labs',
      occurredAt: '2026-05-23T12:31:00+10:00',
      source: 'marketing_leads_route',
      metadata: {
        accessToken: 'token',
        auth_token: 'auth token',
        clientSecret: 'secret',
        passwordHash: 'hash',
        xApiKey: 'api key',
        'api-key': 'api key dashed',
        BoardApprovalID: 'BOARD-456',
        board_approval_id: 'BOARD-789',
        safeCount: 3,
        stage: 'captured',
      },
    });

    expect(event.metadata).toEqual({ safeCount: 3, stage: 'captured' });
  });

  it('rejects unknown event types and missing identity instead of guessing across CRM objects', () => {
    expect(() => buildCrmActivityTimelineEvent({
      type: 'unknown' as CrmActivityTimelineEventInput['type'],
      actor: 'Margot',
      subjectId: 'lead-1',
      subjectLabel: 'Ada',
      occurredAt: '2026-05-23T12:30:00+10:00',
      source: 'test',
    })).toThrow('Unsupported CRM activity type: unknown');

    expect(() => buildCrmActivityTimelineEvent({
      type: 'lead_captured',
      actor: 'Margot',
      subjectId: ' ',
      subjectLabel: 'Ada',
      occurredAt: '2026-05-23T12:30:00+10:00',
      source: 'test',
    })).toThrow('CRM activity subjectId is required');
  });
});
