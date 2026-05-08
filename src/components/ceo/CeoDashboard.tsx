"use client";

import { useState, useEffect, useCallback, useRef, Component } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AreaChart, Area, BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { supabaseClient } from "@/lib/supabase/client";
import {
  Zap, TrendingUp, GitBranch, CheckCircle2, XCircle, Circle,
  Activity, BarChart3, RefreshCw, Clock, ArrowUpRight, Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessHealth {
  id: string;
  name: string;
  status: "operational" | "building" | "degraded" | "down";
  uptime_pct: number;
  deploy_frequency: number;
  open_prs: number;
  ci_passing: boolean | null;
  last_deploy: string | null;
  arr_aud: number;
  trend: number[];
}

interface EmpireHealth {
  score: number;
  businesses: BusinessHealth[];
  total_arr: number;
  active_agents: number;
  content_produced: number;
  content_total: number;
  work_orders_open: number;
  fetched_at: string;
}

interface ContentProgress {
  business: string;
  done: number;
  total: number;
  color: string;
}

interface PiCeoActivity {
  agent: string;
  action: string;
  timeAgo: string;
  icon: string;
}

// ─── Static fallback data ────────────────────────────────────────────────────

const CONTENT_PIPELINE: ContentProgress[] = [
  { business: "Synthex",       done: 9,  total: 15, color: "#6366f1" },
  { business: "RestoreAssist", done: 6,  total: 18, color: "#10b981" },
  { business: "CARSI",         done: 5,  total: 9,  color: "#f59e0b" },
  { business: "CCW",           done: 6,  total: 14, color: "#3b82f6" },
  { business: "DR",            done: 5,  total: 11, color: "#ef4444" },
  { business: "NRPG",          done: 9,  total: 18, color: "#8b5cf6" },
];

const FALLBACK_ACTIVITIES: PiCeoActivity[] = [
  { agent: "health-monitor",    action: "System health checked",    timeAgo: "2m ago",  icon: "monitor"    },
  { agent: "gap-detector",      action: "Content gaps analysed",    timeAgo: "1h ago",  icon: "chart"      },
  { agent: "wiki-ingest",       action: "Knowledge base updated",   timeAgo: "2h ago",  icon: "cpu"        },
  { agent: "sources-watcher",   action: "Sources scanned",          timeAgo: "3h ago",  icon: "git"        },
  { agent: "brief-generator",   action: "Weekly brief prepared",    timeAgo: "5h ago",  icon: "file"       },
  { agent: "alert-dispatcher",  action: "No alerts triggered",      timeAgo: "6h ago",  icon: "shield"     },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  operational: { dotColor: "#10b981", ringColor: "rgba(16,185,129,0.3)",  sparkColor: "#10b981", labelColor: "#10b981" },
  building:    { dotColor: "#3b82f6", ringColor: "rgba(59,130,246,0.3)",  sparkColor: "#3b82f6", labelColor: "#3b82f6" },
  degraded:    { dotColor: "#f59e0b", ringColor: "rgba(245,158,11,0.3)",  sparkColor: "#f59e0b", labelColor: "#f59e0b" },
  down:        { dotColor: "#ef4444", ringColor: "rgba(239,68,68,0.3)",   sparkColor: "#ef4444", labelColor: "#ef4444" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmpireScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 12px ${color}40)` }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="48" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="22" fontWeight="700" fontFamily="ui-monospace, monospace">{score}</text>
        <text x="50" y="64" textAnchor="middle" fill="#475569" fontSize="10">/ 100</text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>Empire Score</span>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) return <div style={{ height: 40 }} />;
  if (typeof window === "undefined") return <div style={{ height: 40, background: "rgba(255,255,255,0.03)", borderRadius: 4 }} />;
  const chartData = data.map((v, i) => ({ i, v }));
  const gradId = `grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CiBadge({ passing }: { passing: boolean | null }) {
  if (passing === true)  return <CheckCircle2 size={13} color="#10b981" />;
  if (passing === false) return <XCircle      size={13} color="#ef4444" />;
  return <Circle size={13} color="#334155" />;
}

function BusinessCard({ biz }: { biz: BusinessHealth }) {
  const cfg = STATUS_CONFIG[biz.status];
  const descriptors: Record<string, string> = {
    restoreassist:      "iOS App · TestFlight active",
    synthex:            "Marketing Automation SaaS",
    "ccw-crm":          "First paying client · $2,400/yr",
    "disaster-recovery": "Disaster Recovery Platform",
    nrpg:               "ANZ Restoration Movement",
    carsi:              "Compliance Delivery",
  };
  return (
    <div style={{
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minHeight: 170,
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
    }}>
      {/* Top row: status dot + CI */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: cfg.dotColor, display: "inline-block", flexShrink: 0,
          boxShadow: `0 0 0 3px ${cfg.ringColor}`,
        }} />
        <Building2 size={12} color="#334155" strokeWidth={2} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: "#475569", flex: 1, letterSpacing: "0.02em" }}>{biz.status}</span>
        <CiBadge passing={biz.ci_passing} />
      </div>

      {/* Name */}
      <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
        {biz.name}
      </div>

      {/* Descriptor */}
      <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
        {descriptors[biz.id] ?? ""}
      </div>

      {/* Sparkline */}
      <div style={{ flex: 1 }}>
        <Sparkline data={biz.trend} color={cfg.sparkColor} />
      </div>

      {/* Bottom stats */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 500, color: "#64748b" }}>
            {biz.deploy_frequency}x/wk
          </span>
          {biz.open_prs > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 500, color: "#f59e0b" }}>
              <GitBranch size={10} color="#f59e0b" />
              {biz.open_prs} PRs
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "#64748b" }}>
          {biz.uptime_pct}%
        </span>
      </div>
    </div>
  );
}

