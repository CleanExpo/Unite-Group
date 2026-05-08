"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";

const PORTFOLIO = [
  { name: "Synthex",        status: "operational", color: "#16a34a" },
  { name: "RestoreAssist",  status: "building",    color: "#1d4ed8" },
  { name: "CCW",            status: "operational", color: "#16a34a" },
  { name: "CARSI",          status: "building",    color: "#1d4ed8" },
  { name: "DR Platform",    status: "building",    color: "#1d4ed8" },
  { name: "NRPG",           status: "building",    color: "#1d4ed8" },
];

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: signUpError, data } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });
      if (signUpError) throw signUpError;
      if (data.user) {
        const conversion_copy_variant = Math.random() < 0.5 ? "win" : "control";
        await supabaseClient.from("profiles").insert([{
          id: data.user.id, first_name: firstName, last_name: lastName,
          role: "user", conversion_copy_variant,
        }]);
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    color: "#f8fafc",
    background: "#0f172a",
    border: "1px solid #1e293b",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.12s ease",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0a0f1e" }}>

      {/* Left panel */}
      <div style={{ width: "45%", background: "#0f172a", borderRight: "1px solid #1e293b", padding: "48px 40px", display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>U</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em" }}>Unite Group</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24", display: "inline-block" }} />
              <span style={{ fontSize: 9, color: "#fbbf24", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Empire</span>
            </div>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.15, margin: 0 }}>Join the Empire</h1>
          <p style={{ fontSize: 14, color: "#475569", marginTop: 10 }}>6 portfolio businesses. 200+ people. One command center.</p>
        </div>

        <div>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#334155", marginBottom: 10 }}>Portfolio Status</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PORTFOLIO.map((biz) => (
              <div key={biz.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#111827", border: "1px solid #1e293b", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>{biz.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span className="status-dot" style={{ width: 5, height: 5, background: biz.color, color: biz.color }} />
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: biz.color }}>{biz.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em", margin: 0 }}>Create your account</h2>
            <p style={{ fontSize: 14, color: "#475569", marginTop: 6 }}>Enter your details to request access.</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
              <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <CheckCircle2 size={40} color="#16a34a" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f8fafc", margin: "0 0 8px" }}>Account created</h3>
              <p style={{ fontSize: 14, color: "#475569" }}>Check your email for verification. Redirecting to sign in&hellip;</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>First name</label>
                  <input
                    type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Phill" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e => (e.target.style.borderColor = "#1e293b")}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Last name</label>
                  <input
                    type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="McGurk" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e => (e.target.style.borderColor = "#1e293b")}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Email address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e => (e.target.style.borderColor = "#1e293b")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Password</label>
                <input
                  type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e => (e.target.style.borderColor = "#1e293b")}
                />
                <p style={{ fontSize: 11, color: "#334155", marginTop: 5 }}>Minimum 6 characters</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Confirm password</label>
                <input
                  type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e => (e.target.style.borderColor = "#1e293b")}
                />
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff",
                  background: "#1d4ed8", border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.16s ease",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#3b82f6"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" />Creating account…</> : "Create account"}
              </button>
            </form>
          )}

          <p style={{ fontSize: 13, color: "#334155", textAlign: "center", marginTop: 24 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
