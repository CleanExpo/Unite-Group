"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SuccessMark } from "@/components/ui/marks";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number | null; // null = custom pricing
  annualPrice: number | null;
  features: string[];
  cta: string;
  popular?: boolean;
}

interface PricingCardsProps {
  locale: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TIERS: PricingTier[] = [
  {
    name: "Starter",
    description:
      "For small teams getting started with operations management.",
    monthlyPrice: 49,
    annualPrice: 408, // $49 * 10 months (2 months free)
    features: [
      "Up to 5 team members",
      "Basic CRM & job tracking",
      "Client portal access",
      "Email support",
      "Standard reporting",
      "1 GB file storage",
      "Mobile app access",
    ],
    cta: "Get Started",
  },
  {
    name: "Professional",
    description:
      "For growing businesses that need advanced automation and integrations.",
    monthlyPrice: 149,
    annualPrice: 1490, // $149 * 10 months (2 months free)
    features: [
      "Up to 25 team members",
      "Everything in Starter",
      "Advanced CRM with pipelines",
      "Automated workflows & triggers",
      "Custom client portals",
      "Billing & invoicing integration",
      "Priority email & chat support",
      "10 GB file storage",
      "API access",
      "Advanced analytics",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description:
      "For large organizations with custom requirements and dedicated support.",
    monthlyPrice: null,
    annualPrice: null,
    features: [
      "Unlimited team members",
      "Everything in Professional",
      "Custom integrations & API",
      "Dedicated account manager",
      "SSO & advanced security",
      "Custom SLA & uptime guarantee",
      "White-label client portals",
      "Unlimited storage",
      "Audit logs & compliance",
      "On-premise deployment option",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PricingCards({ locale }: PricingCardsProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="w-full">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <span
          className={`text-sm font-medium transition-colors ${
            !isAnnual ? "text-slate-100" : "text-slate-400"
          }`}
        >
          Monthly
        </span>
        <Switch
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
          aria-label="Toggle annual billing"
          className="data-[state=checked]:bg-teal-500"
        />
        <span
          className={`text-sm font-medium transition-colors ${
            isAnnual ? "text-slate-100" : "text-slate-400"
          }`}
        >
          Annual
        </span>
        {isAnnual && (
          <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/10">
            Save 2 months
          </Badge>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={`relative flex flex-col border ${
              tier.popular
                ? "border-teal-500/50 bg-slate-900/80 shadow-lg shadow-teal-500/5"
                : "border-slate-700/50 bg-slate-900/50"
            } transition-all duration-300 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5`}
          >
            {/* Most Popular badge */}
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-teal-500 text-white border-0 px-3 py-1 text-xs font-semibold shadow-md">
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-slate-100">
                {tier.name}
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm leading-relaxed">
                {tier.description}
              </CardDescription>

              {/* Price display */}
              <div className="mt-4">
                {tier.monthlyPrice !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-100">
                      $
                      {isAnnual
                        ? Math.round(tier.annualPrice! / 12)
                        : tier.monthlyPrice}
                    </span>
                    <span className="text-slate-400 text-sm">/month</span>
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-slate-100">
                      Custom
                    </span>
                  </div>
                )}
                {isAnnual && tier.annualPrice !== null && (
                  <p className="text-teal-400 text-xs mt-1">
                    ${tier.annualPrice}/year (2 months free)
                  </p>
                )}
                {!isAnnual && tier.monthlyPrice !== null && (
                  <p className="text-slate-500 text-xs mt-1">
                    Billed monthly
                  </p>
                )}
                {!isAnnual && tier.monthlyPrice === null && (
                  <p className="text-slate-500 text-xs mt-1">
                    Tailored to your needs
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <SuccessMark className="text-teal-400 mt-0.5 shrink-0" size={16} />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                asChild
                className={`w-full ${
                  tier.popular
                    ? "bg-teal-500 hover:bg-teal-600 text-white border-0"
                    : "bg-transparent border border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-100"
                }`}
                size="lg"
              >
                <Link href={`/${locale}/register`}>{tier.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
