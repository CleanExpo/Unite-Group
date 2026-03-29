'use client';

/**
 * SYN-525: First Win Notification Banner
 * Dismissible in-app alert shown when a client's post outperforms their baseline.
 * Renders specific metrics: "Your Tuesday post got 312 impressions — 47% above average"
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FirstWinNotification {
  id: string;
  type: string;
  payload: {
    post_id: string;
    posted_at: string;
    platform: string;
    metric: string;
    actual_value: number;
    baseline_value: number;
    improvement_pct: number;
    message: string; // pre-formatted by formatWinMessage()
  };
  read: boolean;
  created_at: string;
}

interface FirstWinBannerProps {
  className?: string;
}

export function FirstWinBanner({ className }: FirstWinBannerProps) {
  const [notification, setNotification] = useState<FirstWinNotification | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchFirstWinNotification();
  }, []);

  const fetchFirstWinNotification = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const firstWin = (data.notifications ?? []).find(
        (n: FirstWinNotification) => n.type === 'first_win' && !n.read
      );
      if (firstWin) {
        setNotification(firstWin);
        // Slight delay before showing for a smooth entrance
        setTimeout(() => setVisible(true), 300);
      }
    } catch {
      // Silent fail — non-critical UI
    }
  };

  const dismiss = async () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);

    if (notification) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
      } catch {
        // Silent fail
      }
    }
  };

  if (!notification || dismissed) return null;

  const { payload } = notification;
  const platformLabel = payload.platform.charAt(0).toUpperCase() + payload.platform.slice(1);

  return (
    <div
      className={cn(
        'transition-all duration-400 ease-out overflow-hidden',
        visible ? 'max-h-32 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0',
        className
      )}
    >
      <div className="relative rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800 px-4 py-3 shadow-sm">
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* Trophy icon */}
          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-amber-600" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                First Win on {platformLabel}!
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3" />
                +{payload.improvement_pct}%
              </span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-snug">
              {payload.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
