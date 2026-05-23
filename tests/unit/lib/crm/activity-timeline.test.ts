import {
  buildCrmActivityTimelineEvent,
  buildCrmTimelineAgentActionInsert,
  type CrmActivityTimelineEvent,
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
    expect(events[0].metadata).toEqual({});
    expect(events[5].metadata).toEqual({ reason: 'Won-stage opportunity requires Board approval' });
    const leadConvertedEvent = events.find((event) => event.type === 'lead_converted');
    expect(leadConvertedEvent).toBeDefined();
    if (!leadConvertedEvent) throw new Error('Expected lead_converted event');
    expect(leadConvertedEvent).not.toHaveProperty('boardApprovalId');
  });

  it('removes sensitive metadata key variants and sensitive-looking values before building CRM timeline events', () => {
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
        auth: 'basic abc123',
        authHeader: 'basic abc123',
        xAuth: 'basic abc123',
        clientSecret: 'secret',
        passwordHash: 'hash',
        xApiKey: 'api key',
        'api-key': 'api key dashed',
        BoardApprovalID: 'BOARD-456',
        board_approval_id: 'BOARD-789',
        boardApproval: 'operator approved',
        board_approval: 'operator approved',
        'Board approval': 'operator approved',
        email: 'grace@example.com',
        phone: '+61 400 111 222',
        ipAddress: '203.0.113.10',
        addressLine1: '1 Compiler Street',
        approvalRef: 'BOARD-123',
        benignBoardReference: 'BOARD-123',
        benignBearer: 'Bearer abc123.def456.ghi789',
        neutralCredential: 'api_key_123456789abcdef',
        benignEmail: 'grace@example.com',
        benignPhone: '+61 400 111 222',
        safeCount: 3,
        stage: 'captured',
      },
    });

    expect(event.metadata).toEqual({ safeCount: 3, stage: 'captured' });
  });

  it('defensively re-sanitizes metadata when mapping structurally constructed events to agent_actions inserts', () => {
    const manuallyConstructedEvent: CrmActivityTimelineEvent = {
      type: 'lead_captured',
      category: 'lead',
      severity: 'normal',
      actionClass: 'auto',
      actor: 'website_form',
      subjectId: 'lead-3',
      subjectLabel: 'Katherine / Orbital Labs',
      occurredAt: '2026-05-23T12:35:00+10:00',
      source: 'manual_test',
      summary: 'Lead captured: Katherine / Orbital Labs via manual_test.',
      metadata: {
        safeCount: 1,
        stage: 'captured',
        email: 'katherine@example.com',
        phone: '+61 411 222 333',
        ipAddress: '198.51.100.20',
        address: '2 Orbital Road',
        approvalRef: 'BOARD-123',
        benignBoardReference: 'BOARD-123',
        benignBearer: 'Bearer abc123.def456.ghi789',
        neutralCredential: 'api_key_123456789abcdef',
        benignEmail: 'katherine@example.com',
        benignPhone: '+61 411 222 333',
      },
    };

    const insert = buildCrmTimelineAgentActionInsert(manuallyConstructedEvent);

    expect(insert.payload.metadata).toEqual({ safeCount: 1, stage: 'captured' });
  });

  it('keeps structurally constructed approval decision inserts pending even with inconsistent auto actionClass', () => {
    const structurallyConstructedDecisionEvent: CrmActivityTimelineEvent = {
      type: 'approval_approved',
      category: 'approval',
      severity: 'high',
      actionClass: 'auto',
      actor: 'operator',
      subjectId: 'opp-structural-1',
      subjectLabel: 'Structurally constructed approval',
      occurredAt: '2026-05-23T12:38:00+10:00',
      source: 'manual_test',
      summary: 'Approval approved: Structurally constructed approval via manual_test.',
      metadata: { decision: 'approved' },
    };

    const insert = buildCrmTimelineAgentActionInsert(structurallyConstructedDecisionEvent);

    expect(insert.status).toBe('pending');
    expect(insert.payload.requiresApproval).toBe(true);
  });

  it('maps sanitized CRM timeline events to agent_actions insert payloads without guessing UUID links', () => {
    const approvalEvent = buildCrmActivityTimelineEvent({
      type: 'approval_requested',
      actor: 'Margot',
      subjectId: 'opp-1',
      subjectLabel: 'CRM automation buildout',
      occurredAt: '2026-05-23T12:25:00+10:00',
      source: 'crm_opportunities_route',
      clientSlug: 'analytical-engines',
      businessSlug: 'compiler-labs',
      requiresApproval: true,
      boardApprovalId: 'BOARD-123',
      metadata: {
        reason: 'Won-stage opportunity requires Board approval',
        BoardApprovalID: 'BOARD-456',
        accessToken: 'token',
      },
    });

    const approvalInsert = buildCrmTimelineAgentActionInsert(approvalEvent);

    expect(approvalInsert).toEqual({
      source: 'margot',
      action_type: 'crm_timeline_approval_requested',
      status: 'pending',
      idea_text: 'Approval requested: CRM automation buildout via crm_opportunities_route.',
      client_id: null,
      business_id: null,
      linear_ticket_id: null,
      parent_id: null,
      payload: {
        type: 'approval_requested',
        category: 'approval',
        severity: 'high',
        actionClass: 'approval_required',
        actor: 'Margot',
        subjectId: 'opp-1',
        subjectLabel: 'CRM automation buildout',
        occurredAt: '2026-05-23T12:25:00+10:00',
        source: 'crm_opportunities_route',
        summary: 'Approval requested: CRM automation buildout via crm_opportunities_route.',
        requiresApproval: true,
        clientSlug: 'analytical-engines',
        businessSlug: 'compiler-labs',
        metadata: { reason: 'Won-stage opportunity requires Board approval' },
      },
    });
    expect(approvalInsert.payload).not.toHaveProperty('boardApprovalId');
    expect(approvalInsert.payload.metadata).not.toHaveProperty('BoardApprovalID');
    expect(approvalInsert.payload.metadata).not.toHaveProperty('accessToken');

    const autoEvent = buildCrmActivityTimelineEvent({
      type: 'contact_created',
      actor: 'Margot',
      subjectId: 'contact-1',
      subjectLabel: 'Ada Lovelace',
      occurredAt: '2026-05-23T12:23:00+10:00',
      source: 'crm_contacts_route',
    });
    const investigateEvent = buildCrmActivityTimelineEvent({
      type: 'integration_stale',
      actor: 'system',
      subjectId: 'linear-sync',
      subjectLabel: 'Linear mirror',
      occurredAt: '2026-05-23T12:27:00+10:00',
      source: 'integration_sync_state',
    });

    expect(buildCrmTimelineAgentActionInsert(autoEvent)).toMatchObject({
      action_type: 'crm_timeline_contact_created',
      status: 'done',
      client_id: null,
      business_id: null,
      linear_ticket_id: null,
      parent_id: null,
    });
    expect(buildCrmTimelineAgentActionInsert(autoEvent).payload).toMatchObject({
      clientSlug: null,
      businessSlug: null,
      requiresApproval: false,
      metadata: {},
    });
    expect(buildCrmTimelineAgentActionInsert(investigateEvent)).toMatchObject({
      action_type: 'crm_timeline_integration_stale',
      status: 'pending',
    });
  });

  it('maps approval decision events to safe pending agent_actions inserts with sensitive metadata stripped', () => {
    const decisionInputs: CrmActivityTimelineEventInput[] = [
      {
        type: 'approval_approved',
        actor: 'operator',
        subjectId: 'opp-2',
        subjectLabel: 'Expansion approval',
        occurredAt: '2026-05-23T12:40:00+10:00',
        source: 'crm_approval_lifecycle_helper',
        metadata: {
          decision: 'approved',
          approvalReference: 'BOARD-100',
          BoardApprovalID: 'BOARD-101',
          board_approval_id: 'BOARD-102',
          accessToken: 'token',
          auth_token: 'auth token',
          clientSecret: 'secret',
          xApiKey: 'api key',
          ipAddress: '203.0.113.40',
        },
      },
      {
        type: 'approval_rejected',
        actor: 'operator',
        subjectId: 'opp-3',
        subjectLabel: 'At-risk approval',
        occurredAt: '2026-05-23T12:45:00+10:00',
        source: 'crm_approval_lifecycle_helper',
        metadata: {
          decision: 'rejected',
          rejectionReason: 'Not enough budget',
          rejection_reason: 'Customer deferred purchase',
          approvalReference: 'BOARD-104',
          BoardApprovalID: 'BOARD-105',
          board_approval_id: 'BOARD-106',
          accessToken: 'token',
          auth_token: 'auth token',
          clientSecret: 'secret',
          xApiKey: 'api key',
          ipAddress: '203.0.113.45',
        },
      },
      {
        type: 'approval_cancelled',
        actor: 'operator',
        subjectId: 'opp-4',
        subjectLabel: 'Cancelled approval',
        occurredAt: '2026-05-23T12:50:00+10:00',
        source: 'crm_approval_lifecycle_helper',
        metadata: {
          decision: 'cancelled',
          approvalReference: 'BOARD-107',
          BoardApprovalID: 'BOARD-108',
          board_approval_id: 'BOARD-109',
          accessToken: 'token',
          auth_token: 'auth token',
          clientSecret: 'secret',
          xApiKey: 'api key',
          ipAddress: '203.0.113.50',
          operatorNote: 'Cancelled after customer requested changes',
        },
      },
      {
        type: 'approval_expired',
        actor: 'system',
        subjectId: 'opp-5',
        subjectLabel: 'Expired approval',
        occurredAt: '2026-05-23T12:55:00+10:00',
        source: 'crm_approval_lifecycle_helper',
        metadata: {
          decision: 'expired',
          rejectionReason: 'Expired with sensitive BOARD-110 value',
          approvalReference: 'BOARD-111',
          BoardApprovalID: 'BOARD-112',
          board_approval_id: 'BOARD-113',
          accessToken: 'token',
          auth_token: 'auth token',
          clientSecret: 'secret',
          xApiKey: 'api key',
          ipAddress: '203.0.113.55',
          elapsedHours: 72,
        },
      },
    ];

    const [approvedEvent, rejectedEvent, cancelledEvent, expiredEvent] = decisionInputs.map(buildCrmActivityTimelineEvent);

    expect(approvedEvent).toMatchObject({
      type: 'approval_approved',
      category: 'approval',
      severity: 'high',
      actionClass: 'approval_required',
      summary: 'Approval approved: Expansion approval via crm_approval_lifecycle_helper.',
      requiresApproval: true,
      metadata: { decision: 'approved' },
    });
    expect(rejectedEvent).toMatchObject({
      type: 'approval_rejected',
      category: 'approval',
      severity: 'high',
      actionClass: 'approval_required',
      summary: 'Approval rejected: At-risk approval via crm_approval_lifecycle_helper.',
      requiresApproval: true,
      metadata: { decision: 'rejected' },
    });
    expect(cancelledEvent).toMatchObject({
      type: 'approval_cancelled',
      category: 'approval',
      severity: 'high',
      actionClass: 'approval_required',
      summary: 'Approval cancelled: Cancelled approval via crm_approval_lifecycle_helper.',
      requiresApproval: true,
      metadata: { decision: 'cancelled', operatorNote: 'Cancelled after customer requested changes' },
    });
    expect(expiredEvent).toMatchObject({
      type: 'approval_expired',
      category: 'approval',
      severity: 'high',
      actionClass: 'approval_required',
      summary: 'Approval expired: Expired approval via crm_approval_lifecycle_helper.',
      requiresApproval: true,
      metadata: { decision: 'expired', elapsedHours: 72 },
    });

    const approvedInsert = buildCrmTimelineAgentActionInsert(approvedEvent);
    const rejectedInsert = buildCrmTimelineAgentActionInsert(rejectedEvent);
    const cancelledInsert = buildCrmTimelineAgentActionInsert(cancelledEvent);
    const expiredInsert = buildCrmTimelineAgentActionInsert(expiredEvent);

    expect(approvedInsert).toMatchObject({
      action_type: 'crm_timeline_approval_approved',
      status: 'pending',
      payload: {
        type: 'approval_approved',
        category: 'approval',
        severity: 'high',
        actionClass: 'approval_required',
        requiresApproval: true,
        metadata: { decision: 'approved' },
      },
    });
    expect(rejectedInsert).toMatchObject({
      action_type: 'crm_timeline_approval_rejected',
      status: 'pending',
      payload: {
        type: 'approval_rejected',
        category: 'approval',
        severity: 'high',
        actionClass: 'approval_required',
        requiresApproval: true,
        metadata: { decision: 'rejected' },
      },
    });
    expect(cancelledInsert).toMatchObject({
      action_type: 'crm_timeline_approval_cancelled',
      status: 'pending',
      payload: {
        type: 'approval_cancelled',
        category: 'approval',
        severity: 'high',
        actionClass: 'approval_required',
        requiresApproval: true,
        metadata: { decision: 'cancelled', operatorNote: 'Cancelled after customer requested changes' },
      },
    });
    expect(expiredInsert).toMatchObject({
      action_type: 'crm_timeline_approval_expired',
      status: 'pending',
      payload: {
        type: 'approval_expired',
        category: 'approval',
        severity: 'high',
        actionClass: 'approval_required',
        requiresApproval: true,
        metadata: { decision: 'expired', elapsedHours: 72 },
      },
    });

    [
      approvedEvent.metadata,
      rejectedEvent.metadata,
      cancelledEvent.metadata,
      expiredEvent.metadata,
      approvedInsert.payload.metadata,
      rejectedInsert.payload.metadata,
      cancelledInsert.payload.metadata,
      expiredInsert.payload.metadata,
    ]
      .forEach((metadata) => {
        expect(metadata).not.toHaveProperty('approvalReference');
        expect(metadata).not.toHaveProperty('BoardApprovalID');
        expect(metadata).not.toHaveProperty('board_approval_id');
        expect(metadata).not.toHaveProperty('accessToken');
        expect(metadata).not.toHaveProperty('auth_token');
        expect(metadata).not.toHaveProperty('clientSecret');
        expect(metadata).not.toHaveProperty('xApiKey');
        expect(metadata).not.toHaveProperty('ipAddress');
        expect(metadata).not.toHaveProperty('rejectionReason');
        expect(metadata).not.toHaveProperty('rejection_reason');
      });
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
