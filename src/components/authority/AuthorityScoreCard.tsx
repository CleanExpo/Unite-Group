'use client';

import React from 'react';
import { EEATBreakdown } from '@/lib/scoring/computeAuthorityScore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthorityScoreCardProps {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: EEATBreakdown;
  delta?: number;
  topAction: string;
}

// ---------------------------------------------------------------------------
// Grade colour helpers
// ---------------------------------------------------------------------------

const gradeConfig: Record<
  'A' | 'B' | 'C' | 'D' | 'F',
  { ring: string; badge: string; text: string; bar: string }
> = {
  A: {
    ring: '#22c55e',    // green-500
    badge: 'bg-green-100 text-green-800',
    text: 'text-green-600',
    bar: 'bg-green-500',
  },
  B: {
    ring: '#3b82f6',    // blue-500
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  C: {
    ring: '#eab308',    // yellow-500
    badge: 'bg-yellow-100 text-yellow-800',
    text: 'text-yellow-600',
    bar: 'bg-yellow-500',
  },
  D: {
    ring: '#f97316',    // orange-500
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-600',
    bar: 'bg-orange-500',
  },
  F: {
    ring: '#ef4444',    // red-500
    badge: 'bg-red-100 text-red-800',
    text: 'text-red-600',
    bar: 'bg-red-500',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ScoreRingProps {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  delta?: number;
}

function ScoreRing({ score, grade, delta }: ScoreRingProps) {
  const config = gradeConfig[grade];
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={config.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>

      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className={`text-4xl font-bold leading-none ${config.text}`}>
          {score}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
          Grade {grade}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span
            className={`text-xs font-medium ${
              delta > 0 ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {delta > 0 ? `+${delta}` : delta} this week
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface BreakdownBarProps {
  label: string;
  score: number;
  max: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

function BreakdownBar({ label, score, max, grade }: BreakdownBarProps) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const config = gradeConfig[grade];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500 tabular-nums">
          {score}
          <span className="text-gray-400">/{max}</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.bar}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbulb icon (inline SVG — no external icon dependency required)
// ---------------------------------------------------------------------------

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5C17.9 10.1 19 8.6 19 7A7 7 0 0 0 5 7c0 1.6 1.1 3.1 2.5 4.5.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AuthorityScoreCard({
  score,
  grade,
  breakdown,
  delta,
  topAction,
}: AuthorityScoreCardProps) {
  const config = gradeConfig[grade];

  const bars = [
    breakdown.google_profile,
    breakdown.review_velocity,
    breakdown.content_freshness,
    breakdown.backlink_signals,
    breakdown.schema_coverage,
    breakdown.social_proof,
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Authority Score</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Composite E.E.A.T. metric — updated daily
        </p>
      </div>

      {/* Score ring + delta */}
      <div className="flex justify-center py-6">
        <ScoreRing score={score} grade={grade} delta={delta} />
      </div>

      {/* Breakdown bars */}
      <div className="px-6 pb-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Score Breakdown
        </h3>
        {bars.map((component) => (
          <BreakdownBar
            key={component.label}
            label={component.label}
            score={component.score}
            max={component.max}
            grade={grade}
          />
        ))}
      </div>

      {/* Top improvement action */}
      <div className="mx-6 mb-6 mt-2 rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3 items-start">
        <LightbulbIcon className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
            Top Improvement Action
          </p>
          <p className="text-sm text-amber-900 leading-snug">{topAction}</p>
        </div>
      </div>
    </div>
  );
}

export default AuthorityScoreCard;
