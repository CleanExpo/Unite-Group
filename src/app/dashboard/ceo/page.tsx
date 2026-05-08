"use client";

import { useState, useEffect, useCallback, useRef, Component } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabaseClient } from "@/lib/supabase/client";

// Recharts must be dynamically imported to avoid SSR crashes
// (recharts accesses DOM APIs that don't exist on the server)
const AreaChart = dynamic(() => import("recharts").then(m => ({ default: m.AreaChart })), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => ({ default: m.Area })), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => ({ default: m.BarChart })), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => ({ default: m.Bar })), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => ({ default: m.XAxis })), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => ({ default: m.Cell })), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })), { ssr: false });

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
  { business: "Synthex", done: 9, total: 15, color: "#6366f1" },
  { business: "RestoreAssist", done: 6, total: 18, color: "#10b981" },
  { business: "CARSI", done: 5, total: 9, color: "#f59e0b" },
  { business: "CCW", done: 6, total: 14, color: "#3b82f6" },
  { business: "DR", done: 5, total: 11, color: "#ef4444" },
  { business: "NRPG", done: 9, total: 18, color: "#8b5cf6" },
];

const FALLBACK_ACTIVITIES: PiCeoActivity[] = [
  { agent: "health-monitor", action: "System health checked", timeAgo: "2m ago", icon: "🤖" },
  { agent: "gap-detector", action: "Content gaps analysed", timeAgo: "1h ago", icon: "📊" },
  { agent: "wiki-ingest", action: "Knowledge base updated", timeAgo: "2h ago", icon: "🔧" },
  { agent: "sources-watcher", action: "Sources scanned", timeAgo: "3h ago", icon: "📝" },
  { agent: "brief-generator", action: "Weekly brief prepared", timeAgo: "5h ago", icon: "📋" },
  { agent: "alert-dispatcher", action: "No alerts triggered", timeAgo: "6h ago", icon: "🛡️" },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  operational: { bg: "bg-emerald-950", border: "border-emerald-500/30", dot: "text-emerald-400", text: "text-emerald-400", sparkColor: "#10b981" },
  building:    { bg: "bg-blue-950",    border: "border-blue-500/30",    dot: "text-blue-400",    text: "text-blue-400",    sparkColor: "#3b82f6" },
  degraded:    { bg: "bg-amber-950",   border: "border-amber-500/30",   dot: "text-amber-400",   text: "text-amber-400",   sparkColor: "#f59e0b" },
  down:        { bg: "bg-red-950",     border: "border-red-500/30",     dot: "text-red-400",     text: "text-red-400",     sparkColor: "#ef4444" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmpireScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="22" fontWeight="bold">{score}</text>
        <text x="50" y="65" textAnchor="middle" fill="#94a3b8" fontSize="10">/ 100</text>
      </svg>
      <span className="text-xs text-slate-400 mt-1">Empire Score</span>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) return <div className="h-10" />;
  const chartData = data.map((v, i) => ({ i, v }));
  const gradId = `grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#${gradId})`} dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CiBadge({ passing }: { passing: boolean | null }) {
  if (passing === true)  return <span className="text-xs font-semibold text-emerald-400 ml-auto">✓ CI</span>;
  if (passing === false) return <span className="text-xs font-semibold text-amber-400 ml-auto">⚠ CI</span>;
  return <span className="text-xs text-slate-600 ml-auto">— CI</span>;
}

function BusinessCard({ biz }: { biz: BusinessHealth }) {
  const cfg = STATUS_CONFIG[biz.status];
  const descriptors: Record<string, string> = {
    restoreassist:     "iOS App · TestFlight active",
    synthex:           "Marketing Automation SaaS",
    "ccw-crm":         "First paying client · $2,400/yr",
    "disaster-recovery": "Disaster Recovery Platform",
    nrpg:              "ANZ Restoration Movement",
    carsi:             "Compliance Delivery",
  };
  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-4 flex flex-col gap-2 min-h-[170px]`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg leading-none ${cfg.dot}`}>●</span>
        <span className={`text-xs font-semibold tracking-widest uppercase ${cfg.text}`}>{biz.status}</span>
        <CiBadge passing={biz.ci_passing} />
      </div>
      <div className="font-bold text-white text-base leading-tight">{biz.name}</div>
      <div className="text-slate-400 text-xs leading-snug">{descriptors[biz.id] ?? ""}</div>
      <div className="flex-1">
        <Sparkline data={biz.trend} color={cfg.sparkColor} />
      </div>
      <div className="border-t border-slate-700/50 pt-2 flex items-center justify-between">
        <div className="flex gap-3 text-slate-400 text-xs">
          <span>{biz.deploy_frequency}x/wk</span>
          {biz.open_prs > 0 && <span className="text-amber-400">{biz.open_prs} open PRs</span>}
        </div>
        <span className="text-slate-500 text-xs">{biz.uptime_pct}%</span>
      </div>
    </div>
  );
}

