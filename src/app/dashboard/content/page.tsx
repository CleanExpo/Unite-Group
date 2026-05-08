"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import { ArrowLeft, BarChart3 } from "lucide-react";

const CONTENT_PIPELINE = [
  { business: "Synthex",       done: 9,  total: 15, color: "#6366f1" },
  { business: "RestoreAssist", done: 6,  total: 18, color: "#10b981" },
  { business: "CARSI",         done: 5,  total: 9,  color: "#f59e0b" },
  { business: "CCW",           done: 6,  total: 14, color: "#3b82f6" },
  { business: "DR Platform",   done: 5,  total: 11, color: "#ef4444" },
  { business: "NRPG",          done: 9,  total: 18, color: "#8b5cf6" },
];

const CONTENT_QUEUE = [
  { title: "RestoreAssist — Water damage response guide",      type: "Blog Post",   biz: "RA",  color: "#10b981" },
  { title: "Synthex — Email automation best practices",        type: "Blog Post",   biz: "SYN", color: "#6366f1" },
  { title: "NRPG — Contractor onboarding checklist",          type: "Guide",       biz: "NRPG",color: "#8b5cf6" },
  { title: "CCW — Carpet cleaning pricing page",              type: "Landing Page",biz: "CCW", color: "#3b82f6" },
  { title: "DR — Business continuity planning 101",            type: "Blog Post",   biz: "DR",  color: "#ef4444" },
];

const totalDone  = CONTENT_PIPELINE.reduce((s, i) => s + i.done,  0);
const totalItems = CONTENT_PIPELINE.reduce((s, i) => s + i.total, 0);
const overallPct = Math.round((totalDone / totalItems) * 100);

const card: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 20,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#334155",
  marginBottom: 12,
};

export default function ContentPipeline() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setLoaded(true);
    });
  }, [router]);

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <BarChart3 size={20} color="#334155" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#f8fafc" }}>

      {/* Header */}
      <header style={{ background: "rgba(10,15,30,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid #1e293b", height: 60, padding: "0 24px", position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", alignItems: "center" }}>
          <Link href="/dashboard/ceo" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", textDecoration: "none", marginRight: 16 }}>
            <ArrowLeft size={13} />Back
          </Link>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>Content Pipeline</span>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Overview header */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.03em", margin: 0 }}>Content Pipeline</h1>
          <p style={{ fontSize: 14, color: "#475569", marginTop: 6 }}>{totalDone} of {totalItems} assets complete across 6 businesses</p>
        </div>

        {/* Overall progress */}
        <motion.div
          style={card}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Overall Progress</p>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em" }}>
              {overallPct}<span style={{ fontSize: 12, fontWeight: 400, color: "#334155" }}>%</span>
            </span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", borderRadius: 3, background: "#1d4ed8" }}
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
            />
          </div>
          <p style={{ fontSize: 11, color: "#334155", marginTop: 8 }}>{totalDone}/{totalItems} assets complete — target: 85 total</p>
        </motion.div>

        {/* Per-business progress */}
        <motion.div
          style={card}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
        >
          <p style={sectionLabel}>By Business</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {CONTENT_PIPELINE.map((item, i) => {
              const pct = Math.round((item.done / item.total) * 100);
              return (
                <div key={item.business}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{item.business}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "#475569" }}>{item.done}/{item.total} · {pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                    <motion.div
                      style={{ height: "100%", borderRadius: 2, background: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.25, 0.4, 0.25, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Content queue */}
        <motion.div
          style={card}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        >
          <p style={sectionLabel}>Content Queue — Next 5</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {CONTENT_QUEUE.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < CONTENT_QUEUE.length - 1 ? "1px solid #1e293b" : "none" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 4, background: `${item.color}12`, border: `1px solid ${item.color}22`, flexShrink: 0 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: item.color, letterSpacing: "0.04em" }}>{item.biz}</span>
                </span>
                <span style={{ fontSize: 13, color: "#94a3b8", flex: 1 }}>{item.title}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>{item.type}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </main>
    </div>
  );
}
