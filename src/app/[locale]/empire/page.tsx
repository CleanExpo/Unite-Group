"use client";

import { BusinessLogo } from '@/components/empire/BusinessLogo';
import { SourceMatrixGrid } from '@/components/empire/SourceMatrixGrid';
import { SystemHealthTile } from '@/components/empire/SystemHealthTile';
import Link from 'next/link';
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { CircuitBoard, type CircuitNodeType, type CircuitConnection } from "@/components/ui/circuit-board";
import {
  SpotlightCard,
  SpotlightCardHeader,
  SpotlightCardTitle,
  SpotlightCardDescription,
  SpotlightCardContent,
} from "@/components/ui/spotlight-card";
import { ShowcaseCard } from "@/components/ui/showcase-card";
import { GithubCalendar } from "@/components/ui/github-calendar";
import { Search, Users, ClipboardList, Cpu, Rocket } from "lucide-react";

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

type PipelineStage = {
  id: string;
  label: string;
  sublabel: string;
  count: number;
  active: boolean;
};

type PipelineCounts = {
  ideas_in_flight: number;
  board_active: number;
  completed_today: number;
  stages?: PipelineStage[];
  recent_activity?: { label: string; when: string }[];
};

type ExitThesisData = {
  currentArr: number;
  gapToMin: number;
  daysRemaining: number;
};

type BoardMinute = {
  date: string;
  topic: string;
  decision: string;
  directiveTo: string | null;
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

// ─── Empire Hero (ShowcaseCard) ───────────────────────────────────────────────

// Dark executive command-centre aesthetic: night skyline, no AI-slop / no fake people.
// Unsplash source: Mike Enerio, dark city skyline at night.
const EMPIRE_HERO_IMAGE =
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=80";

function EmpireHero({
  summary,
  exitThesis,
}: {
  summary: PortfolioSummary | null;
  exitThesis: ExitThesisData | null;
}) {
  const fallbackDays = daysToDeadline();
  const days = exitThesis?.daysRemaining ?? fallbackDays;
  const liveArr = exitThesis?.currentArr ?? summary?.total_arr ?? 0;
  const gapToMin = exitThesis?.gapToMin ?? null;

  const arrLabel = liveArr > 0 ? formatArrFull(liveArr) : "—";
  const gapLabel =
    gapToMin !== null && gapToMin > 0
      ? `${formatArr(gapToMin)} gap to $167M floor`
      : gapToMin !== null
        ? "Above $167M floor"
        : "Gap pending";
  const healthLabel =
    summary?.avg_health != null ? `${summary.avg_health}/100 portfolio health` : "Health pending";

  const description = `Portfolio AUTONOMOUS — ${arrLabel} live, ${days.toLocaleString()} days to $2B target, ${gapLabel}, ${healthLabel}.`;

  return (
    <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
      <ShowcaseCard
        tagline="Empire Command Center"
        heading="$66k → $167M by June 2028"
        description={description}
        imageUrl={EMPIRE_HERO_IMAGE}
        imageAlt="Empire command center skyline"
        ctaText="View KPIs"
        onCtaClick={() => {
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 480, behavior: "smooth" });
          }
        }}
        brandName="Unite Group"
        services={["6 brands", "$2B thesis", "Autonomous"]}
        className="!max-w-full w-full"
      />
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

// ─── Business Health Card (SpotlightCard) ────────────────────────────────────

