"use client";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

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

        {!success ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Reset your password</h2>
              <p className="text-sm" style={{ color: "#64748B" }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl p-4 border" style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.25)" }}>
                <p className="text-sm" style={{ color: "#F87171" }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium" style={{ color: "#CBD5E1" }}>
                  Email address
                </label>
                <input
                  id="email" type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#334155] border focus:outline-none transition-all"
                  style={{ background: "#0F172A", borderColor: "#1E293B" }}
                  onFocus={e => { e.target.style.borderColor = "#1D4ED8"; }}
                  onBlur={e => { e.target.style.borderColor = "#1E293B"; }}
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : <><Mail className="h-4 w-4" />Send reset link</>}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: "#16A34A" }} />
            <h2 className="text-xl font-bold text-white">Check your email</h2>
            <p className="text-sm" style={{ color: "#64748B" }}>
              A password reset link has been sent to <span className="text-white font-medium">{email}</span>
            </p>
          </div>
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
