/**
 * SYN-525: Post Performance Sync — First Win Detection Hook
 *
 * Called by the analytics sync pipeline after each GA4 / social metrics write.
 * Fetches the client's 30-day rolling average, runs detectFirstWin(), and
 * persists the win notification if the threshold is met.
 *
 * Protected by x-internal-secret header (same as process-publish-queue route).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectFirstWin } from '@/lib/notifications/detectFirstWin';
import { saveFirstWinNotification } from '@/lib/notifications/saveFirstWinNotification';
import type { PostPerformanceData } from '@/lib/notifications/detectFirstWin';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface SyncPostPerformanceBody {
  client_id: string;
  post_id: string;
  posted_at: string; // ISO date
  platform: string;
  metric: PostPerformanceData['metric'];
  actual_value: number;
}

export async function POST(request: Request) {
  // Guard: internal secret
  const secret = request.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SyncPostPerformanceBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { client_id, post_id, posted_at, platform, metric, actual_value } = body;

  if (!client_id || !post_id || !metric || actual_value == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // 1. Check if first win already detected (idempotency guard)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_win_detected')
    .eq('id', client_id)
    .single();

  if (profileError) {
    console.error(JSON.stringify({ event: 'sync_post_perf_profile_error', client_id, error: profileError.message }));
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }

  if (profile?.first_win_detected) {
    // Already won — skip detection, no-op
    return NextResponse.json({ skipped: true, reason: 'first_win_already_detected' });
  }

  // 2. Compute 30-day rolling average for this client + metric from post_performance_metrics
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentPosts, error: metricsError } = await supabase
    .from('post_performance_metrics')
    .select('metric_value')
    .eq('client_id', client_id)
    .eq('metric', metric)
    .gte('posted_at', thirtyDaysAgo)
    .neq('post_id', post_id); // Exclude the current post from baseline

  if (metricsError) {
    console.error(JSON.stringify({ event: 'sync_post_perf_metrics_error', client_id, error: metricsError.message }));
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }

  if (!recentPosts || recentPosts.length === 0) {
    // Cold start — not enough history
    console.log(JSON.stringify({ event: 'first_win_cold_start', client_id, metric }));
    return NextResponse.json({ skipped: true, reason: 'no_baseline_data' });
  }

  const rolling_average_30d = recentPosts.reduce((sum, r) => sum + (r.metric_value ?? 0), 0) / recentPosts.length;

  // 3. Run first-win detection
  const post: PostPerformanceData = { post_id, posted_at, platform, metric, actual_value };
  const baseline = { client_id, metric, rolling_average_30d, already_won: false };

  const win = detectFirstWin(post, baseline);

  if (!win) {
    return NextResponse.json({ win_detected: false });
  }

  // 4. Persist the win notification
  await saveFirstWinNotification(win);

  console.log(JSON.stringify({
    event: 'first_win_detected_and_saved',
    client_id,
    post_id,
    metric,
    improvement_pct: win.improvement_pct,
  }));

  return NextResponse.json({ win_detected: true, improvement_pct: win.improvement_pct });
}