function BusinessHealthCard({ biz }: { biz: BusinessHealth }) {
  const color = healthColor(biz.overall_health);
  const score = biz.overall_health;
  const atRisk = score !== null && score < 60;
  const arrLabel = formatArr(biz.arr_aud);

  // Spotlight tone: Candy Red for at-risk, green for healthy, neutral default.
  const spotlightColor = atRisk
    ? "rgba(179, 0, 0, 0.35)"
    : score !== null && score >= 80
      ? "rgba(0, 168, 84, 0.30)"
      : "rgba(224, 112, 32, 0.28)";

  return (
    <Link
      href={`/en/empire/businesses/${biz.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <SpotlightCard
        spotlightColor={spotlightColor}
        borderRadius={10}
        className="cursor-pointer h-full"
        style={{ background: "var(--surface-1)" }}
      >
        <SpotlightCardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BusinessLogo slug={biz.id} size="sm" />
            <SpotlightCardTitle className="!text-base">{biz.name}</SpotlightCardTitle>
          </div>
          <SpotlightCardDescription>
            {biz.status || "Tracked"}
            {atRisk ? " · at risk" : ""}
          </SpotlightCardDescription>
        </SpotlightCardHeader>
        <SpotlightCardContent>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-tertiary)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Health
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color,
                  lineHeight: 1.1,
                }}
              >
                {score !== null ? score : "—"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-tertiary)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Security
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  color:
                    biz.security_score !== null && biz.security_score < 40
                      ? "var(--red-400)"
                      : "var(--ink-secondary)",
                }}
              >
                {biz.security_score !== null ? `${biz.security_score}` : "—"}
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-tertiary)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textAlign: "right",
                }}
              >
                ARR
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: biz.arr_aud > 0 ? "var(--green-400)" : "var(--ink-disabled)",
                  textAlign: "right",
                }}
              >
                {arrLabel || "—"}
              </div>
            </div>
          </div>
        </SpotlightCardContent>
      </SpotlightCard>
    </Link>
  );
}

function BusinessHealthCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        borderRadius: 10,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 130,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Shimmer width={28} height={28} radius={6} />
        <Shimmer width="45%" height={14} />
      </div>
      <Shimmer width="60%" height={11} />
      <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
        <Shimmer width={50} height={26} />
        <Shimmer width={50} height={26} />
        <Shimmer width={70} height={26} />
      </div>
    </div>
  );
}

// ─── Pipeline Circuit (CircuitBoard) ─────────────────────────────────────────

const PIPELINE_STAGE_ICONS: Record<string, React.ReactNode> = {
  margot: <Search size={16} strokeWidth={1.75} />,
  board: <Users size={16} strokeWidth={1.75} />,
  pm: <ClipboardList size={16} strokeWidth={1.75} />,
  orchestrator: <Cpu size={16} strokeWidth={1.75} />,
  deployed: <Rocket size={16} strokeWidth={1.75} />,
};

function PipelineCircuit({ stages }: { stages: PipelineStage[] }) {
  // Layout: 5 stages, horizontally spaced across a 560×140 board with bottom label clearance.
  const width = 560;
  const height = 140;
  const padX = 56;
  const stepX = stages.length > 1 ? (width - padX * 2) / (stages.length - 1) : 0;
  const y = 56;

  const nodes: CircuitNodeType[] = stages.map((s, i) => ({
    id: s.id,
    x: padX + stepX * i,
    y,
    label: `${s.label} · ${s.count}`,
    icon: PIPELINE_STAGE_ICONS[s.id] ?? <Cpu size={16} strokeWidth={1.75} />,
    status: s.active ? "processing" : s.count > 0 ? "active" : "inactive",
    size: "md",
  }));

  const connections: CircuitConnection[] = stages.slice(0, -1).map((s, i) => {
    const next = stages[i + 1];
    const animated = s.active || s.count > 0;
    return {
      from: s.id,
      to: next.id,
      animated,
      // Use Nexus tokens: Candy Red pulse on active, dim trace otherwise.
      color: "rgba(255,255,255,0.12)",
      pulseColor: animated ? "rgba(179, 0, 0, 0.85)" : "rgba(255,255,255,0.25)",
    };
  });

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", overflowX: "auto" }}>
      <CircuitBoard
        nodes={nodes}
        connections={connections}
        width={width}
        height={height}
        showGrid={false}
        variant="dark"
        pulseSpeed={2.5}
      />
    </div>
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
  const [exitThesis, setExitThesis] = useState<ExitThesisData | null>(null);
  const [boardMinutes, setBoardMinutes] = useState<BoardMinute[]>([]);
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

    // Exit thesis: wiki-driven ARR + days
    fetch("/api/wiki/exit-thesis")
      .then(r => r.json())
      .then(setExitThesis)
      .catch(() => {});

    // Board minutes: from harness
    fetch("/api/empire/board-minutes")
      .then(r => r.json())
      .then(d => setBoardMinutes(d.minutes ?? []))
      .catch(() => {});

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

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/en/empire/data-room"
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-secondary)",
              textDecoration: "none",
              padding: "6px 10px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Data Room →
          </Link>
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

        {/* SECTION 1: Empire Hero (ShowcaseCard) */}
        <EmpireHero summary={summary} exitThesis={exitThesis} />

        {/* SECTION 1b: System Health Command Center */}
        <SystemHealthTile />

        {/* SECTION 1c: Brand × Source matrix */}
        <SourceMatrixGrid />

        {/* SECTION 2 + 3: Two-column layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
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
            <div
              style={{
                padding: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <BusinessHealthCardSkeleton key={i} />)
              ) : businesses.length === 0 ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <EmptyState
                    title="No businesses configured yet"
                    description="Portfolio rows haven't been seeded into the businesses table. Add one to start tracking health and ARR."
                  />
                </div>
              ) : (
                businesses.map(biz => <BusinessHealthCard key={biz.id} biz={biz} />)
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: Margot Pipeline + Board Alerts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}>
          {/* Left: Autonomous Pipeline */}
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
                Autonomous Pipeline
              </div>
              {pipeline !== null && (
                <div style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--green-400)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--green-400)",
                    display: "inline-block",
                  }} />
                  ACTIVE
                </div>
              )}
            </div>

            {/* Pipeline flow */}
            <div style={{ padding: "16px 18px" }}>
              {pipeline === null ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Shimmer width="100%" height={48} />
                  <Shimmer width="70%" height={13} />
                </div>
              ) : pipeline.stages ? (
                <>
                  {/* Stage nodes — CircuitBoard */}
                  <PipelineCircuit stages={pipeline.stages} />

                  {/* Recent activity */}
                  {pipeline.recent_activity && pipeline.recent_activity.length > 0 && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--border-hairline)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}>
                      {pipeline.recent_activity.map((item, i) => (
                        <div key={i} style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 11,
                        }}>
                          <span style={{ color: "var(--ink-disabled)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                            {item.when}
                          </span>
                          <span style={{ color: "var(--ink-secondary)", lineHeight: 1.4 }}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Fallback: legacy 3-number display */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Ideas in flight", value: pipeline.ideas_in_flight },
                    { label: "Board directives active", value: pipeline.board_active },
                    { label: "Agent actions today", value: pipeline.completed_today },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--ink-secondary)" }}>{row.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
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

        {/* SECTION 6: Developer Activity — GitHub contribution heatmaps */}
        {/* NOTE: rana-muzamil username sourced from scripts/seed-developer-profiles.ts.
            If contributions API 404s, verify via `gh api users/rana-muzamil`. */}
        <section style={{ marginTop: 24 }}>
          <div
            style={{
              fontSize: "var(--text-2xs)",
              fontWeight: 600,
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
              color: "var(--ink-tertiary)",
              marginBottom: 12,
            }}
          >
            Developer Activity — last 12 months
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "16px 18px",
                overflowX: "auto",
              }}
            >
              <GithubCalendar
                username="CleanExpo"
                variant="city-lights"
                shape="rounded"
                colorSchema="green"
                glowIntensity={4}
              />
            </div>
            <div
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "16px 18px",
                overflowX: "auto",
              }}
            >
              <GithubCalendar
                username="rana-muzamil"
                variant="city-lights"
                shape="rounded"
                colorSchema="orange"
                glowIntensity={4}
              />
            </div>
          </div>
        </section>

        {/* SECTION 5: Recent Board Directives */}
        {boardMinutes.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 600,
              letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase',
              color: 'var(--ink-tertiary)', marginBottom: 12 }}>
              RECENT BOARD DIRECTIVES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {boardMinutes.map(m => (
                <div key={m.date} style={{ background: 'var(--surface-1)',
                  border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)',
                  padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-tertiary)', flexShrink: 0, marginTop: 2 }}>
                    {m.date}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 2 }}>
                      {m.topic}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                      {m.decision}
                    </div>
                    {m.directiveTo && (
                      <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        → {m.directiveTo}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
