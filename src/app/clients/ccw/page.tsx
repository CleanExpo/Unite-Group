"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import type { CcwHealth } from "@/app/api/clients/ccw/health/route";

// CCW brand tokens
const CCW = {
  red: "#D62828",
  blue: "#003049",
  orange: "#F77F00",
  lightGray: "#F5F5F5",
  border: "#E0E0E0",
};

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "—";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Card shells ─────────────────────────────────────────────────────────────

function Card({
  title,
  accentColor,
  children,
}: {
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${CCW.border}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          borderBottom: `3px solid ${accentColor}`,
          padding: "16px 20px 12px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6B7280",
          }}
        >
          {title}
        </p>
      </div>
      <div style={{ padding: "16px 20px 20px" }}>{children}</div>
    </div>
  );
}

function StatusBadge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 20,
        background: bg,
        color,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "6px 0",
        borderBottom: `1px solid ${CCW.lightGray}`,
      }}
    >
      <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: CCW.blue }}>
        {value}
      </span>
    </div>
  );
}

// ── The four metric cards ────────────────────────────────────────────────────

function CrmCard({ data }: { data: CcwHealth }) {
  const statusConfig = {
    operational: { label: "OPERATIONAL", color: "#065F46", bg: "#D1FAE5" },
    degraded: { label: "DEGRADED", color: "#92400E", bg: "#FEF3C7" },
    down: { label: "DOWN", color: "#991B1B", bg: "#FEE2E2" },
  }[data.crm_status];

  return (
    <Card title="CRM Health" accentColor={CCW.red}>
      <div style={{ marginBottom: 14 }}>
        <StatusBadge {...statusConfig} />
      </div>
      <MetricRow label="Uptime" value={`${data.crm_uptime_pct.toFixed(2)}%`} />
      <MetricRow
        label="Last deployment"
        value={data.last_deployment ? formatDate(data.last_deployment) : "—"}
      />
    </Card>
  );
}

function SlaCard({ data }: { data: CcwHealth }) {
  const statusConfig = {
    green: { label: "GREEN", color: "#065F46", bg: "#D1FAE5" },
    warn: { label: "WARN", color: "#92400E", bg: "#FEF3C7" },
    critical: { label: "CRITICAL", color: "#991B1B", bg: "#FEE2E2" },
  }[data.sla_status];

  return (
    <Card title="SLA Status" accentColor={CCW.orange}>
      <div style={{ marginBottom: 14 }}>
        <StatusBadge {...statusConfig} />
      </div>
      <MetricRow
        label="First response"
        value={
          data.sla_first_response_minutes != null
            ? `${data.sla_first_response_minutes} min`
            : "No open tickets"
        }
      />
      <MetricRow label="Open tickets" value={data.open_tickets} />
      <p
        style={{
          marginTop: 10,
          marginBottom: 0,
          fontSize: 11,
          color: "#9CA3AF",
        }}
      >
        Target: 15 min warn · 60 min critical
      </p>
    </Card>
  );
}

function AgentsCard({ data }: { data: CcwHealth }) {
  return (
    <Card title="AI Agent Activity" accentColor={CCW.blue}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 14,
        }}
      >
        <span
          style={{ fontSize: 36, fontWeight: 800, color: CCW.blue, lineHeight: 1 }}
        >
          {data.agents_active}
        </span>
        <span style={{ fontSize: 14, color: "#6B7280" }}>agents active</span>
      </div>
      <MetricRow
        label="Last action"
        value={data.last_agent_action ?? "—"}
      />
      <MetricRow
        label="Last active"
        value={formatRelativeTime(data.last_agent_at)}
      />
      <div style={{ marginTop: 12 }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 20,
            background: CCW.blue,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          Powered by Pi-CEO
        </span>
      </div>
    </Card>
  );
}

function CampaignsCard({ data }: { data: CcwHealth }) {
  const openRate = data.avg_open_rate_pct;
  const rateColor =
    openRate != null && openRate >= 30 ? CCW.red : CCW.orange;

  return (
    <Card title="Synthex Campaigns" accentColor={CCW.orange}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: rateColor,
            lineHeight: 1,
          }}
        >
          {openRate != null ? `${openRate.toFixed(1)}%` : "—"}
        </span>
        <span style={{ fontSize: 14, color: "#6B7280" }}>avg open rate</span>
      </div>
      <MetricRow label="Active campaigns" value={data.active_campaigns} />
      <MetricRow
        label="Last sent"
        value={formatDate(data.last_campaign_sent)}
      />
      {openRate != null && openRate >= 30 && (
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            fontSize: 12,
            fontWeight: 600,
            color: CCW.red,
          }}
        >
          {openRate.toFixed(1)}% open rate — 2× industry average
        </p>
      )}
    </Card>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${CCW.border}`,
        borderRadius: 12,
        padding: 20,
        height: 180,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {[100, 60, 80, 60].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? 28 : 16,
            width: `${w}%`,
            background: CCW.lightGray,
            borderRadius: 4,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CcwPortal() {
  const router = useRouter();
  const [health, setHealth] = useState<CcwHealth | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth gate
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setLoadingAuth(false);
      }
    });
  }, [router]);

  const fetchHealth = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const res = await fetch("/api/clients/ccw/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setHealth(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingAuth) fetchHealth();
  }, [loadingAuth, fetchHealth]);

  if (loadingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CCW.lightGray,
        }}
      >
        <p style={{ color: "#6B7280", fontSize: 14 }}>Authenticating…</p>
      </div>
    );
  }

  return (
    <>
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: CCW.lightGray,
          fontFamily: "var(--font-satoshi, system-ui, sans-serif)",
        }}
      >
        {/* Portal header */}
        <header
          style={{
            background: CCW.blue,
            color: "#fff",
            padding: "0 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: CCW.red,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 15,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                CCW
              </div>
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                Carpet Cleaners Warehouse — Business Intelligence Portal
              </span>
            </div>

            {health && (
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.55)",
                  whiteSpace: "nowrap",
                }}
              >
                Updated {formatRelativeTime(health.fetched_at)}
                {health.source === "pi_ceo_api" ? " · live" : " · cached"}
              </span>
            )}
          </div>
        </header>

        {/* Orange accent bar */}
        <div style={{ height: 4, background: CCW.orange }} />

        {/* Main content */}
        <main
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "32px 24px 48px",
          }}
        >
          {/* Page title */}
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                margin: "0 0 4px",
                fontSize: 24,
                fontWeight: 800,
                color: CCW.blue,
              }}
            >
              Business Health Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>
              Real-time status for your CRM, SLA, AI agents, and marketing
              campaigns.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              style={{
                marginBottom: 24,
                padding: "12px 16px",
                borderRadius: 8,
                background: "#FEE2E2",
                border: `1px solid #FECACA`,
                color: "#991B1B",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{error}</span>
              <button
                onClick={fetchHealth}
                style={{
                  background: CCW.red,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* 4 metric cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {loadingData || !health ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <CrmCard data={health} />
                <SlaCard data={health} />
                <AgentsCard data={health} />
                <CampaignsCard data={health} />
              </>
            )}
          </div>

          {/* Footer note */}
          <p
            style={{
              marginTop: 32,
              fontSize: 12,
              color: "#9CA3AF",
              textAlign: "center",
            }}
          >
            Powered by Unite-Hub · Data refreshes every 60 seconds ·{" "}
            <a
              href="mailto:contact@unite-group.in"
              style={{ color: CCW.orange, textDecoration: "none" }}
            >
              contact@unite-group.in
            </a>
          </p>
        </main>
      </div>
    </>
  );
}
