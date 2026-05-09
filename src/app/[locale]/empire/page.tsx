"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessHealth = {
  id: string;
  name: string;
  status: string;
  arr_aud: number;
  overall_health: number | null;
  security_score: number | null;
  dependencies: number | null;
  security_findings: number | null;
  snapshot_at: string | null;
};

type PortfolioSummary = {
  total_arr: number;
  avg_health: number | null;
  at_risk_count: number;
  last_rescan: string | null;
  has_live_data: boolean;
};

type EmpireData = {
  businesses: BusinessHealth[];
  summary: PortfolioSummary;
  fetched_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthColor(score: number | null): string {
  if (score === null) return "var(--ink-disabled)";
  if (score >= 80)   return "var(--green-400)";
  if (score >= 50)   return "var(--orange-400)";
  return "var(--red-400)";
}

function healthStatusLabel(score: number | null): string {
  if (score === null) return "unknown";
  if (score >= 80)   return "operational";
  if (score >= 60)   return "building";
  if (score >= 40)   return "degraded";
  return "down";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatArr(arr: number): string {
  if (arr === 0) return "";
  if (arr >= 1_000_000) return `$${(arr / 1_000_000).toFixed(1)}M ARR`;
  if (arr >= 1_000)     return `$${Math.round(arr / 1_000)}k ARR`;
  return `$${arr} ARR`;
}

// ─── HealthScoreRing ──────────────────────────────────────────────────────────

function HealthScoreRing({ score }: { score: number | null }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const color = healthColor(score);

  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={36}
          cy={36}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={5}
        />
        {/* Arc */}
        <circle
          cx={36}
          cy={36}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s var(--ease-out), stroke 0.3s" }}
        />
      </svg>
      {/* Score label */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: score !== null ? color : "var(--ink-disabled)",
          lineHeight: 1,
        }}>
          {score !== null ? score : "—"}
        </span>
        <span style={{
          fontSize: 9,
          color: "var(--ink-tertiary)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
          marginTop: 1,
        }}>
          /100
        </span>
      </div>
    </div>
  );
}

// ─── StatusDot ────────────────────────────────────────────────────────────────