function ProgressBar({ item }: { item: ContentProgress }) {
  const pct = Math.round((item.done / item.total) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-300 text-xs w-24 shrink-0 truncate">{item.business}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
      </div>
      <span className="text-slate-400 text-xs w-10 text-right shrink-0">{item.done}/{item.total}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-700/40 rounded-lg p-4 animate-pulse min-h-[170px]">
      <div className="h-3 bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-5 bg-slate-700 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-800 rounded w-full mb-4" />
      <div className="h-10 bg-slate-800 rounded" />
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-red-400 text-sm font-mono mb-4">Dashboard Error</p>
            <p className="text-slate-400 text-xs max-w-md">{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
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
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [health, setHealth] = useState<EmpireHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastFetchRef = useRef<Date>(new Date());

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

  // ARR bar chart data
  const arrData = health?.businesses.map(b => ({
    name: b.name.replace(" Platform", "").replace("-CRM", ""),
    arr: b.arr_aud,
    preRevenue: b.arr_aud === 0,
  })) ?? [];

  const updatedLabel = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <DashboardErrorBoundary>
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-700/60 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-xl tracking-tight">Unite-Group Empire</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
          </div>

          {/* Centre — Empire Score */}
          <div className="hidden md:flex">
            <EmpireScore score={health?.score ?? 0} />
          </div>

          {/* Right — stats */}
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap justify-end">
            <span className="text-emerald-400 font-medium">
              💰 ${((health?.total_arr ?? 2400) / 1000).toFixed(1)}K ARR
            </span>
            <span>🤖 {health?.active_agents ?? 4} agents</span>
            <span>📦 {health?.content_produced ?? totalContent}/{health?.content_total ?? totalTarget} content</span>
            <span className="text-slate-500">🕐 Updated {updatedLabel}</span>
            {user && <span className="text-slate-600 hidden lg:inline">{user.email}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* Mobile Empire Score */}
        <div className="flex md:hidden justify-center">
          <EmpireScore score={health?.score ?? 0} />
        </div>

        {/* ── Business Health Grid ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Business Health
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : (health?.businesses ?? []).map(biz => (
                  <BusinessCard key={biz.id} biz={biz} />
                ))
            }
          </div>
        </section>

        {/* ── Three-column feeds ──────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Col 1 — Pi-CEO Activity */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Pi-CEO Activity</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span className="text-xs text-emerald-400">Live</span>
                <span className="text-xs text-slate-600 ml-1">[30s]</span>
              </div>
            </div>
            <div className="border-t border-slate-700/50 pt-3 space-y-2">
              {FALLBACK_ACTIVITIES.map((a, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <span className="text-base">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs truncate">{a.agent}</p>
                    <p className="text-slate-500 text-xs">{a.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-3">
              work orders open: {health?.work_orders_open ?? 0}
            </p>
          </div>

          {/* Col 2 — Revenue & ARR BarChart */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Revenue</span>
              <span className="text-xs font-mono text-emerald-400">
                ${((health?.total_arr ?? 2400) / 1000).toFixed(1)}K ARR
              </span>
            </div>
            <div className="border-t border-slate-700/50 pt-3">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={arrData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={16}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Bar dataKey="arr" radius={[3, 3, 0, 0]}>
                    {arrData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.preRevenue ? "#1e293b" : "#10b981"}
                        stroke={entry.preRevenue ? "#334155" : "none"}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1">
                <p className="text-slate-300 text-xs">
                  Total ARR: <span className="text-emerald-400 font-medium">${(health?.total_arr ?? 2400).toLocaleString()}/yr</span>
                </p>
                <p className="text-slate-500 text-xs">Next milestone: first $10K ARR</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="w-3 h-3 rounded-sm bg-[#10b981] inline-block" /> Revenue
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="w-3 h-3 rounded-sm bg-[#1e293b] border border-slate-600 inline-block" /> Pre-revenue
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3 — Content Pipeline */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Content Pipeline</span>
              <span className="text-xs font-mono text-slate-400">
                {totalContent}/{totalTarget} ({Math.round((totalContent / totalTarget) * 100)}%)
              </span>
            </div>
            {/* Overall */}
            <div className="mb-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.round((totalContent / totalTarget) * 100)}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs mt-1">
                {Math.round((totalContent / totalTarget) * 100)}% total complete
              </p>
            </div>
            <div className="border-t border-slate-700/50 pt-3 space-y-3">
              {CONTENT_PIPELINE.map(item => (
                <ProgressBar key={item.business} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/board"
              className="px-4 py-2 text-sm font-medium rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Board Minutes
            </Link>
            <Link
              href="/clients/ccw"
              className="px-4 py-2 text-sm font-medium rounded-md border border-blue-500/50 text-blue-300 hover:bg-blue-950 hover:text-white transition-colors"
            >
              CCW Portal
            </Link>
            <Link
              href="/dashboard/content"
              className="px-4 py-2 text-sm font-medium rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Content Artefacts
            </Link>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md border border-amber-500/50 text-amber-300 hover:bg-amber-950 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? "Running…" : "Run Health Check"}
            </button>
            <Link
              href="/dashboard/brief"
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-700 hover:bg-blue-600 text-white transition-colors"
            >
              6-Pager Brief
            </Link>
            <Link
              href="https://linear.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium rounded-md border border-purple-500/50 text-purple-300 hover:bg-purple-950 hover:text-white transition-colors"
            >
              Linear Tickets
            </Link>
          </div>
        </section>
      </main>
    </div>
    </DashboardErrorBoundary>
  );
}
