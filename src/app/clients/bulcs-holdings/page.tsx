"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import {
  TrendingUp, FileText, Video, BarChart3, CheckCircle2,
  Circle, Clock, ExternalLink, LogOut, Zap,
} from "lucide-react";

// ─── Brand tokens ───────────────────────────────────────────────────────────

const BH = {
  blue:    "#228FE0",
  dark:    "var(--canvas)",
  surface: "var(--surface-1)",
  border:  "var(--border-default)",
  ink:     "var(--ink-primary)",
  muted:   "var(--ink-secondary)",
  ghost:   "#52525b",
};

// ─── Static engagement data (to be replaced by API when reporting is live) ──

const DELIVERABLES = [
  { category: "SEO / AEO / GEO",    status: "in-progress", detail: "Baseline audit in progress — domains: bulcsholdings.com, moisturemeterexperts.com.au, aeroair.com.au" },
  { category: "Brand Research",      status: "done",        detail: "Visual identity, tone, audience, and competitor analysis complete across all 5 divisions" },
  { category: "LinkedIn Strategy",   status: "in-progress", detail: "4-post weekly calendar drafted — awaiting your review and approval" },
  { category: "Video: LGR vs Desiccant",    status: "planned",  detail: "Storyboard complete — 8-10 min explainer for restoration contractors" },
  { category: "Video: Moisture Documentation", status: "planned", detail: "Storyboard complete — 12 min insurance claims documentation guide" },
  { category: "Video: IAQ for Building Managers", status: "planned", detail: "Storyboard complete — 10 min compliance guide for facility managers" },
  { category: "Client Proposal",     status: "done",        detail: "3-tier proposal document prepared — Foundation $1,500/mo, Growth $2,000/mo, Full Agency $2,500/mo" },
];

const DIVISIONS = [
  { name: "Bulcs Holdings",            domain: "bulcsholdings.com",          status: "active" },
  { name: "IAQ Ventilation",           domain: "iaqventilation.com.au",      status: "active" },
  { name: "AeroAir",                   domain: "aeroair.com.au",             status: "active" },
  { name: "Moisture Meter Experts",    domain: "moisturemeterexperts.com.au", status: "active" },
  { name: "Air Purifier",              domain: "airpurifier.net.au",         status: "active" },
];

