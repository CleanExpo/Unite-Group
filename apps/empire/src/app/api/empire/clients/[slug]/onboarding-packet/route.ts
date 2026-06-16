// GET /api/empire/clients/[slug]/onboarding-packet — UNI-2148.
//
// Returns the canonical onboarding packet for an existing nexus_clients row:
// the signals-driven buildClientLaunchPacket output, with each task status
// computed honestly from presence signals (env vars + existing columns). The
// packet is recommendation-only — nothing here triggers a live send, and no
// secret/token/env-name ever lands in the response body.
//
// Founder-only (requireAdmin). 404 when the slug has no client. Dynamic +
// no-store: readiness reflects current env presence, so it must never cache.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import { buildClientLaunchPacket } from '@/lib/empire/client-launch-packet';
import {
  computeClientReadinessSignals,
  type ClientReadinessRow,
} from '@/lib/empire/client-onboarding-readiness';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const { slug } = await params;
  const supabase = getAdminClient();

  // Pull the identity columns the packet renders plus the existing columns
  // readiness derives from (linear_project_id, brand_config, portal_content).
  // No provider-link columns are selected because they do not exist on
  // nexus_clients (UNI-2148: no schema change).
  const res = await supabase
    .from('nexus_clients')
    .select('id, slug, company_name, status, linear_project_id, brand_config, portal_content')
    .eq('slug', slug)
    .maybeSingle();

  if (res.error) {
    return NextResponse.json(
      { error: 'client_lookup_failed', detail: res.error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (!res.data) {
    return NextResponse.json(
      { error: 'client_not_found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const row = res.data as ClientReadinessRow & {
    id: string;
    company_name: string;
    status: string;
  };

  const signals = computeClientReadinessSignals(row, process.env);
  const packet = buildClientLaunchPacket(
    {
      id: row.id,
      slug: row.slug,
      company_name: row.company_name,
      status: row.status,
    },
    signals,
  );

  return NextResponse.json(
    { ok: true, packet },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
