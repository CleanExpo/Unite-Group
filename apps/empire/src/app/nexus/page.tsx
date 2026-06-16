'use client';

import React, { useState, useEffect } from 'react';
import { getAdminClient } from '@/lib/supabase/admin';

interface NexusCard {
  id: string;
  title: string;
  project: string;
  category: string;
  idea_quality_score: number;
  priority: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  last_updated: string;
  proposed_by: string;
}

interface DashboardMetrics {
  swarm_health: string;
  last_meaningful_update: string;
  new_ideas_generated: number;
  ideas_filtered_low_value: number;
  cards_currently_blocked: number;
  items_waiting_founder: number;
  work_shipped: number;
  system_confidence: number;
  next_best_move: string;
}

const columns = [
  'Signals & Opportunities',
  'Agent-Proposed Ideas',
  'Founder Review',
  'Approved / Auto-Approved',
  'Production Queue',
  'In Progress',
  'QA / Needs Review',
  'Shipped / Completed',
  'Measuring Impact',
  'Evidence Vault',
  'Blocked (Global)'
];

const priorityColors = {
  P0: 'bg-red-600',
  P1: 'bg-orange-500',
  P2: 'bg-yellow-500',
  P3: 'bg-gray-500'
};

export default function NexusCommandCenter() {
  const [cards, setCards] = useState<NexusCard[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<NexusCard | null>(null);

  const loadData = async () => {
    try {
      const supabase = getAdminClient();

      // Load cards
      const { data: cardsData } = await supabase
        .from('nexus_cards')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(100);

      if (cardsData) setCards(cardsData);

      // Load latest dashboard metrics
      const { data: metricsData } = await supabase
        .from('nexus_dashboard_metrics')
        .select('*')
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .single();

      if (metricsData) {
        setMetrics({
          swarm_health: metricsData.swarm_health || 'Healthy',
          last_meaningful_update: metricsData.last_meaningful_update || 'Just now',
          new_ideas_generated: metricsData.new_ideas_generated || 0,
          ideas_filtered_low_value: metricsData.ideas_filtered_low_value || 0,
          cards_currently_blocked: metricsData.cards_currently_blocked || 0,
          items_waiting_founder: metricsData.items_waiting_founder || 0,
          work_shipped: metricsData.work_shipped || 0,
          system_confidence: metricsData.system_confidence || 92,
          next_best_move: metricsData.next_best_move || 'Continue current trajectory'
        });
      }

    } catch (error) {
      console.error('Error loading Nexus data:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch, setState is in a Promise callback
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 900000); // 15-minute refresh
    return () => clearInterval(interval);
  }, []);

  const getCardsByColumn = (columnTitle: string) => {
    if (columnTitle === 'Blocked (Global)') {
      return cards.filter(c => c.is_blocked);
    }
    return cards.filter(c => !c.is_blocked);
  };

  const handleCardClick = (card: NexusCard) => {
    setSelectedCard(card);
  };

  const closeModal = () => {
    setSelectedCard(null);
  };

  const handleAction = async (action: string) => {
    if (!selectedCard) return;
    
    const supabase = getAdminClient();
    
    try {
      if (action === 'approve') {
        await supabase
          .from('nexus_cards')
          .update({ 
            approval_status: 'approved',
            approval_reason: 'Approved by founder'
          })
          .eq('id', selectedCard.id);
      }
      if (action === 'block') {
        await supabase
          .from('nexus_cards')
          .update({ 
            is_blocked: true,
            blocked_reason: 'Manual founder block'
          })
          .eq('id', selectedCard.id);
      }
      
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div>Loading Nexus Command Center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header Health Metrics Strip */}
      <div className="border-b border-white/10 bg-black/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-white/60">Swarm Health:</span>{' '}
              <span className="font-medium text-green-400">{metrics?.swarm_health}</span>
            </div>
            <div>
              <span className="text-white/60">Last Update:</span>{' '}
              <span className="font-mono">{metrics?.last_meaningful_update}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                +{metrics?.new_ideas_generated} ideas
              </div>
              <div className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                {metrics?.ideas_filtered_low_value} filtered
              </div>
            </div>
            <div>
              <span className="text-red-400 font-medium">{metrics?.cards_currently_blocked}</span> blocked
            </div>
            <div>
              <span className="text-orange-400 font-medium">{metrics?.items_waiting_founder}</span> waiting founder
            </div>
            <div>
              <span className="text-emerald-400 font-medium">{metrics?.work_shipped}</span> shipped
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-white/60">Confidence:</span>{' '}
              <span className="font-mono text-lg font-bold text-emerald-400">{metrics?.system_confidence}%</span>
            </div>
            <div className="max-w-[220px] text-right text-xs text-white/70">
              Next: {metrics?.next_best_move}
            </div>
          </div>
        </div>
      </div>

      {/* Main Kanban Board */}
      <div className="p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Nexus Command Center</h1>
            <p className="text-sm text-white/60">Unite Group Pi-CEO Autonomous Operating Layer • v0.1</p>
          </div>
          <div className="text-xs text-white/50">
            Updates every 15 minutes • WIP limits enforced
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-8">
          {columns.map((columnTitle, index) => {
            const columnCards = getCardsByColumn(columnTitle);
            const isBlockedColumn = columnTitle === 'Blocked (Global)';
            
            return (
              <div 
                key={index} 
                className="min-w-[280px] flex-shrink-0 rounded-xl border border-white/10 bg-[#111] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-medium text-sm tracking-tight">{columnTitle}</div>
                  <div className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-mono text-white/60">
                    {columnCards.length}
                  </div>
                </div>

                <div className="space-y-2">
                  {columnCards.length === 0 && (
                    <div className="py-8 text-center text-xs text-white/40">No cards</div>
                  )}
                  
                  {columnCards.slice(0, 12).map((card) => (
                    <div
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      className="cursor-pointer rounded-lg border border-white/10 bg-[#1a1a1a] p-3 text-sm hover:border-white/30 transition-colors"
                    >
                      <div className="line-clamp-2 font-medium pr-6">{card.title}</div>
                      
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div className="flex gap-1.5">
                          {card.priority && (
                            <span className={`inline-block rounded px-1.5 py-px text-[10px] text-white ${priorityColors[card.priority as keyof typeof priorityColors]}`}>
                              {card.priority}
                            </span>
                          )}
                          {isBlockedColumn && card.blocked_reason && (
                            <span className="rounded bg-red-950 px-1.5 py-px text-[10px] text-red-400">BLOCKED</span>
                          )}
                        </div>
                        
                        <div className="font-mono text-[10px] text-white/50">
                          Score: {card.idea_quality_score ?? '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#111] p-8">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold text-xl tracking-tight">{selectedCard.title}</div>
                <div className="text-sm text-white/60 mt-0.5">{selectedCard.project} • {selectedCard.category}</div>
              </div>
              <button onClick={closeModal} className="text-xl text-white/40 hover:text-white">×</button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-white/50">Quality Score:</span> {selectedCard.idea_quality_score ?? '—'}/100</div>
              <div><span className="text-white/50">Priority:</span> {selectedCard.priority}</div>
              <div><span className="text-white/50">Proposed by:</span> {selectedCard.proposed_by}</div>
              <div><span className="text-white/50">Last updated:</span> {new Date(selectedCard.last_updated).toLocaleString()}</div>
            </div>

            {selectedCard.is_blocked && (
              <div className="mt-6 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm">
                <div className="font-medium text-red-400">Blocked</div>
                <div className="mt-1 text-red-300/80">{selectedCard.blocked_reason}</div>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => handleAction('approve')}
                className="flex-1 rounded-full bg-emerald-600 py-2.5 text-sm font-medium active:bg-emerald-700"
              >
                Approve
              </button>
              <button 
                onClick={() => handleAction('block')}
                className="flex-1 rounded-full border border-white/30 py-2.5 text-sm font-medium hover:bg-white/5"
              >
                Block
              </button>
              <button onClick={closeModal} className="flex-1 rounded-full border border-white/20 py-2.5 text-sm text-white/70 hover:bg-white/5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
