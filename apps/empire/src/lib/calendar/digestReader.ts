/**
 * SYN-521: Digest Reader
 * Reads the last N weekly digests for a client and extracts DigestSignals.
 * Returns null if fewer than minDigestCount digests exist (cold-start gate).
 */
import { createClient } from '@supabase/supabase-js';
import type { DigestSignals, Platform } from './types';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function readDigestSignals(
  client_id: string,
  minDigestCount = 3
): Promise<{ signals: DigestSignals | null; digest_count: number }> {
  const supabase = getServiceClient();

  const { data: digests, error } = await supabase
    .from('weekly_digests')
    .select('top_content_types, peak_engagement_hours, peak_days, winning_hashtag_clusters, best_platform, avg_engagement_rate')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false })
    .limit(minDigestCount + 2);

  if (error || !digests || digests.length < minDigestCount) {
    console.log(JSON.stringify({
      event: 'calendar_cold_start',
      client_id,
      digest_count: digests?.length ?? 0,
      required: minDigestCount,
    }));
    return { signals: null, digest_count: digests?.length ?? 0 };
  }

  // Aggregate signals across last N digests
  const allContentTypes: string[] = digests.flatMap(d => d.top_content_types ?? []);
  const allHours: number[] = digests.flatMap(d => d.peak_engagement_hours ?? []);
  const allDays: number[] = digests.flatMap(d => d.peak_days ?? []);
  const allHashtagClusters: string[][] = digests.flatMap(d => d.winning_hashtag_clusters ?? []);
  const avgEngagement = digests.reduce((sum, d) => sum + (d.avg_engagement_rate ?? 0), 0) / digests.length;

  // Find most common values
  const topContentTypes = mostCommon(allContentTypes, 3);
  const peakHours = mostCommon(allHours, 5);
  const peakDays = mostCommon(allDays, 3);
  const bestPlatformValues: string[] = digests.map(d => d.best_platform).filter(Boolean);
  const bestPlatform = (bestPlatformValues[0] as Platform) ?? 'instagram';

  return {
    signals: {
      client_id,
      top_content_types: topContentTypes,
      peak_engagement_hours: peakHours,
      peak_days: peakDays,
      winning_hashtag_clusters: allHashtagClusters.slice(0, 5),
      best_platform: bestPlatform,
      avg_engagement_rate: avgEngagement,
      digest_count: digests.length,
    },
    digest_count: digests.length,
  };
}

function mostCommon<T>(arr: T[], topN: number): T[] {
  const freq = new Map<string, number>();
  for (const item of arr) {
    const key = String(item);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => arr.find(item => String(item) === key) as T);
}
