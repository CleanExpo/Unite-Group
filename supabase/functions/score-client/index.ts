// Cron: 0 2 * * * (2am UTC daily = midnight AEDT)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// NOTE: computeAuthorityScore is imported inline to keep the function self-contained
// In production, this logic should be duplicated or imported via a shared module

interface ClientScoreInput {
  id: string;
  profile_complete_pct: number;
  reviews_per_month: number;
  days_since_last_post: number;
  backlink_count: number;
  has_localbusiness_schema: boolean;
  avg_star_rating: number;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch all active clients with their scoring signals
  const { data: clients, error } = await supabase
    .from('client_scoring_signals') // view or table joining clients + signals
    .select('id, profile_complete_pct, reviews_per_month, days_since_last_post, backlink_count, has_localbusiness_schema, avg_star_rating')
    .eq('is_active', true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let scored = 0;
  let errors = 0;

  for (const client of (clients as ClientScoreInput[]) ?? []) {
    try {
      // Inline score computation (mirrors computeAuthorityScore.ts logic)
      const profileScore = Math.round((Math.min(100, Math.max(0, client.profile_complete_pct ?? 0)) / 100) * 25);
      const reviewScore = Math.round(Math.min(20, ((client.reviews_per_month ?? 0) / 5) * 20));
      const freshnessDays = Math.max(0, client.days_since_last_post ?? 30);
      const freshnessScore = Math.round(Math.max(0, 20 - (freshnessDays / 30) * 20));
      const backlinkScore = Math.round(Math.min(15, ((client.backlink_count ?? 0) / 50) * 15));
      const schemaScore = (client.has_localbusiness_schema ? 5 : 0) + 0; // videoobject not in view yet
      const starClamped = Math.min(5, Math.max(1, client.avg_star_rating ?? 3));
      const socialScore = Math.round(2 + ((starClamped - 1) / 4) * 8);
      const score = Math.min(100, profileScore + reviewScore + freshnessScore + backlinkScore + schemaScore + socialScore);
      const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

      await supabase.from('authority_scores').insert({
        client_id: client.id,
        score,
        grade,
        eeat_breakdown: { profileScore, reviewScore, freshnessScore, backlinkScore, schemaScore, socialScore },
        top_improvement_action: 'See your Authority Hub for improvement actions.',
        signals_version: '1.0.0',
        computed_at: new Date().toISOString(),
      });
      scored++;
    } catch (err) {
      console.error(JSON.stringify({ event: 'score_error', client_id: client.id, error: String(err) }));
      errors++;
    }
  }

  return new Response(JSON.stringify({ scored, errors }), { headers: { 'Content-Type': 'application/json' } });
});
