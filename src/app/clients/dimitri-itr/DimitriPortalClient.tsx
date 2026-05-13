"use client";

// src/app/clients/dimitri-itr/DimitriPortalClient.tsx
// UNI-1947 Pillar 2: Client component that renders the Duncan/Dimitri ITR
// portal from data passed in by the server `page.tsx`. All hardcoded
// DELIVERABLES / TOUCHPOINTS arrays have been removed — those now come
// from nexus_clients.portal_content via getPortalContent server-side.

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import {
  TrendUpMark, FileMark, CheckCircleMark,
  PipelineMark, ClockMark, ExternalMark, LogOutMark, CommandCenterMark,
} from "@/components/ui/marks";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PortalContent, Deliverable, Touchpoint, QuickLink } from "@/types/portal-content";

// ─── Brand tokens ───────────────────────────────────────────────────────────

const DUNCAN = {
  blue:    "#1a73e8",
  dark:    "var(--canvas)",
  surface: "var(--surface-1)",
  border:  "var(--border-default)",
  ink:     "var(--ink-primary)",
  muted:   "var(--ink-secondary)",
  ghost:   "var(--ink-tertiary)",
};

const STATUS_CONFIG = {
  done:          { color: "#16a34a",   label: "Complete",    icon: CheckCircleMark },
  "in-progress": { color: DUNCAN.blue, label: "In Progress", icon: ClockMark       },
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

export interface DimitriPortalClientProps {
  initialContent: PortalContent;
}

export default function DimitriPortalClient({ initialContent }: DimitriPortalClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authed, setAuthed] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>("");

  const client = {
    name: "Duncan Perkins",
    firstName: "Duncan",
    email: "Duncan@homeloanessentials.com.au",
    slug: "dimitri-itr",
  };

  const proposal = {
    setupFeeAud: 4400,
    monthlyAud: 2750,
    termMonths: 12,
    totalAud: 4400 + 12 * 2750,
    currencyNote: "All amounts AUD, GST inclusive",
  };

  const deliverables: Deliverable[] = initialContent.deliverables ?? [];
  const touchpoints: Touchpoint[]   = initialContent.touchpoints ?? [];
  const quickLinks:  QuickLink[]    = initialContent.quick_links ?? [];
  const welcomeText: string | null  = initialContent.welcome_text ?? null;

  const paid = searchParams?.get("paid") === "1";
  const cancelled = searchParams?.get("paid") === "0";

  async function handleApproveAndPay() {
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/onboarding/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: client.slug }),
      });
      const data = await res.json();
      if (!res.ok || !data?.checkout_url) {
        setCheckoutError(data?.error ?? `Checkout error (HTTP ${res.status})`);
        setCheckoutLoading(false);
        return;
      }
      window.location.href = data.checkout_url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Network error");
      setCheckoutLoading(false);
    }
  }

  useEffect(() => { setMounted(true); }, []);

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

  const inProgress = deliverables.filter(d => d.status === "in-progress").length;

  return (
    <div style={{ minHeight: "100vh", background: DUNCAN.dark, color: DUNCAN.ink, fontFamily: "var(--font-display)" }}>

      <header style={{
        height: 64, display: "flex", alignItems: "center", padding: "0 32px",
        borderBottom: `1px solid ${DUNCAN.border}`,
        background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--red-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CommandCenterMark size={14} color="white" />
            </div>
            <span style={{ fontSize: 12, color: DUNCAN.ghost }}>Unite Group</span>
          </div>

          <span style={{ color: DUNCAN.border, fontSize: 16 }}>·</span>

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

          <span style={{ fontSize: 11, color: DUNCAN.ghost, fontFamily: "var(--font-mono)" }}>{sessionEmail}</span>

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

        {/* Welcome banner */}
        {welcomeText ? (
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
              Welcome, {client.firstName}
            </div>
            <div style={{ fontSize: 13, color: DUNCAN.muted, lineHeight: 1.6 }}>
              {welcomeText}
            </div>
          </motion.div>
        ) : (
          <EmptyState title="Portal not configured yet" description="An account manager will populate this shortly." />
        )}

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Engagement Status",       value: "Active",           color: "#16a34a"   },
            { label: "Deliverables In Flight",  value: String(inProgress), color: DUNCAN.blue },
            { label: "Months to MVP",           value: "4–5",              color: DUNCAN.muted },
            { label: "Retainer",                value: "12-mo",            color: DUNCAN.muted },
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

        {/* Proposal & Approval */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 12 }}>
            Proposal & Approval
          </div>

          {paid && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.35)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <CheckCircleMark size={16} color="#16a34a" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Welcome aboard — engagement locked in</div>
                <div style={{ fontSize: 11, color: DUNCAN.muted, marginTop: 2 }}>
                  Setup fee charged and monthly retainer active. First written status note Friday afternoon.
                </div>
              </div>
            </motion.div>
          )}

          {cancelled && (
            <div style={{
              background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.30)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 14,
              fontSize: 12, color: "#a16207",
            }}>
              Payment cancelled — no charge made. Try again any time.
            </div>
          )}

          <div style={{
            background: DUNCAN.surface,
            backgroundImage: "linear-gradient(180deg,rgba(255,255,255,0.025) 0%,transparent 50%)",
            border: `1px solid ${DUNCAN.border}`, borderRadius: 12, padding: "20px 22px",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
              {[
                { label: "Setup Fee (one-time)",   value: `$${proposal.setupFeeAud.toLocaleString()}`, color: DUNCAN.ink  },
                { label: "Monthly Retainer",        value: `$${proposal.monthlyAud.toLocaleString()}`,  color: DUNCAN.ink  },
                { label: "Minimum Term",            value: `${proposal.termMonths} months`,             color: DUNCAN.ink  },
                { label: "12-Month Commitment",     value: `$${proposal.totalAud.toLocaleString()}`,    color: DUNCAN.blue },
              ].map(t => (
                <div key={t.label} style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: t.color }}>{t.value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: DUNCAN.ghost, marginBottom: 16, lineHeight: 1.5 }}>
              {proposal.currencyNote}. Setup fee charged on signing. Monthly retainer invoiced the 1st of each month from June 2026. Full proposal: <a href="/proposals/duncan-itr-platform-2026-05-13" style={{ color: DUNCAN.blue, textDecoration: "none" }}>read here</a>.
            </div>

            {!paid && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button
                  onClick={handleApproveAndPay}
                  disabled={checkoutLoading}
                  style={{
                    background: checkoutLoading ? DUNCAN.muted : "#E62128",
                    color: "#fff",
                    border: "none",
                    padding: "12px 22px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    cursor: checkoutLoading ? "wait" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!checkoutLoading) (e.currentTarget as HTMLButtonElement).style.background = "#c4181f"; }}
                  onMouseLeave={(e) => { if (!checkoutLoading) (e.currentTarget as HTMLButtonElement).style.background = "#E62128"; }}
                >
                  {checkoutLoading ? "Loading Stripe…" : "Approve & pay setup fee →"}
                </button>
                <div style={{ fontSize: 11, color: DUNCAN.ghost }}>
                  Secure checkout via Stripe. Card details never touch our servers.
                </div>
              </div>
            )}

            {checkoutError && (
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: 8,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)",
                fontSize: 12, color: "#b91c1c",
              }}>
                {checkoutError}
              </div>
            )}
          </div>
        </div>

        {/* Deliverables */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 12 }}>
            Engagement Deliverables
          </div>
          {deliverables.length === 0 ? (
            <EmptyState title="No deliverables yet" description="Discovery starts the week of 19 May 2026 — milestones will populate here." />
          ) : (
            <div style={{ background: DUNCAN.surface, border: `1px solid ${DUNCAN.border}`, borderRadius: 12, overflow: "hidden" }}>
              {deliverables.map((d, i) => (
                <motion.div
                  key={d.category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 120px",
                    alignItems: "start", gap: 16, padding: "14px 20px",
                    borderBottom: i < deliverables.length - 1 ? `1px solid ${DUNCAN.border}` : "none",
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
          )}
        </div>

        {/* Touchpoints */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 12 }}>
            Touchpoints & Partners
          </div>
          {touchpoints.length === 0 ? (
            <EmptyState title="No touchpoints configured yet" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {touchpoints.map((tp, i) => (
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
          )}
        </div>

        {/* Quick links */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: DUNCAN.ghost, marginBottom: 12 }}>
            Resources
          </div>
          {quickLinks.length === 0 ? (
            <EmptyState title="No resources linked yet" />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {quickLinks.map((link, i) => {
                // Mailto links use TrendUpMark; everything else uses FileMark. Keeps the visual
                // tight without a separate icon column in the DB.
                const Icon = link.href.startsWith("mailto:") ? TrendUpMark : FileMark;
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
          )}
        </div>

        {/* Footer */}
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
