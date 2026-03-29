'use client';

/**
 * SYN-527: Brand IQ Score Card
 *
 * Locked/unlock mechanic:
 *   - Locked state:  blurred metrics, "Unlock after your first win" CTA
 *   - Unlocked state: triggered when first_win_detected = true on client record
 *
 * Animated unlock transition: CSS transform + opacity, 0.6s
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, TrendingUp, Clock, Users, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandProfile {
  brand_voice_score: number;
  top_content_attributes: string[];
  best_posting_window: string;
  audience_resonance_score: number;
}

interface NextStep {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimated_impact: string;
}

interface BrandIQCardProps {
  clientId: string;
  isUnlocked?: boolean; // from session/profile: first_win_detected
  className?: string;
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export function BrandIQCard({ clientId, isUnlocked = false, className }: BrandIQCardProps) {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [animating, setAnimating] = useState(false);

  // Trigger unlock animation when prop changes
  useEffect(() => {
    if (isUnlocked && !unlocked) {
      setAnimating(true);
      setTimeout(() => {
        setUnlocked(true);
        setAnimating(false);
      }, 600);
    }
  }, [isUnlocked, unlocked]);

  const loadBrandData = useCallback(async () => {
    if (!unlocked) return;
    setLoadState('loading');
    try {
      const res = await fetch(`/api/brand-iq/${clientId}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setProfile(data.profile);
      setNextSteps(data.next_steps ?? []);
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }, [clientId, unlocked]);

  useEffect(() => {
    if (unlocked) loadBrandData();
  }, [unlocked, loadBrandData]);

  const ScoreRing = ({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' }) => {
    const radius = size === 'sm' ? 22 : 30;
    const stroke = size === 'sm' ? 4 : 5;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const svgSize = (radius + stroke) * 2 + 4;

    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <svg width={svgSize} height={svgSize} className="-rotate-90">
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="none"
              className="text-muted/30"
            />
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {score}
          </span>
        </div>
        <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
      </div>
    );
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-600',
        animating && 'scale-[1.01] shadow-lg',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Brand IQ Score Card
          </CardTitle>
          {unlocked ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Unlock className="h-3 w-3" /> Unlocked
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* LOCKED STATE */}
        {!unlocked && (
          <div className="relative">
            {/* Blurred placeholder metrics */}
            <div className="blur-sm pointer-events-none select-none" aria-hidden>
              <div className="flex justify-around mb-4">
                {[72, 85, 61].map((score, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="h-16 w-16 rounded-full bg-muted/50" />
                    <div className="h-3 w-16 rounded bg-muted/40" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 rounded-lg bg-muted/30" />
                ))}
              </div>
            </div>

            {/* Unlock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px] rounded-lg">
              <div className="text-center space-y-3 px-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Unlock after your first win</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Your brand intelligence is being analysed. When a post outperforms your average, this card unlocks automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* UNLOCKED STATE — Loading */}
        {unlocked && loadState === 'loading' && (
          <div className="space-y-4 animate-pulse">
            <div className="flex justify-around">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-muted" />)}
            </div>
          </div>
        )}

        {/* UNLOCKED STATE — Loaded */}
        {unlocked && loadState === 'loaded' && profile && (
          <div
            className={cn(
              'space-y-5 transition-all duration-600',
              animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            )}
          >
            {/* Score rings */}
            <div className="flex justify-around pt-1">
              <ScoreRing score={profile.brand_voice_score} label="Brand Voice" />
              <ScoreRing score={profile.audience_resonance_score} label="Audience Resonance" />
              <ScoreRing
                score={Math.round((profile.brand_voice_score + profile.audience_resonance_score) / 2)}
                label="Overall IQ"
              />
            </div>

            {/* Top content attributes */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Top Content Attributes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.top_content_attributes.slice(0, 4).map((attr) => (
                  <Badge key={attr} variant="secondary" className="text-xs px-2 py-0.5">
                    {attr}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Best posting window */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-sm">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Best posting window</p>
                <p className="font-medium text-xs">{profile.best_posting_window}</p>
              </div>
            </div>

            {/* Next Steps */}
            {nextSteps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> 3 Next Steps
                </p>
                <div className="space-y-2">
                  {nextSteps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 transition-colors cursor-default"
                    >
                      <span className={cn(
                        'flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded',
                        priorityColors[step.priority]
                      )}>
                        {step.priority.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold leading-snug">{step.title}</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                          {step.description}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* UNLOCKED STATE — Error */}
        {unlocked && loadState === 'error' && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">Could not load Brand IQ data.</p>
            <Button variant="outline" size="sm" onClick={loadBrandData}>Retry</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
