// @ts-nocheck
// HourOnePortal — 6-section client portal template (CMO Board call).
//
// Renders from `nexus_clients.portal_content` JSON populated by the Pi-CEO
// swarm provisioner (~/Pi-CEO/Pi-Dev-Ops/swarm/inbox/provisioner.py). The
// section structure is locked at schema_version = "hour1-v1":
//
//   engagement      → Mission Counter
//   brand_vote      → Day 0–2 active vote (auto-archives after closes_at)
//   build_stream    → Linear-style timeline of shipped items
//   preview_deploys → Current preview vs production
//   approvals_queue → What the client must action this week
//   compliance_vault → Compliance memos (populated by Day 10)
//
// Empty-state copy is THE PRODUCT — it shows the client what's coming
// and when. Sections with no content render their `empty_state` string
// with an "Arrives Day X" placeholder.
"use client";

import { useState } from "react";

type BrandCandidate = {
  name: string;
  tagline?: string;
  tm_status?: "primary" | "backup" | "candidate";
};

type PortalContent = {
  schema_version?: string;
  hour1_provisioned_at?: string;
  linear_project_id?: string | null;
  linear_project_url?: string | null;
  engagement?: {
    label?: string;
    started_at?: string;
    total_days?: number;
    current_day?: number;
    deliverables_shipped?: number;
    active_blockers?: number;
  };
  brand_vote?: {
    active?: boolean;
    closes_at?: string;
    candidates?: BrandCandidate[];
    votes?: Record<string, number>;
  };
  build_stream?: {
    items?: Array<{
      title: string;
      date: string;
      preview_url?: string;
      summary?: string;
    }>;
    empty_state?: string;
  };
  preview_deploys?: {
    current?: { url: string; deployed_at: string } | null;
    empty_state?: string;
  };
  approvals_queue?: {
    items?: Array<{
      id: string;
      title: string;
      subtitle?: string;
      due?: string;
      url?: string;
      blocking?: boolean;
    }>;
  };
  compliance_vault?: {
    items?: Array<{ title: string; url: string; added_at: string }>;
    empty_state?: string;
    populated_by_day?: number;
  };
};

export default function HourOnePortal({
  slug,
  clientName,
  content,
}: {
  slug: string;
  clientName?: string;
  content: PortalContent;
}) {
  const engagement = content?.engagement ?? {};
  const totalDays = engagement.total_days ?? 14;
  const currentDay = engagement.current_day ?? 0;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Sticky header */}
      <header className="border-b border-gray-800 px-6 py-4 sticky top-0 bg-[#1a1a1a]/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-[#dc143c]" />
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Unite-Group</div>
              <div className="font-semibold leading-tight">
                {engagement.label ?? clientName ?? slug}
              </div>
            </div>
          </div>
          <MissionCounter
            currentDay={currentDay}
            totalDays={totalDays}
            shipped={engagement.deliverables_shipped ?? 0}
            blockers={engagement.active_blockers ?? 0}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <BrandVote slug={slug} brandVote={content?.brand_vote} />
        <ApprovalsQueue queue={content?.approvals_queue} />
        <BuildStream stream={content?.build_stream} />
        <PreviewDeploys deploys={content?.preview_deploys} />
        <ComplianceVault vault={content?.compliance_vault} />

        {content?.linear_project_url && (
          <section className="text-center text-xs text-gray-500 py-4">
            Linear project: <a href={content.linear_project_url} className="text-[#dc143c] hover:underline" target="_blank" rel="noopener noreferrer">{content.linear_project_url}</a>
          </section>
        )}
      </main>
    </div>
  );
}

// ─── Mission Counter ────────────────────────────────────────────────────────
function MissionCounter({
  currentDay, totalDays, shipped, blockers,
}: { currentDay: number; totalDays: number; shipped: number; blockers: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <Pill label={`Day ${currentDay} of ${totalDays}`} accent />
      <Pill label={`${shipped} shipped`} />
      <Pill label={`${blockers} blockers`} warn={blockers > 0} />
    </div>
  );
}

function Pill({ label, accent, warn }: { label: string; accent?: boolean; warn?: boolean }) {
  const cls = warn
    ? "bg-red-900/40 text-red-300 border-red-700"
    : accent
      ? "bg-[#dc143c]/20 text-[#dc143c] border-[#dc143c]/40"
      : "bg-[#222] text-gray-300 border-gray-700";
  return (
    <span className={`px-2.5 py-1 rounded border font-medium ${cls}`}>{label}</span>
  );
}

