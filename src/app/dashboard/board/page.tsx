"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import { Plus, Send, CheckCircle2, Loader2 } from "lucide-react";

interface KanbanCard {
  id: string;
  title: string;
  description: string;
  business: string;
  businessColor: string;
  priority: "critical" | "high" | "medium" | "low";
}

interface Column {
  id: string;
  title: string;
  accent: string;
  cards: KanbanCard[];
}

const PRIORITY_COLOR = { critical: "#dc2626", high: "#d97706", medium: "#1d4ed8", low: "#52525b" };

const INITIAL_COLUMNS: Column[] = [
  { id: "backlog", title: "Backlog", accent: "#52525b", cards: [
    { id: "b1", title: "RestoreAssist App Store submission", description: "Prepare metadata, screenshots, compliance checklist. Apple review pending.", business: "RestoreAssist", businessColor: "#0E7C7B", priority: "critical" },
    { id: "b2", title: "NRPG Contractor onboarding flow", description: "Design and build the contractor activation sequence for ANZ market.", business: "NRPG", businessColor: "#16A34A", priority: "medium" },
    { id: "b3", title: "CARSI Compliance tracking module", description: "Build compliance reporting and audit trail functionality.", business: "CARSI", businessColor: "#D97706", priority: "medium" },
    { id: "b4", title: "DR Platform SEO content calendar", description: "12-week content plan targeting disaster recovery keywords in ANZ.", business: "DR Platform", businessColor: "#2563EB", priority: "low" },
  ]},
  { id: "in-progress", title: "In Progress", accent: "#1d4ed8", cards: [
    { id: "ip1", title: "Unite-Hub CRM full redesign", description: "Metallic minimalist design system, Kanban board, business overview graphs.", business: "Unite Group", businessColor: "#1D4ED8", priority: "critical" },
    { id: "ip2", title: "Synthex content pipeline (40/85)", description: "Complete remaining 45 marketing assets across all 6 businesses.", business: "Synthex", businessColor: "#6366F1", priority: "high" },
    { id: "ip3", title: "CCW-CRM Sprint 4", description: "Client feedback integration, reporting dashboard improvements.", business: "CCW-CRM", businessColor: "#DC2626", priority: "high" },
  ]},
  { id: "review", title: "In Review", accent: "#f59e0b", cards: [
    { id: "r1", title: "Pi-CEO agent performance audit", description: "Review swarm health metrics, optimise orchestrator, benchmark against Wave 5 targets.", business: "Unite Group", businessColor: "#1D4ED8", priority: "high" },
    { id: "r2", title: "Synthex brand DESIGN.md codify", description: "Convert BrandResearch dossier into BrandConfig TypeScript.", business: "Synthex", businessColor: "#6366F1", priority: "medium" },
  ]},
  { id: "done", title: "Done", accent: "#16a34a", cards: [
    { id: "d1", title: "Login page redesign", description: "Metallic dark design with portfolio status and ambient glows.", business: "Unite Group", businessColor: "#1D4ED8", priority: "high" },
    { id: "d2", title: "CEO dashboard sidebar fix", description: "Persistent sidebar across all routes via root layout restructure.", business: "Unite Group", businessColor: "#1D4ED8", priority: "critical" },
    { id: "d3", title: "Empire health API endpoint", description: "Deployed and serving live data to CEO command centre.", business: "Unite Group", businessColor: "#1D4ED8", priority: "high" },
    { id: "d4", title: "framer-motion + Design.md", description: "Full animation system + 9-section design system from Linear + Emil Kowalski.", business: "Unite Group", businessColor: "#1D4ED8", priority: "medium" },
  ]},
];

