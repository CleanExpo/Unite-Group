"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Loader2, LogIn, AlertCircle, TrendingUp, Shield, Zap, Eye, EyeOff } from "lucide-react";

const BUSINESSES = [
  { name: "RestoreAssist", color: "#0E7C7B", status: "BUILDING" },
  { name: "Synthex",       color: "#6366F1", status: "OPERATIONAL" },
  { name: "CCW-CRM",       color: "#D62828", status: "OPERATIONAL" },
  { name: "DR Platform",   color: "#1D4ED8", status: "OPERATIONAL" },
  { name: "NRPG",          color: "#16A34A", status: "BUILDING" },
  { name: "CARSI",         color: "#D97706", status: "OPERATIONAL" },
];

const STATS = [
  { icon: TrendingUp, value: "6", label: "Businesses" },
  { icon: Zap,        value: "4",  label: "AI Agents" },
  { icon: Shield,     value: "40", label: "Assets" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel: Brand Hero ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 relative flex-col justify-between p-10 overflow-hidden"
           style={{ background: "#111113" }}>

        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: "linear-gradient(#FBBF24 1px, transparent 1px), linear-gradient(90deg, #FBBF24 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Glow */}
        <div className="absolute top-1/4 -left-24 w-72 h-72 rounded-full blur-[120px] opacity-20"
             style={{ background: "#1D4ED8" }} />
        <div className="absolute bottom-1/3 right-0 w-56 h-56 rounded-full blur-[100px] opacity-15"
             style={{ background: "#FBBF24" }} />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white"
                 style={{ background: "#1d4ed8" }}>
              U
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">Unite Group</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FBBF24" }} />
                <span className="text-xs font-medium" style={{ color: "#FBBF24" }}>Empire Command Center</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] mb-4">
              The autonomous<br />
              <span style={{ color: "#FBBF24" }}>empire</span> runs here.
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "#64748B" }}>
              Six businesses. One command center. AI agents working 24/7 so you can focus on what matters.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-6">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-4 h-4 shrink-0" style={{ color: "#FBBF24" }} />
                <div>
                  <div className="text-xl font-bold text-white leading-none">{value}</div>
                  <div className="text-xs" style={{ color: "#475569" }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Business status grid */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#334155" }}>
              Portfolio Status
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESSES.map(biz => (
                <div key={biz.name}
                     className="flex items-center gap-2 rounded-lg px-3 py-2 border"
                     style={{ background: "rgba(30,41,59,0.6)", borderColor: "#27272a" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: biz.color }} />
                  <span className="text-xs font-medium truncate" style={{ color: "#94A3B8" }}>{biz.name}</span>
                  <span className="ml-auto text-[9px] font-semibold" style={{
                    color: biz.status === "OPERATIONAL" ? "#16A34A" : "#3B82F6"
                  }}>
                    {biz.status === "OPERATIONAL" ? "●" : "◐"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-xs" style={{ color: "#27272a" }}>
            © 2026 Unite Group. All systems operational.
          </p>
        </div>
      </div>

      {/* ── Right Panel: Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10"
           style={{ background: "#09090b" }}>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white"
               style={{ background: "#1d4ed8" }}>
            U
          </div>
          <div className="text-white font-bold">Unite Group</div>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: "-0.03em" }}>Welcome back</h2>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Sign in to your empire command center
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl p-4 border"
                 style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.25)" }}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#DC2626" }} />
              <p className="text-sm" style={{ color: "#F87171" }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium" style={{ color: "#CBD5E1" }}>
                Email address
              </label>
              <input
                id="email" type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#334155] border focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: "#111113",
                  borderColor: "#27272a",
                  ["--tw-ring-color" as any]: "#1D4ED8",
                }}
                onFocus={e => { e.target.style.borderColor = "#1D4ED8"; }}
                onBlur={e => { e.target.style.borderColor = "#27272a"; }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: "#CBD5E1" }}>
                  Password
                </label>
                <Link href="/reset-password" className="text-xs transition-colors"
                      style={{ color: "#3B82F6" }}
                      onMouseEnter={e => (e.target as HTMLAnchorElement).style.color = "#60A5FA"}
                      onMouseLeave={e => (e.target as HTMLAnchorElement).style.color = "#3B82F6"}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-[#334155] border focus:outline-none transition-all"
                  style={{ background: "#111113", borderColor: "#27272a" }}
                  onFocus={e => { e.target.style.borderColor = "#1D4ED8"; }}
                  onBlur={e => { e.target.style.borderColor = "#27272a"; }}
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
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: "#1d4ed8" }}
              onMouseEnter={e => !loading && ((e.target as HTMLButtonElement).style.background = "#3b82f6")}
              onMouseLeave={e => !loading && ((e.target as HTMLButtonElement).style.background = "#1d4ed8")}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Signing in...</>
              ) : (
                <><LogIn className="h-4 w-4" />Sign in</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: "#27272a" }} />
            <span className="text-xs" style={{ color: "#334155" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "#27272a" }} />
          </div>

          {/* Create account */}
          <p className="text-center text-sm" style={{ color: "#475569" }}>
            Need access?{" "}
            <Link href="/register"
                  className="font-medium transition-colors"
                  style={{ color: "#3B82F6" }}>
              Request an account
            </Link>
          </p>
        </div>

        {/* Bottom badge */}
        <div className="mt-12 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#16A34A" }} />
          <span className="text-xs" style={{ color: "#27272a" }}>All systems operational</span>
        </div>
      </div>
    </div>
  );
}
