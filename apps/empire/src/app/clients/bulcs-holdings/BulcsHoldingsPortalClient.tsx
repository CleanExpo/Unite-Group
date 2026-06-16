"use client";

// src/app/clients/bulcs-holdings/BulcsHoldingsPortalClient.tsx
// UNI-1947 Pillar 2: Client component for the Bulcs Holdings portal.
// Hardcoded DELIVERABLES / DIVISIONS arrays removed — content comes from
// nexus_clients.portal_content via getPortalContent server-side.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import {
  TrendUpMark, FileMark, ActivityMark, BarChartMark, CheckCircleMark,
  PipelineMark, ClockMark, ExternalMark, LogOutMark, CommandCenterMark,
} from "@/components/ui/marks";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PortalContent, Deliverable, Touchpoint, QuickLink } from "@/types/portal-content";

// Brand primary lives as a CSS custom property at the page root so future
// brand_config plumbing (UNI-1994) can override it without touching this file.
// Simple consumers read BH.blue → var(--brand-primary); opacity variants use
// color-mix() against the var directly (8-digit hex pattern doesn't work with var()).
const BH_BRAND_PRIMARY_DEFAULT = "#228FE0";
const BH = {
  blue:    "var(--brand-primary)",
  dark:    "var(--canvas)",
  surface: "var(--surface-1)",
  border:  "var(--border-default)",
  ink:     "var(--ink-primary)",
  muted:   "var(--ink-secondary)",
  ghost:   "var(--ink-tertiary)",
};

const STATUS_CONFIG = {
  done:          { color: "#16a34a", label: "Complete",    icon: CheckCircleMark },
  "in-progress": { color: BH.blue,   label: "In Progress", icon: ClockMark       },
  planned:       { color: "var(--ink-tertiary)", label: "Planned", icon: PipelineMark },
};

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

// Pick a sensible icon per link based on URL shape. The DB stores only label/href/note;
// we don't want to add an icon column for one cosmetic detail.
function iconForLink(href: string) {
  if (href.includes("moisturemeterexperts") || href.includes("bulcsholdings.com")) return TrendUpMark;
  if (href.startsWith("mailto:")) return TrendUpMark;
  if (href.endsWith(".pdf"))      return FileMark;
  return ActivityMark;
}

export interface BulcsHoldingsPortalClientProps {
  initialContent: PortalContent;
}

export default function BulcsHoldingsPortalClient({ initialContent }: BulcsHoldingsPortalClientProps) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  const client = {
    name: "Ivi Sims",
    firstName: "Ivi",
    email: "ivi@bulcsholdings.com",
  };

  const deliverables: Deliverable[] = initialContent.deliverables ?? [];
  const touchpoints:  Touchpoint[]  = initialContent.touchpoints ?? [];
  const quickLinks:   QuickLink[]   = initialContent.quick_links ?? [];
  const welcomeText: string | null  = initialContent.welcome_text ?? null;

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
  useEffect(() => { setMounted(true); }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async auth check, setState is in a Promise callback
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/en/login"); return; }
      setAuthed(true);
      setSessionEmail(session.user.email ?? "");
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.push("/en/login");
  };

  if (!mounted || !authed) return null;

  const done = deliverables.filter(d => d.status === "done").length;
  const inProgress = deliverables.filter(d => d.status === "in-progress").length;

  return (
    <div style={{ minHeight: "100vh", background: BH.dark, color: BH.ink, fontFamily: "var(--font-display)", ["--brand-primary" as string]: BH_BRAND_PRIMARY_DEFAULT }}>

      <header style={{
        height: 64, display: "flex", alignItems: "center", padding: "0 32px",
        borderBottom: `1px solid ${BH.border}`,
        background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--red-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CommandCenterMark size={14} color="white" />
            </div>
            <span style={{ fontSize: 12, color: BH.ghost }}>Unite Group</span>
          </div>

          <span style={{ color: BH.border, fontSize: 16 }}>·</span>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: BH.blue }}>BH</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: BH.ink, letterSpacing: "-0.02em" }}>Bulcs Holdings</div>
              <div style={{ fontSize: 10, color: BH.muted }}>Client Portal</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 11, color: BH.ghost, fontFamily: "var(--font-mono)" }}>{sessionEmail}</span>

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
            <LogOutMark size={11} /> Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Welcome banner */}
        {welcomeText ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 8%, transparent) 0%, transparent 100%)",
              border: "1px solid color-mix(in srgb, var(--brand-primary) 15%, transparent)",
              borderRadius: 12, padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: BH.ink, letterSpacing: "-0.03em", marginBottom: 6 }}>
              Welcome, {client.firstName}
            </div>
            <div style={{ fontSize: 13, color: BH.muted, lineHeight: 1.6 }}>
              {welcomeText}
            </div>
          </motion.div>
        ) : (
          <EmptyState title="Portal not configured yet" description="An account manager will populate this shortly." />
        )}

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Deliverables Complete",  value: String(done),               color: "#16a34a" },
            { label: "In Progress",             value: String(inProgress),        color: BH.blue   },
            { label: "Divisions Covered",       value: String(touchpoints.length), color: BH.muted },
            { label: "Monthly Reports",         value: "1",                       color: BH.muted  },
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

        {/* Deliverables */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BH.ghost, marginBottom: 12 }}>
            Agency Deliverables
          </div>
          {deliverables.length === 0 ? (
            <EmptyState title="No deliverables yet" />
          ) : (
            <div style={{ background: BH.surface, border: `1px solid ${BH.border}`, borderRadius: 12, overflow: "hidden" }}>
              {deliverables.map((d, i) => (
                <motion.div
                  key={d.category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 120px",
                    alignItems: "start", gap: 16, padding: "14px 20px",
                    borderBottom: i < deliverables.length - 1 ? `1px solid ${BH.border}` : "none",
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
          )}
        </div>

        {/* Divisions (touchpoints) */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BH.ghost, marginBottom: 12 }}>
            Your Divisions Under Management
          </div>
          {touchpoints.length === 0 ? (
            <EmptyState title="No divisions configured yet" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {touchpoints.map((div, i) => (
                <motion.div
                  key={div.domain ?? div.name}
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
                  {div.domain ? (
                    <a
                      href={`https://${div.domain}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: BH.blue, textDecoration: "none" }}
                    >
                      {div.domain} <ExternalMark size={9} />
                    </a>
                  ) : (
                    <span style={{ fontSize: 10, color: BH.ghost, textTransform: "uppercase", letterSpacing: "0.06em" }}>{div.status}</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BH.ghost, marginBottom: 12 }}>
            Resources
          </div>
          {quickLinks.length === 0 ? (
            <EmptyState title="No resources linked yet" />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {quickLinks.map((link, i) => {
                const Icon = iconForLink(link.href);
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
          )}
        </div>

        {/* Footer */}
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
