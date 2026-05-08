"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Loader2, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) { setError("Invalid or expired password reset link. Please request a new one."); setTokenChecked(true); return; }
      if (data.session) {
        setValidToken(true);
      } else {
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) { setValidToken(true); }
        else { setError("No valid recovery session found. Please request a password reset link."); }
      }
      setTokenChecked(true);
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters long"); return; }
    setLoading(true); setError(null);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while updating your password");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: 10, padding: "10px 14px", paddingRight: 44,
    fontSize: 14, color: "#f8fafc", background: "#111827", border: "1px solid #1e293b",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.12s ease",
  };

  const wrapStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0a0f1e" };
  const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 400, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 32 };

  const Logo = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>U</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em" }}>Unite Group</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24", display: "inline-block" }} />
          <span style={{ fontSize: 9, color: "#fbbf24", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Empire</span>
        </div>
      </div>
    </div>
  );

  if (!tokenChecked) {
    return (
      <div style={wrapStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Loader2 size={18} color="#3b82f6" className="animate-spin" />
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Verifying your reset link&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <Logo />

        {success ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircle2 size={40} color="#16a34a" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", margin: "0 0 8px" }}>Password updated</h2>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 20 }}>Your password has been updated. Redirecting to sign in&hellip;</p>
            <button
              onClick={() => router.push("/login")}
              style={{ width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "#1d4ed8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <ArrowLeft size={15} />Go to sign in
            </button>
          </div>
        ) : validToken ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em", margin: 0 }}>Set a new password</h2>
              <p style={{ fontSize: 14, color: "#475569", marginTop: 6 }}>Create a new secure password for your account.</p>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
                <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>New password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password" type={showPassword ? "text" : "password"} required minLength={6}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e => (e.target.style.borderColor = "#1e293b")}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#334155", padding: 4 }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#334155", marginTop: 5 }}>At least 6 characters</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Confirm password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="confirmPassword" type={showConfirm ? "text" : "password"} required
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e => (e.target.style.borderColor = "#1e293b")}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#334155", padding: 4 }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                style={{ width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "#1d4ed8", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.16s ease" }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#3b82f6"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" />Updating…</> : <><KeyRound size={15} />Update password</>}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
              <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error ?? "The password reset link is invalid or has expired."}</p>
            </div>
            <Link
              href="/reset-password"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "#1d4ed8", textDecoration: "none" }}
            >
              <ArrowLeft size={15} />Request a new reset link
            </Link>
          </>
        )}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>
            <ArrowLeft size={13} />Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
