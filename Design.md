# Unite Group — Design System

> The design team in a file. Every component, every colour, every spacing decision traces back here.

## Brand Identity
- **Name:** Unite Group Empire Command Center
- **Tagline:** Connected service for the field.
- **Voice:** Warm + expert. Direct. No corporate speak. Field-services operators.
- **Dark-first:** All surfaces dark. Light = accent only.

## Colour Tokens
| Token | Hex | Role |
|---|---|---|
| `--ug-blue` | `#1D4ED8` | Primary — trust, action |
| `--ug-blue-light` | `#3B82F6` | Hover states |
| `--ug-slate` | `#1E293B` | Secondary surfaces |
| `--ug-amber` | `#FBBF24` | Accent — connect, signal |
| `--ug-surface` | `#0F172A` | Page background |
| `--ug-surface-1` | `#1E293B` | Card background |
| `--ug-surface-2` | `#334155` | Elevated surface |
| `--ug-border` | `#334155` | Borders |
| `--ug-text` | `#F8FAFC` | Primary text |
| `--ug-text-muted` | `#94A3B8` | Muted text |
| `--ug-success` | `#16A34A` | Operational |
| `--ug-warning` | `#D97706` | Degraded |
| `--ug-danger` | `#DC2626` | Down/error |

## Typography
- **Display:** Inter Bold 700 — headlines, metrics
- **Body:** Inter Regular 400 — copy
- **Mono:** JetBrains Mono 500 — codes, values, metrics
- Scale: 48/36/24/18/16/14/12px

## Component Patterns
- **Cards:** `bg-[--ug-surface-1] border border-[--ug-border] rounded-xl p-5`
- **Primary CTA:** `bg-[--ug-blue] text-white rounded-lg px-5 py-2.5 hover:bg-[--ug-blue-light]`
- **Amber accent:** amber left-border on cards that need attention
- **Status dots:** pulsing dot (emerald=live, blue=building, amber=degraded, red=down)
- **Metric values:** JetBrains Mono, large, `text-[--ug-text]`
- **Section headers:** `text-xs font-semibold text-[--ug-text-muted] uppercase tracking-widest`

## Layout
- Max width: 1440px, 24px side padding
- Sidebar nav (240px) + main content for authenticated views
- Card grid: 3-col desktop, 2-col tablet, 1-col mobile
- Sticky header: 64px

## Navigation (authenticated)
Left sidebar with:
- Unite Group logo + amber pulse
- Links: Dashboard, CEO View, Businesses (6), CCW Portal, Content
- Bottom: Profile, Settings

## Anti-patterns
- No white backgrounds on authenticated pages
- No light mode for the empire dashboard
- No marketing copy on authenticated views
- No "consultation" or "pricing" in the empire context
