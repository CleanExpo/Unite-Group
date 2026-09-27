// src/components/command-centre/revenue/TrendAreaChart.tsx
//
// 7-day cleared-funds trend as a hand-drawn SVG area chart (UNI-2772).
// Pure SVG + CSS: no hooks, no chart library, server-safe.
//
// One y-scale (`scaleY`) positions the line, the area, the grid lines, the tick
// labels and the latest-point dot, so a label can never disagree with a mark.
// A trend with nothing cleared (empty, or every day $0) draws no line at all —
// it says so in words instead of showing a flat line.

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export type TrendPoint = { date: string; netCents: number }

export const CHART = {
  width: 300,
  height: 90,
  plotLeft: 44,
  plotRight: 6,
  plotTop: 6,
  plotBottom: 6,
} as const

const NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

function niceCeil(value: number): number {
  if (value <= 0) return 0
  const mag = 10 ** Math.floor(Math.log10(value))
  const f = value / mag
  return (NICE.find((n) => n >= f) ?? 10) * mag
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeTrendGeometry(trend: TrendPoint[]) {
  if (trend.length === 0 || trend.every((d) => d.netCents === 0)) return null

  const values = trend.map((d) => d.netCents)
  const yMax = niceCeil(Math.max(0, ...values))
  const yMin = -niceCeil(-Math.min(0, ...values))
  const span = yMax - yMin || 1
  const top = CHART.plotTop
  const bottom = CHART.height - CHART.plotBottom
  const left = CHART.plotLeft
  const right = CHART.width - CHART.plotRight

  const scaleY = (cents: number) => round(bottom - ((cents - yMin) / span) * (bottom - top))
  const scaleX = (i: number) => (trend.length === 1 ? right : round(left + (i / (trend.length - 1)) * (right - left)))

  const points = trend.map((d, i) => ({ x: scaleX(i), y: scaleY(d.netCents), date: d.date, cents: d.netCents }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const baseY = scaleY(Math.max(yMin, 0))
  const areaPath = `${linePath} L${points[points.length - 1].x},${baseY} L${points[0].x},${baseY} Z`
  const tickCents = [yMin, (yMin + yMax) / 2, yMax].filter((c, i, a) => a.indexOf(c) === i)
  const ticks = tickCents.map((cents) => ({ cents, y: scaleY(cents), label: aud.format(cents / 100) }))

  return { points, linePath, areaPath, ticks, latest: points[points.length - 1], scaleY }
}

const CSS = `
.rt-line{stroke-dasharray:1;stroke-dashoffset:1;animation:rt-draw .9s ease-out forwards}
.rt-fade{opacity:0;animation:rt-fade .4s ease-out .6s forwards}
@keyframes rt-draw{to{stroke-dashoffset:0}}
@keyframes rt-fade{to{opacity:1}}
@media (prefers-reduced-motion: reduce){.rt-line{animation:none;stroke-dashoffset:0}.rt-fade{animation:none;opacity:1}}
`

export function TrendAreaChart({ trend, id }: { trend: TrendPoint[]; id: string }) {
  const g = computeTrendGeometry(trend)
  if (!g) {
    return <div style={{ color: 'var(--deck-muted)', fontSize: 11 }}>No cleared funds in the last 7 days (read OK).</div>
  }
  const colour = 'var(--deck-cyan, #0891b2)'
  const fillId = `${id}-fill`
  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      width="100%"
      role="img"
      aria-label={`7-day cleared trend, latest ${g.latest.date}: ${aud.format(g.latest.cents / 100)}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <style>{CSS}</style>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colour} stopOpacity={0.35} />
          <stop offset="1" stopColor={colour} stopOpacity={0} />
        </linearGradient>
      </defs>
      {g.ticks.map((t) => (
        <g key={t.cents}>
          <line
            x1={CHART.plotLeft}
            x2={CHART.width - CHART.plotRight}
            y1={t.y}
            y2={t.y}
            stroke="var(--deck-line)"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          <text
            x={CHART.plotLeft - 6}
            y={t.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill="var(--deck-muted)"
          >
            {t.label}
          </text>
        </g>
      ))}
      <path data-testid="revenue-trend-area" className="rt-fade" d={g.areaPath} fill={`url(#${fillId})`} />
      <path
        data-testid="revenue-trend-line"
        className="rt-line"
        d={g.linePath}
        pathLength={1}
        fill="none"
        stroke={colour}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle data-testid="revenue-trend-latest" className="rt-fade" cx={g.latest.x} cy={g.latest.y} r={2.6} fill={colour} />
    </svg>
  )
}
