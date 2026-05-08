"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import {
  Building2, ExternalLink, Activity,
  FileText, BarChart3, Users, ArrowUpRight, RefreshCw,
} from "lucide-react";

// ── Static data ──────────────────────────────────────────────────────────────

const BUSINESSES = [
  { id: "synthex",           name: "Synthex",           status: "operational" as const, arr: 0,    seoSlug: "synthex",           desc: "Marketing Automation · 1,000+ users" },
  { id: "restoreassist",     name: "RestoreAssist",     status: "building"    as const, arr: 0,    seoSlug: "restoreassist",     desc: "iOS App · TestFlight Active" },
  { id: "ccw-crm",           name: "CCW",               status: "operational" as const, arr: 2400, seoSlug: "ccw-crm",           desc: "First Paying Client · $2,400/yr ARR" },
  { id: "carsi",             name: "CARSI",             status: "building"    as const, arr: 0,    seoSlug: "carsi",             desc: "Compliance Delivery" },
  { id: "disaster-recovery", name: "DR Platform",       status: "building"    as const, arr: 0,    seoSlug: "disaster-recovery", desc: "Disaster Recovery Platform" },
  { id: "nrpg",              name: "NRPG",              status: "building"    as const, arr: 0,    seoSlug: "nrpg",              desc: "ANZ Restoration Movement" },
];

const STATUS_COLOR: Record<string, string> = {
  operational: "#16a34a",
  building:    "#1d4ed8",
  degraded:    "#d97706",
  down:        "#dc2626",
};

const FALLBACK_ACTIVITIES = [
  { agent: "health-monitor",   action: "System health checked",  timeAgo: "2m ago"  },
  { agent: "gap-detector",     action: "Content gaps analysed",  timeAgo: "1h ago"  },
  { agent: "wiki-ingest",      action: "Knowledge base updated", timeAgo: "2h ago"  },
  { agent: "sources-watcher",  action: "Sources scanned",        timeAgo: "3h ago"  },
  { agent: "brief-generator",  action: "Weekly brief prepared",  timeAgo: "5h ago"  },
  { agent: "alert-dispatcher", action: "No alerts triggered",    timeAgo: "6h ago"  },
];

const QUICK_LINKS = [
  { label: "Board Room",   href: "/dashboard/board",   icon: <Users size={13} /> },
  { label: "Content",      href: "/dashboard/content", icon: <BarChart3 size={13} /> },
  { label: "SEO Audits",   href: "/businesses/synthex/seo", icon: <Activity size={13} /> },
  { label: "CCW Portal",   href: "/clients/ccw",       icon: <ExternalLink size={13} /> },
  { label: "Clients",      href: "/clients",           icon: <Building2 size={13} /> },
  { label: "6-Pager",      href: "/dashboard/brief",   icon: <FileText size={13} />, primary: true },
];

// ── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#111113",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
  border: "1px solid #27272a",
  borderRadius: 12,
  padding: 20,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#52525b",
  marginBottom: 12,
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState("");

  useEffect(() => {
    setNow(new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium", timeStyle: "short" }));
  }, []);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser({ email: session.user.email ?? "" });
      setLoading(false);
    });
  }, [router]);

  const totalARR = BUSINESSES.reduce((s, b) => s + b.arr, 0);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RefreshCw size={18} color="#334155" className="spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa" }}>

      {/* Page title */}
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-display)" }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 11, color: "#52525b", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>
            {user?.email}{now ? ` · Updated ${now} AEST` : ""}
          </p>
        </div>
        <Link href="/dashboard/ceo" style={{ fontSize: 12, fontWeight: 500, color: "#1d4ed8", textDecoration: "none" }}>Command Center →</Link>
      </div>

      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          style={{ display: "flex", background: "#111113", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)", border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}
        >
          {[
            { label: "Total Businesses", value: "6",                     suffix: "",     color: "#f8fafc" },
            { label: "Total ARR",        value: `$${(totalARR/1000).toFixed(1)}K`, suffix: "/yr", color: "#16a34a" },
            { label: "Active Agents",    value: "4",                     suffix: " live", color: "#94a3b8" },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ flex: 1, padding: "16px 20px", textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid #27272a" : "none" }}>
              <div style={{ ...sectionLabel, marginBottom: 5 }}>{stat.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: stat.color, lineHeight: 1 }}>
                {stat.value}<span style={{ fontSize: 12, fontWeight: 400, color: "#52525b" }}>{stat.suffix}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* 2-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

          {/* Left: Business roster table */}
          <motion.div
            style={card}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          >
            <p style={sectionLabel}>Portfolio Status</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #27272a" }}>
                  {["Business", "Status", "ARR", "SEO Audit"].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#52525b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUSINESSES.map((biz, i) => {
                  const dotColor = STATUS_COLOR[biz.status];
                  return (
                    <motion.tr
                      key={biz.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.1 + i * 0.04 }}
                      style={{ borderBottom: "1px solid #27272a" }}
                    >
                      <td style={{ padding: "12px 8px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc", letterSpacing: "-0.01em" }}>{biz.name}</div>
                        <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{biz.desc}</div>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="status-dot" style={{ width: 6, height: 6, background: dotColor, color: dotColor }} />
                          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: dotColor }}>{biz.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        {biz.arr > 0 ? (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "#16a34a" }}>${biz.arr.toLocaleString()}</span>
                        ) : (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#52525b" }}>pre-revenue</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <Link
                          href={`/businesses/${biz.seoSlug}/seo`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1d4ed8", textDecoration: "none", fontWeight: 500 }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#1d4ed8")}
                        >
                          View audit <ArrowUpRight size={10} />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* Right: Quick links */}
          <motion.div
            style={card}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          >
            <p style={sectionLabel}>Quick Links</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: link.primary ? 600 : 400,
                    color: link.primary ? "#fff" : "#94a3b8",
                    background: link.primary ? "#1d4ed8" : "transparent",
                    border: `1px solid ${link.primary ? "#1d4ed8" : "#27272a"}`,
                    textDecoration: "none",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={e => {
                    if (link.primary) { (e.currentTarget as HTMLAnchorElement).style.background = "#3b82f6"; }
                    else { (e.currentTarget as HTMLAnchorElement).style.background = "#18181b"; (e.currentTarget as HTMLAnchorElement).style.color = "#f8fafc"; }
                  }}
                  onMouseLeave={e => {
                    if (link.primary) { (e.currentTarget as HTMLAnchorElement).style.background = "#1d4ed8"; }
                    else { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"; }
                  }}
                  onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
                  onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Recent Activity</p>
            <Link href="/dashboard/ceo" style={{ fontSize: 11, color: "#1d4ed8", textDecoration: "none" }}>Full command center →</Link>
          </div>
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ borderLeft: "1px solid #27272a", marginLeft: 8, paddingLeft: 16 }}>
              {FALLBACK_ACTIVITIES.map((a, i) => (
                <div key={i} style={{ position: "relative", paddingBottom: i < FALLBACK_ACTIVITIES.length - 1 ? 16 : 0 }}>
                  <span style={{ position: "absolute", left: -20, top: 4, width: 5, height: 5, borderRadius: "50%", background: "#27272a", border: "1px solid #334155", display: "inline-block" }} />
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{a.action}</p>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#52525b", flexShrink: 0, marginLeft: 16 }}>{a.timeAgo}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#52525b", margin: 0, marginTop: 1 }}>{a.agent}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

      </main>
    </div>
  );
}
