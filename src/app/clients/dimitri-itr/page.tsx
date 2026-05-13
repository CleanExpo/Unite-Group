"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import {
  TrendUpMark, FileMark, ActivityMark, BarChartMark, CheckCircleMark,
  PipelineMark, ClockMark, ExternalMark, LogOutMark, CommandCenterMark,
} from "@/components/ui/marks";

// ─── Brand tokens ───────────────────────────────────────────────────────────
// Placeholder blue (Otto / Sorted working palette). Duncan picks final.

const DUNCAN = {
  blue:    "#1a73e8",
  dark:    "var(--canvas)",
  surface: "var(--surface-1)",
  border:  "var(--border-default)",
  ink:     "var(--ink-primary)",
  muted:   "var(--ink-secondary)",
  ghost:   "#52525b",
};

// ─── Static engagement data ──────────────────────────────────────────────────

const DELIVERABLES = [
  { category: "Discovery & Architecture Review",     status: "in-progress", detail: "Months 1–2 — scope lock, integration map, ATO partner application kicks off (their queue is the slowest piece)" },
  { category: "Brand & Button-Name Lock-In",         status: "in-progress", detail: "Working name 'Otto' — finalists: Otto / Sorted / Beau / Tick / Lodgey. Trademark + .com.au sweep included." },
  { category: "ATO MyGov Partner Application",       status: "in-progress", detail: "Started Month 1 — ATO controls their own timeline. Blocks live pre-fill until approved." },
  { category: "DIMITRI Pre-fill Agent",              status: "planned",     detail: "One-question-at-a-time interview, Y/N/Tell-me-more responses, D13 deductions, FBT / CGT / crypto curlies. Months 3–4." },
  { category: "TFN Custody + TASA Compliance Layer", status: "planned",     detail: "TFNs never enter an LLM context window. TASA s90-5 boundary policed in copy + features. Months 3–4." },
  { category: "XPM Tax-Agent Handoff",               status: "planned",     detail: "Complete packet push to Xero Practice Manager so the tax agent's team can run ID / AML / TFN and lodge. Months 5–6." },
  { category: "NOAH Post-Lodgement Agent",           status: "planned",     detail: "NOA trigger → Stripe fee gate → NOA delivery → 11 wealth-planning questions → referral booking → encrypted ZIP. Months 5–6." },
  { category: "Encrypted Client Envelope",           status: "planned",     detail: "AES-256-GCM, key tied to client email, no platform-side decrypt path. Months 5–6." },
  { category: "Approved-Website Embed Button",       status: "planned",     detail: "1-line script for partner sites — brokers / banks / tax agents / financial planners / lawyers / employers. Per-partner attribution. Months 7–8." },
  { category: "First Partner Pilot",                 status: "planned",     detail: "Sams Home Loans pilot integration. Months 7–8." },
  { category: "Production Rollout",                  status: "planned",     detail: "Multi-partner expansion, additional tax-agent partners, marketing engine via Synthex. Months 9–12." },
];

const TOUCHPOINTS = [
  { name: "Duncan Perkins Home Loan Essentials", domain: "homeloanessentials.com.au", status: "active" },
  { name: "Sams Home Loans (pilot partner)",      domain: "", status: "planned" },
  { name: "BLinks tax agency",                    domain: "", status: "planned" },
  { name: "Xero Practice Manager (handoff)",      domain: "xero.com",   status: "planned" },
];

const STATUS_CONFIG = {
  done:          { color: "#16a34a", label: "Complete",    icon: CheckCircleMark },
  "in-progress": { color: DUNCAN.blue, label: "In Progress", icon: ClockMark     },
  planned:       { color: "#52525b", label: "Planned",     icon: PipelineMark    },
};

