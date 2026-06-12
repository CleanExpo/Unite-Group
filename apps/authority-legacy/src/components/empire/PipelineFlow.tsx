"use client";

import * as React from "react";
import { Cpu, type LucideIcon } from "lucide-react";
import type { BrandConfig } from "@/types/brand-config";
import {
  CircuitBoard,
  type CircuitNodeType,
  type CircuitConnection,
} from "@/components/ui/circuit-board";

// ─── Stage model ─────────────────────────────────────────────────────────────

/** A single stage in a pipeline / workflow flow. */
export interface PipelineStage {
  /** Stable id — used for connection routing. */
  id: string;
  /** Display label rendered under the node. */
  label: string;
  /**
   * Item count at this stage. Zero is treated as inactive (dim trace);
   * `> 0` marks the inbound connection as `animated: true`.
   */
  count: number;
  /** Optional lucide icon. Falls back to <Cpu/>. */
  icon?: LucideIcon;
  /** When true, the node renders in "processing" state (pulsing). */
  active?: boolean;
}

interface PipelineFlowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** Ordered list of stages — laid out left-to-right with even horizontal spacing. */
  stages: PipelineStage[];
  /** Board width in px. */
  width?: number;
  /** Board height in px. */
  height?: number;
  /** Pulse animation duration in seconds. */
  pulseSpeed?: number;
  /** Stable identity for asset / analytics. Pass the brand / client slug. */
  brandSlug?: string;
  /**
   * Already-resolved BrandConfig (loaded server-side via `getBrandConfig`).
   * When present, `brand.primary_color` OVERRIDES the Candy-Red pulse on
   * active edges. Omit on the Nexus UI Command Center.
   */
  brand?: Partial<BrandConfig>;
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

/**
 * PipelineFlow — friendlier wrapper around `<CircuitBoard>` for autonomous
 * pipeline / workflow visualisations. Computes node positions automatically
 * (linear horizontal layout, evenly spaced) and maps `count > 0` stages to
 * animated connections so callers pass an ergonomic stages array instead of
 * raw nodes + connections.
 *
 * Scope: defaults to the Nexus UI palette (white-12% traces, Candy-Red pulse).
 * Pass `brand` to override the pulse colour on per-brand surfaces.
 *
 * @example
 * <PipelineFlow stages={[
 *   { id: "margot",   label: "Research",   icon: Search,        count: 0 },
 *   { id: "board",    label: "Board",      icon: Users,         count: 2, active: true },
 *   { id: "pm",       label: "PM",         icon: ClipboardList, count: 1 },
 *   { id: "deployed", label: "Deployed",   icon: Rocket,        count: 4 },
 * ]} />
 */
export function PipelineFlow({
  stages,
  width = 560,
  height = 140,
  pulseSpeed = 2.5,
  brandSlug,
  brand,
  className,
  style,
  ...rest
}: PipelineFlowProps) {
  void brandSlug;

  const pulseColor =
    brand && isHex(brand.primary_color ?? undefined)
      ? hexToRgba(brand.primary_color as string, 0.85)
      : "rgba(179, 0, 0, 0.85)"; // Nexus Candy Red

  const padX = 56;
  const stepX = stages.length > 1 ? (width - padX * 2) / (stages.length - 1) : 0;
  const y = Math.round(height * 0.4);

  const nodes: CircuitNodeType[] = stages.map((s, i) => {
    const Icon = s.icon ?? Cpu;
    return {
      id: s.id,
      x: padX + stepX * i,
      y,
      label: `${s.label} · ${s.count}`,
      icon: <Icon size={16} strokeWidth={1.75} />,
      status: s.active ? "processing" : s.count > 0 ? "active" : "inactive",
      size: "md",
    };
  });

  const connections: CircuitConnection[] = stages.slice(0, -1).map((s, i) => {
    const next = stages[i + 1];
    const animated = s.active || s.count > 0;
    return {
      from: s.id,
      to: next.id,
      animated,
      color: "rgba(255,255,255,0.12)",
      pulseColor: animated ? pulseColor : "rgba(255,255,255,0.25)",
    };
  });

  return (
    <div
      className={className}
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        overflowX: "auto",
        ...style,
      }}
      {...rest}
    >
      <CircuitBoard
        nodes={nodes}
        connections={connections}
        width={width}
        height={height}
        showGrid={false}
        variant="dark"
        pulseSpeed={pulseSpeed}
      />
    </div>
  );
}
