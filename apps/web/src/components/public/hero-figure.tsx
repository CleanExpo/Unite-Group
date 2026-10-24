import h from './hero.module.css'

const CALLOUTS = [
  { k: 'A', x: -233, y: -92, name: 'Hood' },
  { k: 'B', x: -185, y: -62, name: 'Front element' },
  { k: 'C', x: -122, y: -56, name: 'Second element' },
  { k: 'D', x: -58, y: -72, name: 'Aperture' },
  { k: 'E', x: 2, y: -56, name: 'Doublet' },
  { k: 'F', x: 86, y: -42, name: 'Rear element' },
  { k: 'G', x: 156, y: -96, name: 'Mount' },
] as const

const LEGEND = [...CALLOUTS.map((c) => `${c.k} ${c.name}`), 'H Image plane']

/**
 * Treatment A, Minimal Engineering: an optical assembly drawn as a technical figure, in inline SVG and CSS only.
 * No numbers are drawn: the labels name parts, they do not state dimensions. Scale is about 1.4 times.
 * Views (Assembled, Exploded, Inside) and the motion are CSS; see hero.module.css.
 */
export function HeroFigure() {
  return (
    <svg
      id="hero-figure"
      className={h.figure}
      viewBox="0 0 760 420"
      role="img"
      aria-labelledby="hero-figure-title hero-figure-desc"
      data-paused="false"
    >
      <title id="hero-figure-title">Fig. 1, an optical assembly</title>
      <desc id="hero-figure-desc">
        A technical drawing of a lens in section: hood, two front elements, an aperture, a cemented pair, a rear element and the mount, on a
        copper and graphite grid. It is an illustration, not a product.
      </desc>
      <defs>
        <linearGradient id="hf-metal" x1="0" y1="-80" x2="0" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#57534e" />
          <stop offset="0.18" stopColor="#d6d3d1" />
          <stop offset="0.32" stopColor="#fafaf9" />
          <stop offset="0.55" stopColor="#a8a29e" />
          <stop offset="1" stopColor="#44403c" />
        </linearGradient>
        <linearGradient id="hf-copper" x1="0" y1="-96" x2="0" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c2d12" />
          <stop offset="0.3" stopColor="#fb923c" />
          <stop offset="0.6" stopColor="#c2410c" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="hf-glass" x1="-1" y1="-1" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#bae6fd" stopOpacity="0.35" />
          <stop offset="1" stopColor="#78a6bd" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="hf-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hf-ground" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1c1917" stopOpacity="0.28" />
          <stop offset="1" stopColor="#1c1917" stopOpacity="0" />
        </radialGradient>
      </defs>

      <text x="16" y="24" className={h.fig}>
        FIG. 1 · OPTICAL ASSEMBLY · ILLUSTRATIVE
      </text>

      <g transform="translate(385 200) scale(1.4)">
        <ellipse cx="-5" cy="112" rx="285" ry="15" fill="url(#hf-ground)" />

        <line x1="-275" y1="0" x2="260" y2="0" className={h.axis} />

        <path
          className={`${h.shell} ${h.outline}`}
          fill="url(#hf-metal)"
          fillRule="evenodd"
          d="M-225,-80 H150 V80 H-225 Z M-215,-70 V70 H140 V-70 Z"
        />
        <rect className={h.sweep} x="-30" y="-80" width="60" height="160" fill="url(#hf-sweep)" />

        <g className={`${h.intro} ${h.i1}`}>
          <g className={`${h.part} ${h.p1}`}>
            <rect className={h.outline} x="-250" y="-92" width="34" height="20" rx="3" fill="url(#hf-metal)" />
            <rect className={h.outline} x="-250" y="72" width="34" height="20" rx="3" fill="url(#hf-metal)" />
          </g>
        </g>
        <g className={`${h.intro} ${h.i2}`}>
          <g className={`${h.part} ${h.p2}`}>
            <path className={`${h.outline} ${h.glass}`} fill="url(#hf-glass)" d="M-185,-66 Q-155,0 -185,66 Q-215,0 -185,-66 Z" />
          </g>
        </g>
        <g className={`${h.intro} ${h.i3}`}>
          <g className={`${h.part} ${h.p3}`}>
            <path className={`${h.outline} ${h.glass}`} fill="url(#hf-glass)" d="M-130,-60 Q-114,0 -130,60 Q-96,0 -130,-60 Z" />
          </g>
        </g>
        <g className={`${h.intro} ${h.i4}`}>
          <g className={`${h.part} ${h.p4}`}>
            <rect className={`${h.copper}`} x="-62" y="-72" width="8" height="44" fill="url(#hf-copper)" />
            <rect className={`${h.copper}`} x="-62" y="28" width="8" height="44" fill="url(#hf-copper)" />
          </g>
        </g>
        <g className={`${h.intro} ${h.i5}`}>
          <g className={`${h.part} ${h.p5}`}>
            <path className={`${h.outline} ${h.glass}`} fill="url(#hf-glass)" d="M-8,-58 Q16,0 -8,58 Q-30,0 -8,-58 Z" />
            <path className={`${h.outline} ${h.glass}`} fill="url(#hf-glass)" d="M20,-54 Q44,0 20,54 Q8,0 20,-54 Z" />
          </g>
        </g>
        <g className={`${h.intro} ${h.i6}`}>
          <g className={`${h.part} ${h.p6}`}>
            <path className={`${h.outline} ${h.glass}`} fill="url(#hf-glass)" d="M82,-46 Q110,0 82,46 Q60,0 82,-46 Z" />
          </g>
        </g>
        <g className={`${h.intro} ${h.i7}`}>
          <g className={`${h.part} ${h.p7}`}>
            <rect className={h.copper} x="140" y="-96" width="32" height="26" rx="3" fill="url(#hf-copper)" />
            <rect className={h.copper} x="140" y="70" width="32" height="26" rx="3" fill="url(#hf-copper)" />
          </g>
        </g>

        <line x1="240" y1="-92" x2="240" y2="92" className={h.fine} strokeDasharray="3 3" />
        <text x="244" y="-84" className={h.label}>
          H
        </text>

        {CALLOUTS.map((c) => (
          <g key={c.k}>
            <line x1={c.x} y1="-112" x2={c.x} y2={c.y} className={h.leader} />
            <circle cx={c.x} cy={c.y} r="1.8" className={h.dot} />
            <circle cx={c.x} cy="-118" r="7" fill="#ffffff" className={h.copper} />
            <text x={c.x} y="-115.4" textAnchor="middle" className={h.label}>
              {c.k}
            </text>
          </g>
        ))}

        {LEGEND.map((entry, i) => (
          <text key={entry} x={-250 + (i % 4) * 140} y={i < 4 ? 134 : 146} className={h.label}>
            {entry}
          </text>
        ))}
      </g>
    </svg>
  )
}
