---
type: wiki
updated: 2026-05-14
tags: [command-center, ui, componentry, animation, design-system]
brand-tokens: ["#1a1a1a Gun Metal", "#dc143c Candy Red"]
---

# Command Center — Componentry & Animation Catalog (2026-05-14)

Hunt-and-catalog pass for the Unite-Group Command Center redesign. Every entry is brand-fit assessed against the **Gun Metal #1a1a1a + Candy Red #dc143c** monochrome+single-accent constraint. Anything that defaults to rainbow gradients, neon-purple, or AI-slop iridescence is flagged.

---

## 1. componentry.fun audit

Source: https://componentry.fun — all components React + TypeScript + Tailwind + Framer Motion, distributed via shadcn registry (`npx shadcn@latest add @componentry/<name>`).

| Component | What it does | Animation budget | Brand fit | Use in CC? |
|---|---|---|---|---|
| **Magnetic Dock** | macOS-style dock; icons inflate on hover proximity | Hover-driven | Strong — pure mono works | Maybe: bottom nav for the 6 portfolio brands |
| **Matrix Rain** | Falling-glyph background canvas | Continuous loop | Strong — green default but trivially recolour to candy red | Yes — login/idle screen, hero panel behind metrics |
| **Scroll Velocity** | Text/elements that warp on scroll speed | Scroll-triggered | Neutral — useful for narrative scroll, not ops dashboard | No — wrong context for ops |
| **Infinite Icon Field** | Endlessly scrolling icon grid | Continuous | Weak — busy by nature; would distract from ops data | No |
| **Magnet Lines** | Lines that bend toward cursor | Hover | Strong — monochrome native, sharp aesthetic | Yes — empty-state filler on quiet tiles |
| **Animated Gradient** | Smooth shifting gradient background | Continuous | Weak — multi-stop colour by default; AI-slop risk | Skip |
| **Dither Gradient** | Bayer-dithered gradient (retro pixel feel) | Continuous | Strong — dither + grey = mission-control aesthetic | Yes — tile backgrounds, pairs with Gun Metal |
| **Cursor-Driven Particle Typography** | Text dissolves into particles around cursor | Hover/move | Strong — monochrome native | Maybe — splash/intro only |

**Verdict:** componentry.fun is decoration, not data. **3 keepers** for the CC: Magnetic Dock, Matrix Rain, Dither Gradient. The rest fight ops density.

---

## 2. React animation libraries — fit-assessed for circuit-board / live-flow look

| Library | Bundle (gz) | Demo URL | Fit | Time to integrate |
|---|---|---|---|---|
| **framer-motion** (`motion`) | ~30KB | https://motion.dev/docs/react-svg-path-drawing | A+ — already shipped; pathLength + SVG = circuit lines for free | 0 (installed) |
| **react-flow / @xyflow/react** | ~45KB | https://reactflow.dev/examples/edges/animating-edges | A+ — node graph for agents-as-nodes, animated edges for "data moving between agents" | 1 day for custom node/edge components |
| **tsParticles** (`@tsparticles/react`) | ~70KB slim build | https://particles.js.org/samples/index.html#polygonMask | A — particle networks = literal circuit-board background; slim build cuts weight | ½ day |
| **@react-three/fiber + drei** | ~140KB + three.js ~150KB | https://r3f.docs.pmnd.rs/getting-started/examples | B — true 3D depth, but ~300KB cost only justified for one signature hero | 2-3 days |
| **GSAP + ScrollTrigger** | ~50KB | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ | C — duplicates framer-motion; skip unless complex timeline choreo needed | Skip |
| **react-spring** | ~25KB | https://www.react-spring.dev/examples | C — physics-based; overlaps framer-motion; pick one | Skip |
| **D3.js force layout** | ~80KB full / ~20KB modular | https://observablehq.com/@d3/force-directed-graph | B — agents-as-nodes graph; lower-level than react-flow | 2 days |
| **visx (@visx/network)** | ~15KB per module | https://airbnb.io/visx/network | B+ — Airbnb composable D3-in-React; cherry-pick `@visx/network`, `@visx/sparkline` | 1 day |
| **lottiefiles/react** | ~50KB + per-animation JSON | https://lottiefiles.com/featured | C — vendor lock to designer's choices; off-brand colours common | Skip |

