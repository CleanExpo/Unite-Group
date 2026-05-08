"use client";

import { TrendingUp, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";

const BUSINESSES = [
  { name: "Synthex",        desc: "Marketing automation · 1,000+ users",   status: "operational", arr: "$0 ARR (growth)"  },
  { name: "RestoreAssist",  desc: "iOS app · TestFlight active",            status: "building",    arr: "Pre-revenue"      },
  { name: "CCW",            desc: "First paying client · ANZ cleaning",     status: "operational", arr: "$2,400/yr ARR"    },
  { name: "CARSI",          desc: "Compliance delivery · restoration",      status: "building",    arr: "Pre-revenue"      },
  { name: "DR Platform",    desc: "Disaster recovery operations",           status: "building",    arr: "Pre-revenue"      },
  { name: "NRPG",           desc: "ANZ restoration movement",               status: "building",    arr: "Pre-revenue"      },
];

const card: React.CSSProperties = {
  background: "#111113",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
  border: "1px solid #27272a",
  borderRadius: 12,
  padding: 20,
};

export default function About() {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter)" }}>

      {/* Page title */}
      <div style={{ padding: "24px 24px 0" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-inter)" }}>
          About Unite Group
        </h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Hero */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 60px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#52525b", marginBottom: 16 }}>About</p>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 20px", maxWidth: 700 }}>
            Building Australia&apos;s next billion-dollar company from 6 portfolio businesses
          </h2>
          <p style={{ fontSize: 16, color: "#a1a1aa", lineHeight: 1.65, maxWidth: 640 }}>
            Unite Group is the holding company and command center for 6 portfolio businesses across restoration, compliance, SaaS, and field services in Australia and New Zealand. We build, operate, and eventually acquire — targeting exit at 8–12x ARR.
          </p>
        </section>

        {/* Founder section */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 64px" }}>
          <div style={{ ...card, padding: 28, display: "flex", gap: 28, alignItems: "flex-start" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>PM</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em" }}>Phill McGurk</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 3, marginBottom: 12 }}>Founder & CEO</div>
              <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.65, margin: 0, maxWidth: 560 }}>
                Phill founded Unite Group to consolidate a portfolio of ANZ restoration and field-services businesses under one AI-powered command center. He leads product strategy, the Pi-CEO agent swarm, and all six portfolio businesses. Before Unite Group, Phill spent a decade in product development and engineering across SaaS and services.
              </p>
            </div>
          </div>
        </section>

        {/* The Empire */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 64px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#52525b", marginBottom: 20 }}>The Empire</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {BUSINESSES.map((biz) => (
              <div key={biz.name} style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fafafa" }}>{biz.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: biz.status === "operational" ? "#16a34a" : "#1d4ed8", display: "inline-block" }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: biz.status === "operational" ? "#16a34a" : "#1d4ed8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{biz.status}</span>
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>{biz.desc}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "#52525b", marginTop: 8 }}>{biz.arr}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision section */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ ...card, padding: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(29,78,216,0.1)", border: "1px solid rgba(29,78,216,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Zap size={16} color="#1d4ed8" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fafafa", letterSpacing: "-0.02em", margin: "0 0 8px" }}>Pi-CEO Swarm</h3>
              <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, lineHeight: 1.6 }}>Autonomous agents running health checks, SEO analysis, content gaps, and brief generation — continuously, across all 6 businesses.</p>
            </div>
            <div style={{ ...card, padding: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <TrendingUp size={16} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fafafa", letterSpacing: "-0.02em", margin: "0 0 8px" }}>Exit at 8–12x ARR</h3>
              <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, lineHeight: 1.6 }}>Each business is built to acquisition. Once ARR + customer count hit target, the portfolio is positioned for a strategic buyer or PE roll-up at a multiple.</p>
            </div>
            <div style={{ ...card, padding: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Target size={16} color="#f59e0b" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fafafa", letterSpacing: "-0.02em", margin: "0 0 8px" }}>200+ in the network</h3>
              <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, lineHeight: 1.6 }}>Contractors, operators, and field workers across NRPG, RestoreAssist, and CARSI. The network effect compounds with each new business added.</p>
            </div>
          </div>
        </section>
      </motion.div>

    </div>
  );
}
