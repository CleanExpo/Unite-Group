"use client";

import { TelegramFeed } from "@/components/ceo/TelegramFeed";
import { useState, useEffect, useCallback, useRef, Component } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { supabaseClient } from "@/lib/supabase/client";
import {
  Zap, TrendingUp, GitBranch, CheckCircle2, XCircle, Circle,
  Activity, BarChart3, RefreshCw, Clock, ArrowUpRight, Plus,
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

interface PiCeoActivityEvent {
  agent: string;
  action: string;
  timeAgo: string;
  ts: string;
  found: number;
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
  { agent: "health-monitor",    action: "System health checked",    timeAgo: "2m ago",  icon: "monitor" },
  { agent: "gap-detector",      action: "Content gaps analysed",    timeAgo: "1h ago",  icon: "chart"   },
  { agent: "wiki-ingest",       action: "Knowledge base updated",   timeAgo: "2h ago",  icon: "cpu"     },
  { agent: "sources-watcher",   action: "Sources scanned",          timeAgo: "3h ago",  icon: "git"     },
  { agent: "brief-generator",   action: "Weekly brief prepared",    timeAgo: "5h ago",  icon: "file"    },
  { agent: "alert-dispatcher",  action: "No alerts triggered",      timeAgo: "6h ago",  icon: "shield"  },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  operational: { dotColor: "#16a34a", ringColor: "rgba(22,163,74,0.3)",   sparkColor: "#16a34a", labelColor: "#16a34a" },
  building:    { dotColor: "#3b82f6", ringColor: "rgba(59,130,246,0.3)",  sparkColor: "#3b82f6", labelColor: "#3b82f6" },
  degraded:    { dotColor: "#d97706", ringColor: "rgba(217,119,6,0.3)",   sparkColor: "#d97706", labelColor: "#d97706" },
  down:        { dotColor: "#dc2626", ringColor: "rgba(220,38,38,0.3)",   sparkColor: "#dc2626", labelColor: "#dc2626" },
};

// ─── useCountUp hook ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) { frameRef.current = requestAnimationFrame(animate); }
      else { setValue(target); }
    };
    startRef.current = null;
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return value;
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const display = useCountUp(value);
  return <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>${(display / 1000).toFixed(1)}K</span>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmpireScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 12px ${color}40)` }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          initial={{ strokeDashoffset: circumference }}
          transition={{ duration: 1.2, ease: [0.25, 0.4, 0.25, 1] }}
          strokeLinecap="round" transform="rotate(-90 50 50)"
        />
        <text x="50" y="48" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="22" fontWeight="700" fontFamily="var(--font-mono)">{score}</text>
        <text x="50" y="64" textAnchor="middle" fill="#52525b" fontSize="10">/ 100</text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#52525b", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>Empire Score</span>
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
  if (passing === true)  return <CheckCircle2 size={13} color="#16a34a" />;
  if (passing === false) return <XCircle      size={13} color="#dc2626" />;
  return <Circle size={13} color="#27272a" />;
}

function ProgressBar({ item, index }: { item: ContentProgress; index: number }) {
  const pct = Math.round((item.done / item.total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "#52525b", width: 90, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.business}
      </span>
      <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", borderRadius: 2, background: item.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: index * 0.1, ease: [0.25, 0.4, 0.25, 1] }}
        />
      </div>
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500, color: "#52525b", width: 36, textAlign: "right", flexShrink: 0 }}>
        {item.done}/{item.total}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ border: "1px solid #27272a", borderRadius: 12, padding: 16, minHeight: 170 }} className="skeleton">
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
        <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: 32 }}>
            <p style={{ color: "#dc2626", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 16 }}>Dashboard Error</p>
            <p style={{ color: "#52525b", fontSize: 12, maxWidth: 400 }}>{this.state.error}</p>
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

// ─── Bento Business Grid ─────────────────────────────────────────────────────

const BENTO_PRIORITIES = ['synthex', 'restoreassist', 'ccw-crm', 'carsi', 'disaster-recovery', 'nrpg'];

function BentoBusinessGrid({ businesses, loading }: { businesses: BusinessHealth[]; loading: boolean }) {
  const sorted = BENTO_PRIORITIES.map(id => businesses.find(b => b.id === id)).filter(Boolean) as BusinessHealth[];

  if (loading) return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  const descriptors: Record<string, string> = {
    synthex:             "Marketing Automation · 1,000+ users",
    restoreassist:       "iOS App · TestFlight Active",
    "ccw-crm":           "First Paying Client · $2,400/yr ARR",
    "disaster-recovery": "Disaster Recovery Platform",
    nrpg:                "ANZ Restoration Movement",
    carsi:               "Compliance Delivery",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {sorted.map((biz, i) => {
        const cfg = STATUS_CONFIG[biz.status];
        const isFeatured = i < 2;
        return (
          <motion.div
            key={biz.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            style={{
              background: "#111113",
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%), linear-gradient(180deg, ${cfg.dotColor}08 0%, transparent 100%)`,
              border: "1px solid #27272a",
              borderRadius: 12,
              padding: isFeatured ? 20 : 16,
              display: "flex",
              flexDirection: "column",
              gap: isFeatured ? 14 : 10,
              minHeight: isFeatured ? 200 : 160,
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: isFeatured ? 16 : 14, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.03em", fontFamily: "var(--font-display)", lineHeight: 1.2 }}>{biz.name}</div>
                <div style={{ fontSize: 11, color: "#52525b", marginTop: 3 }}>{descriptors[biz.id]}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="status-dot" style={{ width: 6, height: 6, background: cfg.dotColor, color: cfg.dotColor }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: cfg.dotColor }}>{biz.status}</span>
              </div>
            </div>

            {/* ARR badge for revenue-generating */}
            {biz.arr_aud > 0 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.18)" }}>
                <TrendingUp size={10} color="#16a34a" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "#16a34a" }}>${biz.arr_aud.toLocaleString()}/yr</span>
              </div>
            )}

            {/* Sparkline */}
            <div style={{ flex: 1 }}>
              <Sparkline data={biz.trend} color={cfg.sparkColor} />
            </div>

            {/* Bottom metrics */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #27272a" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#a1a1aa" }}>
                  <span style={{ color: biz.uptime_pct >= 99 ? "#16a34a" : biz.uptime_pct >= 95 ? "#d97706" : "#dc2626", fontWeight: 600 }}>{biz.uptime_pct}%</span> up
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#52525b" }}>{biz.deploy_frequency}×/wk</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {biz.open_prs > 0 && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#d97706", display: "flex", alignItems: "center", gap: 3 }}>
                    <GitBranch size={9} color="#d97706" />{biz.open_prs}
                  </span>
                )}
                <CiBadge passing={biz.ci_passing} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Kanban Preview ───────────────────────────────────────────────────────────

