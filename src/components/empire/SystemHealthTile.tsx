"use client";

import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tri = "ok" | "warn" | "err";
type Quad = Tri | "unknown";

export interface SystemHealth {
  overall: Tri;
  computed_at: string;
  signals: {
    database: { status: Tri; latency_ms: number; summary: string };
    api: { status: Tri; routes_total: number; routes_failing: number; summary: string };
    integrations: {
      status: Tri;
      github: Quad;
      linear: Quad;
      vercel: Quad;
      railway: Quad;
      supabase: Quad;
      summary?: string;
    };
    businesses: { status: Tri; total: number; ok_count: number; warn_count: number; err_count: number; summary: string };
    pi_ceo_scanner: { status: Tri; last_scan: string | null; stale_brands: number; summary: string };
    deploys: { status: Tri; last_prod_deploy: string | null; state: string; summary: string };
  };
}

// ─── Style helpers ────────────────────────────────────────────────────────────

export function statusColor(s: Quad): string {
  switch (s) {
    case "ok": return "var(--green-400)";
    case "warn": return "var(--orange-400)";
    case "err": return "var(--red-400)";
    case "unknown": return "var(--ink-disabled)";
  }
}

function statusLabel(s: Tri): string {
  if (s === "ok") return "● ALL GREEN";
  if (s === "warn") return "● DEGRADED";
  return "● FAILING";
}

function shortAge(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs < 60_000) return `${Math.round(ageMs / 1000)}s ago`;
  if (ageMs < 3600_000) return `${Math.round(ageMs / 60_000)}m ago`;
  return `${Math.round(ageMs / 3600_000)}h ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SubTileProps {
  name: string;
  status: Tri;
  summary: string;
  drillHref?: string;
  onClick?: () => void;
  expanded?: boolean;
  expandedChildren?: React.ReactNode;
}

export function SubTile({ name, status, summary, drillHref, onClick, expanded, expandedChildren }: SubTileProps) {
  return (
    <div
      data-signal={name.toLowerCase()}
      data-status={status}
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: onClick ? "pointer" : "default",
        minHeight: 78,
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          data-testid={`dot-${name.toLowerCase()}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor(status),
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            color: "var(--ink-secondary)",
            textTransform: "uppercase",
          }}
        >
          {name}
        </span>
        {drillHref && (
          <a
            href={drillHref}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-tertiary)",
              textDecoration: "none",
            }}
          >
            drill in →
          </a>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-primary)",
          lineHeight: 1.4,
        }}
      >
        {summary}
      </div>
      {expanded && expandedChildren}
    </div>
  );
}

interface SourceRowProps {
  label: string;
  status: Quad;
}

function SourceRow({ label, status }: SourceRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: statusColor(status),
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", width: 70 }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-tertiary)" }}>
        {status}
      </span>
    </div>
  );
}

// ─── Main tile ────────────────────────────────────────────────────────────────

export interface SystemHealthTileProps {
  /** Optional initial payload (for SSR / Storybook). When omitted, fetches on mount. */
  initialData?: SystemHealth | null;
  /** Override the API base for testing. Defaults to relative path. */
  apiPath?: string;
}

export function SystemHealthTile({ initialData = null, apiPath = "/api/empire/system-health" }: SystemHealthTileProps) {
  const [data, setData] = useState<SystemHealth | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState<string | null>(null);
  const [integrationsExpanded, setIntegrationsExpanded] = useState(false);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath, { method: force ? "POST" : "GET", cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SystemHealth;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    if (initialData === null) load(false);
    // Auto-refresh every 30s (server caches; this keeps the UI ticking).
    const interval = setInterval(() => load(false), 30_000);
    return () => clearInterval(interval);
  }, [initialData, load]);

  const overall: Tri = data?.overall ?? "warn";
  const pillBg = overall === "ok"
    ? "rgba(31,199,110,0.12)"
    : overall === "warn"
      ? "rgba(224,112,32,0.12)"
      : "rgba(204,26,26,0.15)";
  const pillBorder = overall === "ok"
    ? "rgba(31,199,110,0.35)"
    : overall === "warn"
      ? "rgba(224,112,32,0.35)"
      : "rgba(204,26,26,0.45)";

  return (
    <section
      data-testid="system-health-tile"
      data-overall={overall}
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-hairline)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            color: "var(--ink-secondary)",
            textTransform: "uppercase",
          }}
        >
          System Health
        </div>
        <span
          data-testid="overall-pill"
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            color: statusColor(overall),
            background: pillBg,
            border: `1px solid ${pillBorder}`,
            padding: "3px 10px",
            borderRadius: "var(--radius-md)",
            letterSpacing: "0.06em",
          }}
        >
          {statusLabel(overall)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-tertiary)" }}>
            {data ? `computed ${shortAge(data.computed_at)}` : loading ? "loading…" : "—"}
          </span>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--ink-primary)",
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "4px 10px",
              cursor: loading ? "wait" : "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {loading ? "…" : "REFRESH"}
          </button>
        </div>
      </div>

      {/* Sub-tile grid */}
      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {!data && !error && (
          <div style={{ gridColumn: "1 / -1", padding: 16, fontSize: 12, color: "var(--ink-tertiary)" }}>
            Loading system health…
          </div>
        )}
        {error && (
          <div style={{ gridColumn: "1 / -1", padding: 12, fontSize: 12, color: "var(--red-400)" }}>
            Health check failed: {error}
          </div>
        )}
        {data && (
          <>
            <SubTile
              name="Database"
              status={data.signals.database.status}
              summary={data.signals.database.summary}
            />
            <SubTile
              name="API"
              status={data.signals.api.status}
              summary={data.signals.api.summary}
              drillHref="/en/empire/integrations"
            />
            <SubTile
              name="Integrations"
              status={data.signals.integrations.status}
              summary={data.signals.integrations.summary ?? "5 sources"}
              onClick={() => setIntegrationsExpanded(v => !v)}
              expanded={integrationsExpanded}
              expandedChildren={
                <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 6, borderTop: "1px solid var(--border-hairline)" }}>
                  <SourceRow label="github"   status={data.signals.integrations.github} />
                  <SourceRow label="linear"   status={data.signals.integrations.linear} />
                  <SourceRow label="vercel"   status={data.signals.integrations.vercel} />
                  <SourceRow label="railway"  status={data.signals.integrations.railway} />
                  <SourceRow label="supabase" status={data.signals.integrations.supabase} />
                </div>
              }
            />
            <SubTile
              name="Businesses"
              status={data.signals.businesses.status}
              summary={data.signals.businesses.summary}
              drillHref="/en/empire/businesses"
            />
            <SubTile
              name="Pi-CEO Scanner"
              status={data.signals.pi_ceo_scanner.status}
              summary={data.signals.pi_ceo_scanner.summary}
              drillHref="/en/empire/businesses"
            />
            <SubTile
              name="Deploys"
              status={data.signals.deploys.status}
              summary={data.signals.deploys.summary}
            />
          </>
        )}
      </div>
    </section>
  );
}
