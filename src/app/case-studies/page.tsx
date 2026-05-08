"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CaseStudies() {
  const caseStudies = [
    {
      id: 1,
      title: "CCW-CRM: Full CRM Implementation in 8 Weeks",
      description: "Complete Works Cleaning needed to replace 3 spreadsheets with a unified CRM. We built intake flows, real-time job status, and client-facing dashboards on Supabase — shipped in 8 weeks with zero downtime migration.",
      industry: "Restoration / Cleaning",
      services: ["CRM Development", "Supabase Schema", "Client Portal", "Workflow Automation"],
      results: "3 spreadsheets replaced, 8-week delivery",
      year: "2026",
      link: "/case-studies/ccw-crm"
    },
    {
      id: 2,
      title: "RestoreAssist App Store Launch",
      description: "Guided RestoreAssist from TestFlight to App Store approval — submission strategy, review rejection resolution, screenshot optimisation, and onboarding flow that drove 140 organic installs in the first 30 days.",
      industry: "Restoration SaaS",
      services: ["App Store Strategy", "Onboarding UX", "ASO", "Launch Playbook"],
      results: "140 organic installs in first 30 days",
      year: "2026",
      link: "/case-studies/restoreassist-launch"
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
      {/* Navigation */}
      <nav style={{ borderBottom: "1px solid #27272a", background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", textDecoration: "none" }}>UNITE Group</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/features" style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>Services</Link>
            <Link href="/pricing" style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>Pricing</Link>
            <Link href="/contact" style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>Contact</Link>
            <Link href="/about" style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>About</Link>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/login" style={{ color: "#a1a1aa", textDecoration: "none", padding: "8px 16px", fontSize: 14 }}>Login</Link>
            <Link href="/book-consultation" style={{ background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Book Now</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 32px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.04em", color: "#fafafa", marginBottom: 16 }}>
            Case Studies
          </h1>
          <p style={{ fontSize: 18, color: "#a1a1aa", lineHeight: 1.6 }}>
            Real implementations. Real results. No placeholder metrics.
          </p>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {caseStudies.map((study) => (
            <div key={study.id} style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 28, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1d4ed8", background: "rgba(29,78,216,0.1)", padding: "4px 10px", borderRadius: 4 }}>
                  {study.industry}
                </span>
                <span style={{ fontSize: 12, color: "#52525b", fontFamily: "var(--font-mono, monospace)" }}>{study.year}</span>
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", marginBottom: 10 }}>{study.title}</h2>
              <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 20, flex: 1 }}>{study.description}</p>

              <div style={{ padding: "12px 16px", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", borderRadius: 8, marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#52525b", marginBottom: 4 }}>Result</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#16a34a" }}>{study.results}</p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {study.services.map((service, idx) => (
                  <span key={idx} style={{ fontSize: 12, color: "#a1a1aa", background: "#18181b", border: "1px solid #27272a", padding: "4px 10px", borderRadius: 4 }}>
                    {service}
                  </span>
                ))}
              </div>

              <Link href={study.link} style={{ color: "#3b82f6", textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, borderTop: "1px solid #27272a", paddingTop: 16 }}>
                View Case Study <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 32px", borderTop: "1px solid #27272a" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "#fafafa", marginBottom: 16 }}>
            Ready to Transform Your Business?
          </h2>
          <p style={{ fontSize: 16, color: "#a1a1aa", marginBottom: 32, lineHeight: 1.6 }}>
            Schedule your $550 consultation session today and start your journey toward measurable results.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/book-consultation" style={{ background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
              Book Your Consultation
            </Link>
            <Link href="/contact" style={{ background: "transparent", color: "#a1a1aa", textDecoration: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, border: "1px solid #27272a" }}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
