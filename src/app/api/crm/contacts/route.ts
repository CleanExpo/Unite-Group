import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  buildCrmActivityTimelineEvent,
  buildCrmTimelineAgentActionInsert,
} from '@/lib/crm/activity-timeline';

export const dynamic = 'force-dynamic';

const blankStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim().length === 0 ? undefined : value;

const optionalTrimmed = (max: number) => z.string().trim().max(max).optional();
const optionalTrimmedDefault = (max: number, defaultValue: string) =>
  z.preprocess(blankStringToUndefined, z.string().trim().max(max).default(defaultValue));
const optionalTrimmedEmail = z.string().trim().email().max(320).optional();
const optionalBoardApprovalId = z.preprocess(
  blankStringToUndefined,
  z.string().trim().min(6).max(120).optional(),
);
const CONTACT_SELECT_COLUMNS = 'id,display_name,first_name,last_name,primary_email,primary_phone,role_title,company_name,linked_lead_id,linked_client_id,linked_business_id,source,source_detail,marketing_consent,relationship_owner,status,privacy_scope,dedupe_email_key,dedupe_domain_key,additional_data,created_at,updated_at';

const contactCreateSchema = z.object({
  displayName: optionalTrimmed(200),
  firstName: optionalTrimmed(120),
  lastName: optionalTrimmed(120),
  primaryEmail: optionalTrimmedEmail,
  primaryPhone: optionalTrimmed(80),
  roleTitle: optionalTrimmed(160),
  companyName: optionalTrimmed(200),
  linkedLeadId: z.string().uuid().optional(),
  linkedClientId: z.string().uuid().optional(),
  linkedBusinessId: z.string().uuid().optional(),
  source: optionalTrimmedDefault(120, 'manual'),
  sourceDetail: optionalTrimmed(500),
  marketingConsent: z.boolean().default(false),
  relationshipOwner: optionalTrimmedDefault(120, 'Margot'),
  status: z
    .enum(['active', 'lead_only', 'client_contact', 'nurture', 'do_not_contact', 'archived', 'blocked_review'])
    .default('lead_only'),
  privacyScope: z
    .enum(['lead_scoped', 'client_scoped', 'business_scoped', 'restricted', 'global_crm'])
    .default('lead_scoped'),
  boardApprovalId: optionalBoardApprovalId,
});

function hasText(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

function deriveDisplayName(payload: z.infer<typeof contactCreateSchema>) {
  if (hasText(payload.displayName)) return payload.displayName as string;

  const fromName = [payload.firstName, payload.lastName]
    .filter(hasText)
    .join(' ')
    .trim();

  return fromName || payload.primaryEmail || '';
}

async function recordContactCreatedTimelineEvent(
  supabase: ReturnType<typeof createClient<any>>,
  contactRow: Record<string, unknown>,
) {
  const subjectId = typeof contactRow.id === 'string' ? contactRow.id : '';
  const subjectLabel = typeof contactRow.display_name === 'string' ? contactRow.display_name : '';
  if (!subjectId || !subjectLabel) return;

  const event = buildCrmActivityTimelineEvent({
    type: 'contact_created',
    actor: 'Margot',
    subjectId,
    subjectLabel,
    occurredAt: new Date().toISOString(),
    source: 'crm_contacts_route',
    metadata: {
      status: typeof contactRow.status === 'string' ? contactRow.status : undefined,
      privacyScope: typeof contactRow.privacy_scope === 'string' ? contactRow.privacy_scope : undefined,
      linkedLead: Boolean(contactRow.linked_lead_id),
      linkedClient: Boolean(contactRow.linked_client_id),
      linkedBusiness: Boolean(contactRow.linked_business_id),
    },
  });

  try {
    const { error } = await supabase
      .from('agent_actions')
      .insert(buildCrmTimelineAgentActionInsert(event))
      .select('id')
      .single();

    if (error) {
      console.error('Error recording CRM contact timeline event:', error);
    }
  } catch (error) {
    console.error('Error recording CRM contact timeline event:', error);
  }
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
    return NextResponse.json({ error: 'invalid_contact_payload' }, { status: 400 });
  }

  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_contact_payload' }, { status: 400 });
  }

  const contact = parsed.data;
  if (
    !hasText(contact.displayName) &&
    !hasText(contact.firstName) &&
    !hasText(contact.lastName) &&
    !hasText(contact.primaryEmail)
  ) {
    return NextResponse.json({ error: 'contact_identity_required' }, { status: 400 });
  }

  const linkCount = [contact.linkedLeadId, contact.linkedClientId, contact.linkedBusinessId]
    .filter(Boolean)
    .length;
  if (linkCount > 1 && !hasText(contact.boardApprovalId)) {
    return NextResponse.json({ error: 'operator_approval_required' }, { status: 403 });
  }

  const dedupeEmailKey = contact.primaryEmail ? contact.primaryEmail.toLowerCase() : null;
  const dedupeDomainKey = dedupeEmailKey?.split('@')[1] || null;

  const insertPayload = {
    display_name: deriveDisplayName(contact),
    first_name: contact.firstName ?? null,
    last_name: contact.lastName ?? null,
    primary_email: contact.primaryEmail ?? null,
    primary_phone: contact.primaryPhone ?? null,
    role_title: contact.roleTitle ?? null,
    company_name: contact.companyName ?? null,
    linked_lead_id: contact.linkedLeadId ?? null,
    linked_client_id: contact.linkedClientId ?? null,
    linked_business_id: contact.linkedBusinessId ?? null,
    source: contact.source,
    source_detail: contact.sourceDetail ?? null,
    marketing_consent: contact.marketingConsent,
    relationship_owner: contact.relationshipOwner,
    status: contact.status,
    privacy_scope: contact.privacyScope,
    dedupe_email_key: dedupeEmailKey,
    dedupe_domain_key: dedupeDomainKey,
    additional_data: {},
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    const { data, error } = await supabase
      .from('crm_contacts')
      .insert(insertPayload)
      .select(CONTACT_SELECT_COLUMNS)
      .single();

    if (error) {
      console.error('Error creating CRM contact:', error);
      return NextResponse.json({ error: 'crm_contact_create_failed' }, { status: 500 });
    }

    await recordContactCreatedTimelineEvent(supabase, data as Record<string, unknown>);

    return NextResponse.json({ success: true, contact: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected CRM contact create error:', error);
    return NextResponse.json({ error: 'crm_contact_create_failed' }, { status: 500 });
  }
}