**Top picks:** framer-motion (already there) + react-flow + tsParticles slim + visx modules. Total new weight ≈ **~130KB gzipped**.

---

## 3. Circuit-board / data-flow specific demos (ranked by remix-fit)

1. **Magic UI — Animated Beam** — https://magicui.design/docs/components/animated-beam
   The literal "data flowing between two boxes" component. SVG path + framer-motion gradient stop animated along the path. **Copy-paste in 5 min.** MIT.

2. **React Flow — Animated SVG Edge** — https://reactflow.dev/ui/components/animated-svg-edge
   Custom edge component that animates a tiny SVG ball along the bezier. Drop-in for `react-flow`. MIT.

3. **React Flow — Animating Edges** — https://reactflow.dev/examples/edges/animating-edges
   Uses CSS `offsetPath` + `offsetDistance` keyframes — zero JS animation overhead. **Best perf for many simultaneous flows.**

4. **tsParticles — Polygon Mask** — https://particles.js.org/samples/index.html#polygonMask
   Particles snap to a vector outline (e.g. company logo) — particles flow along edges = circuit-board on top of brand mark.

5. **tsParticles — Links preset** — https://particles.js.org/samples/index.html#links
   Classic node-and-line particle network. The literal "agents connected" wallpaper. Slim build only.

6. **Aceternity — Background Beams** — https://ui.aceternity.com/components/background-beams
   Diagonal SVG beams animating across container. Pure CSS+SVG, ~2KB component. Recolour to Candy Red trivial. MIT.

7. **Aceternity — Grid + Dot Backgrounds** — https://ui.aceternity.com/components/grid-and-dot-backgrounds
   Static grid (CSS radial-gradient + linear-gradient). Zero JS. Ships as Tailwind classes. Perfect Gun Metal substrate.

8. **Framer Motion — pathLength tutorial** — https://blog.noelcserepy.com/how-to-animate-svg-paths-with-framer-motion
   Reference for the "draw a circuit trace from 0→1" pattern. 3 lines of motion.path.

9. **r3f circuit-board examples (CodeSandbox)** — search `react-three-fiber circuit` on https://codesandbox.io
   3D version for a single hero — overkill for the grid but a signature moment.

10. **D3 force-directed graph (Observable)** — https://observablehq.com/@d3/force-directed-graph
    Classic; remix as agent-comms visualizer if `react-flow` is too opinionated about layout.

---

## 4. FUI / mission-control React components found in the wild

| Component | Source | License | Cost | Verdict |
|---|---|---|---|---|
| **openclaw-mission-control** | https://github.com/manish-raana/openclaw-mission-control | MIT | Fork — Convex-coupled | Cannibalize the layout grid; rip out Convex |
| **builderz-labs/mission-control** | https://github.com/builderz-labs/mission-control | MIT | Fork | Decent agent-fleet card patterns; lift the dispatch UI |
| **ha-component-kit** | https://github.com/shannonhochkins/ha-component-kit | MIT | Inspiration | Home-assistant kit; clock + weather + activity widgets are FUI-adjacent |
| **shadcn/ui Blocks — Dashboard** | https://ui.shadcn.com/blocks | MIT | 5-min copy | Sidebar, header, KPI cards — load-bearing baseline |
| **Tremor Blocks** | https://blocks.tremor.so/ | Apache-2.0 | Heavy | Skip whole-suite; cherry-pick chart blocks only |
| **shadcn.io** (community) | https://www.shadcn.io/ | MIT | 5-min copy | Animated registry; lots of overlap with magicui/aceternity |

