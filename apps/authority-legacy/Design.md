# Unite Group — Design System

> The design team in a file. Every component, every colour, every animation decision traces back here. Adapted from Linear's design system (awesome-design-md) + Emil Kowalski's design engineering skill (emilkowalski/skill).

---

## 1. Visual Theme & Atmosphere

**5-word character statement:** Precise. Dark. Signal-forward. Trustworthy.

This is an empire command centre — field operators and the founder, not investors or the public. Every authenticated surface is dark-first with a strict 4-step surface ladder. The canvas is a deep navy-black (`#0a0f1e`), not pure black. Trust blue (`#1D4ED8`) is the single action accent. Amber (`#FBBF24`) signals live-state and alerts only — never decoration. Surfaces separate by lift, never by colour washes or gradients.

The dashboard should read like Linear crossed with a dark-mode IDE: data-dense, typographically precise, no chrome you didn't ask for.

---

## 2. Color Palette & Roles

```yaml
canvas:         "#0a0f1e"   # Page background — deep navy-black with blue tint. Never pure #000.
surface-1:      "#0f172a"   # Default cards, panels, sidebars
surface-2:      "#111827"   # Elevated cards, hover state of surface-1 cards
surface-3:      "#1e293b"   # Dropdowns, modals, nested panels
surface-4:      "#334155"   # Active/selected states inside panels
hairline:       "#1e293b"   # 1px card borders
hairline-strong:"#334155"   # Input focus rings, dividers
ink:            "#f8fafc"   # All headlines, primary body text
ink-muted:      "#94a3b8"   # Secondary text, meta info
ink-subtle:     "#64748b"   # Tertiary text, placeholder, disabled
ink-ghost:      "#334155"   # Section labels, barely-there callouts

primary:        "#1d4ed8"   # Trust blue — primary CTA, active nav, focus ring
primary-hover:  "#3b82f6"   # Lighter blue on hover
primary-focus:  "#1e40af"   # Focus ring / pressed state
amber:          "#fbbf24"   # Live-state signal, critical alerts — NOT decorative
amber-subtle:   "#78350f"   # Amber background tint when needed

success:        "#16a34a"   # Operational status
warning:        "#d97706"   # Degraded status
danger:         "#dc2626"   # Down / error status
```

**Color strategy: Restrained.** Tinted neutrals + primary accent ≤10% of any surface. Amber is intentional signal — one pulsing dot, not a background wash.

---

## 3. Typography Rules

**Font stack:**
- **Display/Headlines:** `Inter` 600–700, fallback `-apple-system, system-ui, sans-serif`
- **Body:** `Inter` 400, same fallback
- **Metrics/Code/Values:** `JetBrains Mono` 400–600, fallback `ui-monospace, SF Mono, Menlo`

**CSS variables:** `--font-inter` and `--font-mono` (loaded in root layout)

**Hierarchy:**

| Role | Size | Weight | Letter-spacing | Use |
|---|---|---|---|---|
| Display XL | 48px | 700 | -0.04em | Page-level hero number only |
| Display | 32px | 700 | -0.03em | Section title, Empire Score |
| Headline | 22px | 600 | -0.02em | Card titles, panel headings |
| Subhead | 18px | 500 | -0.01em | Section openers |
| Body | 15px | 400 | -0.01em | Default copy |
| Body SM | 13px | 400 | 0 | Card body, secondary info |
| Caption | 11px | 500 | 0.06em | Section labels — uppercase, tracked out |
| Mono | 13px | 500 | 0 | All metrics, uptime %, ARR, deploy counts |

**Principles:**
- Aggressive negative tracking on display (-0.02em minimum). Flat tracking looks amateur.
- Caption/section labels: uppercase + 0.06em positive tracking — marks taxonomy.
- Metrics always `font-family: var(--font-mono)`. Never use sans-serif for data values.
- Cap body at 65–75ch line length.
- Hierarchy through scale + weight contrast (≥1.25 ratio between steps).

---

## 4. Component Stylings