export default function KanbanBoard() {
  const router = useRouter();
  const [columns] = useState<Column[]>(INITIAL_COLUMNS);
  const [mounted, setMounted] = useState(false);
  const [teams, setTeams] = useState<Array<{id: string; name: string; key: string}>>([]);
  const [pushing, setPushing] = useState<string | null>(null); // card id being pushed
  const [pushed, setPushed] = useState<Record<string, string>>({}); // cardId -> linearUrl

  useEffect(() => { setMounted(true); }, []);

  // Fetch Linear teams on mount
  useEffect(() => {
    fetch('/api/linear/issue?action=teams')
      .then(r => r.json())
      .then(data => {
        const nodes = data?.data?.teams?.nodes ?? [];
        if (nodes.length > 0) setTeams(nodes);
      })
      .catch(() => { /* silently ignore */ });
  }, []);

  const pushToLinear = async (card: KanbanCard) => {
    setPushing(card.id);
    const teamMatch = teams.find(t =>
      t.key === 'RA' || t.name.toLowerCase().includes('restoreassist') || t.name.toLowerCase().includes('unite')
    ) ?? teams[0];

    if (!teamMatch) { setPushing(null); return; }

    const res = await fetch('/api/linear/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title: card.title,
        teamId: teamMatch.id,
        description: `${card.description}\n\n_Pushed from Unite-Group CRM Kanban board — Business: ${card.business}_`,
        priority: card.priority === 'critical' ? 1 : card.priority === 'high' ? 2 : card.priority === 'medium' ? 3 : 4,
      }),
    });
    const data = await res.json();
    const url = data?.data?.issueCreate?.issue?.url;
    if (url) setPushed(prev => ({ ...prev, [card.id]: url }));
    setPushing(null);
  };

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/en/login");
    });
  }, [router]);

  if (!mounted) return null;

  const totalCards = columns.reduce((s, c) => s + c.cards.length, 0);
  const doneCards = columns.find(c => c.id === "done")?.cards.length ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa" }}>
      {/* Page title */}
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-display)" }}>
            Work Orders
          </h1>
          <p style={{ fontSize: 11, color: "#52525b", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>{doneCards}/{totalCards} done</p>
        </div>
        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 120, height: 3, background: "#27272a", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", borderRadius: 2, background: "#16a34a" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((doneCards / totalCards) * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#52525b" }}>{Math.round((doneCards / totalCards) * 100)}%</span>
        </div>
      </div>

      {/* Board */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "start" }}>
        {columns.map((col, ci) => (
          <motion.div
            key={col.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: ci * 0.06, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Column header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 2px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.accent, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#d4d4d8", letterSpacing: "-0.01em" }}>{col.title}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "#52525b", background: "#111113", border: "1px solid #27272a", borderRadius: 4, padding: "1px 6px" }}>{col.cards.length}</span>
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.cards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: ci * 0.06 + i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                  whileHover={{ y: -2 }}
                  style={{
                    background: "#111113",
                    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 50%)",
                    border: "1px solid #27272a",
                    borderRadius: 10,
                    padding: 14,
                    cursor: "default",
                  }}
                >
                  {/* Business tag + priority */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 4, background: `${card.businessColor}12`, border: `1px solid ${card.businessColor}25` }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: card.businessColor, display: "inline-block" }} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: card.businessColor, letterSpacing: "0.04em", textTransform: "uppercase" }}>{card.business}</span>
                    </span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[card.priority], display: "inline-block" }} title={card.priority} />
                  </div>

                  {/* Title */}
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#d4d4d8", letterSpacing: "-0.01em", lineHeight: 1.4, marginBottom: 6, fontFamily: "var(--font-display)" }}>
                    {card.title}
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: 11, color: "#52525b", lineHeight: 1.5 }}>
                    {card.description}
                  </div>

                  {/* Push to Linear */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {pushed[card.id] ? (
                      <a href={pushed[card.id]} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#16a34a', textDecoration: 'none' }}>
                        <CheckCircle2 size={10} /> View in Linear
                      </a>
                    ) : (
                      <button
                        onClick={() => pushToLinear(card)}
                        disabled={pushing === card.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                          fontSize: 10, fontWeight: 500, borderRadius: 5,
                          border: '1px solid #27272a', color: '#52525b',
                          background: 'transparent', cursor: pushing === card.id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.1s ease',
                        }}
                        onMouseEnter={e => { if (pushing !== card.id) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1d4ed8'; (e.currentTarget as HTMLButtonElement).style.color = '#1d4ed8'; }}}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#27272a'; (e.currentTarget as HTMLButtonElement).style.color = '#52525b'; }}
                      >
                        {pushing === card.id ? <Loader2 size={9} className="spin" /> : <Send size={9} />}
                        {pushing === card.id ? 'Pushing…' : 'Push to Linear'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Add card ghost */}
              <button
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px dashed #27272a", color: "#3f3f46", background: "transparent", cursor: "pointer", fontSize: 12, transition: "all 0.12s ease", width: "100%" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3f3f46"; (e.currentTarget as HTMLButtonElement).style.color = "#52525b"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLButtonElement).style.color = "#3f3f46"; }}
              >
                <Plus size={11} /> Add card
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
