"use client";

// UNI-1947 Pillar 3 — Brand × Source health matrix.
//
// 6 brands × 5 sources = 30 cells. Each cell is a coloured status dot driven
// by the real adapter response (NO MOCK DATA). Click a cell → right-side
// drawer with summary + details + deep link + "file remediation" mailto.
//
// Visual register matches SystemHealthTile (Gun Metal canvas, mono caps for
// labels, 4px corners, dense). Australian English. No smart quotes.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BusinessLogo } from "@/components/empire/BusinessLogo";
import type { BusinessSource, SourceKind, SourceStatus } from "@/types/business-source";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SourceMatrixBrand {
  slug: string;
  name: string;
  cells: Record<SourceKind, BusinessSource>;
}

export interface SourceMatrix {
  computed_at: string;
  brands: SourceMatrixBrand[];
}

interface SourceMatrixGridProps {
  /** Optional initial payload (SSR / tests). Without it, fetches on mount. */
  initialData?: SourceMatrix | null;
  /** Override API path for tests. */
  apiPath?: string;
}

interface DrawerSelection {
  brand: SourceMatrixBrand;
  source: SourceKind;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES: SourceKind[] = ["github", "linear", "vercel", "railway", "supabase"];

// Colour tokens — match the brief exactly.
const STATUS_COLOURS: Record<SourceStatus, string> = {
  ok: "#16a34a",
  warn: "#d97706",
  err: "#dc2626",
  unknown: "#52525b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: SourceStatus): string {
  if (s === "ok") return "OK";
  if (s === "warn") return "WARN";
  if (s === "err") return "ERR";
  return "UNKNOWN";
}

function shortAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

function emptyMatrix(): SourceMatrix {
  return { computed_at: new Date().toISOString(), brands: [] };
}

function remediationMailto(brand: SourceMatrixBrand, source: SourceKind, cell: BusinessSource): string {
  const subject = `[Remediation] ${brand.name} ${source}`;
  const lines = [
    `Brand: ${brand.name} (${brand.slug})`,
    `Source: ${source}`,
    `Status: ${cell.status}`,
    `Summary: ${cell.summary}`,
    cell.error ? `Error: ${cell.error}` : "",
    cell.url ? `URL: ${cell.url}` : "",
    "",
    "Details:",
    cell.details ? JSON.stringify(cell.details, null, 2) : "(none)",
  ].filter(Boolean);
  const body = lines.join("\n");
  return `mailto:contact@unite-group.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Status dot ───────────────────────────────────────────────────────────────

interface StatusDotProps {
  status: SourceStatus;
  title: string;
  onClick: () => void;
  testId: string;
}

function StatusDot({ status, title, onClick, testId }: StatusDotProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-status={status}
      title={title}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 4,
        background: "transparent",
        border: "1px solid var(--border-hairline)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: "border-color 0.12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-hairline)")}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: STATUS_COLOURS[status],
          flexShrink: 0,
          boxShadow: status === "err" ? "0 0 0 2px rgba(220,38,38,0.20)" : undefined,
        }}
      />
    </button>
  );
}

// ─── Column header pill ───────────────────────────────────────────────────────

function ColumnHealthPill({ okCount, total }: { okCount: number; total: number }) {
  const status: SourceStatus = okCount === total
    ? "ok"
    : okCount === 0
      ? "err"
      : "warn";
  return (
    <span
      data-testid={`col-pill-${status}`}
      style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        color: STATUS_COLOURS[status],
        background: `${STATUS_COLOURS[status]}1f`,
        border: `1px solid ${STATUS_COLOURS[status]}59`,
        padding: "1px 6px",
        borderRadius: 4,
        letterSpacing: "0.04em",
      }}
    >
      {okCount}/{total}
    </span>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface DrawerProps {
  brand: SourceMatrixBrand;
  source: SourceKind;
  onClose: () => void;
}

function Drawer({ brand, source, onClose }: DrawerProps) {
  const cell = brand.cells[source];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const detailEntries = cell.details ? Object.entries(cell.details) : [];

  return (
    <div
      data-testid="source-matrix-drawer"
      role="dialog"
      aria-label={`${brand.name} ${source}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.45)",
      }}
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          maxHeight: "100vh",
          background: "var(--surface-1)",
          borderLeft: "1px solid var(--border-default)",
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BusinessLogo slug={brand.slug} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-primary)" }}>
              {brand.name} <span style={{ color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>·</span>{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>{source}</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-tertiary)", marginTop: 2 }}>
              {cell.last_update ? `updated ${shortAge(cell.last_update)}` : "no recorded update"}
            </div>
          </div>
          <span
            data-testid="drawer-status-pill"
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: STATUS_COLOURS[cell.status],
              background: `${STATUS_COLOURS[cell.status]}1f`,
              border: `1px solid ${STATUS_COLOURS[cell.status]}59`,
              padding: "3px 8px",
              borderRadius: 4,
              letterSpacing: "0.06em",
            }}
          >
            {statusLabel(cell.status)}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              fontSize: 14,
              background: "transparent",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              padding: "2px 8px",
              color: "var(--ink-secondary)",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Summary */}
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--ink-primary)",
            background: "var(--surface-2)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 4,
            padding: "12px 14px",
          }}
        >
          {cell.summary}
        </div>

        {cell.error && (
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: STATUS_COLOURS.err,
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.30)",
              borderRadius: 4,
              padding: "8px 12px",
              wordBreak: "break-word",
            }}
          >
            {cell.error}
          </div>
        )}

        {/* Details key-value table */}
        {detailEntries.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-tertiary)",
                marginBottom: 6,
              }}
            >
              Details
            </div>
            <table
              data-testid="drawer-details"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            >
              <tbody>
                {detailEntries.map(([k, v]) => (
                  <tr key={k}>
                    <td
                      style={{
                        padding: "6px 10px 6px 0",
                        color: "var(--ink-tertiary)",
                        borderBottom: "1px solid var(--border-hairline)",
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k}
                    </td>
                    <td
                      style={{
                        padding: "6px 0",
                        color: "var(--ink-primary)",
                        borderBottom: "1px solid var(--border-hairline)",
                        wordBreak: "break-word",
                      }}
                    >
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
          <Link
            href={`/en/empire/businesses/${brand.slug}`}
            data-testid="drawer-open-business"
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--ink-primary)",
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              padding: "6px 12px",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            Open business detail →
          </Link>
          {cell.url && (
            <a
              data-testid="drawer-open-link"
              href={cell.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                color: "var(--ink-primary)",
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                borderRadius: 4,
                padding: "6px 12px",
                textDecoration: "none",
                letterSpacing: "0.04em",
              }}
            >
              Open source →
            </a>
          )}
          <a
            data-testid="drawer-remediation"
            href={remediationMailto(brand, source, cell)}
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--red-400)",
              background: "rgba(220,38,38,0.10)",
              border: "1px solid rgba(220,38,38,0.35)",
              borderRadius: 4,
              padding: "6px 12px",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            File remediation ticket
          </a>
        </div>
      </aside>
    </div>
  );
}

