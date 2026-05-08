import Link from "next/link";
import { CheckCircle } from "lucide-react";

const TIERS = [
  {
    name: "Foundation",
    price: "$1,500",
    period: "/mo",
    desc: "For businesses starting their digital transformation.",
    features: [
      "CRM setup and onboarding",
      "1 Synthex email campaign/month",
      "SEO audit (initial)",
      "Monthly health report",
      "Email support",
    ],
    cta: "Get started",
    primary: false,
  },
  {
    name: "Growth",
    price: "$2,000",
    period: "/mo",
    desc: "Full agency delivery for established ANZ businesses.",
    features: [
      "Everything in Foundation",
      "4 Synthex campaigns/month",
      "SEO management + keyword tracking",
      "Pi-CEO agent monitoring",
      "Fortnightly strategy call",
      "Priority support",
    ],
    cta: "Get started",
    primary: true,
  },
  {
    name: "Full Agency",
    price: "$2,500",
    period: "/mo",
    desc: "Complete white-glove delivery for complex operations.",
    features: [
      "Everything in Growth",
      "Unlimited campaigns",
      "Custom software development (scoped)",
      "RestoreAssist / CARSI integration",
      "Dedicated account manager",
      "Weekly board-room brief",
    ],
    cta: "Contact us",
    primary: false,
  },
];

const COMPARISON = [
  { feature: "CRM setup",                     foundation: true,  growth: true,  agency: true  },
  { feature: "Synthex campaigns/month",        foundation: "1",   growth: "4",   agency: "∞"   },
  { feature: "SEO audit",                      foundation: "One-off", growth: "Ongoing", agency: "Ongoing" },
  { feature: "Pi-CEO monitoring",              foundation: false, growth: true,  agency: true  },
  { feature: "Software development",           foundation: false, growth: false, agency: true  },
  { feature: "Dedicated account manager",      foundation: false, growth: false, agency: true  },
];

const card: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 24,
};

function Check({ ok }: { ok: boolean | string }) {
  if (typeof ok === "string") return <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#94a3b8" }}>{ok}</span>;
  if (ok) return <CheckCircle size={15} color="#16a34a" />;
  return <span style={{ fontSize: 13, color: "#334155" }}>—</span>;
}

export default function Pricing() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#f8fafc" }}>

      {/* Nav */}
      <nav style={{ background: "rgba(10,15,30,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid #1e293b", height: 60, padding: "0 24px", position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: "#fff" }}>U</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em" }}>Unite Group</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/features" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>Platform</Link>
            <Link href="/pricing" style={{ fontSize: 13, fontWeight: 500, color: "#f8fafc", textDecoration: "none" }}>Pricing</Link>
            <Link href="/about" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>About</Link>
            <Link href="/login" style={{ fontSize: 13, fontWeight: 500, color: "#fff", background: "#1d4ed8", padding: "6px 14px", borderRadius: 8, textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "72px 24px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#334155", marginBottom: 12 }}>Pricing</p>
        <h1 style={{ fontSize: 38, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.04em", lineHeight: 1.15, margin: "0 0 14px" }}>Agency services, not SaaS pricing</h1>
        <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
          Unite Group delivers hands-on agency work across CRM, SEO, content, and software for ANZ businesses. No per-seat fees. One monthly retainer.
        </p>
        <p style={{ fontSize: 12, color: "#334155", marginTop: 16 }}>Currently serving select ANZ businesses — contact us to check availability.</p>
      </section>

      {/* Tier cards */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                ...card,
                border: tier.primary ? "1px solid rgba(29,78,216,0.4)" : "1px solid #1e293b",
                background: tier.primary ? "rgba(29,78,216,0.06)" : "#0f172a",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {tier.primary && (
                <div style={{ textAlign: "center", marginBottom: -8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.06em", textTransform: "uppercase" }}>Most popular</span>
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", letterSpacing: "-0.01em", marginBottom: 6 }}>{tier.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.03em" }}>{tier.price}</span>
                  <span style={{ fontSize: 13, color: "#334155" }}>{tier.period}</span>
                </div>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>{tier.desc}</p>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {tier.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <CheckCircle size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/contact"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: tier.primary ? "#fff" : "#94a3b8",
                  background: tier.primary ? "#1d4ed8" : "transparent",
                  border: `1px solid ${tier.primary ? "#1d4ed8" : "#1e293b"}`,
                  transition: "all 0.14s ease",
                }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Feature comparison table */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#334155", marginBottom: 16 }}>Comparison</p>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#334155" }}>Feature</th>
                {["Foundation", "Growth", "Full Agency"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#334155" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} style={{ borderBottom: i < COMPARISON.length - 1 ? "1px solid #1e293b" : "none" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#94a3b8" }}>{row.feature}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}><Check ok={row.foundation} /></td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}><Check ok={row.growth} /></td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}><Check ok={row.agency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#0f172a", borderTop: "1px solid #1e293b", padding: "48px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.03em", margin: "0 0 10px" }}>Ready to get started?</h2>
        <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 24px" }}>Contact us to discuss your requirements and check current availability.</p>
        <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", padding: "10px 22px", borderRadius: 10, background: "#1d4ed8", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Contact Unite Group
        </Link>
      </section>

    </div>
  );
}
