// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface PortalSummary {
  clientName: string;
  plan: string;
  arrAud: number;
  domain: string | null;
  websiteScore: number | null;
  seoSnapshot: Record<string, unknown> | null;
  lastReportAt: string | null;
}

const DEFAULTS: PortalSummary = {
  clientName: 'CCW-CRM',
  plan: 'Pro',
  arrAud: 33000,
  domain: null,
  websiteScore: 78,
  seoSnapshot: null,
  lastReportAt: null,
};

export async function GET() {
  const supabase = await createClient();

  // Auth gate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch CCW business + portal row
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, domain, arr_aud')
    .eq('slug', 'ccw-crm')
    .single();

  if (!business) {
    return NextResponse.json(DEFAULTS);
  }

  const { data: portal } = await supabase
    .from('client_portals')
    .select('domain_tracked, website_score, seo_snapshot, last_report_at')
    .eq('client_id', business.id)
    .single();

  const summary: PortalSummary = {
    clientName: business.name ?? DEFAULTS.clientName,
    plan: 'Pro',
    arrAud: Number(business.arr_aud) || DEFAULTS.arrAud,
    domain: portal?.domain_tracked ?? business.domain ?? null,
    websiteScore: portal?.website_score ?? DEFAULTS.websiteScore,
    seoSnapshot: (portal?.seo_snapshot as Record<string, unknown>) ?? null,
    lastReportAt: portal?.last_report_at ?? null,
  };

  return NextResponse.json(summary);
}