**No first-class "FUI" React library exists** (Jayse Hansen's work is film/CGI, not open-source code). The aesthetic is assembled from primitives — SVG + framer-motion + monospace type.

---

## 5. Specific patterns + how to build them

### 5.1 Live status dot with breathing pulse

**Pure CSS (zero JS):**

```tsx
// 3 lines of Tailwind, $0 bundle cost
<span className="relative flex h-2.5 w-2.5">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dc143c] opacity-75" />
  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#dc143c]" />
</span>
```

**framer-motion version** (control easing curve):

```tsx
<motion.span
  className="block h-2.5 w-2.5 rounded-full bg-[#dc143c]"
  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
/>
```

Pick CSS for fleet-wide status dots (50+ on screen). Pick framer for the hero.

### 5.2 Activity event stream (auto-scrolling, colour-coded)

Pattern: virtualized list (`@tanstack/react-virtual`, ~5KB) + framer's `AnimatePresence` on enter:

```tsx
<AnimatePresence initial={false}>
  {events.map(e => (
    <motion.li key={e.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className={severityClass(e.severity)}  // bg-zinc-900 / border-l-2 border-[#dc143c]
    >
      <time className="font-mono text-xs text-zinc-500">{e.ts}</time>
      <span>{e.msg}</span>
    </motion.li>
  ))}
</AnimatePresence>
```

Auto-scroll: `useEffect(() => listRef.current?.scrollTo({top: 0, behavior: 'smooth'}), [events.length])`.

### 5.3 Connection lines that pulse on data move

Two options:

**a) react-flow custom edge** (when nodes are draggable):

```tsx
function PulseEdge({ id, sourceX, sourceY, targetX, targetY }) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <path d={path} stroke="#27272a" strokeWidth={1} fill="none" />
      <circle r={3} fill="#dc143c">
        <animateMotion dur="2s" repeatCount="indefinite" path={path} />
      </circle>
    </>
  );
}
```

**b) Standalone SVG + framer-motion** (fixed topology):

```tsx
<motion.path
  d="M10,10 C100,10 100,100 200,100"
  stroke="#dc143c" strokeWidth={1} fill="none"
  initial={{ pathLength: 0 }}
  animate={{ pathLength: [0, 1, 1], pathOffset: [0, 0, 1] }}
  transition={{ duration: 2, repeat: Infinity }}
/>
```

### 5.4 Glowing border / "active" tile

```css
.tile-active {
  border: 1px solid #dc143c;
  box-shadow:
    0 0 0 1px #dc143c33,
    0 0 24px -4px #dc143c66,
    inset 0 0 16px -8px #dc143c33;
  animation: tile-breathe 3s ease-in-out infinite;
}
@keyframes tile-breathe {
  50% { box-shadow: 0 0 0 1px #dc143c55, 0 0 32px -4px #dc143c99, inset 0 0 24px -8px #dc143c44; }
}
```

### 5.5 Sparkline rows

`@visx/sparkline` — ~6KB, zero theme: pass `stroke="#dc143c"` and forget. Or hand-roll a 20-line SVG component (8 data points → 8 line segments).

### 5.6 Terminal-style log viewer (typewriter)

xterm.js is overkill for read-only display logs (~200KB). For "agent speaking" effect:

```tsx
function Typewriter({ text, speed = 18 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i < text.length) {
      const t = setTimeout(() => setI(i + 1), speed);
      return () => clearTimeout(t);
    }
  }, [i, text, speed]);
  return <span className="font-mono">{text.slice(0, i)}<span className="animate-pulse">▌</span></span>;
}
```

Use xterm.js **only** if streaming ANSI-coloured shell output.

### 5.7 Hexagon / honeycomb tile layouts

Pure CSS `clip-path: polygon(...)` honeycomb is 30 lines and zero deps. Skip `d3-hexbin` unless binning real geospatial data. Reference: https://codepen.io/celar/pen/XENWgq.

### 5.8 Animated counters

`framer-motion`'s `useMotionValue` + `useTransform`:

```tsx
const count = useMotionValue(0);
const rounded = useTransform(count, v => Math.round(v).toLocaleString());
useEffect(() => animate(count, target, { duration: 1.2, ease: "easeOut" }), [target]);
return <motion.span>{rounded}</motion.span>;
```

Zero new dependency.

---

## 6. Recommended bundle to install for the redesign

**Add to package.json (3 libraries, ~130KB gzipped total):**

| Library | Adds | What it gives the CC |
|---|---|---|
| `@xyflow/react` | ~45KB | Agent/service topology graph with animated edges; org chart of the 6 brands; the "live wiring" centrepiece |
| `@tsparticles/react` + `@tsparticles/slim` | ~70KB | Circuit-board background; particle network behind hero; slim build only (no plugins) |
| `@visx/sparkline` + `@visx/scale` | ~15KB | Per-tile data-density sparklines; lower bundle than recharts/tremor |

**Already shipped (use harder):**
- `framer-motion` — path animation, pulse, AnimatePresence, useMotionValue
- `tailwindcss` — `animate-ping`, `animate-pulse`, `animate-spin`, custom keyframes
- `clsx` / `tailwind-merge` — for stateful tile classes

**Copy-paste, no install:**
- Magic UI Animated Beam — `components/animated-beam.tsx` (one file)
- Aceternity Background Beams — single component file
- Aceternity Grid+Dot Background — Tailwind classes only

---

## 7. Anti-recommendations (do NOT install)

| Library | Why no |
|---|---|
| **Tremor full suite** | ~200KB; brings recharts; conflicts with custom monochrome theme; multi-colour chart defaults are AI-slop |
| **GSAP + ScrollTrigger** | ~50KB duplicating framer-motion; commercial license edge cases |
| **react-spring** | Overlaps framer-motion; pick one, not both |
| **lottiefiles/react-lottie** | Vendor lock; off-brand colours; ~50KB + per-JSON cost; AI-slop pre-built animations |
| **MUI / MUI X** | Massive runtime; design opinions fight Gun Metal palette; bundle bloat |
| **AdminLTE / TailAdmin full kits** | Template lock-in; full of bootstrap-era patterns; will look generic |
| **shadcn.io clone sites** | Many are copy-shops of magicui/aceternity with stolen code; use originals |
| **Three.js (full)** | 150KB minimum; only worth it for ONE signature 3D moment, not a 6-tile dashboard |
| **xterm.js** for read-only logs | 200KB to render text; use Typewriter pattern + virtualized list instead |
| **D3.js full bundle** | 80KB; if you need it, modular-import (`d3-scale`, `d3-force`) not full d3 |

---

## 8. Brand-fit guardrails (apply at PR review)

1. **Two colours on screen at any one time** — Gun Metal `#1a1a1a` substrate + Candy Red `#dc143c` accent. Greyscale ramps allowed (zinc-50 → zinc-950). Anything else (purple gradients, neon-blue beams, multi-stop conic) = AI-slop, reject.
2. **Monospace for data, sans for chrome** — JetBrains Mono / Geist Mono for numbers/timestamps; system-ui or Inter for labels.
3. **Motion has purpose** — every animation answers "what state changed?". Decorative loops only in idle/background layers, never on data tiles.
4. **No icon libraries with stylistic baggage** — per Phill's design rule, no Lucide. Custom geometric SVG marks only.
5. **Bundle review per PR** — bundlephobia check before merge; new lib >20KB needs CEO sign-off.

---

## 9. Suggested next move

Wire a `/command-center-preview` Vercel route with three side-by-side hero candidates:
- **A:** react-flow agent topology (functional centrepiece)
- **B:** tsParticles polygon-mask over Unite-Group logo (atmospheric)
- **C:** Aceternity Background Beams + Magic UI Animated Beam grid (decorative + signal)

Pick the winner by gut + 60-second live walkthrough. The other two become secondary panels.

— end —
