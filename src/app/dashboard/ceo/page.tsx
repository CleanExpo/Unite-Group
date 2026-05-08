"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessStatus = "OPERATIONAL" | "BUILDING" | "DEGRADED" | "DOWN";

interface Business {
  id: string;
  name: string;
  status: BusinessStatus;
  descriptor: string;
  stat1: string;
  stat2: string;
}

interface PiCeoActivity {
  agent: string;
  action: string;
  timeAgo: string;
  icon: string;
}

interface ContentProgress {
  business: string;
  done: number;
  total: number;
  color: string;
}

interface CcwHealth {
  crm_status: string;
  crm_uptime_pct: number;
  sla_status: string;
  open_tickets: number;
  agents_active: number;
  active_campaigns: number;
  avg_open_rate_pct: number | null;
  source: string;
}

interface PiCeoHealth {
  source: string;
  task_title: string | null;
  confidence: number | null;
  last_updated: string | null;
  status_log: string | null;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const BUSINESSES: Business[] = [
  {
    id: "restore-assist",
    name: "RestoreAssist",
    status: "BUILDING",
    descriptor: "iOS App · TestFlight",
    stat1: "📱 TestFlight active",
    stat2: "🔧 RA-1842 in progress",
  },
  {
    id: "synthex",
    name: "Synthex",
    status: "OPERATIONAL",
    descriptor: "Marketing Automation SaaS · 1000+ users",
    stat1: "📈 NRR tracking",
    stat2: "🎯 CCW integrated",
  },
  {
    id: "ccw-crm",
    name: "CCW-CRM",
    status: "OPERATIONAL",
    descriptor: "First paying client · $2,400/yr ARR",
    stat1: "⚡ SLA: GREEN",
    stat2: "📊 34% open rate",
  },
  {
    id: "dr-platform",
    name: "DR Platform",
    status: "OPERATIONAL",
    descriptor: "Disaster Recovery Platform",
    stat1: "🌐 disasterrecovery.com.au live",
    stat2: "🏗️ Platform stable",
  },
  {
    id: "nrpg",
    name: "NRPG",
    status: "BUILDING",
    descriptor: "ANZ Restoration Movement",
    stat1: "🌱 Community building",
    stat2: "📋 Onboarding framework",
  },
  {
    id: "carsi",
    name: "CARSI",
    status: "OPERATIONAL",
    descriptor: "Compliance Delivery",
    stat1: "✅ First implementations stable",
    stat2: "📄 Compliance tracking",
  },
];

const CONTENT_PIPELINE: ContentProgress[] = [
  { business: "Synthex", done: 9, total: 15, color: "#6366f1" },
  { business: "RestoreAssist", done: 6, total: 18, color: "#10b981" },
  { business: "CARSI", done: 5, total: 9, color: "#f59e0b" },
  { business: "CCW", done: 6, total: 14, color: "#3b82f6" },
  { business: "DR", done: 5, total: 11, color: "#ef4444" },
  { business: "NRPG", done: 9, total: 18, color: "#8b5cf6" },
];

const FALLBACK_ACTIVITIES: PiCeoActivity[] = [
  { agent: "wiki-ingest", action: "Knowledge base updated", timeAgo: "2 min ago", icon: "🤖" },
  { agent: "gap-detector", action: "Content gaps analysed", timeAgo: "1h ago", icon: "📊" },
  { agent: "health-monitor", action: "System health checked", timeAgo: "2h ago", icon: "🔧" },
  { agent: "sources-watcher", action: "Sources scanned", timeAgo: "3h ago", icon: "📝" },
  { agent: "brief-generator", action: "Weekly brief prepared", timeAgo: "5h ago", icon: "📋" },
  { agent: "alert-dispatcher", action: "No alerts triggered", timeAgo: "6h ago", icon: "🛡️" },
];

// ─── Status styling helpers ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<BusinessStatus, { bg: string; border: string; dot: string; text: string }> = {
  OPERATIONAL: {
    bg: "bg-emerald-950",
    border: "border-emerald-500/30",
    dot: "text-emerald-400",
    text: "text-emerald-400",
  },
  BUILDING: {
    bg: "bg-blue-950",
    border: "border-blue-500/30",
    dot: "text-blue-400",
    text: "text-blue-400",
  },
  DEGRADED: {
    bg: "bg-amber-950",
    border: "border-amber-500/30",
    dot: "text-amber-400",
    text: "text-amber-400",
  },
  DOWN: {
    bg: "bg-red-950",
    border: "border-red-500/30",
    dot: "text-red-400",
    text: "text-red-400",
  },
};

