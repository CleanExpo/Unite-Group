'use client';

/**
 * SYN-526: Trial-End Conversion Modal — Win-Anchored Copy
 *
 * Replaces fear-based "your data will be deleted" urgency with opportunity framing.
 * Three copy states:
 *   1. win_known    — first win detected, anchors ask to specific result
 *   2. active       — no standout win but activity recorded, references momentum
 *   3. no_activity  — fallback to platform capability copy
 *
 * A/B test variant stored on client profile: conversion_copy_variant = 'win' | 'control'
 * 50% of users see 'win' variant, 50% see 'control' (original flow, rendered elsewhere).
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Zap, Award } from 'lucide-react';

type CopyState = 'win_known' | 'active' | 'no_activity';

interface TrialEndData {
  daysLeft: number;
  copyVariant: 'win' | 'control';
  firstWinDetected: boolean;
  bestResultMessage?: string; // e.g. "Your Tuesday post got 47% more reach"
  postsPublished: number;
}

interface TrialEndModalProps {
  open: boolean;
  onClose: () => void;
  onConvert: () => void; // Navigate to pricing/checkout
  trialData: TrialEndData;
}

// Map state → copy blocks
const COPY: Record<CopyState, {
  eyebrow: string;
  headline: string;
  subtext: string;
  cta: string;
  secondaryCta: string;
}> = {
  win_known: {
    eyebrow: 'Your momentum is just getting started',
    headline: '', // filled dynamically with bestResultMessage
    subtext: "That result didn't happen by accident — it happened because your content was optimised for your audience. Keep that momentum going.",
    cta: 'Keep my momentum',
    secondaryCta: 'See my results first',
  },
  active: {
    eyebrow: 'Your audience is warming up',
    headline: "You've been building something real",
    subtext: "Clients who stay see an average of 3× engagement growth by week 4. Your audience is learning your brand — now's not the time to stop.",
    cta: 'Continue growing',
    secondaryCta: 'View my activity',
  },
  no_activity: {
    eyebrow: 'The best results are still ahead',
    headline: 'Synthex works harder the longer you use it',
    subtext: "Every post you publish trains your content engine. Businesses that stay active for 30 days see an average 2.4× improvement in post reach.",
    cta: 'Start my subscription',
    secondaryCta: 'See how it works',
  },
};

export function TrialEndModal({ open, onClose, onConvert, trialData }: TrialEndModalProps) {
  const [state, setState] = useState<CopyState>('no_activity');

  useEffect(() => {
    if (trialData.firstWinDetected && trialData.bestResultMessage) {
      setState('win_known');
    } else if (trialData.postsPublished > 0) {
      setState('active');
    } else {
      setState('no_activity');
    }
  }, [trialData]);

  const handleConvertClick = () => {
    // Fire Vercel Analytics event
    if (typeof window !== 'undefined' && 'va' in window) {
      // @ts-expect-error Vercel Analytics global
      window.va?.track('trial_conversion_cta_click', {
        variant: trialData.copyVariant,
        has_win_data: trialData.firstWinDetected,
        copy_state: state,
      });
    }
    onConvert();
  };

  const copy = COPY[state];
  const headline = state === 'win_known' ? trialData.bestResultMessage! : copy.headline;

  const icons: Record<CopyState, React.ReactNode> = {
    win_known: <Award className="h-7 w-7 text-amber-500" />,
    active: <TrendingUp className="h-7 w-7 text-blue-500" />,
    no_activity: <Zap className="h-7 w-7 text-violet-500" />,
  };

  const accentColors: Record<CopyState, string> = {
    win_known: 'from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20',
    active: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
    no_activity: 'from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {/* Header accent strip */}
        <div className={`-mx-6 -mt-6 mb-6 rounded-t-lg bg-gradient-to-r px-6 pt-6 pb-5 ${accentColors[state]}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white/80 dark:bg-black/30 flex items-center justify-center shadow-sm">
              {icons[state]}
            </div>
            <div>
              <Badge variant="outline" className="text-xs mb-1">
                {trialData.daysLeft === 0 ? 'Trial ended' : `${trialData.daysLeft} day${trialData.daysLeft === 1 ? '' : 's'} left`}
              </Badge>
              <p className="text-xs font-medium text-muted-foreground">{copy.eyebrow}</p>
            </div>
          </div>

          <DialogHeader>
            <DialogTitle className="text-xl leading-tight">{headline}</DialogTitle>
          </DialogHeader>
        </div>

        <DialogDescription className="text-sm text-muted-foreground leading-relaxed mb-6">
          {copy.subtext}
        </DialogDescription>

        {/* Social proof snippet */}
        {state === 'active' && (
          <div className="mb-5 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground border">
            💬 <span className="italic">"I was skeptical, but by week 3 my Google Business calls doubled."</span>
            <span className="block mt-1 font-medium not-italic">— Cleaning business, Brisbane</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={handleConvertClick}>
            {copy.cta}
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
            {copy.secondaryCta}
          </Button>
        </div>

        {/* No fear-based urgency — opportunity framing only */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Cancel anytime. No lock-in contracts.
        </p>
      </DialogContent>
    </Dialog>
  );
}
