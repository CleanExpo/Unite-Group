// POST /api/empire/clients — create a nexus_clients row from the UNI-1995
// onboarding wizard. Founder-only.
//
// Validates the minimal shape, slug-uniques, normalises brand_config via the
// shared zod-equivalent guard (the same primary_color / accent_color hex
// rules used by UNI-1992's getBrandConfig), and INSERTs the row in status
// `onboarding`. The wizard sets status → 'active' on publish.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import { isValidBrandConfig, type BrandConfig } from '@/types/brand-config';
import { invalidateBrandConfigCache } from '@/lib/branding/getBrandConfig';
import { invalidatePortalContentCache } from '@/lib/branding/getPortalContent';
import { parseContactEmail } from './_validate-email';
import { parseWebsiteUrl } from './_validate-website';
import { recordClientAction } from './_record-action';
import { mapUniqueViolation } from './_map-unique-violation';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

interface CreateClientInput {
  company_name: string;
  slug: string;
  website_url?: string;
  contact_email?: string;
  brand_config?: BrandConfig;
}

function parseInput(body: unknown): CreateClientInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'invalid_json' };
  const obj = body as Record<string, unknown>;
  const company_name = typeof obj.company_name === 'string' ? obj.company_name.trim() : '';
  const slug = typeof obj.slug === 'string' ? obj.slug.trim() : '';
  if (!company_name || company_name.length > 200) return { error: 'invalid_company_name' };
  if (!SLUG_RE.test(slug)) return { error: 'invalid_slug' };

  const websiteResult = parseWebsiteUrl(obj.website_url);
  if (!websiteResult.ok) return { error: 'invalid_website_url' };
  const website_url = websiteResult.value ?? undefined;

  const emailResult = parseContactEmail(obj.contact_email);
  if (!emailResult.ok) return { error: 'invalid_contact_email' };
  const contact_email = emailResult.value ?? undefined;

  let brand_config: BrandConfig | undefined;
  if (obj.brand_config !== undefined) {
    if (!isValidBrandConfig(obj.brand_config)) {
      return { error: 'invalid_brand_config' };
    }
    brand_config = obj.brand_config;
  }

  return { company_name, slug, website_url, contact_email, brand_config };
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = parseInput(raw);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Slug-unique check before insert so the operator sees a clean error
  // instead of a Postgres 23505 leaking through.
  const existing = await supabase
    .from('nexus_clients')
    .select('id')
    .eq('slug', parsed.slug)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json(
      { error: 'slug_check_failed', detail: existing.error.message },
      { status: 500 },
    );
  }
  if (existing.data) {
    return NextResponse.json({ error: 'slug_in_use' }, { status: 409 });
  }

  const inserted = await supabase
    .from('nexus_clients')
    .insert({
      company_name: parsed.company_name,
      slug: parsed.slug,
      website_url: parsed.website_url ?? null,
      contact_email: parsed.contact_email ?? null,
      brand_config: parsed.brand_config ?? {},
      status: 'onboarding',
    })
    .select('id, slug, company_name, status')
    .single();

  if (inserted.error || !inserted.data) {
    // Race window: another POST snuck a row in between the pre-check above
    // and this INSERT. Postgres rejects with 23505 (unique_violation) on
    // either slug (pre-check race) or contact_email (no pre-check on this
    // column today). Map to a column-aware 409 so the wizard renders the
    // right copy.
    const unique = mapUniqueViolation(inserted.error);
    if (unique) {
      return NextResponse.json(unique.body, { status: unique.status });
    }
    return NextResponse.json(
      { error: 'client_insert_failed', detail: inserted.error?.message },
      { status: 500 },
    );
  }

  // Sister of #131. Bust the negative cache entry that would exist if anyone
  // hit /portal/<slug> before the client was created — the 5-min TTL on
  // negative results would otherwise keep serving 404 for up to 5 minutes
  // after a successful POST.
  invalidateBrandConfigCache(parsed.slug);
  invalidatePortalContentCache(parsed.slug);

  // Audit signal (#137 follow-up). Lights up ActivityLog + GlobalStatusBar
  // so the founder sees the create event surfaced on the Command Center.
  await recordClientAction({
    supabase,
    kind: 'created',
    slug: parsed.slug,
    actorEmail: gate.actorEmail,
    companyName: parsed.company_name,
  });

  return NextResponse.json(
    {
      ok: true,
      client: inserted.data,
      portal_url: `/en/portal/${inserted.data.slug}`,
    },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
