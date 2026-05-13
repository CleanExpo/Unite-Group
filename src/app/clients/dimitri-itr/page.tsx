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
  { category: "Agent Doctrine (Karpathy method)",   status: "done",        detail: "8 specialists + 8 sub-agents + 9 skills + 3 always-on rules scaffolded by Phill 18 Apr 2026 in .claude/" },
  { category: "Prisma schema + role model",          status: "done",        detail: "users / clients / itrs / conversations (dimitri/noah enum) / documents / consent_grants / audit_log — committed by Duncan 22 Apr 2026" },
  { category: "Anthropic Claude chat route",         status: "done",        detail: "/api/itr/chat — loads PROJECT_BRIEF as system prompt, biases to Y/N/Tell-me-more interactions" },
  { category: "Hard stops (TASA, TFN, en-AU)",       status: "done",        detail: ".claude/rules/ — TASA s90-5 boundary, TFN custody pattern, deterministic tax calcs, Sydney data residency" },
  { category: "Role-based portal shells",            status: "in-progress", detail: "tax_agent / practice_admin / client / referred_professional / referring_site — Phase 1 (Weeks 1-6)" },
  { category: "MyGov OAuth + ATO partner enrolment", status: "in-progress", detail: "Critical path — ATO partner application in flight. Blocks DIMITRI prefill until live." },
  { category: "DIMITRI interview UI",                status: "planned",     detail: "Y/N/Tell-me-more rendering, one-question-at-a-time, D13 deductions flow. Target: 20 ghost 2025 ITRs by 30 Jun 2026." },
  { category: "XPM tax-agent packet push",           status: "planned",     detail: "Xero Practice Manager integration. Phase 2 (Weeks 7-14)." },
  { category: "NOAH post-lodgement flow",            status: "planned",     detail: "NOA trigger → Stripe fee gate → NOA delivery → 11 wealth-planning questions → referral booking → encrypted ZIP. Phase 2." },
  { category: "Encrypted client envelope",           status: "planned",     detail: "AES-256-GCM, key tied to client email, no platform-side decrypt. Phase 2 critical path." },
  { category: "Approved-website button (Otto)",      status: "planned",     detail: "1-line script embed for finance brokers / banks / lawyers / financial planners / tax agents. Pilot: Sams Home Loans." },
  { category: "Brand & button-name finalisation",    status: "in-progress", detail: "Internal agents stay DIMITRI + NOAH. Button label TBD: Otto / Sorted / Beau / Tick / Lodgey." },
];

const TOUCHPOINTS = [
  { name: "Duncan Perkins Home Loan Essentials", domain: "homeloanessentials.com.au", status: "active" },
  { name: "GitHub repo (perkoathle-design/itr)",  domain: "github.com/perkoathle-design/itr", status: "active" },
  { name: "Sams Home Loans (pilot broker site)",   domain: "", status: "planned" },
  { name: "XPM tax-agent partner (TBD)",           domain: "", status: "planned" },
  { name: "BLinks tax agency",                      domain: "", status: "planned" },
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
            Welcome, {user.name.split(" ")[0]} — we're four weeks into your ITR Platform build. The .claude/ doctrine and the Next.js / Prisma scaffold are in place. Phase 1 starts 19 May 2026: role-based portal shells, MyGov OAuth, DIMITRI interview UI. Target: 20 ghost 2025 ITRs by 30 June 2026.
          </div>
        </motion.div>

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Deliverables Complete",  value: String(done),         color: "#16a34a"  },
            { label: "In Progress",             value: String(inProgress),  color: DUNCAN.blue },
            { label: "Phase",                   value: "1 of 4",            color: DUNCAN.muted },
            { label: "Weeks to MVP",            value: "7",                 color: DUNCAN.muted },
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
              { label: "ITR Platform Proposal (13 May 2026)", icon: FileMark,     href: "/proposals/duncan-itr-platform-2026-05-13", note: "Retainer proposal v2 — read this first" },
              { label: "Your GitHub Repo",                     icon: ExternalMark, href: "https://github.com/perkoathle-design/itr", note: "perkoathle-design/itr — main branch" },
              { label: "Agent Doctrine (.claude/CLAUDE.md)",   icon: ActivityMark, href: "https://github.com/perkoathle-design/itr/blob/main/.claude/CLAUDE.md", note: "Karpathy method — 8 specialists active" },
              { label: "Project Brief",                         icon: BarChartMark, href: "https://github.com/perkoathle-design/itr/blob/main/PROJECT_BRIEF.md", note: "DIMITRI + NOAH spec" },
              { label: "Phill direct",                          icon: TrendUpMark,  href: "mailto:contact@unite-group.in", note: "contact@unite-group.in" },
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
