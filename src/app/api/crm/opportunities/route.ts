import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  buildCrmActivityTimelineEvent,
  buildCrmTimelineAgentActionInsert,
} from '@/lib/crm/activity-timeline';

export const dynamic = 'force-dynamic';

const opportunityStages = [
  'new_signal',
  'qualified',
  'discovery',
  'proposal_needed',
  'proposal_sent',
  'negotiation',
  'decision_needed',
  'won_pending_client_conversion',
  'won_converted',
  'lost',
  'paused',
  'blocked_review',
] as const;

const opportunityStatuses = ['open', 'won', 'lost', 'paused', 'blocked_review', 'cancelled'] as const;
const approvalStatuses = ['not_required', 'requested', 'approved', 'rejected', 'expired'] as const;
const safeValueCurrencies = ['AUD', 'USD', 'NZD', 'GBP', 'EUR'] as const;
const ADDITIONAL_DATA_MAX_BYTES = 4096;
const OPPORTUNITY_SELECT_COLUMNS = 'id,name,stage,status,value_amount,value_currency,probability,expected_close_at,next_action_due_at,next_action,decision_needed,risk,source,owner,campaign_source,campaign_medium,campaign_name,source_detail,lost_reason,linked_lead_id,linked_contact_id,linked_client_id,linked_business_id,approval_required,approval_status,additional_data,created_at,updated_at';

const sensitiveAdditionalDataKeyPattern = /(?:secret|token|password|passphrase|api[_-]?key|private[_-]?key|credential|authorization|cookie|session|stripe|payment|card|cvc|cvv|bank|iban|bsb|account[_-]?number|passport|driver'?s?[_\s-]?licen[cs]e|tax[_\s-]?file|tfn|medicare|ssn|dob|birth[_\s-]?date|email|phone|mobile|address|cross[_\s-]?client|client[_\s-]?notes?)/i;
const sensitiveAdditionalDataStringPatterns = [
  /(?:secret|token|password|passphrase|api[_-]?key|private[_-]?key|credential|authorization|bearer\s+[a-z0-9._-]+)/i,
  /(?:stripe|payment|card|cvc|cvv|bank|iban|bsb|account\s*number|passport|driver'?s?\s*licen[cs]e|tax\s*file|tfn|medicare|ssn)/i,
  /(?:cross\s*client|client\s*notes?)/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
];

const blankStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim().length === 0 ? undefined : value;

const optionalTrimmed = (max: number) =>
  z.preprocess(blankStringToUndefined, z.string().trim().max(max).optional());
const optionalTrimmedDefault = (max: number, defaultValue: string) =>
  z.preprocess(blankStringToUndefined, z.string().trim().max(max).default(defaultValue));
const optionalBoardApprovalId = z.preprocess(
  blankStringToUndefined,
  z.string().trim().max(120).optional(),
);
const optionalValueCurrency = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(safeValueCurrencies).optional(),
);

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsUnsafeAdditionalData(value: unknown): boolean {
  if (typeof value === 'string') {
    return sensitiveAdditionalDataStringPatterns.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some(containsUnsafeAdditionalData);
  }

  if (isJsonObject(value)) {
    return Object.entries(value).some(([key, nestedValue]) => (
      sensitiveAdditionalDataKeyPattern.test(key) || containsUnsafeAdditionalData(nestedValue)
    ));
  }

  return false;
}

const safeAdditionalData = z.record(z.unknown()).superRefine((value, ctx) => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > ADDITIONAL_DATA_MAX_BYTES) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'additionalData is too large' });
    return;
  }

  if (containsUnsafeAdditionalData(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'additionalData contains sensitive data' });
  }
});

const opportunityCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  stage: z.enum(opportunityStages).default('new_signal'),
  status: z.enum(opportunityStatuses).default('open'),
  valueAmount: z.number().nonnegative().optional(),
  valueCurrency: optionalValueCurrency,
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseAt: z.string().datetime().optional(),
  nextActionDueAt: z.string().datetime().optional(),
  source: optionalTrimmedDefault(120, 'manual'),
  owner: optionalTrimmedDefault(120, 'Margot'),
  linkedLeadId: z.string().uuid().optional(),
  linkedContactId: z.string().uuid().optional(),
  linkedClientId: z.string().uuid().optional(),
  linkedBusinessId: z.string().uuid().optional(),
  nextAction: optionalTrimmed(2000),
  decisionNeeded: optionalTrimmed(2000),
  risk: optionalTrimmed(2000),
  campaignSource: optionalTrimmed(200),
  campaignMedium: optionalTrimmed(200),
  campaignName: optionalTrimmed(200),
  sourceDetail: optionalTrimmed(500),
  lostReason: optionalTrimmed(1000),
  approvalRequired: z.boolean().default(false),
  approvalStatus: z.enum(approvalStatuses).default('not_required'),
  boardApprovalId: optionalBoardApprovalId,
  additionalData: safeAdditionalData.default({}),
});

function requiresOperatorApproval(opportunity: z.infer<typeof opportunityCreateSchema>) {
  return (
    opportunity.status === 'won'
      || opportunity.stage === 'won_pending_client_conversion'
      || opportunity.stage === 'won_converted'
  );
}

function hasBoardApprovalId(opportunity: z.infer<typeof opportunityCreateSchema>) {
  return typeof opportunity.boardApprovalId === 'string' && opportunity.boardApprovalId.trim().length >= 6;
}

function hasRequiredOperatorApproval(opportunity: z.infer<typeof opportunityCreateSchema>) {
  return (
    opportunity.approvalRequired === true
      && opportunity.approvalStatus === 'approved'
      && hasBoardApprovalId(opportunity)
  );
}

function linkedScopeCount(opportunity: z.infer<typeof opportunityCreateSchema>) {
  return [
    opportunity.linkedLeadId,
    opportunity.linkedContactId,
    opportunity.linkedClientId,
    opportunity.linkedBusinessId,
  ].filter(Boolean).length;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error
      && typeof error === 'object'
      && 'code' in error
      && (error as { code?: unknown }).code === '23505',
  );
}

async function recordOpportunityTimelineEvents(
  supabase: ReturnType<typeof createClient<any>>,
  opportunityRow: Record<string, unknown>,
) {
  const subjectId = typeof opportunityRow.id === 'string' ? opportunityRow.id : '';
  const subjectLabel = typeof opportunityRow.name === 'string' ? opportunityRow.name : '';
  if (!subjectId || !subjectLabel) return;

  const baseInput = {
    actor: 'Margot',
    subjectId,
    subjectLabel,
    occurredAt: new Date().toISOString(),
    source: 'crm_opportunities_route',
    metadata: {
      stage: typeof opportunityRow.stage === 'string' ? opportunityRow.stage : undefined,
      status: typeof opportunityRow.status === 'string' ? opportunityRow.status : undefined,
      valueCurrency: typeof opportunityRow.value_currency === 'string' ? opportunityRow.value_currency : undefined,
      hasValueAmount: typeof opportunityRow.value_amount === 'number',
      linkedLead: Boolean(opportunityRow.linked_lead_id),
      linkedContact: Boolean(opportunityRow.linked_contact_id),
      linkedClient: Boolean(opportunityRow.linked_client_id),
      linkedBusiness: Boolean(opportunityRow.linked_business_id),
    },
  };

  const events = [
    buildCrmActivityTimelineEvent({ type: 'opportunity_created', ...baseInput }),
  ];

  if (opportunityRow.approval_required === true || opportunityRow.approval_status === 'approved') {
    events.push(buildCrmActivityTimelineEvent({
      type: 'approval_requested',
      requiresApproval: true,
      ...baseInput,
    }));
  }

  for (const event of events) {
    try {
      const { error } = await supabase
        .from('agent_actions')
        .insert(buildCrmTimelineAgentActionInsert(event))
        .select('id')
        .single();

      if (error) {
        console.error('Error recording CRM opportunity timeline event');
      }
    } catch {
      console.error('Error recording CRM opportunity timeline event');
    }
  }
}

