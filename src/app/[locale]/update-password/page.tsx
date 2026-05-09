"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { LoaderMark, KeyMark, ArrowLeftMark, CheckCircleMark, EyeMark, EyeOffMark } from "@/components/ui/marks";
import { motion } from "framer-motion";

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
    fontSize: 14, color: "var(--ink-primary)", background: "var(--surface-1)", border: "1px solid #27272a",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.12s ease",
  };

  const wrapStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--canvas)" };
  const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 400, background: "var(--surface-1)", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)", border: "1px solid #27272a", borderRadius: 16, padding: 32 };

  const Logo = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--red-500)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>U</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>Unite Group</div>
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
          <LoaderMark size={18} color="var(--red-400)" className="animate-spin" />
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Verifying your reset link&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={cardStyle}>
        <Logo />

        {success ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircleMark size={40} color="#16a34a" className="mx-auto mb-3" />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-primary)", margin: "0 0 8px" }}>Password updated</h2>
            <p style={{ fontSize: 14, color: "#52525b", marginBottom: 20 }}>Your password has been updated. Redirecting to sign in&hellip;</p>
            <button
              onClick={() => router.push("/login")}
              style={{ width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--red-500)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <ArrowLeftMark size={15} />Go to sign in
            </button>
          </div>
        ) : validToken ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-primary)", letterSpacing: "-0.02em", margin: 0 }}>Set a new password</h2>
              <p style={{ fontSize: 14, color: "#52525b", marginTop: 6 }}>Create a new secure password for your account.</p>
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
                    onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 4 }}>
                    {showPassword ? <EyeOffMark size={15} /> : <EyeMark size={15} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#52525b", marginTop: 5 }}>At least 6 characters</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Confirm password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="confirmPassword" type={showConfirm ? "text" : "password"} required
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 4 }}>
                    {showConfirm ? <EyeOffMark size={15} /> : <EyeMark size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                style={{ width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--red-500)", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.16s ease" }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--red-400)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--red-500)"; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {loading ? <><LoaderMark size={15} className="animate-spin" />Updating…</> : <><KeyMark size={15} />Update password</>}
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
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--red-500)", textDecoration: "none" }}
            >
              <ArrowLeftMark size={15} />Request a new reset link
            </Link>
          </>
        )}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--red-400)", textDecoration: "none" }}>
            <ArrowLeftMark size={13} />Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