// ─── Main grid ────────────────────────────────────────────────────────────────

export function SourceMatrixGrid({
  initialData = null,
  apiPath = "/api/empire/source-matrix",
}: SourceMatrixGridProps) {
  const [data, setData] = useState<SourceMatrix | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<DrawerSelection | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const url = force ? `${apiPath}?force=1` : apiPath;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SourceMatrix;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [apiPath],
  );

  useEffect(() => {
    if (initialData === null) load(false);
  }, [initialData, load]);

  const matrix = data ?? emptyMatrix();

  // Column counts (ok per source).
  const columnOk = useMemo(() => {
    const result: Record<SourceKind, number> = {
      github: 0, linear: 0, vercel: 0, railway: 0, supabase: 0,
    };
    for (const brand of matrix.brands) {
      for (const kind of SOURCES) {
        if (brand.cells[kind]?.status === "ok") result[kind] += 1;
      }
    }
    return result;
  }, [matrix.brands]);

  return (
    <section
      data-testid="source-matrix-grid"
      data-brand-count={matrix.brands.length}
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
          Source Matrix
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-tertiary)" }}>
            {data ? `computed ${shortAge(data.computed_at)}` : loading ? "loading…" : "—"}
          </span>
          <button
            type="button"
            data-testid="source-matrix-refresh"
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

      {/* Body */}
      {error && (
        <div style={{ padding: 14, fontSize: 12, color: "var(--red-400)" }}>
          Matrix unavailable: {error}
        </div>
      )}
      {!error && matrix.brands.length === 0 && !loading && (
        <div style={{ padding: 14, fontSize: 12, color: "var(--ink-tertiary)" }}>
          No active brands found.
        </div>
      )}
      {!error && matrix.brands.length > 0 && (
        <div style={{ padding: "14px 18px", overflowX: "auto" }}>
          <table
            data-testid="source-matrix-table"
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 4px",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink-tertiary)",
                    padding: "4px 10px 8px 0",
                    minWidth: 200,
                  }}
                >
                  Brand
                </th>
                {SOURCES.map((kind) => (
                  <th
                    key={kind}
                    data-testid={`col-${kind}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-tertiary)",
                      padding: "4px 6px 8px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span>{kind}</span>
                      <ColumnHealthPill okCount={columnOk[kind]} total={matrix.brands.length} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.brands.map((brand) => (
                <tr key={brand.slug} data-testid={`row-${brand.slug}`}>
                  <td
                    style={{
                      padding: "6px 10px 6px 0",
                      borderBottom: "1px solid var(--border-hairline)",
                    }}
                  >
                    <Link
                      href={`/en/empire/businesses/${brand.slug}`}
                      data-testid={`row-link-${brand.slug}`}
                      style={{
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "inherit",
                      }}
                    >
                      <BusinessLogo slug={brand.slug} size="sm" />
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--ink-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {brand.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            color: "var(--ink-tertiary)",
                          }}
                        >
                          {brand.slug}
                        </span>
                      </div>
                    </Link>
                  </td>
                  {SOURCES.map((kind) => {
                    const cell = brand.cells[kind];
                    const status = cell?.status ?? "unknown";
                    const tooltip = cell ? `${cell.summary}` : "no data";
                    return (
                      <td
                        key={kind}
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          borderBottom: "1px solid var(--border-hairline)",
                          verticalAlign: "middle",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <StatusDot
                            status={status}
                            title={tooltip}
                            testId={`cell-${brand.slug}-${kind}`}
                            onClick={() => setSelection({ brand, source: kind })}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {selection && (
        <Drawer
          brand={selection.brand}
          source={selection.source}
          onClose={() => setSelection(null)}
        />
      )}
    </section>
  );
}
