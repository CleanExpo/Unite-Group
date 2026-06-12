---
type: wiki
updated: 2026-05-10
---

# Unite-Group Nexus Design System

The Nexus design system is the visual language for all Unite-Group products. It is built on a Gun Metal dark foundation with Candy Red as the primary brand accent.

## Two Registers

Nexus ships two registers — visual personalities that share the same tokens but differ in density, rounding, and spatial rhythm.

### CEO Command Center
- Context: internal dashboards, Pi-CEO board, portfolio ops
- Character: sharp, dense, data-forward
- Sidebar width: 240px
- Radius profile: `--radius-sharp` (2px) and `--radius-sm` (4px)
- Header height: 64px
- Typography weight: semibold labels, mono data values

### Client Portal
- Context: [[ccw]] and future client-facing surfaces
- Character: soft, spacious, approachable
- Sidebar width: 220px
- Radius profile: `--radius-client-sm` (6px) to `--radius-client-lg` (14px)
- Header height: 72px
- Typography weight: regular body, slightly looser leading

---

## Color System

### Canvas & Surface

The background stack creates depth through layering without heavy shadows at the lower levels.

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#0e1014` | Page background, deepest layer |
| `--surface-1` | `#141820` | Primary panel / sidebar background |
| `--surface-2` | `#1c2230` | Card backgrounds |
| `--surface-3` | `#232b3a` | Elevated cards, modals |
| `--surface-4` | `#2d3748` | Hover states, selected rows |
| `--surface-5` | `#3a4556` | Active states, pressed |

### Borders

| Token | Hex | Use |
|---|---|---|
| `--border-hairline` | `#1e2636` | Subtle dividers, table rules |
| `--border-default` | `#2a3347` | Card borders, input outlines |
| `--border-strong` | `#3d4f65` | Focused inputs, prominent dividers |
| `--border-accent` | `#8b0000` | Active nav item, selected state highlight |

### Ink (Text)

| Token | Hex | Use |
|---|---|---|
| `--ink-primary` | `#f0f2f5` | Primary body text, headings |
| `--ink-secondary` | `#9ba8bc` | Supporting labels, metadata |
| `--ink-tertiary` | `#5c6a7e` | Placeholders, disabled labels |
| `--ink-disabled` | `#384050` | Disabled controls |
| `--ink-inverse` | `#0e1014` | Text on light / accent backgrounds |

---

## Brand Color Families

### Candy Red (Primary)

The primary brand accent. Used for CTAs, active states, and critical data signals.

| Token | Hex |
|---|---|
| `--red-900` | `#3d0000` |
| `--red-800` | `#5c0000` |
| `--red-700` | `#7a0000` |
| `--red-600` | `#990000` |
| `--red-500` | `#b30000` ← primary |
| `--red-400` | `#cc1a1a` |
| `--red-300` | `#e03333` |
| `--red-200` | `#f06666` |
| `--red-100` | `#fcc2c2` |

Alpha variants for overlays and subtle fills:

| Token | Value |
|---|---|
| `--red-a20` | `rgba(179, 0, 0, 0.20)` |
| `--red-a12` | `rgba(179, 0, 0, 0.12)` |
| `--red-a08` | `rgba(179, 0, 0, 0.08)` |
| `--red-a04` | `rgba(179, 0, 0, 0.04)` |

### Orange

| Token | Hex | Use |
|---|---|---|
| `--orange-500` | `#bf5c00` | Warning-adjacent, pricing accents |
| `--orange-400` | `#e07020` | Warning semantic, chart slot 3 |
| `--orange-300` | `#f5923a` | Warning text on dark |

### Green

| Token | Hex | Use |
|---|---|---|
| `--green-500` | `#00a854` | Success semantic, positive metrics |
| `--green-400` | `#1fc76e` | Success hover |
| `--green-300` | `#4dde8f` | Success text on dark |

---

## Semantic Colors

| Token | Hex | Use |
|---|---|---|
| `--color-success` | `#00a854` | Positive status, confirmed actions |
| `--color-success-subtle` | `rgba(0,168,84,0.12)` | Success fill backgrounds |
| `--color-success-text` | `#4dde8f` | Success text on dark surfaces |
| `--color-warning` | `#e07020` | Caution state, pending |
| `--color-warning-subtle` | `rgba(224,112,32,0.12)` | Warning fill backgrounds |
| `--color-warning-text` | `#f5923a` | Warning text on dark surfaces |
| `--color-error` | `#b30000` | Destructive actions, errors |
| `--color-error-subtle` | `rgba(179,0,0,0.12)` | Error fill backgrounds |
| `--color-error-text` | `#f06666` | Error text on dark surfaces |
| `--color-info` | `#3a7bd5` | Informational, neutral links |
| `--color-info-subtle` | `rgba(58,123,213,0.12)` | Info fill backgrounds |
| `--color-info-text` | `#7aabec` | Info text on dark surfaces |

---

## Chart Palette

Six slots chosen for readability on the Gun Metal canvas, with sufficient contrast between adjacent series.