const KANBAN_PREVIEW = [
  { col: "Backlog",      accent: "#52525b", cards: [
    { title: "RestoreAssist App Store submission", biz: "RA",   color: "#0E7C7B" },
    { title: "NRPG Contractor onboarding flow",   biz: "NRPG", color: "#16A34A" },
  ]},
  { col: "In Progress",  accent: "#1d4ed8", cards: [
    { title: "Unite-Hub CEO redesign",            biz: "UG",   color: "#1D4ED8" },
    { title: "Synthex content pipeline (40/85)",   biz: "SYN",  color: "#6366F1" },
  ]},
  { col: "In Review",    accent: "#f59e0b", cards: [
    { title: "DR Platform SEO strategy",          biz: "DR",   color: "#2563EB" },
    { title: "Pi-CEO agent performance audit",    biz: "UG",   color: "#1D4ED8" },
  ]},
  { col: "Done",         accent: "#16a34a", cards: [
    { title: "Login page redesign",               biz: "UG",   color: "#1D4ED8" },
    { title: "framer-motion integration",         biz: "UG",   color: "#1D4ED8" },
  ]},
];

function KanbanPreview() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {KANBAN_PREVIEW.map(col => (
        <div key={col.col}>
          {/* Column header */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: col.accent, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa" }}>{col.col}</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "#52525b" }}>{col.cards.length}</span>
          </div>
          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {col.cards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  background: "#111113",
                  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 50%)",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "default",
                  transition: "border-color 0.12s ease, background 0.12s ease",
                }}
                whileHover={{ borderColor: "#3f3f46", backgroundColor: "#18181b" } as Record<string, string>}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: "#d4d4d8", letterSpacing: "-0.01em", lineHeight: 1.4, marginBottom: 6 }}>
                  {card.title}
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 4, background: `${card.color}14`, border: `1px solid ${card.color}28` }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: card.color, display: "inline-block" }} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: card.color, letterSpacing: "0.04em" }}>{card.biz}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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
  const [piActivity, setPiActivity] = useState<PiCeoActivityEvent[]>([]);
  const [piConnected, setPiConnected] = useState(false);

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

  // Pi-CEO activity feed — fetch on mount and every 30 seconds
  useEffect(() => {
    const fetchPiActivity = async () => {
      try {
        const res = await fetch('/api/pi-ceo/activity');
        if (res.ok) {
          const data = await res.json();
          setPiActivity(data.events ?? []);
          setPiConnected(data.connected ?? false);
        }
      } catch { /* silently retain previous */ }
    };
    fetchPiActivity();
    const interval = setInterval(fetchPiActivity, 30_000);
    return () => clearInterval(interval);
  }, []);

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

  const card: React.CSSProperties = {
    background: "#111113",
    border: "1px solid #27272a",
    borderRadius: 12,
    padding: 20,
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
    backgroundSize: "100% 100%",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#52525b",
    marginBottom: 12,
  };

  // Suppress hydration mismatch for AnimatedNumber
  void AnimatedNumber;

  return (
    <DashboardErrorBoundary>
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        background: "rgba(9,9,11,0.9)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid #27272a",
        height: 60,
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={14} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>Unite Group</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                <span className="status-dot" style={{ width: 5, height: 5, background: "#f59e0b", color: "#f59e0b" }} />
                <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Command Center</span>
              </div>
            </div>
          </div>
          {/* Right: user + refresh + clock */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {user && <span style={{ fontSize: 11, color: "#52525b", fontFamily: "var(--font-mono)" }}>{user.email}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#52525b" }}>
              <Clock size={11} />
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#52525b" }}>{updatedLabel}</span>
            </div>
            <button
              onClick={fetchHealth} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11, fontWeight: 500, borderRadius: 7, border: "1px solid #27272a", color: "#a1a1aa", background: "transparent", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.12s ease" }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = "#18181b"; (e.currentTarget as HTMLButtonElement).style.color = "#fafafa"; }}}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa"; }}
            >
              <RefreshCw size={11} className={loading ? "spin" : ""} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 24px 0" }}>
        <div style={{ display: "flex", background: "#111113", border: "1px solid #27272a", borderRadius: 10, overflow: "hidden", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 50%)" }}>
          {[
            { label: "Empire Health", value: health ? `${health.score}` : "—", suffix: "/100", color: health ? (health.score >= 80 ? "#16a34a" : health.score >= 60 ? "#d97706" : "#dc2626") : "#52525b" },
            { label: "Total ARR",     value: `$${((health?.total_arr ?? 2400)/1000).toFixed(1)}K`, suffix: "/yr", color: "#16a34a" },
            { label: "AI Agents",     value: String(health?.active_agents ?? 4), suffix: " live", color: "#d4d4d8" },
            { label: "Content",       value: `${health?.content_produced ?? totalContent}/${health?.content_total ?? totalTarget}`, suffix: "", color: "#d4d4d8" },
            { label: "Work Orders",   value: String(health?.work_orders_open ?? 0), suffix: " open", color: health?.work_orders_open ? "#f59e0b" : "#52525b" },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ flex: 1, padding: "16px 20px", textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid #27272a" : "none" }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#52525b", marginBottom: 5 }}>{stat.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: stat.color, lineHeight: 1 }}>
                {stat.value}<span style={{ fontSize: 12, fontWeight: 400, color: "#52525b" }}>{stat.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* ── Portfolio Bento Grid ─────────────────────────────────────────── */}
        <section>
          <p style={sectionLabel}>Portfolio Health</p>
          <BentoBusinessGrid businesses={health?.businesses ?? []} loading={loading} />
        </section>

        {/* ── Three-column feeds ──────────────────────────────────────────── */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

          {/* Col 1 — Pi-CEO Activity (timeline) */}
          <motion.div
            style={card}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={14} color="#60a5fa" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Pi-CEO Activity</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="status-dot" style={{ width: 6, height: 6, background: piConnected ? "#16a34a" : "#d97706", color: piConnected ? "#16a34a" : "#d97706" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: piConnected ? "#16a34a" : "#d97706", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {piConnected ? "Live" : "Fallback"}
                </span>
              </div>
            </div>

            {/* Vertical timeline */}
            <div style={{ borderTop: "1px solid #27272a", paddingTop: 12, position: "relative" }}>
              <div style={{ borderLeft: "1px solid #27272a", marginLeft: 8, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 0 }}>
                {(piActivity.length > 0 ? piActivity : FALLBACK_ACTIVITIES).map((a, i, arr) => (
                  <div key={i} style={{ position: "relative", paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                    <span style={{ position: "absolute", left: -20, top: 4, width: 5, height: 5, borderRadius: "50%", background: "#27272a", border: "1px solid #3f3f46", display: "inline-block" }} />
                    <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0, lineHeight: 1.4 }}>{a.agent}</p>
                    <p style={{ fontSize: 10, color: "#52525b", margin: 0, marginTop: 1 }}>{a.timeAgo}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #27272a", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#52525b" }}>
                {health?.work_orders_open ?? 0} open work orders
              </span>
            </div>
          </motion.div>

          {/* Col 2 — Revenue & ARR BarChart */}
          <motion.div
            style={card}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={14} color="#16a34a" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Revenue</span>
              </div>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#16a34a" }}>
                ${((health?.total_arr ?? 2400) / 1000).toFixed(1)}K ARR
              </span>
            </div>
            <div style={{ borderTop: "1px solid #27272a", paddingTop: 12 }}>
              {mounted ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={arrData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={16}>
                    <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Bar dataKey="arr" radius={[3, 3, 0, 0]}>
                      {arrData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.preRevenue ? "rgba(255,255,255,0.04)" : "#1d4ed8"}
                          stroke={entry.preRevenue ? "#27272a" : "none"}
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
                <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>
                  Total ARR:{" "}
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#16a34a" }}>
                    ${(health?.total_arr ?? 2400).toLocaleString()}/yr
                  </span>
                </p>
                <p style={{ fontSize: 11, color: "#52525b", margin: 0 }}>Next milestone: first $10K ARR</p>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#52525b" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#1d4ed8", display: "inline-block" }} />
                    Revenue
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#52525b" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.04)", border: "1px solid #27272a", display: "inline-block" }} />
                    Pre-revenue
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Col 3 — Content Pipeline */}
          <motion.div
            style={card}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={14} color="#8b5cf6" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Content Pipeline</span>
              </div>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500, color: "#52525b" }}>
                {totalContent}/{totalTarget} ({Math.round((totalContent / totalTarget) * 100)}%)
              </span>
            </div>

            {/* Overall bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div
                  style={{ height: "100%", borderRadius: 2, background: "#3b82f6" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((totalContent / totalTarget) * 100)}%` }}
                  transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
                />
              </div>
              <p style={{ fontSize: 10, color: "#52525b", margin: 0, marginTop: 5 }}>
                {Math.round((totalContent / totalTarget) * 100)}% complete overall
              </p>
            </div>

            <div style={{ borderTop: "1px solid #27272a", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {CONTENT_PIPELINE.map((item, index) => (
                <ProgressBar key={item.business} item={item} index={index} />
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Kanban Preview ───────────────────────────────────────────────── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={sectionLabel}>Work Orders</p>
            <Link href="/dashboard/board" style={{ fontSize: 11, color: "#1d4ed8", textDecoration: "none" }}>View full board →</Link>
          </div>
          <KanbanPreview />
        </section>

        {/* ── Telegram Live Feed ──────────────────────────────────────────── */}
        <section>
          <p style={sectionLabel}>Margot — Telegram Live Feed</p>
          <TelegramFeed />
        </section>

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <section>
          <p style={sectionLabel}>Quick Actions</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link
              href="/dashboard/board"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none", background: "transparent", transition: "all 0.12s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#18181b"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#3f3f46"; (e.currentTarget as HTMLAnchorElement).style.color = "#fafafa"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLAnchorElement).style.color = "#a1a1aa"; }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              Board Minutes
              <ArrowUpRight size={12} />
            </Link>
            <Link
              href="/clients/ccw"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none", background: "transparent", transition: "all 0.12s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#18181b"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#3f3f46"; (e.currentTarget as HTMLAnchorElement).style.color = "#fafafa"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLAnchorElement).style.color = "#a1a1aa"; }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              CCW Portal
              <ArrowUpRight size={12} />
            </Link>
            <Link
              href="/dashboard/content"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none", background: "transparent", transition: "all 0.12s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#18181b"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#3f3f46"; (e.currentTarget as HTMLAnchorElement).style.color = "#fafafa"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLAnchorElement).style.color = "#a1a1aa"; }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              Content Artefacts
            </Link>
            <button
              onClick={fetchHealth}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid #27272a", color: "#a1a1aa", background: "transparent", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, transition: "all 0.12s ease" }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = "#18181b"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#3f3f46"; (e.currentTarget as HTMLButtonElement).style.color = "#fafafa"; }}}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa"; }}
              onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              <RefreshCw size={12} className={loading ? "spin" : ""} />
              {loading ? "Running…" : "Run Health Check"}
            </button>
            <Link
              href="/dashboard/brief"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #1d4ed8", color: "#fff", textDecoration: "none", background: "#1d4ed8", transition: "all 0.16s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#3b82f6"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#3b82f6"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#1d4ed8"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#1d4ed8"; }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; (e.currentTarget as HTMLAnchorElement).style.background = "#1e40af"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              6-Pager Brief
            </Link>
            <Link
              href="https://linear.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none", background: "transparent", transition: "all 0.12s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#18181b"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#3f3f46"; (e.currentTarget as HTMLAnchorElement).style.color = "#fafafa"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLAnchorElement).style.color = "#a1a1aa"; }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              Linear Tickets
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </section>

      </main>
    </div>
    </DashboardErrorBoundary>
  );
}
