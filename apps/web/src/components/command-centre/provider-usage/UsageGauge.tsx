// src/components/command-centre/provider-usage/UsageGauge.tsx
//
// Radial usage gauge for one provider (UNI-2772). Pure SVG + CSS: no hooks, no
// chart library, server-safe.
//
// A 270-degree dial: the track runs from bottom-left (135deg) clockwise to
// bottom-right (45deg). The value arc covers pct/100 of it, clamped to [0, 1];
// the centre label always shows the TRUE number, so 137% draws a full arc and
// still reads 137%. The colour band is the provider's library-derived state.
// Callers render this only for a known usage figure — an
// unknown figure is never drawn as a 0% dial.

import type { ProviderState } from '@/lib/command-centre/provider-usage'

export const GAUGE = { size: 100, cx: 50, cy: 50, r: 40, stroke: 9, startDeg: 135, sweepDeg: 270 } as const

export type GaugeTone = 'ok' | 'caution' | 'alarm'

/** Tone comes from the library's own classification of the provider — the
 *  same state that drives the text label — never from a recomputation on the
 *  rounded display percent. near_limit is caution, blocked (at/over limit) is
 *  alarm, anything else is ok. */
export function gaugeTone(state: ProviderState): GaugeTone {
  if (state === 'blocked') return 'alarm'
  if (state === 'near_limit') return 'caution'
  return 'ok'
}

const ARC_COLOUR: Record<GaugeTone, string> = {
  ok: 'var(--deck-go, #2dbb57)',
  caution: 'var(--deck-amber, #f4820f)',
  alarm: 'var(--deck-abort, #e5484d)',
}

const TEXT_COLOUR: Record<GaugeTone, string> = {
  ok: 'var(--cc-ink)',
  caution: 'var(--deck-amber-text, #f0a94c)',
  alarm: 'var(--deck-abort-text, #f87171)',
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function pointAt(deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: round(GAUGE.cx + GAUGE.r * Math.cos(rad)), y: round(GAUGE.cy + GAUGE.r * Math.sin(rad)) }
}

function arcPath(sweepDeg: number): string {
  const s = pointAt(GAUGE.startDeg)
  const e = pointAt(GAUGE.startDeg + sweepDeg)
  const large = sweepDeg > 180 ? 1 : 0
  return `M${s.x},${s.y} A${GAUGE.r} ${GAUGE.r} 0 ${large} 1 ${e.x},${e.y}`
}

/** Track + value arc for a usage percentage. valuePath is null at 0%. */
export function gaugeArc(pct: number) {
  const fraction = Math.max(0, Math.min(1, pct / 100))
  const trackPath = arcPath(GAUGE.sweepDeg)
  const valuePath = fraction === 0 ? null : arcPath(GAUGE.sweepDeg * fraction)
  return { fraction, trackPath, valuePath }
}

function formatPct(pct: number): string {
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`
}

const CSS = `
.ug-arc{stroke-dasharray:1;stroke-dashoffset:1;animation:ug-sweep .9s ease-out forwards}
@keyframes ug-sweep{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion: reduce){.ug-arc{animation:none;stroke-dashoffset:0}}
`

export function UsageGauge({
  id,
  label,
  pct,
  state,
  caption,
}: {
  id: string
  label: string
  pct: number
  state: ProviderState
  caption: string
}) {
  const g = gaugeArc(pct)
  const tone = gaugeTone(state)
  return (
    <div data-testid={`usage-gauge-${id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg
        viewBox={`0 0 ${GAUGE.size} ${GAUGE.size}`}
        width={96}
        height={96}
        role="meter"
        aria-label={`${label} usage`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={Math.max(100, pct)}
        aria-valuetext={`${formatPct(pct)} used`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <style>{CSS}</style>
        <path
          d={g.trackPath}
          fill="none"
          stroke="var(--deck-panel-hi, #232b3a)"
          strokeWidth={GAUGE.stroke}
          strokeLinecap="round"
        />
        {g.valuePath && (
          <path
            data-testid={`usage-gauge-value-${id}`}
            className="ug-arc"
            d={g.valuePath}
            pathLength={1}
            fill="none"
            stroke={ARC_COLOUR[tone]}
            strokeWidth={GAUGE.stroke}
            strokeLinecap="round"
          />
        )}
        <text
          data-testid={`usage-gauge-pct-${id}`}
          x={GAUGE.cx}
          y={GAUGE.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fontWeight={600}
          fill={TEXT_COLOUR[tone]}
        >
          {formatPct(pct)}
        </text>
      </svg>
      <span style={{ color: 'var(--cc-ink)', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>{label}</span>
      <span style={{ color: 'var(--cc-ink-dim)', fontSize: 11, textAlign: 'center' }}>{caption}</span>
    </div>
  )
}
