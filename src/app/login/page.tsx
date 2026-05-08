"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/en/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#1D4ED8] rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">U</span>
        </div>
        <div>
          <div className="text-white font-bold text-xl leading-tight">Unite Group</div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse inline-block" />
            <span className="text-[#FBBF24] text-xs font-medium">Empire</span>
          </div>
        </div>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-[#1E293B] border border-[#334155] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-8 pt-8 pb-2">
          <h1 className="text-[#F8FAFC] text-2xl font-bold mb-1">Sign in to the Empire</h1>
          <p className="text-[#94A3B8] text-sm">
            Connected service for the field.
          </p>
        </div>

        <div className="px-8 py-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-[#DC2626] mt-0.5 shrink-0" />
              <p className="text-[#DC2626] text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-[#F8FAFC]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] placeholder-[#475569] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#F8FAFC]">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D4ED8] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#3B82F6] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <div className="px-8 py-4 border-t border-[#334155] flex justify-center">
          <p className="text-sm text-[#94A3B8]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#3B82F6] hover:text-[#60A5FA] font-medium transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