function ProgressBar({ item }: { item: ContentProgress }) {
  const pct = Math.round((item.done / item.total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "#64748b", width: 90, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.business}
      </span>
      <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: item.color, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 500, color: "#475569", width: 36, textAlign: "right", flexShrink: 0 }}>
        {item.done}/{item.total}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, minHeight: 170, animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}>
      <div style={{ height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, width: "33%", marginBottom: 12 }} />
      <div style={{ height: 16, background: "rgba(255,255,255,0.06)", borderRadius: 4, width: "66%", marginBottom: 8 }} />
      <div style={{ height: 10, background: "rgba(255,255,255,0.03)", borderRadius: 4, width: "100%", marginBottom: 16 }} />
      <div style={{ height: 40, background: "rgba(255,255,255,0.03)", borderRadius: 4 }} />
    </div>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: "" };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: 32 }}>
            <p style={{ color: "#ef4444", fontSize: 12, fontFamily: "ui-monospace, monospace", marginBottom: 16 }}>Dashboard Error</p>
            <p style={{ color: "#475569", fontSize: 12, maxWidth: 400 }}>{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: 24, padding: "8px 16px", background: "#1d4ed8", color: "white", fontSize: 13, border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CeoCommandCenter() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [health, setHealth] = useState<EmpireHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastFetchRef = useRef<Date>(new Date());

  useEffect(() => { setMounted(true); }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/empire/health");
      if (res.ok) {
        const data: EmpireHealth = await res.json();
        setHealth(data);
        lastFetchRef.current = new Date();
        setSecondsAgo(0);
      }
    } catch {
      // silently retain previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUser({ email: session.user.email ?? "" });
      fetchHealth();
    };
    init();
  }, [router, fetchHealth]);

  // 30-second auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Tick "Updated Xs ago"
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastFetchRef.current.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const totalContent = CONTENT_PIPELINE.reduce((s, i) => s + i.done, 0);
  const totalTarget   = CONTENT_PIPELINE.reduce((s, i) => s + i.total, 0);

  const arrData = health?.businesses.map(b => ({
    name: b.name.replace(" Platform", "").replace("-CRM", ""),
    arr: b.arr_aud,
    preRevenue: b.arr_aud === 0,
  })) ?? [];

  const updatedLabel = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;

  // Shared card style
  const card: React.CSSProperties = {
    background: "#111827",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#334155",
    marginBottom: 12,
  };

  return (
    <DashboardErrorBoundary>
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#f8fafc" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        background: "rgba(10,15,30,0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* Left — wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1 }}>Unite-Group Empire</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                {/* Amber "live" indicator */}
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24", display: "inline-block", boxShadow: "0 0 6px #fbbf24" }} />
                <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Live</span>
              </div>
            </div>
          </div>

          {/* Centre — Empire Score ring */}
          <div style={{ display: "flex" }}>
            <EmpireScore score={health?.score ?? 0} />
          </div>

          {/* Right — quick stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={13} color="#10b981" />
              <span style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "#10b981" }}>
                ${((health?.total_arr ?? 2400) / 1000).toFixed(1)}K ARR
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={13} color="#60a5fa" />
              <span style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", fontWeight: 500, color: "#64748b" }}>
                {health?.active_agents ?? 4} agents
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart3 size={13} color="#8b5cf6" />
              <span style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", fontWeight: 500, color: "#64748b" }}>
                {health?.content_produced ?? totalContent}/{health?.content_total ?? totalTarget}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#334155" }}>
              <Clock size={12} color="#334155" />
              <span style={{ fontSize: 11, color: "#334155" }}>{updatedLabel}</span>
            </div>
            {user && <span style={{ fontSize: 11, color: "#1e2d45" }}>{user.email}</span>}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Business Health Grid ─────────────────────────────────────────── */}
        <section>
          <p style={sectionLabel}>Business Health</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : (health?.businesses ?? []).map(biz => (
                  <BusinessCard key={biz.id} biz={biz} />
                ))
            }
          </div>
        </section>

        {/* ── Three-column feeds ──────────────────────────────────────────── */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

          {/* Col 1 — Pi-CEO Activity (timeline) */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={14} color="#60a5fa" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Pi-CEO Activity</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#10b981", letterSpacing: "0.05em", textTransform: "uppercase" }}>Live</span>
                <span style={{ fontSize: 10, color: "#1e2d45", marginLeft: 4 }}>30s</span>
              </div>
            </div>

            {/* Vertical timeline */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12, position: "relative" }}>
              <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", marginLeft: 8, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 0 }}>
                {FALLBACK_ACTIVITIES.map((a, i) => (
                  <div key={i} style={{ position: "relative", paddingBottom: i < FALLBACK_ACTIVITIES.length - 1 ? 14 : 0 }}>
                    {/* Timeline dot */}
                    <span style={{ position: "absolute", left: -20, top: 4, width: 5, height: 5, borderRadius: "50%", background: "#1e2d45", border: "1px solid rgba(255,255,255,0.1)", display: "inline-block" }} />
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>{a.agent}</p>
                    <p style={{ fontSize: 10, color: "#334155", margin: 0, marginTop: 1 }}>{a.timeAgo}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#334155" }}>
                {health?.work_orders_open ?? 0} open work orders
              </span>
            </div>
          </div>

          {/* Col 2 — Revenue & ARR BarChart */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={14} color="#10b981" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Revenue</span>
              </div>
              <span style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#10b981" }}>
                ${((health?.total_arr ?? 2400) / 1000).toFixed(1)}K ARR
              </span>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
              {mounted ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={arrData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={16}>
                    <XAxis dataKey="name" tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Bar dataKey="arr" radius={[3, 3, 0, 0]}>
                      {arrData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.preRevenue ? "rgba(255,255,255,0.04)" : "#1d4ed8"}
                          stroke={entry.preRevenue ? "rgba(255,255,255,0.06)" : "none"}
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 80, background: "rgba(255,255,255,0.03)", borderRadius: 4 }} />
              )}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                  Total ARR:{" "}
                  <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "#10b981" }}>
                    ${(health?.total_arr ?? 2400).toLocaleString()}/yr
                  </span>
                </p>
                <p style={{ fontSize: 11, color: "#334155", margin: 0 }}>Next milestone: first $10K ARR</p>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#1d4ed8", display: "inline-block" }} />
                    Revenue
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "inline-block" }} />
                    Pre-revenue
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3 — Content Pipeline */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={14} color="#8b5cf6" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Content Pipeline</span>
              </div>
              <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 500, color: "#475569" }}>
                {totalContent}/{totalTarget} ({Math.round((totalContent / totalTarget) * 100)}%)
              </span>
            </div>

            {/* Overall bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${Math.round((totalContent / totalTarget) * 100)}%`, background: "#3b82f6", transition: "width 0.6s ease" }} />
              </div>
              <p style={{ fontSize: 10, color: "#334155", margin: 0, marginTop: 5 }}>
                {Math.round((totalContent / totalTarget) * 100)}% complete overall
              </p>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {CONTENT_PIPELINE.map(item => (
                <ProgressBar key={item.business} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <section>
          <p style={sectionLabel}>Quick Actions</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link
              href="/dashboard/board"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", textDecoration: "none", background: "transparent", transition: "all 0.15s" }}
            >
              Board Minutes
              <ArrowUpRight size={12} color="#475569" />
            </Link>
            <Link
              href="/clients/ccw"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", textDecoration: "none", background: "transparent", transition: "all 0.15s" }}
            >
              CCW Portal
              <ArrowUpRight size={12} color="#60a5fa" />
            </Link>
            <Link
              href="/dashboard/content"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", textDecoration: "none", background: "transparent", transition: "all 0.15s" }}
            >
              Content Artefacts
            </Link>
            <button
              onClick={fetchHealth}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", background: "transparent", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, transition: "all 0.15s" }}
            >
              <RefreshCw size={12} color="#fbbf24" style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              {loading ? "Running…" : "Run Health Check"}
            </button>
            <Link
              href="/dashboard/brief"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #1d4ed8", color: "white", textDecoration: "none", background: "#1d4ed8", transition: "all 0.15s" }}
            >
              6-Pager Brief
            </Link>
            <Link
              href="https://linear.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa", textDecoration: "none", background: "transparent", transition: "all 0.15s" }}
            >
              Linear Tickets
              <ArrowUpRight size={12} color="#a78bfa" />
            </Link>
          </div>
        </section>

      </main>
    </div>
    </DashboardErrorBoundary>
  );
}
