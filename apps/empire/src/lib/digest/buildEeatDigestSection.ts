import { getEeatSection } from './getEeatSection';
import { generateEeatAction } from './generateEeatAction';

export interface EeatDigestData {
  score: number;
  grade: string;
  delta: number | null;
  delta_label: string; // "Baseline established" or "+5" or "-2"
  delta_arrow: string; // "→" or "↑" or "↓"
  top_mover: string | null;
  breakdown: Record<string, number>;
  action: string;
  skipped: boolean; // true if no authority_scores data
}

export async function buildEeatDigestSection(client_id: string): Promise<EeatDigestData> {
  const section = await getEeatSection(client_id);

  if (!section) {
    return {
      score: 0, grade: '', delta: null,
      delta_label: '', delta_arrow: '→',
      top_mover: null, breakdown: {}, action: '',
      skipped: true,
    };
  }

  const action = await generateEeatAction(client_id, section.breakdown, section.current_score);

  let delta_label: string;
  let delta_arrow: string;

  if (section.is_first_week || section.delta === null) {
    delta_label = 'Baseline established — track progress from next week';
    delta_arrow = '→';
  } else if (section.delta > 0) {
    delta_label = `+${section.delta} pts this week`;
    delta_arrow = '↑';
  } else if (section.delta < 0) {
    delta_label = `${section.delta} pts this week`;
    delta_arrow = '↓';
  } else {
    delta_label = 'No change this week';
    delta_arrow = '→';
  }

  return {
    score: section.current_score,
    grade: section.current_grade,
    delta: section.delta,
    delta_label,
    delta_arrow,
    top_mover: section.top_mover,
    breakdown: section.breakdown,
    action,
    skipped: false,
  };
}
