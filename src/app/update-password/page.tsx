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

      if (error) {
        setError("Invalid or expired password reset link. Please request a new one.");
        setTokenChecked(true);
        return;
      }

      if (data.session) {
        setValidToken(true);
      } else {
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) {
          setValidToken(true);
        } else {
          setError("No valid recovery session found. Please request a password reset link.");
        }
      }

      setTokenChecked(true);
    };

    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError(null);

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

  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#080E1A" }}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#3B82F6" }} />
          <p className="text-white text-sm">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#080E1A" }}>
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
               style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)" }}>
            U
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">Unite Group</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FBBF24" }} />
              <span className="text-xs font-medium" style={{ color: "#FBBF24" }}>Empire</span>
            </div>
          </div>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: "#16A34A" }} />
            <h2 className="text-xl font-bold text-white">Password updated</h2>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Your password has been updated. Redirecting to sign in...
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}>
              <ArrowLeft className="h-4 w-4" />
              Go to sign in
            </button>
          </div>
        ) : validToken ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Set a new password</h2>
              <p className="text-sm" style={{ color: "#64748B" }}>
                Create a new secure password for your account.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl p-4 border" style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.25)" }}>
                <p className="text-sm" style={{ color: "#F87171" }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: "#CBD5E1" }}>
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password" type={showPassword ? "text" : "password"} required minLength={6}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-[#334155] border focus:outline-none transition-all"
                    style={{ background: "#0F172A", borderColor: "#1E293B" }}
                    onFocus={e => { e.target.style.borderColor = "#1D4ED8"; }}
                    onBlur={e => { e.target.style.borderColor = "#1E293B"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: "#475569" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#94A3B8")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs" style={{ color: "#475569" }}>At least 6 characters</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{ color: "#CBD5E1" }}>
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword" type={showConfirm ? "text" : "password"} required
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-[#334155] border focus:outline-none transition-all"
                    style={{ background: "#0F172A", borderColor: "#1E293B" }}
                    onFocus={e => { e.target.style.borderColor = "#1D4ED8"; }}
                    onBlur={e => { e.target.style.borderColor = "#1E293B"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: "#475569" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#94A3B8")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</> : <><KeyRound className="h-4 w-4" />Update password</>}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6 rounded-xl p-4 border" style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.25)" }}>
              <p className="text-sm" style={{ color: "#F87171" }}>
                {error ?? "The password reset link is invalid or has expired."}
              </p>
            </div>
            <Link
              href="/reset-password"
              className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}>
              <ArrowLeft className="h-4 w-4" />
              Request a new reset link
            </Link>
          </>
        )}

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "#3B82F6" }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
