/**
 * Unite Group — Shared UI constants
 * Single source of truth for all inline styles.
 * Import these in every page — never hardcode tokens.
 */

import type { CSSProperties } from "react";

// ── Zinc tokens ──────────────────────────────────────────────────────────────
export const Z = {
  canvas:    "#09090b",
  surface1:  "#111113",
  surface2:  "#18181b",
  surface3:  "#27272a",
  surface4:  "#3f3f46",
  hairline:  "#27272a",
  hairlineS: "#3f3f46",
  ink:       "#fafafa",
  muted:     "#d4d4d8",
  subtle:    "#a1a1aa",
  ghost:     "#52525b",
  blue:      "#1d4ed8",
  blueH:     "#3b82f6",
  amber:     "#f59e0b",
  success:   "#16a34a",
  warning:   "#d97706",
  danger:    "#dc2626",
} as const;

// ── Reusable style objects ────────────────────────────────────────────────────

/** Standard card — use on every container card */
export const card: CSSProperties = {
  background: Z.surface1,
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
  border: `1px solid ${Z.hairline}`,
  borderRadius: 12,
  padding: 20,
};

/** Elevated card — for featured/highlighted cards */
export const cardElevated: CSSProperties = {
  ...card,
  background: Z.surface2,
  border: `1px solid ${Z.hairlineS}`,
};

/** Section label — "PORTFOLIO", "QUICK ACTIONS", etc. */
export const sectionLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: Z.ghost,
  marginBottom: 12,
};

/** Page wrapper — use as the outer div on every page */
export const pageWrap: CSSProperties = {
  minHeight: "100vh",
  background: Z.canvas,
  color: Z.ink,
  fontFamily: "var(--font-inter)",
};

/** Max-width content container */
export const contentWrap: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "24px",
  display: "flex",
  flexDirection: "column" as const,
  gap: 24,
};

/** Standard page title (replaces internal sticky headers) */
export const pageTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: Z.ink,
  letterSpacing: "-0.02em",
  margin: 0,
  fontFamily: "var(--font-inter)",
};

/** Metric value (always JetBrains Mono) */
export const metric: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
};

/** Primary button */
export const btnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 8,
  border: "none",
  background: Z.blue,
  color: "#fff",
  cursor: "pointer",
  transition: "background 0.1s ease",
  fontFamily: "var(--font-inter)",
};

/** Ghost button */
export const btnGhost: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 8,
  border: `1px solid ${Z.hairline}`,
  background: "transparent",
  color: Z.subtle,
  cursor: "pointer",
  transition: "all 0.1s ease",
  fontFamily: "var(--font-inter)",
};

/** Standard input */
export const input: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  borderRadius: 8,
  border: `1px solid ${Z.hairline}`,
  background: Z.surface1,
  color: Z.ink,
  outline: "none",
  fontFamily: "var(--font-inter)",
  boxSizing: "border-box" as const,
  transition: "border-color 0.1s ease",
};

/** Page header bar (replaces per-page sticky headers) */
export const pageHeader: CSSProperties = {
  height: 56,
  display: "flex",
  alignItems: "center",
  padding: "0 24px",
  borderBottom: `1px solid ${Z.hairline}`,
  position: "sticky" as const,
  top: 0,
  zIndex: 40,
  background: "rgba(9,9,11,0.9)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  gap: 16,
};