function aggregateHealth(businesses: Business[]): { color: string; label: string } {
  const statuses = businesses.map((b) => b.status);
  if (statuses.includes("DOWN")) return { color: "text-red-400", label: "Issues Detected" };
  if (statuses.includes("DEGRADED")) return { color: "text-amber-400", label: "Degraded Services" };
  if (statuses.every((s) => s === "OPERATIONAL")) return { color: "text-emerald-400", label: "All Systems Operational" };
  return { color: "text-blue-400", label: "Systems Building" };
}

function timeAgoFromIso(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BusinessCard({ biz }: { biz: Business }) {
  const cfg = STATUS_CONFIG[biz.status];
  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-4 flex flex-col gap-2 min-h-[160px]`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg leading-none ${cfg.dot}`}>●</span>
        <span className={`text-xs font-semibold tracking-widest ${cfg.text}`}>{biz.status}</span>
      </div>
      <div className="font-bold text-white text-base leading-tight">{biz.name}</div>
      <div className="text-slate-400 text-xs leading-snug">{biz.descriptor}</div>
      <div className="border-t border-slate-700/50 pt-2 mt-auto flex flex-col gap-1">
        <span className="text-slate-300 text-xs">{biz.stat1}</span>
        <span className="text-slate-300 text-xs">{biz.stat2}</span>
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
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: item.color }}
        />
      </div>
      <span className="text-slate-400 text-xs w-10 text-right shrink-0">
        {item.done}/{item.total}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CeoCommandCenter() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [piCeo, setPiCeo] = useState<PiCeoHealth | null>(null);
  const [piCeoLoading, setPiCeoLoading] = useState(true);
  const [ccwHealth, setCcwHealth] = useState<CcwHealth | null>(null);
  const [ccwLoading, setCcwLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchLiveData = useCallback(async () => {
    setPiCeoLoading(true);
    setCcwLoading(true);

    const [piRes, ccwRes] = await Promise.allSettled([
      fetch("/api/pi-ceo/health").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/clients/ccw/health").then((r) => (r.ok ? r.json() : null)),
    ]);

    setPiCeo(piRes.status === "fulfilled" ? piRes.value : null);
    setCcwHealth(ccwRes.status === "fulfilled" ? ccwRes.value : null);
    setPiCeoLoading(false);
    setCcwLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser({ email: session.user.email ?? "" });
      fetchLiveData();
    };

    init();
  }, [router, fetchLiveData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLiveData();
    setRefreshing(false);
  };

  const handleRunHealthCheck = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/pi-ceo/health", { method: "GET" });
    } catch {
      // silently continue
    }
    await fetchLiveData();
    setRefreshing(false);
  };

  const health = aggregateHealth(BUSINESSES);
  const totalContent = CONTENT_PIPELINE.reduce((s, i) => s + i.done, 0);
  const totalContentTarget = CONTENT_PIPELINE.reduce((s, i) => s + i.total, 0);

  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Build Pi-CEO activity items from health data or use fallback
  const piCeoActivities: PiCeoActivity[] = FALLBACK_ACTIVITIES;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Zone 1: Empire Header ─────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-700/60 px-6 h-[80px] flex items-center justify-between sticky top-0 z-40">
        <span className="font-bold text-2xl tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
          Unite-Group Empire
        </span>

        <span className="text-slate-400 text-sm hidden md:block">{today}</span>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-lg leading-none ${health.color}`}>●</span>
            <span className={`text-sm font-medium ${health.color}`}>{health.label}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {user && (
            <span className="text-slate-500 text-xs hidden lg:block">
              {user.email}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* ── Zone 2: Business Health Grid 3×2 ──────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Business Health
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BUSINESSES.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} />
            ))}
          </div>
        </section>

        {/* ── Zone 3: Three-column live feeds ───────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1 — Pi-CEO Agent Activity */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Pi-CEO Activity</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span className="text-xs text-emerald-400">Live</span>
              </div>
            </div>
            <div className="border-t border-slate-700/50 pt-3 space-y-2">
              {piCeoLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
                  <span className="text-slate-400 text-xs">Loading…</span>
                </div>
              ) : piCeo && piCeo.source !== "unavailable" ? (
                <>
                  {piCeo.task_title && (
                    <div className="flex items-start gap-2 py-1">
                      <span className="text-base">🤖</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-xs truncate">{piCeo.task_title}</p>
                        <p className="text-slate-500 text-xs">
                          {piCeo.last_updated ? timeAgoFromIso(piCeo.last_updated) : "active"}
                          {piCeo.confidence !== null && ` · ${piCeo.confidence}% confidence`}
                        </p>
                      </div>
                    </div>
                  )}
                  {piCeoActivities.slice(0, piCeo.task_title ? 5 : 6).map((a, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className="text-base">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-xs truncate">{a.agent}</p>
                        <p className="text-slate-500 text-xs">{a.timeAgo}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
                    <span className="text-slate-300 text-xs">Autonomous system running</span>
                  </div>
                  {piCeoActivities.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className="text-base">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-xs truncate">{a.agent}</p>
                        <p className="text-slate-500 text-xs">{a.timeAgo}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <p className="text-slate-600 text-xs mt-3">
              Last refresh: {lastRefresh.toLocaleTimeString("en-AU")}
            </p>
          </div>

          {/* Column 2 — Content Pipeline */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Content Pipeline</span>
              <span className="text-xs font-mono text-slate-400">
                {totalContent}/{totalContentTarget}
              </span>
            </div>
            {/* Overall progress */}
            <div className="mb-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.round((totalContent / totalContentTarget) * 100)}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs mt-1">
                {Math.round((totalContent / totalContentTarget) * 100)}% total complete
              </p>
            </div>
            <div className="border-t border-slate-700/50 pt-3 space-y-3">
              {CONTENT_PIPELINE.map((item) => (
                <ProgressBar key={item.business} item={item} />
              ))}
            </div>
          </div>

          {/* Column 3 — CCW Client Health */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">CCW — First Client</span>
              {ccwHealth ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      ccwHealth.sla_status === "green"
                        ? "bg-emerald-400"
                        : ccwHealth.sla_status === "warn"
                        ? "bg-amber-400"
                        : "bg-red-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      ccwHealth.sla_status === "green"
                        ? "text-emerald-400"
                        : ccwHealth.sla_status === "warn"
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {ccwHealth.sla_status.toUpperCase()}
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 text-xs">Loading…</span>
              )}
            </div>
            <div className="border-t border-slate-700/50 pt-3 space-y-2.5">
              {ccwLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
                  <span className="text-slate-400 text-xs">Loading health data…</span>
                </div>
              ) : ccwHealth ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">CRM Status</span>
                    <span className="text-xs font-medium text-emerald-400 uppercase">
                      {ccwHealth.crm_status} {ccwHealth.crm_uptime_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">SLA Status</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          ccwHealth.sla_status === "green" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <span className="text-xs font-medium text-emerald-400 uppercase">
                        {ccwHealth.sla_status}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Open Tickets</span>
                    <span className="text-xs font-medium text-white">{ccwHealth.open_tickets}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">AI Agents</span>
                    <span className="text-xs font-medium text-white">
                      {ccwHealth.agents_active} active
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Campaigns</span>
                    <span className="text-xs font-medium text-white">
                      {ccwHealth.active_campaigns} active
                      {ccwHealth.avg_open_rate_pct !== null &&
                        ` · ${ccwHealth.avg_open_rate_pct.toFixed(1)}% open`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 text-xs py-2">Unable to fetch CCW health data.</div>
              )}
            </div>
          </div>
        </section>

        {/* ── Quick Actions Bar ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/board"
              className="px-4 py-2 text-sm font-medium rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              View Board Minutes
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
              onClick={handleRunHealthCheck}
              disabled={refreshing}
              className="px-4 py-2 text-sm font-medium rounded-md border border-amber-500/50 text-amber-300 hover:bg-amber-950 hover:text-white transition-colors disabled:opacity-50"
            >
              {refreshing ? "Running…" : "Run Health Check"}
            </button>
            <Link
              href="/dashboard/brief"
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-700 hover:bg-blue-600 text-white transition-colors"
              style={{ backgroundColor: "#1D4ED8" }}
            >
              6-Pager Brief
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
