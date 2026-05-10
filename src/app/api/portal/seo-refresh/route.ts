export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

const SEMRUSH_BASE = 'https://api.semrush.com/';

async function semrushGet(params: Record<string, string>, apiKey: string): Promise<string> {
  const qs = new URLSearchParams({ ...params, key: apiKey });
  const res = await fetch(`${SEMRUSH_BASE}?${qs}`, {
    signal: AbortSignal.timeout(15000),
  });
  return res.text();
}

function parseSemrushCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split('\r\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(';');
  return lines.slice(1).map((line) => {
    const values = line.split(';');
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

export async function POST() {
  const apiKey = process.env.SEMRUSH_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'SEMRUSH_API_KEY not configured' }, { status: 500 });

  const domain = 'ccwonline.com.au';
  const database = 'au';

  // Domain overview
  const overviewRaw = await semrushGet({
    type: 'domain_ranks',
    export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
    domain,
    database,
  }, apiKey);

  const [overview] = parseSemrushCsv(overviewRaw);

  // Top organic keywords (by traffic)
  const keywordsRaw = await semrushGet({
    type: 'domain_organic',
    export_columns: 'Ph,Po,Nq,Tr',
    domain,
    database,
    display_limit: '20',
    display_sort: 'tr_desc',
  }, apiKey);

  const keywords = parseSemrushCsv(keywordsRaw);

  const seoSnapshot = {
    domain,
    fetchedAt: new Date().toISOString(),
    metrics: {
      organicTraffic: parseInt(overview?.Ot ?? '0', 10),
      totalKeywords: parseInt(overview?.Or ?? '0', 10),
      domainRank: parseInt(overview?.Rk ?? '0', 10),
    },
    topKeywords: keywords.slice(0, 10).map((kw) => ({
      keyword: kw.Ph,
      position: parseInt(kw.Po ?? '0', 10),
      volume: parseInt(kw.Nq ?? '0', 10),
    })),
  };

  const supabase = getAdminClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', 'ccw-crm')
    .single();

  if (business?.id) {
    await supabase
      .from('client_portals')
      .upsert({
        client_id: business.id,
        seo_snapshot: seoSnapshot,
        domain_tracked: domain,
        last_report_at: new Date().toISOString(),
      });
  }

  return NextResponse.json({ success: true, seoSnapshot });
}
