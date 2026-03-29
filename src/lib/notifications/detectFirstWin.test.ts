/**
 * SYN-525: Jest tests for detectFirstWin
 */

import { detectFirstWin, formatWinMessage } from './detectFirstWin';
import type { PostPerformanceData, ClientBaseline } from './detectFirstWin';

const basePost: PostPerformanceData = {
  post_id: 'post-001',
  posted_at: '2026-03-25T10:00:00Z',
  platform: 'instagram',
  metric: 'impressions',
  actual_value: 300,
};

const baseBaseline: ClientBaseline = {
  client_id: 'client-001',
  metric: 'impressions',
  rolling_average_30d: 200,
  already_won: false,
};

describe('detectFirstWin', () => {
  it('returns null when post is below 1.3× threshold', () => {
    const post = { ...basePost, actual_value: 250 }; // 1.25× — below threshold
    const result = detectFirstWin(post, baseBaseline);
    expect(result).toBeNull();
  });

  it('returns WinEvent when post is exactly at 1.3× threshold', () => {
    const post = { ...basePost, actual_value: 260 }; // exactly 1.3×
    const result = detectFirstWin(post, baseBaseline);
    expect(result).not.toBeNull();
    expect(result?.improvement_pct).toBe(30);
    expect(result?.client_id).toBe('client-001');
  });

  it('returns WinEvent when post is above 1.3× threshold', () => {
    const post = { ...basePost, actual_value: 300 }; // 1.5×
    const result = detectFirstWin(post, baseBaseline);
    expect(result).not.toBeNull();
    expect(result?.improvement_pct).toBe(50);
    expect(result?.actual_value).toBe(300);
    expect(result?.baseline_value).toBe(200);
  });

  it('returns null when already_won is true (idempotency)', () => {
    const baseline = { ...baseBaseline, already_won: true };
    const post = { ...basePost, actual_value: 500 }; // way above threshold
    const result = detectFirstWin(post, baseline);
    expect(result).toBeNull();
  });

  it('returns null when rolling_average_30d is zero', () => {
    const baseline = { ...baseBaseline, rolling_average_30d: 0 };
    const result = detectFirstWin(basePost, baseline);
    expect(result).toBeNull();
  });

  it('returns null when metrics do not match', () => {
    const post = { ...basePost, metric: 'saves' as const, actual_value: 999 };
    const result = detectFirstWin(post, baseBaseline); // baseline metric is 'impressions'
    expect(result).toBeNull();
  });

  it('respects custom win_threshold_multiplier', () => {
    const baseline = { ...baseBaseline, win_threshold_multiplier: 2.0 };
    const post260 = { ...basePost, actual_value: 260 }; // 1.3× — below 2.0× custom threshold
    const post450 = { ...basePost, actual_value: 450 }; // 2.25× — above custom threshold

    expect(detectFirstWin(post260, baseline)).toBeNull();
    expect(detectFirstWin(post450, baseline)).not.toBeNull();
  });

  it('includes detected_at in WinEvent', () => {
    const before = new Date().toISOString();
    const result = detectFirstWin({ ...basePost, actual_value: 300 }, baseBaseline);
    const after = new Date().toISOString();
    expect(result?.detected_at).toBeDefined();
    expect(result!.detected_at >= before).toBe(true);
    expect(result!.detected_at <= after).toBe(true);
  });

  it('works for engagement_rate metric', () => {
    const post: PostPerformanceData = {
      post_id: 'post-eng',
      posted_at: '2026-03-25T10:00:00Z',
      platform: 'facebook',
      metric: 'engagement_rate',
      actual_value: 6.5,
    };
    const baseline: ClientBaseline = {
      client_id: 'client-002',
      metric: 'engagement_rate',
      rolling_average_30d: 4.0,
      already_won: false,
    };
    const result = detectFirstWin(post, baseline);
    expect(result).not.toBeNull();
    expect(result?.improvement_pct).toBe(62); // (6.5/4.0 - 1) * 100 = 62.5 → rounded to 62
  });
});

describe('formatWinMessage', () => {
  it('formats impressions win correctly', () => {
    const win = {
      client_id: 'client-001',
      post_id: 'post-001',
      posted_at: '2026-03-24T10:00:00Z', // Tuesday
      platform: 'instagram',
      metric: 'impressions' as const,
      actual_value: 312,
      baseline_value: 212,
      improvement_pct: 47,
      detected_at: new Date().toISOString(),
    };
    const msg = formatWinMessage(win);
    expect(msg).toContain('312');
    expect(msg).toContain('212');
    expect(msg).toContain('47%');
    expect(msg).toContain('impressions');
  });
});
