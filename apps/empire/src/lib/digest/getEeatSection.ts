import { createClient } from '@supabase/supabase-js';

export interface EeatSection {
  current_score: number;
  current_grade: string;
  delta: number | null; // null = first week (no prior)
  top_mover: string | null;
  breakdown: Record<string, number>;
  is_first_week: boolean;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getEeatSection(client_id: string): Promise<EeatSection | null> {
  const supabase = getServiceClient();

  // Get the two most recent authority scores
  const { data: scores, error } = await supabase
    .from('authority_scores')
    .select('score, grade, breakdown, computed_at')
    .eq('client_id', client_id)
    .order('computed_at', { ascending: false })
    .limit(2);

  if (error || !scores || scores.length === 0) {
    return null;
  }

  const current = scores[0];
  const prior = scores[1] ?? null;

  // Compute delta
  const delta = prior ? current.score - prior.score : null;

  // Identify top mover: component with highest absolute change
  let top_mover: string | null = null;
  if (prior && current.breakdown && prior.breakdown) {
    let maxChange = 0;
    for (const [component, value] of Object.entries(current.breakdown as Record<string, number>)) {
      const priorValue = (prior.breakdown as Record<string, number>)[component] ?? 0;
      const change = Math.abs(value - priorValue);
      if (change > maxChange) {
        maxChange = change;
        top_mover = component;
      }
    }
  }

  return {
    current_score: current.score,
    current_grade: current.grade,
    delta,
    top_mover,
    breakdown: (current.breakdown as Record<string, number>) ?? {},
    is_first_week: prior === null,
  };
}