// ─── Subcomponents ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600,
      letterSpacing: "0.04em", textTransform: "uppercase",
      color: cfg.color,
      background: `${cfg.color}12`,
      border: `1px solid ${cfg.color}25`,
    }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DimitriItrPortal() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/en/login"); return; }
      const meta = session.user.user_metadata;
      setUser({
        email: session.user.email ?? "",
        name: meta?.name ?? session.user.email ?? "Duncan",
      });
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.push("/en/login");
  };

  if (!mounted || !user) return null;

  const done = DELIVERABLES.filter(d => d.status === "done").length;
  const inProgress = DELIVERABLES.filter(d => d.status === "in-progress").length;

  return (
    <div style={{ minHeight: "100vh", background: DUNCAN.dark, color: DUNCAN.ink, fontFamily: "var(--font-display)" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={{
        height: 64, display: "flex", alignItems: "center", padding: "0 32px",
        borderBottom: `1px solid ${DUNCAN.border}`,
        background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 16 }}>

          {/* Unite Group wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--red-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CommandCenterMark size={14} color="white" />
            </div>
            <span style={{ fontSize: 12, color: DUNCAN.ghost }}>Unite Group</span>
          </div>

          <span style={{ color: DUNCAN.border, fontSize: 16 }}>·</span>

          {/* Dimitri ITR logo area */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${DUNCAN.blue}20`, border: `1px solid ${DUNCAN.blue}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: DUNCAN.blue }}>DP</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: DUNCAN.ink, letterSpacing: "-0.02em" }}>Dimitri ITR Platform</div>
              <div style={{ fontSize: 10, color: DUNCAN.muted }}>Client Portal</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 11, color: DUNCAN.ghost, fontFamily: "var(--font-mono)" }}>{user.email}</span>

          <button
            onClick={handleSignOut}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
              fontSize: 11, borderRadius: 7, border: `1px solid ${DUNCAN.border}`,
              color: DUNCAN.ghost, background: "transparent", cursor: "pointer", transition: "all 0.1s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-tertiary)"; (e.currentTarget as HTMLButtonElement).style.color = DUNCAN.muted; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = DUNCAN.border; (e.currentTarget as HTMLButtonElement).style.color = DUNCAN.ghost; }}
          >
            <LogOutMark size={11} /> Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Welcome banner ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          style={{
            background: `linear-gradient(135deg, ${DUNCAN.blue}14 0%, transparent 100%)`,
            border: `1px solid ${DUNCAN.blue}25`,
            borderRadius: 12, padding: "20px 24px",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: DUNCAN.ink, letterSpacing: "-0.03em", marginBottom: 6 }}>
            Welcome, {user.name.split(" ")[0]}
          </div>
          <div style={{ fontSize: 13, color: DUNCAN.muted, lineHeight: 1.6 }}>
            Welcome, {user.name.split(" ")[0]}. Your ITR Platform engagement with Unite-Group is live. Kick-off Discovery starts the week of 19 May 2026 — first written status note Friday 23 May. Working MVP target lands Month 4–5; production launch around Month 8–10. Quality over rushing.
          </div>
        </motion.div>

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Engagement Status",       value: "Active",            color: "#16a34a"   },
            { label: "Deliverables In Flight",  value: String(inProgress),  color: DUNCAN.blue },
            { label: "Months to MVP",           value: "4–5",               color: DUNCAN.muted },
            { label: "Retainer",                value: "12-mo",             color: DUNCAN.muted },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
              style={{
                background: DUNCAN.surface,
                backgroundImage: "linear-gradient(180deg,rgba(255,255,255,0.025) 0%,transparent 50%)",
                border: `1px solid ${DUNCAN.border}`, borderRadius: 10, padding: "14px 18px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: s.color }}>{s.value}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Deliverables table ──────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 12 }}>
            Engagement Deliverables
          </div>
          <div style={{ background: DUNCAN.surface, border: `1px solid ${DUNCAN.border}`, borderRadius: 12, overflow: "hidden" }}>
            {DELIVERABLES.map((d, i) => (
              <motion.div
                key={d.category}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 120px",
                  alignItems: "start", gap: 16, padding: "14px 20px",
                  borderBottom: i < DELIVERABLES.length - 1 ? `1px solid ${DUNCAN.border}` : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DUNCAN.ink, letterSpacing: "-0.01em", marginBottom: 3 }}>{d.category}</div>
                  <div style={{ fontSize: 11, color: DUNCAN.ghost, lineHeight: 1.5 }}>{d.detail}</div>
                </div>
                <div style={{ textAlign: "right", paddingTop: 2 }}>
                  <StatusPill status={d.status as keyof typeof STATUS_CONFIG} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Touchpoints ────────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 12 }}>
            Touchpoints & Partners
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {TOUCHPOINTS.map((tp, i) => (
              <motion.div
                key={tp.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  background: DUNCAN.surface,
                  backgroundImage: "linear-gradient(180deg,rgba(255,255,255,0.025) 0%,transparent 50%)",
                  border: `1px solid ${DUNCAN.border}`, borderRadius: 10, padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: DUNCAN.ink, marginBottom: 4 }}>{tp.name}</div>
                {tp.domain ? (
                  <a
                    href={`https://${tp.domain}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: DUNCAN.blue, textDecoration: "none" }}
                  >
                    {tp.domain} <ExternalMark size={9} />
                  </a>
                ) : (
                  <span style={{ fontSize: 10, color: DUNCAN.ghost, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tp.status}</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Quick links ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 12 }}>
            Resources
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: "ITR Platform Proposal",      icon: FileMark,     href: "/proposals/duncan-itr-platform-2026-05-13", note: "Signed retainer terms — read first" },
              { label: "Weekly Status Notes",         icon: ActivityMark, href: "#", note: "Friday afternoons — live once Discovery starts" },
              { label: "Engagement Letter",           icon: BarChartMark, href: "#", note: "Signed copy — available after kick-off" },
              { label: "First Invoice (Setup fee)",   icon: FileMark,     href: "#", note: "AUD $4,400 inc GST — due on signing" },
              { label: "Phill direct",                icon: TrendUpMark,  href: "mailto:contact@unite-group.in", note: "contact@unite-group.in" },
            ].map((link, i) => {
              const Icon = link.icon;
              return (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: "flex", flexDirection: "column", gap: 3,
                    padding: "10px 14px", borderRadius: 9,
                    border: `1px solid ${DUNCAN.border}`, background: "transparent",
                    textDecoration: "none", transition: "all 0.1s ease", cursor: "pointer",
                  }}
                  onMouseEnter={(e: React.MouseEvent) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ink-tertiary)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-1)"; }}
                  onMouseLeave={(e: React.MouseEvent) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = DUNCAN.border; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon size={12} color={DUNCAN.blue} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: DUNCAN.muted }}>{link.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: DUNCAN.ghost }}>{link.note}</span>
                </motion.a>
              );
            })}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${DUNCAN.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: DUNCAN.ghost }}>
            Managed by <a href="https://unite-group.in" target="_blank" rel="noopener noreferrer" style={{ color: DUNCAN.blue, textDecoration: "none" }}>Unite Group</a> · AI-powered agency services
          </div>
          <div style={{ fontSize: 10, color: DUNCAN.ghost, fontFamily: "var(--font-mono)" }}>
            Last updated: {new Date().toLocaleDateString("en-AU")}
          </div>
        </div>

      </main>
    </div>
  );
}
