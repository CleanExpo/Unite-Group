/**
 * SYN-513: Authority Score Computation
 * Pure function — deterministic, no side effects, fully testable.
 * Score: 0-100 composite E.E.A.T. metric for local businesses.
 */

export interface AuthorityScoreInput {
  // Google Business Profile completeness (0-100 percentage)
  profile_complete_pct: number;
  // Review velocity (reviews per month)
  reviews_per_month: number;
  // Days since last content post
  days_since_last_post: number;
  // Total backlink count
  backlink_count: number;
  // Schema presence
  has_localbusiness_schema: boolean;
  has_videoobject_schema: boolean;
  // Average star rating (1-5)
  avg_star_rating: number;
}

export interface EEATBreakdown {
  google_profile: { score: number; max: number; label: string; action: string | null };
  review_velocity: { score: number; max: number; label: string; action: string | null };
  content_freshness: { score: number; max: number; label: string; action: string | null };
  backlink_signals: { score: number; max: number; label: string; action: string | null };
  schema_coverage: { score: number; max: number; label: string; action: string | null };
  social_proof: { score: number; max: number; label: string; action: string | null };
}

export interface AuthorityScoreResult {
  score: number; // 0-100, rounded integer
  breakdown: EEATBreakdown;
  signals_version: string; // semver for schema changes
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  top_improvement_action: string;
}

const SIGNALS_VERSION = '1.0.0';

export function computeAuthorityScore(input: AuthorityScoreInput): AuthorityScoreResult {
  // 1. Google Profile (max 25)
  const profileScore = Math.round((Math.min(100, Math.max(0, input.profile_complete_pct)) / 100) * 25);
  const profileAction = profileScore < 20
    ? 'Complete your Google Business Profile to unlock more score points'
    : null;

  // 2. Review velocity (max 20): linear 0-5 reviews/month → 0-20
  const reviewScore = Math.round(Math.min(20, (input.reviews_per_month / 5) * 20));
  const reviewAction = reviewScore < 10
    ? 'Ask recent customers for Google reviews to boost your review velocity'
    : null;

  // 3. Content freshness (max 20): 0 days=20, 30+ days=0, linear
  const freshnessDays = Math.max(0, input.days_since_last_post);
  const freshnessScore = Math.round(Math.max(0, 20 - (freshnessDays / 30) * 20));
  const freshnessAction = freshnessScore < 10
    ? `You haven't posted in ${freshnessDays} days — post today to recover freshness score`
    : null;

  // 4. Backlinks (max 15): 0=0, 50+=15, linear
  const backlinkScore = Math.round(Math.min(15, (input.backlink_count / 50) * 15));
  const backlinkAction = backlinkScore < 8
    ? 'Build local citations and backlinks to improve your authority signals'
    : null;

  // 5. Schema coverage (max 10): 5pts each
  const schemaScore = (input.has_localbusiness_schema ? 5 : 0) + (input.has_videoobject_schema ? 5 : 0);
  const schemaAction = schemaScore < 10
    ? !input.has_localbusiness_schema
      ? 'LocalBusiness schema not detected — your Authority Hub page fixes this'
      : 'Add VideoObject schema by connecting your YouTube channel'
    : null;

  // 6. Social proof (max 10): star rating 1→2pts, 5→10pts
  const starClamped = Math.min(5, Math.max(1, input.avg_star_rating));
  const socialScore = Math.round(2 + ((starClamped - 1) / 4) * 8);
  const socialAction = socialScore < 7
    ? 'Respond to all reviews and address negative feedback to improve your rating'
    : null;

  const total = profileScore + reviewScore + freshnessScore + backlinkScore + schemaScore + socialScore;
  const score = Math.min(100, Math.max(0, total));

  const grade: AuthorityScoreResult['grade'] =
    score >= 85 ? 'A' :
    score >= 70 ? 'B' :
    score >= 55 ? 'C' :
    score >= 40 ? 'D' : 'F';

  // Pick top improvement action (highest potential gain first)
  const actions = [
    { action: profileAction, potential: 25 - profileScore },
    { action: reviewAction, potential: 20 - reviewScore },
    { action: freshnessAction, potential: 20 - freshnessScore },
    { action: backlinkAction, potential: 15 - backlinkScore },
    { action: schemaAction, potential: 10 - schemaScore },
    { action: socialAction, potential: 10 - socialScore },
  ]
    .filter(a => a.action !== null)
    .sort((a, b) => b.potential - a.potential);

  const top_improvement_action = actions[0]?.action ?? 'Your Authority Score is strong — keep up the great work!';

  return {
    score,
    grade,
    top_improvement_action,
    signals_version: SIGNALS_VERSION,
    breakdown: {
      google_profile: { score: profileScore, max: 25, label: 'Google Profile', action: profileAction },
      review_velocity: { score: reviewScore, max: 20, label: 'Review Velocity', action: reviewAction },
      content_freshness: { score: freshnessScore, max: 20, label: 'Content Freshness', action: freshnessAction },
      backlink_signals: { score: backlinkScore, max: 15, label: 'Backlink Signals', action: backlinkAction },
      schema_coverage: { score: schemaScore, max: 10, label: 'Schema Coverage', action: schemaAction },
      social_proof: { score: socialScore, max: 10, label: 'Social Proof', action: socialAction },
    },
  };
}
