// marks.tsx — Unite-Group Nexus custom geometric mark set.
//
// DESIGN.md Rule 2: brand glyphs are hand-authored geometric marks, NOT an icon
// library. Every mark is drawn on a 24×24 grid, hexagon-derived where it can be,
// stroked at 1.5px with square caps and mitre joins so the whole set reads as one
// engineered family. Colour is inherited (`currentColor`) — never hard-coded — so
// a mark takes the Candy-Red / ink / signal colour of whatever context holds it.
//
// The 2026-06-30 icon rule stands: Lucide is fine for generic UI chrome; this file
// is reserved for the brand-specific marks (the π/hexagon lineage, Margot, vault,
// machine glyphs) that carry Unite-Group's identity.
//
// Usage:
//   import { HexMark, ApproveMark } from '@/components/ui/marks'
//   <HexMark className="text-[--red-bright]" />
//   <ApproveMark size={20} aria-label="Approve" />

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MarkProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  /** Square edge length in px. Defaults to 16 (canvas nav size). */
  size?: number
  /** Accessible label. When omitted the mark is treated as decorative (aria-hidden). */
  'aria-label'?: string
}

/**
 * Shared mark frame. Holds the 24×24 viewBox and the family stroke contract so
 * individual glyphs only declare their geometry, never their stroke treatment.
 */
const Mark = React.forwardRef<SVGSVGElement, MarkProps & { children: React.ReactNode }>(
  ({ size = 16, className, children, ...props }, ref) => {
    const decorative = props['aria-label'] === undefined
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden={decorative || undefined}
        role={decorative ? undefined : 'img'}
        className={cn('shrink-0', className)}
        {...props}
      >
        {children}
      </svg>
    )
  },
)
Mark.displayName = 'Mark'

// ── hexagon lineage ────────────────────────────────────────────────────────

/** The house mark — bare hexagon. Brand glyph and generic "contact/entity". */
export const HexMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
  </Mark>
))
HexMark.displayName = 'HexMark'

/** Today — hexagon holding a clock hand. */
export const TodayMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
    <line x1="12" y1="9" x2="12" y2="12.5" />
    <line x1="12" y1="12.5" x2="15" y2="14" />
  </Mark>
))
TodayMark.displayName = 'TodayMark'

/** Command — a prompt chevron over a base line. */
export const CommandMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <polyline points="6,8 10,12 6,16" />
    <line x1="12" y1="16" x2="18" y2="16" />
  </Mark>
))
CommandMark.displayName = 'CommandMark'

/** Approve — hexagon holding a tick. Approval-required / approved states. */
export const ApproveMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
    <polyline points="8.5,12 11,14.5 15.5,9.5" />
  </Mark>
))
ApproveMark.displayName = 'ApproveMark'

/** Portfolio / Pipeline — a four-cell quadrant. */
export const PortfolioMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <rect x="4" y="4" width="7" height="7" />
    <rect x="13" y="4" width="7" height="7" />
    <rect x="4" y="13" width="7" height="7" />
    <rect x="13" y="13" width="7" height="7" />
  </Mark>
))
PortfolioMark.displayName = 'PortfolioMark'

/** Money — a stroked ledger "S" over a spine. */
export const MoneyMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M16 7 H10 a3 3 0 0 0 0 6 h4 a3 3 0 0 1 0 6 H8" />
  </Mark>
))
MoneyMark.displayName = 'MoneyMark'

/** Evidence — a receipt/document with rule lines. */
export const EvidenceMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <polyline points="7,4 17,4 17,20 7,20 7,4" />
    <line x1="10" y1="9" x2="14" y2="9" />
    <line x1="10" y1="13" x2="14" y2="13" />
  </Mark>
))
EvidenceMark.displayName = 'EvidenceMark'

/** Machines — a unit with two antennae. Agents / runners. */
export const MachineMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <rect x="5" y="8" width="14" height="10" />
    <line x1="9" y1="8" x2="9" y2="4" />
    <line x1="15" y1="8" x2="15" y2="4" />
  </Mark>
))
MachineMark.displayName = 'MachineMark'

/** Vault — a strongbox with a centre seam. Credentials / secrets. */
export const VaultMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <rect x="4" y="5" width="16" height="14" />
    <line x1="12" y1="10" x2="12" y2="14" />
  </Mark>
))
VaultMark.displayName = 'VaultMark'

/** Margot — a taller hexagon holding a cross-hair. The estate's agent actor. */
export const MargotMark = React.forwardRef<SVGSVGElement, MarkProps>((props, ref) => (
  <Mark ref={ref} {...props}>
    <polygon points="12,3 19,8 19,16 12,21 5,16 5,8" />
    <line x1="12" y1="9" x2="12" y2="15" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </Mark>
))
MargotMark.displayName = 'MargotMark'
