"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";

const PORTFOLIO = [
  { name: "Synthex",       color: "#6366f1", status: "operational", arr: null      },
  { name: "RestoreAssist", color: "#0e7c7b", status: "building",    arr: null      },
  { name: "CCW-CRM",       color: "#dc2626", status: "operational", arr: "$33K"    },
  { name: "DR Platform",   color: "#2563eb", status: "operational", arr: null      },
  { name: "NRPG",          color: "#16a34a", status: "building",    arr: null      },
  { name: "CARSI",         color: "#d97706", status: "operational", arr: null      },
];

export default function Login() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/en/ceo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "var(--font-inter)" }}>

      {/* ── Left Panel ───────────────────────────────────────────────────── */}
      <div style={{
        width: 520,
        flexShrink: 0,
        display: "none",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 52px",
        background: "#09090b",
        borderRight: "1px solid #27272a",
        position: "relative",
        overflow: "hidden",
      }} className="lg-panel">

        {/* Subtle noise texture overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          pointerEvents: "none",
        }} />

        {/* Top: Wordmark */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 64 }}>
            <img src="/logo-mark.svg" width={40} height={40} alt="Unite Group" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em" }}>Unite Group</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", display: "inline-block", boxShadow: "0 0 6px #f59e0b" }} />
                <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Empire</span>
              </div>
            </div>
          </div>

          {/* Hero headline */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{
              fontSize: 40, fontWeight: 700, color: "#fafafa",
              letterSpacing: "-0.04em", lineHeight: 1.1,
              margin: "0 0 16px",
            }}>
              Empire<br />Command<br />Centre.
            </h1>
            <p style={{ fontSize: 14, color: "#52525b", lineHeight: 1.6, margin: 0, maxWidth: 320 }}>
              AI-driven operations, real-time health monitoring, autonomous execution — all from a single authenticated session.
            </p>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 0, marginBottom: 40, background: "#111113", border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
            {[
              { label: "Businesses",  value: "6"     },
              { label: "ARR/yr",      value: "$33K"  },
              { label: "Autonomy",    value: "100%"  },
            ].map((s, i) => (
              <div key={s.label} style={{
                flex: 1, padding: "14px 0", textAlign: "center",
                borderRight: i < 2 ? "1px solid #27272a" : "none",
              }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", color: "#fafafa", lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#52525b", marginTop: 5 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio roster */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46", marginBottom: 12 }}>
            Portfolio
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {PORTFOLIO.map(biz => (
              <div key={biz.name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                background: "transparent",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: biz.color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#a1a1aa", flex: 1, letterSpacing: "-0.01em" }}>{biz.name}</span>
                {biz.arr && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#16a34a", fontWeight: 600 }}>{biz.arr}</span>
                )}
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                  color: biz.status === "operational" ? "#16a34a" : "#1d4ed8" }}>
                  {biz.status === "operational" ? "Live" : "Build"}
                </span>
              </div>
            ))}
          </div>

          {/* Pi-CEO live indicator */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#111113", border: "1px solid #27272a", borderRadius: 8 }}>
            <span className="status-dot" style={{ width: 6, height: 6, background: "#16a34a", color: "#16a34a", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#52525b" }}>Pi-CEO swarm active · 100% autonomy</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: 10, color: "#3f3f46", margin: 0 }}>
            © 2026 Unite Group. Private system — authorised access only.
          </p>
        </div>
      </div>

      {/* ── Right Panel: Form ────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
        background: "#09090b",
      }}>

        {/* Mobile wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }} className="mobile-logo">
          <img src="/logo-mark.svg" width={36} height={36} alt="Unite Group" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em" }}>Unite Group</span>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.04em", margin: "0 0 6px", lineHeight: 1.2 }}>
              Sign in
            </h2>
            <p style={{ fontSize: 13, color: "#52525b", margin: 0 }}>
              Access restricted to authorised personnel only.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 20, padding: "12px 14px", borderRadius: 8,
              background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 12, color: "#f87171", lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="email" style={{ fontSize: 12, fontWeight: 500, color: "#a1a1aa" }}>
                Email
              </label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@unite-group.in"
                style={{
                  width: "100%", padding: "10px 14px", fontSize: 14,
                  background: "#111113", border: "1px solid #27272a",
                  borderRadius: 9, color: "#fafafa", outline: "none",
                  fontFamily: "var(--font-inter)", boxSizing: "border-box",
                  transition: "border-color 0.12s ease",
                }}
                onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                onBlur={e => (e.target.style.borderColor = "#27272a")}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label htmlFor="password" style={{ fontSize: 12, fontWeight: 500, color: "#a1a1aa" }}>
                  Password
                </label>
                <a href="/reset-password" style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#3b82f6")}>
                  Forgot?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: "100%", padding: "10px 42px 10px 14px", fontSize: 14,
                    background: "#111113", border: "1px solid #27272a",
                    borderRadius: 9, color: "#fafafa", outline: "none",
                    fontFamily: "var(--font-inter)", boxSizing: "border-box",
                    transition: "border-color 0.12s ease",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e => (e.target.style.borderColor = "#27272a")}
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "#52525b", padding: 2, display: "flex",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#52525b")}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "11px 0", marginTop: 4,
                fontSize: 14, fontWeight: 600,
                background: loading ? "#1e40af" : "#1d4ed8",
                color: "#fff", border: "none", borderRadius: 9,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                transition: "background 0.12s ease",
                fontFamily: "var(--font-inter)",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#3b82f6"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
            >
              {loading
                ? <><Loader2 size={15} className="spin" /> Signing in…</>
                : <><ArrowRight size={15} /> Sign in</>
              }
            </button>

          </form>

          {/* System status */}
          <div style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <span className="status-dot" style={{ width: 5, height: 5, background: "#16a34a", color: "#16a34a" }} />
            <span style={{ fontSize: 11, color: "#3f3f46", fontFamily: "var(--font-mono)" }}>All systems operational</span>
          </div>
        </div>
      </div>

      {/* Responsive: show left panel on lg+ */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-panel { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
        @media (max-width: 1023px) {
          .lg-panel { display: none !important; }
          .mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