### Cards
```css
/* Standard card */
background: var(--surface-1);       /* #0f172a */
border: 1px solid var(--hairline);  /* #1e293b */
border-radius: 12px;
padding: 20px;

/* Elevated / hover */
background: var(--surface-2);       /* #111827 */
border-color: var(--hairline-strong);

/* NO: backdrop-filter glassmorphism as default */
/* NO: border-left/right > 1px coloured accent stripes — use background tints instead */
/* NO: identical icon+heading+text card grids — vary the content pattern */
```

### Status tinting (replaces stripe borders)
```css
/* Operational tint — background approach, not border stripes */
background: rgba(22, 163, 74, 0.06);
border-color: rgba(22, 163, 74, 0.15);

/* Building tint */
background: rgba(29, 78, 216, 0.06);
border-color: rgba(29, 78, 216, 0.15);
```

### Primary CTA
```css
background: #1d4ed8;
color: #fff;
border-radius: 8px;
padding: 8px 14px;
font-size: 13px;
font-weight: 500;
transition: background 160ms ease-out;

&:hover  { background: #3b82f6; }
&:active { background: #1e40af; transform: scale(0.97); }
```

### Status dots
```css
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  animation: pulse-dot 2.5s ease-in-out infinite;
}
/* Colour set inline per status via style="background: {color}; color: {color}" */
```

### Section labels
```css
font-size: 10px;
font-weight: 600;
letter-spacing: 0.1em;
text-transform: uppercase;
color: var(--ink-ghost);  /* #334155 */
```

### Metric values
```css
font-family: var(--font-mono);
font-weight: 600;
color: var(--ink);
/* Larger values — tabular-nums for alignment */
font-variant-numeric: tabular-nums;
```

### Nav (sidebar)
Active item: `background: rgba(29,78,216,0.12)` + `border-left: 2px solid #3b82f6`. Left border only on active — 2px is fine because it's structural navigation state, not card decoration.

---

## 5. Layout Principles

- **Max content width:** 1440px, 24px side padding
- **Sidebar:** 240px fixed, `#0d1424` surface, `borderRight: 1px solid hairline`
- **Card grid:** 3-col desktop (≥1280px), 2-col tablet (768–1279px), 1-col mobile
- **Sticky header:** 64px, `backdrop-filter: blur(20px) saturate(180%)`
- **Base spacing unit:** 4px
- **Spacing tokens:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 96px
- **Card interior padding:** 20px standard, 24px for featured
- **Section gaps:** 24px between cards, 40px between sections

**Whitespace philosophy:** The dark canvas IS the whitespace. Sections separate by surface lift (canvas → surface-1 → surface-2), not by gap-on-white. Vary padding for rhythm — identical padding everywhere is monotony.

**Cards are the lazy answer.** Use them only when content genuinely needs containment. Never nest cards. Prefer lists, rows, or raw type where cards add no value.

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 — flat | No border, no bg shift | Body text, hero text, inline data |
| 1 — panel | `surface-1` bg + 1px `hairline` border | Default cards, panels |
| 2 — lifted | `surface-2` bg + 1px `hairline-strong` | Featured/hover cards, modals |
| 3 — overlay | `surface-3` bg | Dropdowns, command palettes |
| 4 — focus | 2px `primary-focus` outline | Focused inputs, focused buttons |

**Depth is carried by the surface ladder + hairline borders.** No drop-shadows on dark surfaces except `0 20px 40px rgba(0,0,0,0.4)` for modals.

**No atmospheric gradients. No spotlight-card glows. No decorative glassmorphism.** Background-filter blur is only used on the sticky header (functional: separates header from scrolled content) and intentional overlays.

---

## 7. Do's and Don'ts

### Do
- Use the 4-step surface ladder for hierarchy. Never skip levels.
- Apply negative letter-spacing to all display type (-0.02em minimum).
- Use `var(--font-mono)` for every metric, percentage, count, and ID.
- Use background tints for status colouring on cards — not side-stripe borders.
- Keep amber (`#fbbf24`) as an operational signal only: live dot, alert badge.
- Keep trust blue (`#1d4ed8`) for primary CTA, active nav, focus rings. That's it.
- Pair weight 700 headlines with weight 400 body. Never 700+700.
- Use `transform: scale(0.97)` on `:active` for every pressable element.
- Start entrance animations from `scale(0.95) opacity(0)` — never `scale(0)`.

