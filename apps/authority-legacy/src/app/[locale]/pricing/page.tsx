// src/app/[locale]/pricing/page.tsx
// Public pricing page for Unite-Hub SaaS offering.
// Showcases 3 tiers (Starter/Professional/Enterprise) with a feature
// comparison table and FAQ section. Uses the slate-900 dark theme
// with teal/cyan accents per the SaaS design system spec.

import type { Metadata } from "next";
import Link from "next/link";
import {
  PricingCards,
  FeatureComparison,
  PricingFaq,
} from "@/components/pricing";
import { Button } from "@/components/ui/button";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Pricing — Unite-Hub",
  description:
    "Simple, transparent pricing for Unite-Hub. Start free, scale as you grow. CRM, automation, client portals, and billing — everything your operations team needs.",
};

export const dynamic = "force-static";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* ─── Hero Section ───────────────────────────────────────────── */}
        <section className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-teal-400 font-semibold text-sm uppercase tracking-wider mb-3">
              Pricing
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 mb-4">
              Plans that scale with your business
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Start with what you need. Upgrade as you grow. No hidden fees,
              no surprises. Every plan includes core CRM, job tracking, and
              mobile access.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-slate-200"
              >
                <Link href={`/${locale}`}>← Back to Home</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Pricing Cards ──────────────────────────────────────────── */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <PricingCards locale={locale} />
        </section>

        {/* ─── Trust indicators ───────────────────────────────────────── */}
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-teal-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              SOC 2 Type II
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-teal-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              AES-256 Encryption
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-teal-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Secure Payments via Stripe
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-teal-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              99.9% Uptime SLA
            </div>
          </div>
        </section>

        {/* ─── Divider ────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <hr className="border-slate-800" />
        </div>

        {/* ─── Feature Comparison ─────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <FeatureComparison />
        </section>

        {/* ─── Divider ────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <hr className="border-slate-800" />
        </div>

        {/* ─── FAQ ────────────────────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <PricingFaq />
        </section>

        {/* ─── Bottom CTA ─────────────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 mb-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-slate-900 to-slate-900/80 p-10 shadow-lg shadow-teal-500/5">
              <h2 className="text-2xl font-bold text-slate-100 mb-3">
                Ready to streamline your operations?
              </h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Join hundreds of businesses using Unite-Hub to manage their
                teams, clients, and projects in one place. Start your free trial
                today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-teal-500 hover:bg-teal-600 text-white border-0 min-w-[160px]"
                >
                  <Link href={`/${locale}/register`}>Start Free Trial</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-100 min-w-[160px]"
                >
                  <Link href={`/${locale}/contact`}>Talk to Sales</Link>
                </Button>
              </div>
              <p className="text-slate-500 text-xs mt-4">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