function StatusDot({ score }: { score: number | null }) {
  const color = healthColor(score);
  return (
    <span
      className="status-dot"
      style={{
        width: 7,
        height: 7,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

// ─── ShieldIcon ───────────────────────────────────────────────────────────────

function ShieldIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M8 1.5L2 4v4c0 3.314 2.686 6 6 6s6-2.686 6-6V4L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── BusinessCard ─────────────────────────────────────────────────────────────

function BusinessCard({ biz }: { biz: BusinessHealth }) {
  const color = healthColor(biz.overall_health);
  const arrLabel = formatArr(biz.arr_aud);

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "border-color var(--duration-base)",
        animation: "empire-fade-in 0.4s var(--ease-out) both",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-default)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-hairline)";
      }}
    >
      {/* Header row: name + ARR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <StatusDot score={biz.overall_health} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.2px" }}>
            {biz.name}
          </span>
        </div>
        {arrLabel && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--green-400)",
            fontFamily: "var(--font-mono)",
            background: "rgba(0,168,84,0.10)",
            padding: "2px 7px",
            borderRadius: "var(--radius-full)",
            letterSpacing: "0.02em",
          }}>
            {arrLabel}
          </span>
        )}
      </div>

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <HealthScoreRing score={biz.overall_health} />

        {/* Right side metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {/* Security score */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <ShieldIcon size={11} />
            <span style={{
              fontSize: 11,
              color: "var(--ink-secondary)",
              fontFamily: "var(--font-mono)",
            }}>
              sec:{" "}
              <span style={{ color: biz.security_score !== null ? color : "var(--ink-disabled)" }}>
                {biz.security_score !== null ? biz.security_score : "—"}/100
              </span>
            </span>
          </div>

          {/* Findings */}
          <div style={{ fontSize: 11, color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
            {biz.security_findings !== null
              ? <><span style={{ color: "var(--ink-primary)" }}>{biz.security_findings.toLocaleString()}</span> findings</>
              : <span style={{ color: "var(--ink-disabled)" }}>no scan data</span>
            }
          </div>

          {/* Status label */}
          <div style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: color,
            opacity: 0.8,
          }}>
            {healthStatusLabel(biz.overall_health)}
          </div>
        </div>
      </div>

      {/* Footer: last updated */}
      <div style={{
        fontSize: 10,
        color: "var(--ink-tertiary)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.03em",
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 10,
        marginTop: -4,
      }}>
        Updated {relativeTime(biz.snapshot_at)}
      </div>
    </div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 4 }} />
      <div style={{ display: "flex", gap: 16 }}>
        <div className="skeleton" style={{ width: 72, height: 72, borderRadius: "50%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
          <div className="skeleton" style={{ height: 11, width: "80%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 11, width: "55%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 10, width: "40%", borderRadius: 4 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 10, width: "45%", borderRadius: 4, marginTop: 6 }} />
    </div>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary: PortfolioSummary | null }) {
  const avgColor = healthColor(summary?.avg_health ?? null);

  const items = [
    {
      label: "Total ARR",
      value: summary ? formatArr(summary.total_arr) || "—" : "—",
      color: summary && summary.total_arr > 0 ? "var(--green-400)" : "var(--ink-secondary)",
    },
    {
      label: "Avg Health",
      value: summary?.avg_health !== null && summary?.avg_health !== undefined
        ? `${summary.avg_health}/100`
        : "—",
      color: avgColor,
    },
    {
      label: "At Risk",
      value: summary ? `${summary.at_risk_count} biz` : "—",
      color: summary && summary.at_risk_count > 0 ? "var(--red-300)" : "var(--ink-secondary)",
    },
    {
      label: "Last Rescan",
      value: summary ? relativeTime(summary.last_rescan) : "—",
      color: "var(--ink-secondary)",
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 1,
      background: "var(--border-hairline)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      marginBottom: 24,
    }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: "var(--surface-1)",
            padding: "14px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{
            fontSize: 10,
            color: "var(--ink-tertiary)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
          }}>
            {item.label}
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: item.color,
            letterSpacing: "-0.3px",
          }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmpireCommandCenter() {
  const router = useRouter();
  const [checking, setChecking]   = useState(true);
  const [data, setData]           = useState<EmpireData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lastPoll, setLastPoll]   = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/empire/businesses", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EmpireData = await res.json();
      setData(json);
      setLastPoll(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth check
  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) {
        router.replace("/en/login");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  // Initial fetch + 30s polling
  useEffect(() => {
    if (checking) return;
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [checking, fetchData]);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--canvas)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ color: "var(--ink-tertiary)", fontSize: 13, fontFamily: "monospace" }}>
          Authenticating...
        </div>
      </div>
    );
  }

  const businesses = data?.businesses ?? [];
  const summary = data?.summary ?? null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--canvas)",
      color: "var(--ink-primary)",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-hairline)",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--surface-1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            background: "var(--red-500)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.5px",
          }}>
            N
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>
              Empire Command Center
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 1 }}>
              Nexus — Wave 1 · Live Data
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Poll indicator */}
          {loading && (
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--orange-400)",
              animation: "pulse-dot 1s ease-in-out infinite",
            }} />
          )}
          {lastPoll && !loading && (
            <span style={{
              fontSize: 10,
              color: "var(--ink-tertiary)",
              fontFamily: "var(--font-mono)",
            }}>
              polled {relativeTime(lastPoll.toISOString())}
            </span>
          )}
          <div style={{
            fontSize: 11,
            color: "var(--red-400)",
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            border: "1px solid var(--red-900)",
            padding: "4px 10px",
            borderRadius: 4,
            background: "var(--red-a08)",
          }}>
            WAVE 1 · LIVE
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 6,
          letterSpacing: "-0.5px",
        }}>
          Portfolio Businesses
        </h1>
        <p style={{ color: "var(--ink-secondary)", fontSize: 13, marginBottom: 24 }}>
          {businesses.length} businesses tracked · Pi-CEO health data · 30s polling
          {summary?.has_live_data === false && (
            <span style={{ color: "var(--orange-300)", marginLeft: 8 }}>
              (no snapshot data yet — showing static fallback)
            </span>
          )}
        </p>

        {/* Portfolio summary bar */}
        <SummaryBar summary={summary} />

        {/* Error banner */}
        {error && (
          <div style={{
            padding: "12px 16px",
            background: "var(--red-a08)",
            border: "1px solid var(--red-900)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--red-200)",
            marginBottom: 16,
            fontFamily: "var(--font-mono)",
          }}>
            Failed to load health data: {error}
          </div>
        )}

        {/* Bento grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {businesses.length > 0
            ? businesses.map((biz) => (
                <BusinessCard key={biz.id} biz={biz} />
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
          }
        </div>

        {/* Wave status banner */}
        <div style={{
          marginTop: 40,
          padding: "20px 24px",
          background: "var(--red-a08)",
          border: "1px solid var(--red-900)",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red-300)", marginBottom: 6 }}>
            Nexus Wave 1 — Live Health Pipeline
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
            Schema migrations applied · /empire/ route live · Middleware protecting all empire routes ·
            Live health data from <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>pi_ceo_health_snapshots</code> ·
            30-second polling · Agent pipeline canvas arriving in Wave 2.
          </div>
        </div>
      </main>
    </div>
  );
}