### Don't (Impeccable Absolute Bans)
- **No side-stripe borders** — `border-left` or `border-right` > 1px as coloured card accents. Rewrite with background tints.
- **No glassmorphism as default** — backdrop-filter only where it serves a function.
- **No hero-metric template** — big number + small label + supporting stats + gradient accent is a SaaS cliché. Use the Empire Score ring only as a small header element, not a centrepiece.
- **No identical card grids** — same-sized cards with icon + heading + text, endlessly repeated. Vary content weight across cards.
- **No gradient text** — `background-clip: text` with gradient. Use solid colour.
- **No true `#000000` canvas** — use `#0a0f1e` (tinted toward brand hue).
- **No white backgrounds** on authenticated empire pages.
- **No light mode** for the empire dashboard.
- **No marketing copy** on authenticated views (no "consultation", "pricing", "testimonials").

---

## 8. Responsive Behaviour

| Breakpoint | Width | Changes |
|---|---|---|
| Desktop XL | 1440px | Full layout, sidebar pinned |
| Desktop | 1280px | 3-col card grid |
| Tablet | 1024px | 3-col → 2-col cards |
| Mobile-lg | 768px | Sidebar collapses to top nav, 1-col |
| Mobile | 480px | Single-col, display type scales down 40% |

**Touch targets:** All CTAs ≥44px tap height. Nav links ≥40px.
**Hover animations:** Gate all hover transforms with `@media (hover: hover) and (pointer: fine)` — touch devices trigger hover on tap.

---

## 9. Agent Prompt Guide

Quick colour reference for prompts:
- Canvas: `#0a0f1e` · Surface-1: `#0f172a` · Surface-2: `#111827` · Surface-3: `#1e293b`
- Trust blue: `#1d4ed8` (hover `#3b82f6`) · Amber signal: `#fbbf24`
- Ink: `#f8fafc` · Ink-muted: `#94a3b8` · Ink-subtle: `#64748b`
- Success: `#16a34a` · Warning: `#d97706` · Danger: `#dc2626`

Copy-paste component prompts:
```
Standard card: bg #0f172a, border 1px #1e293b, border-radius 12px, padding 20px
Primary CTA: bg #1d4ed8 → hover #3b82f6, border-radius 8px, padding 8px 14px, font-size 13px weight 500
Section label: 10px, weight 600, uppercase, letter-spacing 0.1em, color #334155
Metric value: font-family JetBrains Mono, weight 600, tabular-nums
Status dot: 7px circle, animate pulse-dot 2.5s, color = status color
```

---

## 10. Animation & Motion (Emil Kowalski Design Engineering)

*From emilkowalski/skill — first 4 sections.*

### Core Philosophy

**Taste is trained, not innate.** Good taste is a trained instinct: the ability to see beyond the obvious and recognise what elevates. Develop it by surrounding yourself with great work, studying why things feel good, reversing-engineering animations, and practising relentlessly. Don't just make it work. Study why the best interfaces feel the way they do.

**Unseen details compound.** Most details users never consciously notice. That is the point. When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. Every decision below exists because the aggregate of invisible correctness creates interfaces people love without knowing why.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." — Paul Graham

**Beauty is leverage.** People select tools based on the overall experience, not just functionality. Good defaults and good animations are real differentiators. Beauty is underutilised in software. Use it to stand out.

---

### Animation Decision Framework

**1. Should this animate at all?**

| Frequency | Decision |
|---|---|
| 100+ times/day (keyboard shortcuts, command palette) | No animation. Ever. |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, celebrations) | Can add delight |

Never animate keyboard-initiated actions. Raycast has no open/close animation. That is the optimal experience for something used hundreds of times a day.

**2. What is the purpose?**

Valid purposes only: spatial consistency, state indication, explanation, feedback (button press), preventing jarring changes. If the purpose is "it looks cool" and the user sees it often — don't animate.

**3. What easing?**

```
Entering or exiting?    → ease-out (starts fast, feels responsive)
Moving/morphing?        → ease-in-out (natural accel/decel)
Hover / colour change?  → ease
Constant motion?        → linear
```

