"use client";

import * as React from "react";
import type { BrandConfig } from "@/types/brand-config";
import { GithubCalendar } from "@/components/ui/github-calendar";

/**
 * Supported colour schemes. Mirrors the underlying GithubCalendar palette,
 * EXCEPT `red` — the primitive does not ship a red palette. `red` is mapped
 * to `orange` (closest hue) to keep the wrapper API future-friendly; revisit
 * if/when GithubCalendar gains a red schema.
 */
export type ActivityHeatmapColor = "green" | "orange" | "blue" | "red";

interface ActivityHeatmapProps {
  /** GitHub username to fetch contributions for. */
  username: string;
  /** Optional caption above the heatmap (e.g. "Phill · GitHub activity"). */
  label?: string;
  /**
   * Visual colour scheme. Defaults to "green" (Phill on Command Center). The
   * Command Center uses "orange" for Rana. Future client-activity heatmaps
   * can choose their own. NOTE: "red" currently falls through to "orange"
   * — see GithubCalendar primitive.
   */
  colorScheme?: ActivityHeatmapColor;
  /** Show the contribution total + username header line. Default true. */
  showTotal?: boolean;
  /** Glow intensity for city-lights variant. */
  glowIntensity?: number;
  /** Stable identity for asset / analytics. Pass the brand / client slug. */
  brandSlug?: string;
  /**
   * Already-resolved BrandConfig. Reserved for per-brand styling overrides
   * (e.g. surrounding card border). Currently informational only — the
   * underlying GithubCalendar palette is fixed.
   */
  brand?: Partial<BrandConfig>;
  className?: string;
}

const SCHEME_MAP: Record<ActivityHeatmapColor, "green" | "orange" | "blue"> = {
  green: "green",
  orange: "orange",
  blue: "blue",
  red: "orange", // see ActivityHeatmapColor JSDoc
};

// ─── Wrapper ─────────────────────────────────────────────────────────────────

/**
 * ActivityHeatmap — single-author GithubCalendar wrapped in a Nexus-UI panel
 * with an optional label slot + colour-scheme prop. Used by the Command
 * Center to show developer activity for Phill (green) and Rana (orange); the
 * same component drops into client-activity surfaces with a different scheme.
 *
 * Scope: defaults to the Nexus UI Gun-Metal surface. `brand` is accepted for
 * future per-brand styling overrides — currently informational.
 *
 * @example
 * <ActivityHeatmap username="CleanExpo" label="Phill" colorScheme="green" />
 *
 * @example
 * <ActivityHeatmap username="rana-muzamil" label="Rana" colorScheme="orange" />
 */
export function ActivityHeatmap({
  username,
  label,
  colorScheme = "green",
  showTotal = true,
  glowIntensity = 4,
  brandSlug,
  brand,
  className,
}: ActivityHeatmapProps) {
  void brandSlug;
  void brand;

  const colorSchema = SCHEME_MAP[colorScheme];

  return (
    <div
      className={className}
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "16px 18px",
        overflowX: "auto",
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-tertiary)",
            fontFamily: "var(--font-mono)",
            marginBottom: 10,
          }}
        >
          {label}
        </div>
      )}
      <GithubCalendar
        username={username}
        variant="city-lights"
        shape="rounded"
        colorSchema={colorSchema}
        showTotal={showTotal}
        glowIntensity={glowIntensity}
      />
    </div>
  );
}
