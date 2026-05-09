"use client";

import { BusinessLogo } from '@/components/empire/BusinessLogo';
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessHealth = {
  id: string;
  name: string;
  status: string;
  arr_aud: number;
  overall_health: number | null;
  security_score: number | null;
  dependencies: number | null;
  security_findings: number | null;
  snapshot_at: string | null;
};

type PortfolioSummary = {
  total_arr: number;
  avg_health: number | null;
  at_risk_count: number;
  last_rescan: string | null;
  has_live_data: boolean;
};

type EmpireData = {
  businesses: BusinessHealth[];
  summary: PortfolioSummary;
  fetched_at: string;
};

type Priority = {
  id: string;
  title: string;
  subtitle: string;
  priority: "urgent" | "high" | "medium";
  owner: string;
  url: string | null;
  team: string;
};

type PipelineCounts = {
  ideas_in_flight: number;
  board_active: number;
  completed_today: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthColor(score: number | null): string {
  if (score === null) return "var(--ink-disabled)";
  if (score >= 80) return "var(--green-400)";
  if (score >= 50) return "var(--orange-400)";
  return "var(--red-400)";
}

function formatArr(arr: number): string {
  if (arr === 0) return "";
  if (arr >= 1_000_000) return `$${(arr / 1_000_000).toFixed(1)}M`;
  if (arr >= 1_000) return `$${Math.round(arr / 1_000)}k`;
  return `$${arr}`;
}

function formatArrFull(arr: number): string {
  if (arr === 0) return "—";
  if (arr >= 1_000_000) return `$${(arr / 1_000_000).toFixed(1)}M ARR`;
  if (arr >= 1_000) return `$${Math.round(arr / 1_000)}k ARR`;
  return `$${arr} ARR`;
}

function daysToDeadline(): number {
  // 2B acquisition target deadline: calculated from today
  const deadline = new Date("2028-03-15");
  const now = new Date();
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

function priorityBadgeStyle(p: Priority["priority"]): React.CSSProperties {
  if (p === "urgent") return { background: "var(--red-500)", color: "var(--ink-inverse)" };
  if (p === "high") return { background: "var(--orange-400)", color: "#1a0a00" };
  return { background: "#92400e", color: "#fde68a" };
}

function priorityLabel(p: Priority["priority"]): string {
  if (p === "urgent") return "URGENT";
  if (p === "high") return "HIGH";
  return "MED";
}

function ownerBadgeStyle(owner: string): React.CSSProperties {
  if (owner === "phill") {
    return { background: "rgba(185,28,28,0.15)", color: "#f87171", border: "1px solid rgba(185,28,28,0.4)" };
  }
  return { background: "rgba(34,197,94,0.12)", color: "var(--green-400)", border: "1px solid rgba(34,197,94,0.3)" };
}

function ownerLabel(owner: string): string {
  return owner === "phill" ? "OWNER ACTION" : "AUTONOMOUS";
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function Shimmer({ width, height, radius = 4 }: { width: string | number; height: number; radius?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, flexShrink: 0 }}
    />
  );
}

// ─── Empire Pulse Bar ─────────────────────────────────────────────────────────

function EmpirePulseBar({ summary, loading }: { summary: PortfolioSummary | null; loading: boolean }) {
  const days = daysToDeadline();
  const daysColor = days < 365 ? "var(--red-400)" : days < 548 ? "var(--orange-400)" : "var(--ink-primary)";

  const pills = [
    {
      label: "Total ARR",
      value: summary ? formatArrFull(summary.total_arr) : "—",
      color: summary && summary.total_arr > 0 ? "var(--green-400)" : "var(--ink-secondary)",
    },
    {
      label: "Days to deadline",
      value: `${days.toLocaleString()} days`,
      color: daysColor,
    },
    {
      label: "Portfolio avg",
      value: summary?.avg_health != null ? `${summary.avg_health}/100` : "—",
      color: healthColor(summary?.avg_health ?? null),
    },
    {
      label: "Businesses at risk",
      value: summary ? `${summary.at_risk_count}` : "—",
      color: summary && summary.at_risk_count > 0 ? "var(--red-400)" : "var(--green-400)",
    },
    {
      label: "System status",
      value: "● AUTONOMOUS",
      color: "var(--green-400)",
    },
  ];

  return (
    <div style={{
      display: "flex",
      gap: 1,
      background: "var(--border-hairline)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      marginBottom: 20,
    }}>
      {pills.map((pill) => (
        <div
          key={pill.label}
          style={{
            flex: 1,
            background: "var(--surface-1)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <div style={{
            fontSize: 10,
            color: "var(--ink-tertiary)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            {pill.label}
          </div>
          {loading ? (
            <Shimmer width="80%" height={18} />
          ) : (
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: pill.color,
              letterSpacing: "-0.3px",
            }}>
              {pill.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Priority Card ────────────────────────────────────────────────────────────

function PriorityCard({ p, index }: { p: Priority; index: number }) {
  return (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      animation: `empire-fade-in 0.3s var(--ease-out) ${index * 60}ms both`,
    }}>
      {/* Top row: priority badge + owner badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Priority badge */}
          <span style={{
            ...priorityBadgeStyle(p.priority),
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            padding: "3px 8px",
            borderRadius: "var(--radius-md)",
          }}>
            {priorityLabel(p.priority)}
          </span>
          {/* Ticket ID */}
          <span style={{
            fontSize: 11,
            color: "var(--ink-tertiary)",
            fontFamily: "var(--font-mono)",
          }}>
            {p.id}
          </span>
        </div>
        {/* Owner badge */}
        <span style={{
          ...ownerBadgeStyle(p.owner),
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.06em",
          padding: "3px 8px",
          borderRadius: "var(--radius-md)",
        }}>
          {ownerLabel(p.owner)}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: "-0.2px",
        color: "var(--ink-primary)",
        lineHeight: 1.3,
      }}>
        {p.title}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: 12,
        color: "var(--ink-secondary)",
        lineHeight: 1.5,
      }}>
        {p.subtitle}
      </div>

      {/* Action button */}
      {p.url && (
        <div>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-primary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "5px 12px",
              textDecoration: "none",
              background: "var(--surface-2)",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
          >
            Open in Linear →
          </a>
        </div>
      )}
    </div>
  );
}

function PriorityCardSkeleton() {
  return (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Shimmer width={52} height={20} radius={4} />
        <Shimmer width={70} height={20} radius={4} />
      </div>
      <Shimmer width="65%" height={15} />
      <Shimmer width="90%" height={12} />
      <Shimmer width="80%" height={12} />
    </div>
  );
}

// ─── Business Health Row ──────────────────────────────────────────────────────

function BusinessHealthRow({ biz }: { biz: BusinessHealth }) {
  const color = healthColor(biz.overall_health);
  const score = biz.overall_health;
  const atRisk = score !== null && score < 60;
  const arrLabel = formatArr(biz.arr_aud);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 14px",
      borderBottom: "1px solid var(--border-hairline)",
    }}>
      {/* Business logo with mark fallback */}
      <BusinessLogo slug={biz.id} size="sm" />

      {/* Name */}
      <span style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--ink-primary)",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {biz.name}
      </span>

      {/* ARR if > 0 */}
      {arrLabel && (
        <span style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--green-400)",
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {arrLabel}
        </span>
      )}

      {/* Security score small */}
      {biz.security_score !== null && (
        <span style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--ink-tertiary)",
          flexShrink: 0,
        }}>
          sec:{biz.security_score}
        </span>
      )}

      {/* Health score */}
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        color,
        flexShrink: 0,
        minWidth: 28,
        textAlign: "right",
      }}>
        {score !== null ? score : "—"}
      </span>

      {/* Risk warning */}
      {atRisk && (
        <span style={{ fontSize: 12, flexShrink: 0 }}>⚠</span>
      )}
    </div>
  );
}

function BusinessHealthSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          borderBottom: "1px solid var(--border-hairline)",
        }}>
          <Shimmer width={7} height={7} radius={999} />
          <Shimmer width="45%" height={13} />
          <div style={{ flex: 1 }} />
          <Shimmer width={28} height={13} />
        </div>
      ))}
    </>
  );
}

// ─── Board Alerts ─────────────────────────────────────────────────────────────

function BoardAlerts({ businesses }: { businesses: BusinessHealth[] }) {
  const alerts: { text: string; key: string }[] = [];

  for (const biz of businesses) {
    if (biz.security_score !== null && biz.security_score < 40) {
      alerts.push({
        key: `sec-${biz.id}`,
        text: `${biz.name} security: ${biz.security_score}/100`,
      });
    }
  }

  if (alerts.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--ink-tertiary)", padding: "4px 0" }}>
        No active alerts
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {alerts.map(alert => (
        <div key={alert.key} style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 12,
          color: "var(--ink-secondary)",
          lineHeight: 1.4,
        }}>
          <span style={{ color: "var(--orange-400)", flexShrink: 0 }}>⚠</span>
          <span>{alert.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmpireCommandCenter() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [empireData, setEmpireData] = useState<EmpireData | null>(null);
  const [priorities, setPriorities] = useState<Priority[] | null>(null);
  const [pipeline, setPipeline] = useState<PipelineCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/empire/businesses", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EmpireData = await res.json();
      setEmpireData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth check
  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) {
        router.replace("/en/login");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  // On auth resolved: fetch all three endpoints
  useEffect(() => {
    if (checking) return;

    // Businesses: fetch + 30s poll
    fetchBusinesses();
    const interval = setInterval(fetchBusinesses, 30_000);

    // Priorities: one-shot
    fetch("/api/empire/priorities")
      .then(r => r.json())
      .then(json => setPriorities(json.priorities ?? []))
      .catch(() => setPriorities([]));

    // Pipeline: one-shot
    fetch("/api/empire/pipeline")
      .then(r => r.json())
      .then(json => setPipeline(json))
      .catch(() => setPipeline({ ideas_in_flight: 0, board_active: 0, completed_today: 0 }));

    return () => clearInterval(interval);
  }, [checking, fetchBusinesses]);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--canvas)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ color: "var(--ink-tertiary)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
          Authenticating...
        </div>
      </div>
    );
  }

  const businesses = empireData?.businesses ?? [];
  const summary = empireData?.summary ?? null;
  const isLoading = !empireData;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--canvas)",
      color: "var(--ink-primary)",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-hairline)",
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--surface-1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Pulsing green dot — autonomous indicator */}
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--green-400)",
            display: "inline-block",
            animation: "pulse-dot 2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>
              Empire Command Center
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 1 }}>
              Unite Group · Decision-focused · 30s polling
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {loading && (
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--orange-400)",
              animation: "pulse-dot 1s ease-in-out infinite",
            }} />
          )}
          {error && (
            <span style={{
              fontSize: 11,
              color: "var(--red-400)",
              fontFamily: "var(--font-mono)",
            }}>
              {error}
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: "24px 32px", maxWidth: 1280, margin: "0 auto" }}>

        {/* SECTION 1: Empire Pulse Bar */}
        <EmpirePulseBar summary={summary} loading={isLoading} />

        {/* SECTION 2 + 3: Two-column layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "60% 1fr",
          gap: 16,
          marginBottom: 16,
        }}>
          {/* LEFT: Today's Priorities */}
          <div style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--border-hairline)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-secondary)",
              }}>
                Today&apos;s Priorities
              </div>
              <div style={{
                fontSize: 10,
                color: "var(--ink-tertiary)",
                fontFamily: "var(--font-mono)",
              }}>
                {priorities ? `${priorities.length} items` : "loading..."}
              </div>
            </div>
            <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {priorities === null
                ? Array.from({ length: 3 }).map((_, i) => <PriorityCardSkeleton key={i} />)
                : priorities.map((p, i) => <PriorityCard key={p.id} p={p} index={i} />)
              }
            </div>
          </div>

          {/* RIGHT: Business Health Strip */}
          <div style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--border-hairline)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-secondary)",
              }}>
                Business Health
              </div>
              <div style={{
                fontSize: 10,
                color: "var(--ink-tertiary)",
                fontFamily: "var(--font-mono)",
              }}>
                {businesses.length > 0 ? `${businesses.length} tracked` : "loading..."}
              </div>
            </div>
            {isLoading
              ? <BusinessHealthSkeleton />
              : businesses.map(biz => <BusinessHealthRow key={biz.id} biz={biz} />)
            }
          </div>
        </div>

        {/* SECTION 4: Margot Pipeline + Board Alerts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}>
          {/* Left: Margot Pipeline */}
          <div style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--border-hairline)",
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-secondary)",
              }}>
                Margot Pipeline
              </div>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {pipeline === null ? (
                <>
                  <Shimmer width="70%" height={13} />
                  <Shimmer width="55%" height={13} />
                  <Shimmer width="60%" height={13} />
                </>
              ) : (
                <>
                  {[
                    { label: "Ideas in flight", value: pipeline.ideas_in_flight, color: "var(--ink-secondary)" },
                    { label: "Board directives active", value: pipeline.board_active, color: pipeline.board_active > 0 ? "var(--green-400)" : "var(--ink-secondary)" },
                    { label: "Agent actions today", value: pipeline.completed_today, color: "var(--ink-secondary)" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--border-default)",
                        flexShrink: 0,
                        display: "inline-block",
                      }} />
                      <span style={{ flex: 1, fontSize: 12, color: "var(--ink-secondary)" }}>
                        {row.label}
                      </span>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: row.color,
                        minWidth: 24,
                        textAlign: "right",
                      }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Right: Board Alerts */}
          <div style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--border-hairline)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-secondary)",
              }}>
                Board Alerts
              </div>
              {businesses.length > 0 && (
                <div style={{
                  fontSize: 10,
                  color: "var(--ink-tertiary)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {businesses.filter(b => b.security_score !== null && b.security_score < 40).length} active
                </div>
              )}
            </div>
            <div style={{ padding: "16px 18px" }}>
              {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Shimmer width="75%" height={12} />
                  <Shimmer width="65%" height={12} />
                  <Shimmer width="55%" height={12} />
                </div>
              ) : (
                <BoardAlerts businesses={businesses} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
