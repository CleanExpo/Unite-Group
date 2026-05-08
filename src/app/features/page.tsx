"use client";

import {
  Building2, Smartphone, Users, ShieldCheck, Cloud, TrendingUp,
  Cpu, BarChart3, Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const BUSINESSES = [
  { icon: <TrendingUp size={18} color="#6366f1" />, name: "Synthex", desc: "Marketing automation platform. AI-powered content, email sequences, and campaign management for field-services businesses.", color: "#6366f1" },
  { icon: <Smartphone size={18} color="#10b981" />, name: "RestoreAssist", desc: "iOS app for Australia's restoration industry. Job management, compliance checklists, and contractor coordination for disaster recovery.", color: "#10b981" },
  { icon: <ShieldCheck size={18} color="#f59e0b" />, name: "CARSI", desc: "Compliance automation for restoration contractors. Digitised audit trails, certification tracking, and regulatory reporting.", color: "#f59e0b" },
  { icon: <Cloud size={18} color="#3b82f6" />, name: "CCW CRM", desc: "Business intelligence portal for Carpet Cleaners Warehouse. Real-time CRM health, SLA tracking, and Synthex campaign metrics.", color: "#3b82f6" },
  { icon: <Globe size={18} color="#ef4444" />, name: "DR Platform", desc: "Disaster recovery operations platform. Coordinated response workflows, team dispatch, and live job tracking for ANZ restoration.", color: "#ef4444" },
  { icon: <Users size={18} color="#8b5cf6" />, name: "NRPG", desc: "Network for Restoration Professionals and Growers. Community, training, and procurement tools for ANZ restoration contractors.", color: "#8b5cf6" },
];

const CAPABILITIES = [
  {
    icon: <Cpu size={20} color="#1d4ed8" />,
    name: "Pi-CEO Swarm",
    desc: "Autonomous agent layer that runs health checks, content gap analysis, brief generation, and alert dispatch — every 30 seconds, continuously.",
  },
  {
    icon: <BarChart3 size={20} color="#16a34a" />,
    name: "Real-time SEO Intelligence",
    desc: "DataForSEO-powered keyword tracking, competitor analysis, and technical audits across all 6 portfolio domains. Rank data refreshes on demand.",
  },
  {
    icon: <Building2 size={20} color="#f59e0b" />,
    name: "Client Portals",
    desc: "White-labelled business intelligence portals for paying clients. CCW gets live CRM status, SLA tracking, and campaign open-rate dashboards.",
  },
];

const card: React.CSSProperties = {
  background: "#111113",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
  border: "1px solid #27272a",
  borderRadius: 12,
  padding: 20,
};

export default function Features() {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-display)" }}>

      {/* Page title */}
      <div style={{ padding: "24px 24px 0" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-display)" }}>
          Platform
        </h1>
        <p style={{ fontSize: 13, color: "#52525b", margin: "4px 0 0" }}>
          The Empire Command Center — 6 portfolio businesses, one platform.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Hero */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#52525b", marginBottom: 16 }}>Platform</p>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 16px" }}>
            The Empire Command Center
          </h2>
          <p style={{ fontSize: 16, color: "#a1a1aa", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.6 }}>
            A single platform managing 6 portfolio businesses — SEO intelligence, AI agents, client portals, and real-time operational health, all in one place.
          </p>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#1d4ed8", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Access the platform
          </Link>
        </section>

        {/* 6 Business blocks */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 64px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#52525b", marginBottom: 20 }}>Portfolio Businesses</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {BUSINESSES.map((biz) => (
              <div key={biz.name} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${biz.color}12`, border: `1px solid ${biz.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {biz.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fafafa", letterSpacing: "-0.01em", marginBottom: 5 }}>{biz.name}</div>
                  <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, lineHeight: 1.55 }}>{biz.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3 Platform capabilities */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#52525b", marginBottom: 20 }}>Platform Capabilities</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {CAPABILITIES.map((cap) => (
              <div key={cap.name} style={{ ...card, padding: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#18181b", border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  {cap.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", letterSpacing: "-0.02em", margin: "0 0 8px" }}>{cap.name}</h3>
                <p style={{ fontSize: 14, color: "#a1a1aa", margin: 0, lineHeight: 1.6 }}>{cap.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </motion.div>

    </div>
  );
}