Never `ease-in` for UI — it starts slow, feels sluggish, delays the moment the user is watching most closely.

**Custom curves (required):**
```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Resources: easing.dev · easings.co

**4. How fast?**

| Element | Duration |
|---|---|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |
| Marketing / explanatory | Can be longer |

UI animations stay under 300ms. A 180ms dropdown feels more responsive than 400ms. Easing amplifies perception: `ease-out` at 200ms feels faster than `ease-in` at 200ms.

---

### Spring Animations

Springs feel more natural than duration-based animations because they simulate real physics. Use them for: drag interactions with momentum, elements that should feel "alive", gestures that can be interrupted mid-animation.

```jsx
// Without spring: feels artificial
const rotation = mouseX * 0.1;

// With spring: feels natural, has momentum
const springRotation = useSpring(mouseX * 0.1, { stiffness: 100, damping: 10 });
```

**Configuration:**
```js
// Apple's approach (recommended)
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Traditional physics
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Keep bounce subtle (0.1–0.3). Avoid bounce in most UI contexts. Springs maintain velocity when interrupted — CSS keyframes restart from zero. Use springs for gestures users might change mid-motion.

---

### Component Building Principles

**Buttons must feel responsive.** Add `transform: scale(0.97)` on `:active`. The scale should be subtle (0.95–0.98).
```css
.button { transition: transform 160ms ease-out; }
.button:active { transform: scale(0.97); }
```

**Never animate from `scale(0)`.** Nothing in the real world disappears and reappears completely. Start from `scale(0.95)` combined with `opacity: 0`.
```css
/* Wrong */ .entering { transform: scale(0); }
/* Right  */ .entering { transform: scale(0.95); opacity: 0; }
```

**Popovers are origin-aware.** Scale from their trigger, not from centre. Modals are the exception — they stay `transform-origin: center`.
```css
.popover { transform-origin: var(--radix-popover-content-transform-origin); }
```

**Tooltips: skip delay + animation on subsequent hovers.** Once one tooltip is open, adjacent tooltips open instantly. Add `[data-instant] { transition-duration: 0ms; }`.

**Stagger card entrances:** 30–80ms between items. Never block interaction while stagger plays.
```css
.card { animation: fadeIn 300ms ease-out forwards; }
.card:nth-child(1) { animation-delay: 0ms;   }
.card:nth-child(2) { animation-delay: 50ms;  }
.card:nth-child(3) { animation-delay: 100ms; }
```

---

### Performance Rules

**Only animate `transform` and `opacity`.** These skip layout and paint, running on the GPU. Never animate `padding`, `margin`, `height`, or `width`.

**Framer Motion hardware acceleration caveat:**
```jsx
// NOT hardware-accelerated (drops frames under load)
<motion.div animate={{ x: 100 }} />

// Hardware-accelerated (stays smooth)
<motion.div animate={{ transform: "translateX(100px)" }} />
```

**CSS variables on parent = expensive.** Updating `--swipe-amount` on a container recalculates styles for ALL children. Update `transform` directly on the element:
```js
// Bad: triggers recalc on all children
element.style.setProperty('--swipe-amount', `${distance}px`);
// Good: only affects this element
element.style.transform = `translateY(${distance}px)`;
```

**CSS animations beat JS under load.** CSS animations run off the main thread. When the browser is busy, Framer Motion (requestAnimationFrame) drops frames. Use CSS for predetermined animations; JS for dynamic, interruptible ones.

---

## Animation Review Checklist

| Issue | Fix |
|---|---|
| `transition: all` | Specify exact properties: `transition: transform 200ms ease-out` |
| `scale(0)` entry | Start from `scale(0.95)` with `opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or custom curve |
| `transform-origin: center` on popover | Set to trigger location; modals are exempt |
| Animation on keyboard action | Remove entirely |
| Duration > 300ms on UI element | Reduce to 150–250ms |
| Hover without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Framer Motion `x`/`y` props under load | Use `transform: "translateX()"` string |
| Same enter/exit speed | Make exit faster (exit 200ms, enter can be longer) |
| All elements appear at once | Add stagger 30–80ms between items |
