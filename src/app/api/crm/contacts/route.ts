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
const optionalNonBlankTrimmed = (max: number) => z.string().trim().min(1).max(max).optional();
const optionalTrimmedDefault = (max: number, defaultValue: string) =>
  z.preprocess(blankStringToUndefined, z.string().trim().max(max).default(defaultValue));
const optionalTrimmedEmail = z.string().trim().email().max(320).optional();
const optionalBoardApprovalId = z.preprocess(
  blankStringToUndefined,
  z.string().trim().min(6).max(120).optional(),
);
const CONTACT_SELECT_COLUMNS = 'id,display_name,first_name,last_name,primary_email,primary_phone,role_title,company_name,linked_lead_id,linked_client_id,linked_business_id,source,source_detail,marketing_consent,relationship_owner,status,privacy_scope,dedupe_email_key,dedupe_domain_key,additional_data,created_at,updated_at';
const CONTACT_PATCH_SELECT_COLUMNS = 'id,display_name,role_title,primary_email,primary_phone,relationship_owner,source,updated_at';

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

const contactUpdateSchema = z.object({
  id: z.string().uuid(),
  displayName: optionalNonBlankTrimmed(200),
  roleTitle: optionalNonBlankTrimmed(160),
  email: optionalTrimmedEmail,
  phone: optionalNonBlankTrimmed(80),
  relationshipOwner: optionalNonBlankTrimmed(120),
  source: optionalNonBlankTrimmed(120),
}).strict();

function hasText(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

const SENSITIVE_TIMELINE_LABEL_PATTERNS = [
  /\bBOARD-[A-Z0-9-]+\b/i,
  /\bbearer\s+[a-z0-9._~+/=-]+\b/i,
  /\bapi[_ -]?key[_ :=-]*[a-z0-9._-]+\b/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d ().-]{7,}\d)/,
  /(?:\b(?:billing|payment)\b.*\b(?:card|method|visa|mastercard|amex|discover|\d{4})\b|\bcard\b.*\b(?:visa|mastercard|amex|discover|\d{4})\b|\b(?:visa|mastercard|amex|discover)\b\s+(?:card|ending\s+\d{4}|\d{4})\b)/i,
];

function safeTimelineSubjectLabel(contactRow: Record<string, unknown>) {
  const subjectId = typeof contactRow.id === 'string' ? contactRow.id : '';
  const label = typeof contactRow.display_name === 'string' ? contactRow.display_name.trim() : '';
  if (!subjectId) return '';
  if (!label) return `contact ${subjectId}`;

  if (SENSITIVE_TIMELINE_LABEL_PATTERNS.some((pattern) => pattern.test(label))) {
    return `contact ${subjectId}`;
  }

  return label;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error
      && typeof error === 'object'
      && 'code' in error
      && (error as { code?: unknown }).code === '23505',
  );
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
  const subjectLabel = safeTimelineSubjectLabel(contactRow);
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
      console.error('Error recording CRM contact timeline event');
    }
  } catch {
    console.error('Error recording CRM contact timeline event');
  }
}

async function recordContactUpdatedTimelineEvent(
  supabase: ReturnType<typeof createClient<any>>,
  contactRow: Record<string, unknown>,
  changedFields: Record<string, boolean>,
) {
  const subjectId = typeof contactRow.id === 'string' ? contactRow.id : '';
  const subjectLabel = safeTimelineSubjectLabel(contactRow);
  if (!subjectId || !subjectLabel) return;

  const event = buildCrmActivityTimelineEvent({
    type: 'contact_updated',
    actor: 'Margot',
    subjectId,
    subjectLabel,
    occurredAt: new Date().toISOString(),
    source: 'crm_contacts_route',
    metadata: changedFields,
  });

  try {
    const { error } = await supabase
      .from('agent_actions')
      .insert(buildCrmTimelineAgentActionInsert(event))
      .select('id')
      .single();

    if (error) {
      console.error('Error recording CRM contact timeline event');
    }
  } catch {
    console.error('Error recording CRM contact timeline event');
  }
}

async function existingContactConflictByEmail(
  supabase: ReturnType<typeof createClient<any>>,
  dedupeEmailKey: string | null,
) {
  if (!dedupeEmailKey) return false;

  const { data, error } = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('dedupe_email_key', dedupeEmailKey)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking CRM contact duplicate');
    throw new Error('crm_contact_duplicate_check_failed');
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
    if (await existingContactConflictByEmail(supabase, dedupeEmailKey)) {
      return NextResponse.json({ error: 'crm_contact_conflict' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('crm_contacts')
      .insert(insertPayload)
      .select(CONTACT_SELECT_COLUMNS)
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ error: 'crm_contact_conflict' }, { status: 409 });
      }

      console.error('Error creating CRM contact');
      return NextResponse.json({ error: 'crm_contact_create_failed' }, { status: 500 });
    }

    await recordContactCreatedTimelineEvent(supabase, data as Record<string, unknown>);

    return NextResponse.json({ success: true, contact: data }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: 'crm_contact_conflict' }, { status: 409 });
    }

    if (error instanceof Error && error.message === 'crm_contact_duplicate_check_failed') {
      return NextResponse.json({ error: 'crm_contact_duplicate_check_failed' }, { status: 500 });
    }

    console.error('Unexpected CRM contact create error');
    return NextResponse.json({ error: 'crm_contact_create_failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'crm_not_configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_contact_update_payload' }, { status: 400 });
  }

  const parsed = contactUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_contact_update_payload' }, { status: 400 });
  }

  const contact = parsed.data;
  const updatePayload: Record<string, unknown> = {};
  const changedFields: Record<string, boolean> = {};

  if (contact.displayName !== undefined) {
    updatePayload.display_name = contact.displayName;
    changedFields.changedDisplayName = true;
  }
  if (contact.roleTitle !== undefined) {
    updatePayload.role_title = contact.roleTitle;
    changedFields.changedRoleTitle = true;
  }
  if (contact.email !== undefined) {
    updatePayload.primary_email = contact.email;
    changedFields.changedEmail = true;
  }
  if (contact.phone !== undefined) {
    updatePayload.primary_phone = contact.phone;
    changedFields.changedPhone = true;
  }
  if (contact.relationshipOwner !== undefined) {
    updatePayload.relationship_owner = contact.relationshipOwner;
    changedFields.changedRelationshipOwner = true;
  }
  if (contact.source !== undefined) {
    updatePayload.source = contact.source;
    changedFields.changedSource = true;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'invalid_contact_update_payload' }, { status: 400 });
  }

  updatePayload.updated_at = new Date().toISOString();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    const { data, error } = await supabase
      .from('crm_contacts')
      .update(updatePayload)
      .eq('id', contact.id)
      .select(CONTACT_PATCH_SELECT_COLUMNS)
      .single();

    if (error) {
      console.error('Error updating CRM contact');
      return NextResponse.json({ error: 'crm_contact_update_failed' }, { status: 500 });
    }

    await recordContactUpdatedTimelineEvent(
      supabase,
      data as Record<string, unknown>,
      changedFields,
    );

    return NextResponse.json({ success: true, contact: data }, { status: 200 });
  } catch {
    console.error('Unexpected CRM contact update error');
    return NextResponse.json({ error: 'crm_contact_update_failed' }, { status: 500 });
  }
}