async function existingOpportunityConflict(
  supabase: ReturnType<typeof createClient<any>>,
  opportunity: z.infer<typeof opportunityCreateSchema>,
) {
  const linkChecks = [
    ['linked_lead_id', opportunity.linkedLeadId],
    ['linked_contact_id', opportunity.linkedContactId],
    ['linked_client_id', opportunity.linkedClientId],
    ['linked_business_id', opportunity.linkedBusinessId],
  ] as const;

  const firstScopedLink = linkChecks.find(([, value]) => typeof value === 'string' && value.length > 0);
  if (!firstScopedLink) return false;

  const [linkColumn, linkValue] = firstScopedLink;
  const { data, error } = await supabase
    .from('crm_opportunities')
    .select('id')
    .eq('name', opportunity.name)
    .eq(linkColumn, linkValue)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking CRM opportunity duplicate');
    throw new Error('crm_opportunity_duplicate_check_failed');
  }

  return Boolean(data && typeof data === 'object' && 'id' in data);
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'crm_not_configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_opportunity_payload' }, { status: 400 });
  }

  const parsed = opportunityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_opportunity_payload' }, { status: 400 });
  }

  const opportunity = parsed.data;
  if (linkedScopeCount(opportunity) > 1 && !hasBoardApprovalId(opportunity)) {
    return NextResponse.json({ error: 'operator_approval_required' }, { status: 403 });
  }

  if (requiresOperatorApproval(opportunity) && !hasRequiredOperatorApproval(opportunity)) {
    return NextResponse.json({ error: 'operator_approval_required' }, { status: 403 });
  }

  const insertPayload = {
    name: opportunity.name,
    stage: opportunity.stage,
    status: opportunity.status,
    value_amount: opportunity.valueAmount ?? null,
    value_currency: opportunity.valueAmount === undefined ? null : opportunity.valueCurrency ?? 'AUD',
    probability: opportunity.probability ?? null,
    expected_close_at: opportunity.expectedCloseAt ?? null,
    next_action_due_at: opportunity.nextActionDueAt ?? null,
    next_action: opportunity.nextAction ?? null,
    decision_needed: opportunity.decisionNeeded ?? null,
    risk: opportunity.risk ?? null,
    source: opportunity.source,
    owner: opportunity.owner,
    campaign_source: opportunity.campaignSource ?? null,
    campaign_medium: opportunity.campaignMedium ?? null,
    campaign_name: opportunity.campaignName ?? null,
    source_detail: opportunity.sourceDetail ?? null,
    lost_reason: opportunity.lostReason ?? null,
    linked_lead_id: opportunity.linkedLeadId ?? null,
    linked_contact_id: opportunity.linkedContactId ?? null,
    linked_client_id: opportunity.linkedClientId ?? null,
    linked_business_id: opportunity.linkedBusinessId ?? null,
    approval_required: opportunity.approvalRequired,
    approval_status: opportunity.approvalStatus,
    additional_data: opportunity.additionalData,
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    if (await existingOpportunityConflict(supabase, opportunity)) {
      return NextResponse.json({ error: 'crm_opportunity_conflict' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('crm_opportunities')
      .insert(insertPayload)
      .select(OPPORTUNITY_SELECT_COLUMNS)
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ error: 'crm_opportunity_conflict' }, { status: 409 });
      }

      console.error('Error creating CRM opportunity');
      return NextResponse.json({ error: 'crm_opportunity_create_failed' }, { status: 500 });
    }

    await recordOpportunityTimelineEvents(supabase, data as Record<string, unknown>);

    return NextResponse.json({ success: true, opportunity: data }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: 'crm_opportunity_conflict' }, { status: 409 });
    }

    if (error instanceof Error && error.message === 'crm_opportunity_duplicate_check_failed') {
      return NextResponse.json({ error: 'crm_opportunity_duplicate_check_failed' }, { status: 500 });
    }

    console.error('Unexpected CRM opportunity create error');
    return NextResponse.json({ error: 'crm_opportunity_create_failed' }, { status: 500 });
  }
}
