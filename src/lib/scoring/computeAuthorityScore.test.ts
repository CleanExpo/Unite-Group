/**
 * SYN-513: Authority Score Tests
 * Run with: npx jest src/lib/scoring/computeAuthorityScore.test.ts
 */

import { computeAuthorityScore, AuthorityScoreInput } from './computeAuthorityScore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const perfectInput: AuthorityScoreInput = {
  profile_complete_pct: 100,
  reviews_per_month: 5,
  days_since_last_post: 0,
  backlink_count: 50,
  has_localbusiness_schema: true,
  has_videoobject_schema: true,
  avg_star_rating: 5,
};

const zeroInput: AuthorityScoreInput = {
  profile_complete_pct: 0,
  reviews_per_month: 0,
  days_since_last_post: 0, // freshness still counts at 0 days
  backlink_count: 0,
  has_localbusiness_schema: false,
  has_videoobject_schema: false,
  avg_star_rating: 1, // minimum: social proof gives 2pts
};

// ---------------------------------------------------------------------------
// Boundary / edge inputs
// ---------------------------------------------------------------------------

describe('computeAuthorityScore — boundary inputs', () => {
  test('all-zero inputs → score = 2 (only social proof minimum)', () => {
    // days_since_last_post=0 gives freshness=20, but all other signals are zero
    // profile=0, review=0, freshness=20, backlink=0, schema=0, social=2 → 22
    // Re-read rubric: "all-zero" means zero for numeric fields and false for booleans
    // but avg_star_rating=1 gives social=2, and days_since_last_post=0 gives freshness=20
    // To get score=2 we need days_since_last_post >= 30 (freshness=0)
    const input: AuthorityScoreInput = {
      profile_complete_pct: 0,
      reviews_per_month: 0,
      days_since_last_post: 30,
      backlink_count: 0,
      has_localbusiness_schema: false,
      has_videoobject_schema: false,
      avg_star_rating: 1,
    };
    const result = computeAuthorityScore(input);
    expect(result.score).toBe(2);
  });

  test('perfect inputs → score = 100', () => {
    const result = computeAuthorityScore(perfectInput);
    expect(result.score).toBe(100);
  });

  test('days_since_last_post=0 → freshnessScore=20', () => {
    const result = computeAuthorityScore({ ...zeroInput, days_since_last_post: 0 });
    expect(result.breakdown.content_freshness.score).toBe(20);
  });

  test('days_since_last_post=30 → freshnessScore=0', () => {
    const result = computeAuthorityScore({ ...zeroInput, days_since_last_post: 30 });
    expect(result.breakdown.content_freshness.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Partial / realistic input
// ---------------------------------------------------------------------------

describe('computeAuthorityScore — partial inputs', () => {
  test('partial inputs produce correct component scores', () => {
    const input: AuthorityScoreInput = {
      profile_complete_pct: 50,
      reviews_per_month: 2,
      days_since_last_post: 10,
      backlink_count: 25,
      has_localbusiness_schema: true,
      has_videoobject_schema: true,
      avg_star_rating: 4,
    };
    const result = computeAuthorityScore(input);

    // profile: round(50/100 * 25) = 13
    expect(result.breakdown.google_profile.score).toBe(13);
    // review: round(min(20, (2/5)*20)) = round(8) = 8
    expect(result.breakdown.review_velocity.score).toBe(8);
    // freshness: round(max(0, 20 - (10/30)*20)) = round(20 - 6.67) = round(13.33) = 13
    expect(result.breakdown.content_freshness.score).toBe(13);
    // backlink: round(min(15, (25/50)*15)) = round(7.5) = 8
    expect(result.breakdown.backlink_signals.score).toBe(8);
    // schema: 5 + 5 = 10
    expect(result.breakdown.schema_coverage.score).toBe(10);
    // social: round(2 + ((4-1)/4)*8) = round(2 + 6) = 8
    expect(result.breakdown.social_proof.score).toBe(8);

    // total: 13 + 8 + 13 + 8 + 10 + 8 = 60
    expect(result.score).toBe(60);
    expect(result.grade).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// Grade boundaries
// ---------------------------------------------------------------------------

describe('computeAuthorityScore — grade boundaries', () => {
  function makeScoreInput(targetScore: number): AuthorityScoreInput {
    // Build inputs that produce exactly the target total via profile_complete_pct,
    // with all other signals fixed so they contribute a known amount.
    // Fixed contributions: review=0, freshness=0 (30 days), backlink=0, schema=0, social=2
    // Fixed total from non-profile = 2
    // profile_pct needed = (targetScore - 2) / 25 * 100
    // We clamp to [0, 100] and accept minor rounding
    const profilePct = Math.min(100, Math.max(0, ((targetScore - 2) / 25) * 100));
    return {
      profile_complete_pct: profilePct,
      reviews_per_month: 0,
      days_since_last_post: 30,
      backlink_count: 0,
      has_localbusiness_schema: false,
      has_videoobject_schema: false,
      avg_star_rating: 1,
    };
  }

  const cases: Array<[number, 'A' | 'B' | 'C' | 'D' | 'F']> = [
    [85, 'A'],
    [84, 'B'],
    [70, 'B'],
    [69, 'C'],
    [55, 'C'],
    [54, 'D'],
    [40, 'D'],
    [39, 'F'],
  ];

  test.each(cases)('score %i → grade %s', (targetScore, expectedGrade) => {
    const input = makeScoreInput(targetScore);
    const result = computeAuthorityScore(input);
    // The computed score may be off by 1 due to rounding; test the grade of the actual score
    expect(result.grade).toBe(expectedGrade);
  });
});

// ---------------------------------------------------------------------------
// top_improvement_action
// ---------------------------------------------------------------------------

describe('computeAuthorityScore — top_improvement_action', () => {
  test('returns a non-empty string when there are improvement areas', () => {
    const result = computeAuthorityScore(zeroInput);
    expect(typeof result.top_improvement_action).toBe('string');
    expect(result.top_improvement_action.length).toBeGreaterThan(0);
  });

  test('returns the "strong" message when all inputs are perfect', () => {
    const result = computeAuthorityScore(perfectInput);
    expect(result.top_improvement_action).toBe(
      'Your Authority Score is strong — keep up the great work!'
    );
  });

  test('has_localbusiness_schema=false triggers action mentioning LocalBusiness', () => {
    const input: AuthorityScoreInput = {
      ...perfectInput,
      has_localbusiness_schema: false,
      has_videoobject_schema: true,
      // Make schema the only improvement area by maxing everything else
    };
    const result = computeAuthorityScore(input);
    expect(result.breakdown.schema_coverage.action).toContain('LocalBusiness');
  });
});

// ---------------------------------------------------------------------------
// Structural / type checks
// ---------------------------------------------------------------------------

describe('computeAuthorityScore — result shape', () => {
  test('result has all required fields', () => {
    const result = computeAuthorityScore(perfectInput);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('top_improvement_action');
    expect(result).toHaveProperty('signals_version', '1.0.0');
    expect(result).toHaveProperty('breakdown');
  });

  test('breakdown has all 6 components with correct max values', () => {
    const result = computeAuthorityScore(perfectInput);
    expect(result.breakdown.google_profile.max).toBe(25);
    expect(result.breakdown.review_velocity.max).toBe(20);
    expect(result.breakdown.content_freshness.max).toBe(20);
    expect(result.breakdown.backlink_signals.max).toBe(15);
    expect(result.breakdown.schema_coverage.max).toBe(10);
    expect(result.breakdown.social_proof.max).toBe(10);
  });

  test('score is always an integer between 0 and 100', () => {
    const inputs: AuthorityScoreInput[] = [
      zeroInput,
      perfectInput,
      { ...zeroInput, profile_complete_pct: 33.3, avg_star_rating: 3.7 },
    ];
    for (const input of inputs) {
      const { score } = computeAuthorityScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    }
  });
});
