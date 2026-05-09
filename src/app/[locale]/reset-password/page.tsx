"use client";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/en/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--canvas)" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ width: "100%", maxWidth: 400, background: "var(--surface-1)", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)", border: "1px solid #27272a", borderRadius: 16, padding: 32 }}>

        {/* Logo */}
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

        {!success ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-primary)", letterSpacing: "-0.02em", margin: 0 }}>Reset your password</h2>
              <p style={{ fontSize: 14, color: "#52525b", marginTop: 6 }}>Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
                <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Email address</label>
                <input
                  id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "var(--ink-primary)", background: "var(--surface-1)", border: "1px solid #27272a", outline: "none", boxSizing: "border-box", transition: "border-color 0.12s ease" }}
                  onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                />
              </div>

              <button
                type="submit" disabled={loading}
                style={{ width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--red-500)", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.16s ease" }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--red-400)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--red-500)"; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" />Sending…</> : <><Mail size={15} />Send reset link</>}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircle2 size={40} color="#16a34a" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-primary)", margin: "0 0 8px" }}>Check your email</h2>
            <p style={{ fontSize: 14, color: "#52525b" }}>
              A reset link has been sent to <span style={{ color: "var(--ink-primary)", fontWeight: 500 }}>{email}</span>
            </p>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--red-400)", textDecoration: "none" }}>
            <ArrowLeft size={13} />Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
