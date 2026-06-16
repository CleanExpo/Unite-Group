// PATCH /api/empire/clients/[slug] — update an existing nexus_clients row.
//
// Founder-only. Same validation contract as POST /api/empire/clients
// (UNI-1995): non-null fields are validated; brand_config goes through
// isValidBrandConfig. Status changes go through CHECK constraint.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import { isValidBrandConfig, type BrandConfig } from '@/types/brand-config';
import { isValidPortalContent, type PortalContent } from '@/types/portal-content';
import { invalidateBrandConfigCache } from '@/lib/branding/getBrandConfig';
import { invalidatePortalContentCache } from '@/lib/branding/getPortalContent';
import { parseContactEmail } from '../_validate-email';
import { parseWebsiteUrl } from '../_validate-website';
import { recordClientAction } from '../_record-action';
import { mapUniqueViolation } from '../_map-unique-violation';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set(['active', 'paused', 'churned', 'onboarding']);

interface PatchInput {
  company_name?: string;
  website_url?: string | null;
  contact_email?: string | null;
  brand_config?: BrandConfig;
  portal_content?: PortalContent;
  status?: string;
}

function parsePatch(body: unknown): PatchInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'invalid_json' };
  const obj = body as Record<string, unknown>;
  const out: PatchInput = {};

  if (obj.company_name !== undefined) {
    if (typeof obj.company_name !== 'string') return { error: 'invalid_company_name' };
    const trimmed = obj.company_name.trim();
    if (!trimmed || trimmed.length > 200) return { error: 'invalid_company_name' };
    out.company_name = trimmed;
  }

  if (obj.website_url !== undefined) {
    const result = parseWebsiteUrl(obj.website_url);
    if (!result.ok) return { error: 'invalid_website_url' };
    out.website_url = result.value;
  }

  if (obj.contact_email !== undefined) {
    const result = parseContactEmail(obj.contact_email);
    if (!result.ok) return { error: 'invalid_contact_email' };
    out.contact_email = result.value;
  }

  if (obj.brand_config !== undefined) {
    if (!isValidBrandConfig(obj.brand_config)) {
      return { error: 'invalid_brand_config' };
    }
    out.brand_config = obj.brand_config;
  }

  if (obj.portal_content !== undefined) {
    if (!isValidPortalContent(obj.portal_content)) {
      return { error: 'invalid_portal_content' };
    }
    out.portal_content = obj.portal_content;
  }

  if (obj.status !== undefined) {
    if (typeof obj.status !== 'string' || !ALLOWED_STATUSES.has(obj.status)) {
      return { error: 'invalid_status' };
    }
    out.status = obj.status;
  }

  if (Object.keys(out).length === 0) {
    return { error: 'empty_patch' };
  }
  return out;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = parsePatch(raw);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { slug } = await params;
  const supabase = getAdminClient();
  const res = await supabase
    .from('nexus_clients')
    .update(parsed)
    .eq('slug', slug)
    .select('id, slug, company_name, status, brand_config')
    .single();

  if (res.error || !res.data) {
    const code = res.error?.code;
    if (code === 'PGRST116') {
      // No rows matched
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
    }
    // PATCH can't violate slug uniqueness (slug is immutable) but CAN
    // violate contact_email uniqueness if the founder reassigns one that
    // belongs to another client.
    const unique = mapUniqueViolation(res.error);
    if (unique) {
      return NextResponse.json(unique.body, { status: unique.status });
    }
    return NextResponse.json(
      { error: 'client_update_failed', detail: res.error?.message },
      { status: 500 },
    );
  }

  // Bust the per-slug caches so /portal/[slug] reflects the edit on the
  // next request. Without this, the 5-min in-memory cache in
  // getBrandConfig + getPortalContent would serve stale data for up to
  // 5 minutes after every PATCH.
  invalidateBrandConfigCache(slug);
  invalidatePortalContentCache(slug);

  // Audit signal (#137 follow-up). Records which fields were touched in
  // the payload so the ActivityLog row reads e.g.:
  //   "Client updated: Acme (brand_config, status)"
  await recordClientAction({
    supabase,
    kind: 'updated',
    slug,
    actorEmail: gate.actorEmail,
    companyName: (res.data as { company_name?: string }).company_name,
    fields: Object.keys(parsed),
  });

  return NextResponse.json(
    { ok: true, client: res.data },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
