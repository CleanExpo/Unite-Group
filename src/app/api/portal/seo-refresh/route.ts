export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3';

async function dataForSEOPost(path: string, body: unknown, login: string, password: string) {
  const res = await fetch(`${DATAFORSEO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return res.json();
}

export async function POST() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return NextResponse.json({ error: 'DataForSEO not configured' }, { status: 500 });

  const domain = 'ccwonline.com.au';

  // Get domain overview
  const overviewData = await dataForSEOPost(
    '/dataforseo_labs/google/domain_rank_overview/live',
    [{ target: domain, language_code: 'en', location_code: 2036 }], // 2036 = Australia
    login, password
  );

  // Get top keywords
  const keywordsData = await dataForSEOPost(
    '/dataforseo_labs/google/ranked_keywords/live',
    [{ target: domain, language_code: 'en', location_code: 2036, limit: 20, order_by: ['keyword_data.keyword_info.search_volume,desc'] }],
    login, password
  );

  const overview = overviewData?.tasks?.[0]?.result?.[0] ?? {};
  const keywords: Array<{
    keyword_data: { keyword: string; keyword_info: { search_volume: number } };
    ranked_serp_element: { serp_item: { rank_absolute: number } };
  }> = keywordsData?.tasks?.[0]?.result?.[0]?.items ?? [];

  const seoSnapshot = {
    domain,
    fetchedAt: new Date().toISOString(),
    metrics: {
      organicTraffic: overview?.metrics?.organic?.etv ?? 0,
      totalKeywords: overview?.metrics?.organic?.count ?? 0,
      avgPosition: null as number | null,
    },
    topKeywords: keywords.slice(0, 10).map((kw) => ({
      keyword: kw.keyword_data?.keyword,
      position: kw.ranked_serp_element?.serp_item?.rank_absolute ?? null,
      volume: kw.keyword_data?.keyword_info?.search_volume ?? 0,
    })),
  };

  // Store in Supabase
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
