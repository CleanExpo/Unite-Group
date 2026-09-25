// src/components/command-centre/cost-allocation/CostAllocationCharts.tsx
//
// Cost allocation as hand-drawn SVG (UNI-2772). Pure SVG + CSS: no hooks, no
// chart library, server-safe.
//
// Two charts, each fed ONLY figures the tile already reads:
//  - CostSplitDonut: this month's cost split across the tile's cost sources,
//    with revenue − cost (net) in the centre. A loss keeps its sign and takes
//    the alarm text colour.
//  - MonthOnMonthBars: this month's cost vs prior month's cost as two bars on
//    ONE x-scale (`scaleX`), so the two widths can never disagree.
// Any unknown (non-finite / absent) or negative figure returns null geometry,
// and the component draws nothing — a missing figure is never drawn as $0.

const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export type CostSource = { id: string; name: string; amount_aud: number }

function isAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

const RADIUS = 52
export const DONUT = {
  size: 150,
  radius: RADIUS,
  stroke: 16,
  circumference: 2 * Math.PI * RADIUS,
  gap: 3,
} as const

// Cost is caution, not success: every slice is the caution fill, stepped down
// in opacity so adjacent sources stay distinguishable without a new colour.
const SLICE_FILL = 'var(--deck-amber, #ff8a1f)'
const SLICE_OPACITY = [1, 0.72, 0.52, 0.38, 0.28]

export function sliceOpacity(index: number): number {
  return SLICE_OPACITY[Math.min(index, SLICE_OPACITY.length - 1)]
}

export function computeDonutGeometry(sources: CostSource[], net: number) {
  if (!isAmount(net)) return null
  if (!Array.isArray(sources) || sources.some((s) => !isAmount(s.amount_aud) || s.amount_aud < 0)) return null
  const spending = sources.filter((s) => s.amount_aud > 0)
  const total = spending.reduce((acc, s) => acc + s.amount_aud, 0)
  if (total <= 0) return null

  const C = DONUT.circumference
  const gap = spending.length > 1 ? DONUT.gap : 0
  let offset = 0
  const slices = spending.map((s, i) => {
    const share = s.amount_aud / total
    const length = C * share
    const slice = {
      id: s.id,
      name: s.name,
      amount: s.amount_aud,
      share,
      length: round(length),
      dash: round(Math.max(0, length - gap)),
      rest: round(C - Math.max(0, length - gap)),
      offset: round(offset),
      opacity: sliceOpacity(i),
    }
    offset += length
    return slice
  })

  const colour = net < 0 ? 'var(--deck-abort-text, #f87171)' : 'var(--deck-text, #f4f5f7)'
  return { slices, total, net: { value: net, label: aud.format(net), colour } }
}

export const BARS = {
  width: 300,
  labelWidth: 84,
  valueWidth: 76,
  barHeight: 10,
  rowGap: 22,
  plotWidth: 300 - 84 - 76,
} as const

const NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

function niceCeil(value: number): number {
  if (value <= 0) return 0
  const mag = 10 ** Math.floor(Math.log10(value))
  const f = value / mag
  return (NICE.find((n) => n >= f) ?? 10) * mag
}

export function computeMonthOnMonthGeometry(current: number, prior: number) {
  if (!isAmount(current) || !isAmount(prior) || current < 0 || prior < 0) return null
  const max = niceCeil(Math.max(current, prior))
  if (max === 0) return null
  const scaleX = (aud_: number) => round((aud_ / max) * BARS.plotWidth)
  return {
    max,
    scaleX,
    current: { value: current, width: scaleX(current), label: aud.format(current) },
    prior: { value: prior, width: scaleX(prior), label: aud.format(prior) },
  }
}

const CSS = `
.ca-arc{opacity:0;animation:ca-fade .5s ease-out forwards}
.ca-bar{transform-box:fill-box;transform-origin:left;transform:scaleX(0);animation:ca-grow .8s cubic-bezier(.19,1,.22,1) forwards}
@keyframes ca-fade{to{opacity:1}}
@keyframes ca-grow{to{transform:scaleX(1)}}
@media (prefers-reduced-motion: reduce){.ca-arc{animation:none;opacity:1}.ca-bar{animation:none;transform:none}}
`

export function CostSplitDonut({ sources, net }: { sources: CostSource[]; net: number }) {
  const g = computeDonutGeometry(sources, net)
  if (!g) return null
  const c = DONUT.size / 2
  return (
    <svg
      viewBox={`0 0 ${DONUT.size} ${DONUT.size}`}
      width={DONUT.size}
      role="img"
      aria-label={`Cost split across ${g.slices.length} source${g.slices.length === 1 ? '' : 's'}; net ${g.net.label}`}
      style={{ display: 'block', flex: 'none', maxWidth: '100%', height: 'auto' }}
    >
      <style>{CSS}</style>
      <circle cx={c} cy={c} r={DONUT.radius} fill="none" stroke="var(--deck-panel-hi, #232934)" strokeWidth={DONUT.stroke} />
      {g.slices.map((s) => (
        <circle
          key={s.id}
          data-testid={`cost-slice-${s.id}`}
          className="ca-arc"
          cx={c}
          cy={c}
          r={DONUT.radius}
          fill="none"
          stroke={SLICE_FILL}
          strokeOpacity={s.opacity}
          strokeWidth={DONUT.stroke}
          strokeDasharray={`${s.dash} ${s.rest}`}
          strokeDashoffset={-s.offset}
          transform={`rotate(-90 ${c} ${c})`}
        >
          <title>{`${s.name}: ${aud.format(s.amount)} (${Math.round(s.share * 100)}%)`}</title>
        </circle>
      ))}
      <text
        data-testid="cost-net"
        x={c}
        y={c + 2}
        textAnchor="middle"
        fontSize={18}
        fontWeight={700}
        fill={g.net.colour}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {g.net.label}
      </text>
      <text x={c} y={c + 18} textAnchor="middle" fontSize={10} fill="var(--deck-muted, #a7adba)">
        net this month
      </text>
    </svg>
  )
}

export function MonthOnMonthBars({ current, prior }: { current: number; prior: number }) {
  const g = computeMonthOnMonthGeometry(current, prior)
  if (!g) return null
  const rows = [
    { key: 'current', label: 'This month', bar: g.current, fill: SLICE_FILL },
    { key: 'prior', label: 'Prior month', bar: g.prior, fill: 'var(--deck-muted, #a7adba)' },
  ]
  const height = BARS.rowGap * rows.length
  return (
    <svg
      viewBox={`0 0 ${BARS.width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Cost this month ${g.current.label} against prior month ${g.prior.label}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <style>{CSS}</style>
      {rows.map((r, i) => {
        const y = i * BARS.rowGap + (BARS.rowGap - BARS.barHeight) / 2
        const mid = y + BARS.barHeight / 2
        return (
          <g key={r.key}>
            <text x={0} y={mid} dominantBaseline="middle" fontSize={11} fill="var(--deck-muted, #a7adba)">
              {r.label}
            </text>
            <rect
              x={BARS.labelWidth}
              y={y}
              width={BARS.plotWidth}
              height={BARS.barHeight}
              rx={2}
              fill="var(--deck-panel-hi, #232934)"
            />
            <rect
              data-testid={`mom-${r.key}`}
              className="ca-bar"
              x={BARS.labelWidth}
              y={y}
              width={r.bar.width}
              height={BARS.barHeight}
              rx={2}
              fill={r.fill}
            />
            <text
              x={BARS.width}
              y={mid}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--deck-text, #f4f5f7)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {r.bar.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
