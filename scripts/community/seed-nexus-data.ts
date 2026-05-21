import { getAdminClient } from '@/lib/supabase/admin';

export async function seedNexusTestData() {
  const supabase = getAdminClient();

  // Get column IDs
  const { data: columns } = await supabase
    .from('nexus_columns')
    .select('id, title');

  const colMap = Object.fromEntries(columns?.map(c => [c.title, c.id]) || []);

  const testCards = [
    {
      board_id: '00000000-0000-0000-0000-000000000001',
      column_id: colMap['Agent-Proposed Ideas'],
      title: 'Add AI-powered quote revision suggestions in CCW-CRM',
      project: 'CCW',
      category: 'Product',
      proposed_by: 'Pi-CEO',
      summary: 'Enable sales team to receive contextual AI suggestions when revising quotes based on historical win rates and client data.',
      idea_quality_score: 78,
      strategic_alignment_score: 85,
      confidence_score: 72,
      priority: 'P2',
      approval_status: 'proposed',
      source_signal: 'CCW sales team feedback on slow quote turnaround',
      effort_hours: 14,
      risk_level: 'Low',
      reversibility: 'Moderate',
      founder_attention_required: false,
      is_blocked: false
    },
    {
      board_id: '00000000-0000-0000-0000-000000000001',
      column_id: colMap['Founder Review'],
      title: 'Create RestoreAssist customer portal explainer hub',
      project: 'RestoreAssist',
      category: 'Growth',
      proposed_by: 'Pi-CEO',
      summary: 'Build free educational hub inside customer portal covering insurance jargon, restoration process, and claim tips to differentiate RA.',
      idea_quality_score: 82,
      strategic_alignment_score: 90,
      confidence_score: 80,
      priority: 'P1',
      approval_status: 'proposed',
      source_signal: 'Competitive analysis showing no vendor offers deep homeowner education',
      effort_hours: 35,
      risk_level: 'Medium',
      reversibility: 'Easy',
      founder_attention_required: true,
      is_blocked: false
    },
    {
      board_id: '00000000-0000-0000-0000-000000000001',
      column_id: colMap['Approved / Auto-Approved'],
      title: 'Auto-import NRPG jobs into RestoreAssist inspections',
      project: 'DR-NRPG',
      category: 'Integration',
      proposed_by: 'Pi-CEO',
      summary: 'When a DR-NRPG job is accepted, automatically create corresponding inspection in RestoreAssist with pre-filled data.',
      idea_quality_score: 85,
      strategic_alignment_score: 88,
      confidence_score: 75,
      priority: 'P2',
      approval_status: 'approved',
      source_signal: 'High volume of manual double-handling between DR-NRPG and RA',
      effort_hours: 12,
      risk_level: 'Low',
      reversibility: 'Easy',
      founder_attention_required: false,
      is_blocked: false
    }
  ];

  const { error } = await supabase.from('nexus_cards').insert(testCards);
  
  if (error) {
    console.error('Seed error:', error);
    return { success: false, error };
  }

  return { success: true, count: testCards.length };
}
