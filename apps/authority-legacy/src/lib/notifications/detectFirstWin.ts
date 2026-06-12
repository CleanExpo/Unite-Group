/**
 * SYN-525: First Win Detection
 * Pure function — no side effects. Accepts post performance data + client baseline.
 * Returns WinEvent if post engagement ≥ 1.3× rolling average, else null.
 */

export interface PostPerformanceData {
  post_id: string;
  posted_at: string; // ISO date
  platform: string;
  metric: 'reach' | 'engagement_rate' | 'click_through' | 'saves' | 'impressions';
  actual_value: number;
}

export interface ClientBaseline {
  client_id: string;
  metric: PostPerformanceData['metric'];
  rolling_average_30d: number; // 30-day rolling average for the same metric
  already_won: boolean; // true = first win already flagged, don't trigger again
  win_threshold_multiplier?: number; // default 1.3, configurable per client
}

export interface WinEvent {
  client_id: string;
  post_id: string;
  posted_at: string;
  platform: string;
  metric: PostPerformanceData['metric'];
  actual_value: number;
  baseline_value: number;
  improvement_pct: number; // e.g. 47 for "47% above average"
  detected_at: string; // ISO date
}

/**
 * Detect if a post represents a client's first meaningful win.
 *
 * @param post - Performance data for the post being evaluated
 * @param baseline - Client's rolling baseline for the same metric
 * @returns WinEvent if threshold met and first win not already triggered, else null
 */
export function detectFirstWin(
  post: PostPerformanceData,
  baseline: ClientBaseline
): WinEvent | null {
  // Idempotency: if first win already detected, never fire again
  if (baseline.already_won) {
    return null;
  }

  // Can't compute win against zero baseline (new client with no history)
  if (baseline.rolling_average_30d <= 0) {
    return null;
  }

  // Metrics must match
  if (post.metric !== baseline.metric) {
    return null;
  }

  const threshold = baseline.win_threshold_multiplier ?? 1.3;
  const ratio = post.actual_value / baseline.rolling_average_30d;

  if (ratio < threshold) {
    return null;
  }

  const improvement_pct = Math.round((ratio - 1) * 100);

  return {
    client_id: baseline.client_id,
    post_id: post.post_id,
    posted_at: post.posted_at,
    platform: post.platform,
    metric: post.metric,
    actual_value: post.actual_value,
    baseline_value: baseline.rolling_average_30d,
    improvement_pct,
    detected_at: new Date().toISOString(),
  };
}

/**
 * Human-readable description of the win for use in notification copy.
 * Example: "Your Tuesday post got 312 impressions — 47% above your 212-impression average"
 */
export function formatWinMessage(win: WinEvent): string {
  const metricLabels: Record<WinEvent['metric'], string> = {
    reach: 'reach',
    engagement_rate: 'engagement',
    click_through: 'click-throughs',
    saves: 'saves',
    impressions: 'impressions',
  };

  const label = metricLabels[win.metric];
  const postedDate = new Date(win.posted_at).toLocaleDateString('en-AU', { weekday: 'long' });
  const actualFormatted = Math.round(win.actual_value).toLocaleString();
  const baselineFormatted = Math.round(win.baseline_value).toLocaleString();

  if (win.metric === 'engagement_rate' || win.metric === 'click_through') {
    return `Your ${postedDate} post got ${win.actual_value.toFixed(1)}% ${label} — ${win.improvement_pct}% above your ${win.baseline_value.toFixed(1)}% average`;
  }

  return `Your ${postedDate} post got ${actualFormatted} ${label} — ${win.improvement_pct}% above your ${baselineFormatted} average`;
}
