// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { LoaderMark } from "@/components/ui/marks";
import { motion } from "framer-motion";
import {
  SpotlightCard,
  SpotlightCardHeader,
  SpotlightCardTitle,
  SpotlightCardContent,
} from "@/components/ui/spotlight-card";
import { z } from "zod";

// ─── Validation schema ────────────────────────────────────────────────────────
const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ─── Password strength ────────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "#27272a" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: "#ef4444" };
  if (score <= 4) return { score: 2, label: "Fair", color: "#f59e0b" };
  if (score <= 5) return { score: 3, label: "Good", color: "#22c55e" };
  return { score: 4, label: "Strong", color: "#10b981" };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  color: "var(--ink-primary)",
  background: "var(--surface-1)",
  border: "1px solid #27272a",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.12s ease",
};

const PORTFOLIO = [
  { name: "Synthex",        status: "operational", color: "#16a34a" },
  { name: "RestoreAssist",  status: "building",    color: "var(--red-500)" },
  { name: "CCW",            status: "operational", color: "#16a34a" },
  { name: "CARSI",          status: "building",    color: "var(--red-500)" },
  { name: "DR Platform",    status: "building",    color: "var(--red-500)" },
  { name: "NRPG",           status: "building",    color: "var(--red-500)" },
];

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === "string" ? params.locale : "en";

  const strength = getPasswordStrength(password);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    const result = registerSchema.safeParse({
      firstName, lastName, email, password, confirmPassword,
      acceptTerms: acceptTerms as true,
    });
    if (!result.success) {
      const msg = result.error.errors[0]?.message ?? "Please fix the form errors.";
      toast.error(msg);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName, acceptTerms }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast.error("Too many signup attempts. Please try again later.");
        } else {
          toast.error(data.error || "Registration failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (data.needsVerification) {
        toast.info("Account created! Check your email to verify your address.");
        setTimeout(() => router.push(`/${locale}/login`), 2000);
        return;
      }

      // Success — redirect to onboarding wizard
      toast.success(`Welcome, ${firstName}! Your account is ready.`);
      router.push(`/${locale}/onboarding`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, email, password, confirmPassword, acceptTerms, router, locale]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--canvas)" }}>

      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ width: "45%", background: "var(--surface-1)", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)", borderRight: "1px solid #27272a", padding: "48px 40px", display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--red-500)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>U</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>Unite Group</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24", display: "inline-block" }} />
              <span style={{ fontSize: 9, color: "#fbbf24", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Empire</span>
            </div>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink-primary)", letterSpacing: "-0.03em", lineHeight: 1.15, margin: 0 }}>Join the Empire</h1>
          <p style={{ fontSize: 14, color: "#52525b", marginTop: 10 }}>6 portfolio businesses. 200+ people. One command center.</p>
        </div>

        <div>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#52525b", marginBottom: 10 }}>Portfolio Status</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PORTFOLIO.map((biz) => (
              <div key={biz.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface-1)", border: "1px solid #27272a", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>{biz.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span className="status-dot" style={{ width: 5, height: 5, background: biz.color, color: biz.color }} />
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: biz.color }}>{biz.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <SpotlightCard
          spotlightColor="rgba(179, 0, 0, 0.30)"
          borderRadius={12}
          style={{ width: "100%", maxWidth: 440 }}
        >
          <SpotlightCardHeader>
            <SpotlightCardTitle style={{ fontSize: 22, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>Create your account</SpotlightCardTitle>
            <p style={{ fontSize: 14, color: "#52525b", marginTop: 6 }}>Start your free account in seconds.</p>
          </SpotlightCardHeader>
          <SpotlightCardContent>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>First name</label>
                  <input
                    type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Phill" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Last name</label>
                  <input
                    type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="McGurk" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Email address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                />
              </div>

              {/* Password with strength indicator */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Password</label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                />
                {/* Password strength bar */}
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i <= strength.score ? strength.color : "#27272a",
                          transition: "background 0.2s ease",
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: strength.color, margin: 0, fontWeight: 500 }}>
                      {strength.label}
                    </p>
                  </div>
                )}
                {!password && (
                  <p style={{ fontSize: 11, color: "#52525b", marginTop: 5 }}>Min 8 chars, uppercase, lowercase, number</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Confirm password</label>
                <input
                  type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--red-500)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, margin: 0 }}>Passwords do not match</p>
                )}
              </div>

              {/* Terms checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "var(--red-500)" }}
                />
                <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                  I agree to the{" "}
                  <Link href={`/${locale}/privacy`} style={{ color: "var(--red-400)", textDecoration: "none" }}>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href={`/${locale}/privacy`} style={{ color: "var(--red-400)", textDecoration: "none" }}>
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {/* Submit button */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff",
                  background: "var(--red-500)", border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.16s ease",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--red-400)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--red-500)"; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {loading ? <><LoaderMark size={15} className="animate-spin" />Creating account…</> : "Create account"}
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#27272a" }} />
                <span style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#27272a" }} />
              </div>

              {/* Google Sign-Up placeholder */}
              <button
                type="button"
                disabled
                style={{
                  width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 500,
                  background: "transparent",
                  border: "1px solid #27272a", borderRadius: 10,
                  color: "#52525b", cursor: "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: 0.6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign up with Google (coming soon)
              </button>
            </form>

            {/* Login link */}
            <p style={{ fontSize: 13, color: "#52525b", textAlign: "center", marginTop: 24 }}>
              Already have an account?{" "}
              <Link href={`/${locale}/login`} style={{ color: "var(--red-400)", textDecoration: "none", fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          </SpotlightCardContent>
        </SpotlightCard>
      </div>
    </div>
  );
}