| Token | Hex | Hue |
|---|---|---|
| `--chart-1` | `#cc1a1a` | Red |
| `--chart-2` | `#3a7bd5` | Blue |
| `--chart-3` | `#e07020` | Orange |
| `--chart-4` | `#00a854` | Green |
| `--chart-5` | `#8b5cf6` | Violet |
| `--chart-6` | `#14b8a6` | Teal |

---

## Typography

### Typefaces

| Role | Family | Token |
|---|---|---|
| Display / UI | Syne | `--font-display` |
| Data / Mono | JetBrains Mono | `--font-mono` |

Syne is used for all headings, nav labels, and UI text. JetBrains Mono is reserved for numeric KPIs, code blocks, terminal output, and structured data values.

### Scale

| Token | Size |
|---|---|
| `--text-2xs` | 0.6875rem (11px) |
| `--text-xs` | 0.75rem (12px) |
| `--text-sm` | 0.8125rem (13px) |
| `--text-base` | 0.875rem (14px) |
| `--text-md` | 1rem (16px) |
| `--text-lg` | 1.125rem (18px) |
| `--text-xl` | 1.25rem (20px) |
| `--text-2xl` | 1.5rem (24px) |
| `--text-3xl` | 1.875rem (30px) |
| `--text-4xl` | 2.25rem (36px) |
| `--text-5xl` | 3rem (48px) |

### Weight

| Token | Value |
|---|---|
| `--weight-regular` | 400 |
| `--weight-medium` | 500 |
| `--weight-semibold` | 600 |
| `--weight-bold` | 700 |
| `--weight-extrabold` | 800 |

### Leading & Tracking

| Token | Value | Use |
|---|---|---|
| `--leading-none` | 1 | Display lockups |
| `--leading-tight` | 1.2 | Headings |
| `--leading-snug` | 1.35 | Subheadings |
| `--leading-normal` | 1.5 | Body text |
| `--leading-relaxed` | 1.65 | Long-form prose |
| `--tracking-display` | -0.025em | Hero text |
| `--tracking-heading` | -0.015em | Section headings |
| `--tracking-body` | 0em | Body |
| `--tracking-label` | 0.01em | UI labels |
| `--tracking-caps` | 0.08em | All-caps labels |
| `--tracking-mono` | 0.02em | Mono / data |

---

## Spacing

4px base grid.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

---

## Border Radius

Two profiles: Command Center (sharp) and Client Portal (rounded).

| Token | Value | Register |
|---|---|---|
| `--radius-sharp` | 2px | Command Center |
| `--radius-sm` | 4px | Command Center |
| `--radius-md` | 6px | Command Center |
| `--radius-lg` | 8px | Shared |
| `--radius-full` | 9999px | Pills, badges |
| `--radius-client-sm` | 6px | Client Portal |
| `--radius-client-md` | 10px | Client Portal |
| `--radius-client-lg` | 14px | Client Portal |

---

## Shadows

| Token | Use |
|---|---|
| `--shadow-0` | No elevation |
| `--shadow-1` | Subtle card lift |
| `--shadow-2` | Dropdown, tooltip |
| `--shadow-3` | Modal, panel |
| `--shadow-4` | Full-screen overlay |
| `--shadow-red-glow` | Focused red CTA, error state ring |
| `--shadow-green-glow` | Positive metric pulse, success ring |

---

## Motion

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23,1,0.32,1)` | Enter transitions |
| `--ease-in-out` | `cubic-bezier(0.77,0,0.175,1)` | Page transitions |
| `--ease-spring` | `cubic-bezier(0.34,1.56,0.64,1)` | Interactive elements |
| `--duration-fast` | 80ms | Hover, focus |
| `--duration-base` | 150ms | Panel open/close |
| `--duration-slow` | 300ms | Page-level transitions |

### Keyframes

- `pulse-dot` — status indicator pulse (opacity + scale)
- `empire-fade-in` — panel entrance (opacity + translateY)
- `score-reveal` — SVG stroke-dashoffset reveal for score rings
- `pulse-green-glow` — box-shadow pulse for positive metrics

---

## Layout

| Token | Value |
|---|---|
| `--sidebar-width` | 240px (Command Center) |
| `--client-sidebar-width` | 220px (Client Portal) |
| `--header-height` | 64px (Command Center) |
| `--client-header-height` | 72px (Client Portal) |

---

## shadcn HSL Bridge

All shadcn `--primary`, `--accent`, `--ring`, and `--destructive` tokens are mapped to the Candy Red family (`0 100% 35%` ≈ `#b30000`). The `--background` HSL is mapped to the canvas (`10 15% 7%`). These bridge tokens allow shadcn/ui components to inherit Nexus colours without modification.

---

## Legacy Bridge

Tokens prefixed `*-legacy` are temporary aliases pointing to the new system. Remove them per-component as migration completes.

| Legacy Token | Maps To |
|---|---|
| `--canvas-legacy` | `--canvas` |
| `--surface-legacy` | `--surface-1` |
| `--ink-legacy` | `--ink-primary` |
| `--ink-muted-legacy` | `--ink-secondary` |
| `--primary-legacy` | `--red-500` |