const STATUS_CONFIG = {
  done:        { color: "#16a34a", label: "Complete",    icon: CheckCircle2 },
  "in-progress": { color: BH.blue,  label: "In Progress", icon: Clock        },
  planned:     { color: "#52525b", label: "Planned",     icon: Circle       },
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

export default function BulcsHoldingsPortal() {
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
        name: meta?.name ?? session.user.email ?? "Ivi",
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
    <div style={{ minHeight: "100vh", background: BH.dark, color: BH.ink, fontFamily: "var(--font-display)" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={{
        height: 64, display: "flex", alignItems: "center", padding: "0 32px",
        borderBottom: `1px solid ${BH.border}`,
        background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 16 }}>

          {/* Unite Group wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--red-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={14} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 12, color: BH.ghost }}>Unite Group</span>
          </div>

          <span style={{ color: BH.border, fontSize: 16 }}>·</span>

          {/* Bulcs Holdings logo area */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${BH.blue}20`, border: `1px solid ${BH.blue}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: BH.blue }}>BH</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: BH.ink, letterSpacing: "-0.02em" }}>Bulcs Holdings</div>
              <div style={{ fontSize: 10, color: BH.muted }}>Client Portal</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 11, color: BH.ghost, fontFamily: "var(--font-mono)" }}>{user.email}</span>

          <button
            onClick={handleSignOut}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
              fontSize: 11, borderRadius: 7, border: `1px solid ${BH.border}`,
              color: BH.ghost, background: "transparent", cursor: "pointer", transition: "all 0.1s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-tertiary)"; (e.currentTarget as HTMLButtonElement).style.color = BH.muted; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BH.border; (e.currentTarget as HTMLButtonElement).style.color = BH.ghost; }}
          >
            <LogOut size={11} /> Sign out
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
            background: `linear-gradient(135deg, ${BH.blue}14 0%, transparent 100%)`,
            border: `1px solid ${BH.blue}25`,
            borderRadius: 12, padding: "20px 24px",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: BH.ink, letterSpacing: "-0.03em", marginBottom: 6 }}>
            Welcome, {user.name.split(" ")[0]}
          </div>
          <div style={{ fontSize: 13, color: BH.muted, lineHeight: 1.6 }}>
            Your AI-powered agency engagement is active. Here&apos;s the live status across all deliverables.
            Questions or feedback? Email your account manager at <a href="mailto:contact@unite-group.in" style={{ color: BH.blue, textDecoration: "none" }}>contact@unite-group.in</a>
          </div>
        </motion.div>

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Deliverables Complete",  value: String(done),             color: "#16a34a" },
            { label: "In Progress",             value: String(inProgress),      color: BH.blue   },
            { label: "Divisions Covered",       value: "5",                     color: BH.muted  },
            { label: "Monthly Reports",         value: "1",                     color: BH.muted  },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
              style={{
                background: BH.surface,
                backgroundImage: "linear-gradient(180deg,rgba(255,255,255,0.025) 0%,transparent 50%)",
                border: `1px solid ${BH.border}`, borderRadius: 10, padding: "14px 18px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BH.ghost, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: s.color }}>{s.value}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Deliverables table ──────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BH.ghost, marginBottom: 12 }}>
            Agency Deliverables
          </div>
          <div style={{ background: BH.surface, border: `1px solid ${BH.border}`, borderRadius: 12, overflow: "hidden" }}>
            {DELIVERABLES.map((d, i) => (
              <motion.div
                key={d.category}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 120px",
                  alignItems: "start", gap: 16, padding: "14px 20px",
                  borderBottom: i < DELIVERABLES.length - 1 ? `1px solid ${BH.border}` : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: BH.ink, letterSpacing: "-0.01em", marginBottom: 3 }}>{d.category}</div>
                  <div style={{ fontSize: 11, color: BH.ghost, lineHeight: 1.5 }}>{d.detail}</div>
                </div>
                <div style={{ textAlign: "right", paddingTop: 2 }}>
                  <StatusPill status={d.status as keyof typeof STATUS_CONFIG} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Divisions ──────────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BH.ghost, marginBottom: 12 }}>
            Your Divisions Under Management
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {DIVISIONS.map((div, i) => (
              <motion.div
                key={div.domain}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  background: BH.surface,
                  backgroundImage: "linear-gradient(180deg,rgba(255,255,255,0.025) 0%,transparent 50%)",
                  border: `1px solid ${BH.border}`, borderRadius: 10, padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: BH.ink, marginBottom: 4 }}>{div.name}</div>
                <a
                  href={`https://${div.domain}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: BH.blue, textDecoration: "none" }}
                >
                  {div.domain} <ExternalLink size={9} />
                </a>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Quick links ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BH.ghost, marginBottom: 12 }}>
            Resources
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: "Monthly SEO Report",   icon: BarChart3,  href: "#",                          note: "Available after first month" },
              { label: "LinkedIn Posts",        icon: FileText,   href: "#",                          note: "Week 1 calendar ready for review" },
              { label: "Video Storyboards",     icon: Video,      href: "#",                          note: "3 scripts ready" },
              { label: "Your Website",          icon: TrendingUp, href: "https://bulcsholdings.com", note: "bulcsholdings.com" },
              { label: "Moisture Meter Experts",icon: ExternalLink, href: "https://moisturemeterexperts.com.au", note: "Primary e-commerce" },
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
                    border: `1px solid ${BH.border}`, background: "transparent",
                    textDecoration: "none", transition: "all 0.1s ease", cursor: "pointer",
                  }}
                  onMouseEnter={(e: React.MouseEvent) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ink-tertiary)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-1)"; }}
                  onMouseLeave={(e: React.MouseEvent) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BH.border; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon size={12} color={BH.blue} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: BH.muted }}>{link.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: BH.ghost }}>{link.note}</span>
                </motion.a>
              );
            })}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${BH.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: BH.ghost }}>
            Managed by <a href="https://unite-group.in" target="_blank" rel="noopener noreferrer" style={{ color: BH.blue, textDecoration: "none" }}>Unite Group</a> · AI-powered agency services
          </div>
          <div style={{ fontSize: 10, color: BH.ghost, fontFamily: "var(--font-mono)" }}>
            Last updated: {new Date().toLocaleDateString("en-AU")}
          </div>
        </div>

      </main>
    </div>
  );
}