// ─── Brand Vote ─────────────────────────────────────────────────────────────
function BrandVote({ slug, brandVote }: { slug: string; brandVote?: PortalContent["brand_vote"] }) {
  const candidates = brandVote?.candidates ?? [];
  const votes = brandVote?.votes ?? {};
  const active = brandVote?.active && candidates.length > 0;
  const totalVotes = Object.values(votes).reduce((a, b) => a + (b || 0), 0);

  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function vote(name: string) {
    setVoting(true);
    setError(null);
    try {
      const r = await fetch(`/api/clients/${slug}/brand-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: name }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || `HTTP ${r.status}`);
        setVoting(false);
        return;
      }
      setVoted(name);
      setVoting(false);
      // Re-fetch the page so the tallies update
      window.location.reload();
    } catch (e: any) {
      setError(String(e?.message || e));
      setVoting(false);
    }
  }

  if (!active) {
    return null;
  }

  return (
    <Section title="Brand Vote" subtitle={
      brandVote?.closes_at
        ? `Closes ${new Date(brandVote.closes_at).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`
        : undefined
    }>
      <p className="text-sm text-gray-400 mb-4">
        Both names below clear preliminary trademark sweep across Class 9 (software) and Class 36 (financial services). Vote your favourite — final mark concepts arrive Day 2.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {candidates.map(c => {
          const count = votes[c.name] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <button
              key={c.name}
              onClick={() => vote(c.name)}
              disabled={voting || voted !== null}
              className="text-left bg-[#1a1a1a] border border-gray-700 hover:border-[#dc143c] disabled:opacity-50 rounded-lg p-4 transition group"
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-semibold group-hover:text-[#dc143c] transition">{c.name}</span>
                {c.tm_status === "primary" && <span className="text-xs text-[#dc143c]">Primary</span>}
                {c.tm_status === "backup"  && <span className="text-xs text-gray-500">Backup</span>}
              </div>
              {c.tagline && <div className="text-sm text-gray-400 mb-2">{c.tagline}</div>}
              <div className="text-xs text-gray-500">
                {count} vote{count !== 1 ? "s" : ""}{totalVotes > 0 ? ` · ${pct}%` : ""}
              </div>
            </button>
          );
        })}
      </div>
      {error && <div className="text-red-400 text-sm mt-3">{error}</div>}
      {voted && <div className="text-green-400 text-sm mt-3">✓ Voted for {voted}. Mark concepts arrive Day 2.</div>}
    </Section>
  );
}

// ─── Approvals Queue ────────────────────────────────────────────────────────
function ApprovalsQueue({ queue }: { queue?: PortalContent["approvals_queue"] }) {
  const items = queue?.items ?? [];
  if (items.length === 0) return null;
  return (
    <Section title="Approvals Queue" subtitle="What we need from you this week">
      <div className="space-y-2">
        {items.map(item => (
          <a
            key={item.id}
            href={item.url ?? "#"}
            className="flex items-center justify-between bg-[#1a1a1a] border border-gray-700 hover:border-[#dc143c] rounded-lg p-4 transition group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                {item.blocking && <span className="text-xs px-2 py-0.5 bg-yellow-900/40 text-yellow-300 border border-yellow-700 rounded">Blocking</span>}
                <span className="font-medium group-hover:text-[#dc143c] transition">{item.title}</span>
              </div>
              {item.subtitle && <div className="text-sm text-gray-400">{item.subtitle}</div>}
              {item.due && <div className="text-xs text-gray-500 mt-1">Due {new Date(item.due).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>}
            </div>
            <span className="text-[#dc143c] text-lg">→</span>
          </a>
        ))}
      </div>
    </Section>
  );
}

// ─── Build Stream ───────────────────────────────────────────────────────────
function BuildStream({ stream }: { stream?: PortalContent["build_stream"] }) {
  const items = stream?.items ?? [];
  return (
    <Section title="The Build" subtitle="What we've shipped">
      {items.length === 0 ? (
        <EmptyState text={stream?.empty_state ?? "Build stream populates as we ship."} />
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="border-l-2 border-gray-700 pl-4 py-1">
              <div className="flex items-baseline justify-between">
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-gray-500">{new Date(it.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
              </div>
              {it.summary && <div className="text-sm text-gray-400 mt-1">{it.summary}</div>}
              {it.preview_url && <a href={it.preview_url} className="text-xs text-[#dc143c] hover:underline mt-1 inline-block" target="_blank" rel="noopener noreferrer">View preview ↗</a>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Preview Deploys ────────────────────────────────────────────────────────
function PreviewDeploys({ deploys }: { deploys?: PortalContent["preview_deploys"] }) {
  return (
    <Section title="Preview Deploys" subtitle="Click around — every link works">
      {!deploys?.current ? (
        <EmptyState text={deploys?.empty_state ?? "First preview arrives soon."} />
      ) : (
        <a href={deploys.current.url} target="_blank" rel="noopener noreferrer" className="block bg-[#1a1a1a] border border-gray-700 hover:border-[#dc143c] rounded-lg p-4 transition group">
          <div className="text-sm text-gray-500 mb-1">Latest staging URL</div>
          <div className="font-mono text-sm text-[#dc143c] group-hover:underline break-all">{deploys.current.url}</div>
          <div className="text-xs text-gray-500 mt-2">
            Deployed {new Date(deploys.current.deployed_at).toLocaleString("en-AU")}
          </div>
        </a>
      )}
    </Section>
  );
}

// ─── Compliance Vault ───────────────────────────────────────────────────────
function ComplianceVault({ vault }: { vault?: PortalContent["compliance_vault"] }) {
  const items = vault?.items ?? [];
  return (
    <Section title="Compliance Vault" subtitle="ASIC / AFSL / PII handling memos">
      {items.length === 0 ? (
        <EmptyState text={vault?.empty_state ?? "Compliance pack arrives by Day 10."} />
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i}>
              <a href={it.url} className="text-[#dc143c] hover:underline" target="_blank" rel="noopener noreferrer">
                {it.title}
              </a>
              <span className="text-xs text-gray-500 ml-2">{new Date(it.added_at).toLocaleDateString("en-AU")}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ─── Shared primitives ──────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#222] border border-gray-800 rounded-xl p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-sm text-gray-500 italic py-2">{text}</div>
  );
}
