"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SuccessMark } from "@/components/ui/marks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── Plan definitions ──────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  priceId: string; // Stripe Price ID
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For small teams getting started.",
    monthlyPrice: 49,
    annualPrice: 408,
    priceId: "price_starter_monthly",
    features: [
      "Up to 5 team members",
      "Basic CRM & job tracking",
      "Client portal access",
      "Email support",
      "1 GB storage",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Advanced automation & integrations.",
    monthlyPrice: 149,
    annualPrice: 1490,
    priceId: "price_professional_monthly",
    features: [
      "Up to 25 team members",
      "Advanced CRM with pipelines",
      "Automated workflows",
      "Custom client portals",
      "Billing integration",
      "10 GB storage",
      "API access",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom requirements & dedicated support.",
    monthlyPrice: null,
    annualPrice: null,
    priceId: "price_enterprise_monthly",
    features: [
      "Unlimited team members",
      "Everything in Professional",
      "Custom integrations & API",
      "Dedicated account manager",
      "SSO & advanced security",
      "Unlimited storage",
      "24/7 phone support",
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface BillingPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanId: string;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingPlanModal({
  open,
  onOpenChange,
  currentPlanId,
  onSuccess,
}: BillingPlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSelectPlan() {
    if (!selectedPlan) return;

    setIsSubmitting(true);
    try {
      const plan = PLANS.find((p) => p.id === selectedPlan);
      if (!plan) return;

      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to change plan");
      }

      toast.success("Plan updated", {
        description: `You are now on the ${plan.name} plan.`,
      });
      onSuccess();
      onOpenChange(false);
      setSelectedPlan(null);
    } catch (err: any) {
      toast.error("Failed to change plan", {
        description: err.message ?? "Please try again or contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-100">
            Change Your Plan
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select a plan that best fits your needs. Changes take effect
            immediately with prorated billing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isSelected = plan.id === selectedPlan;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col cursor-pointer transition-all border ${
                  isSelected
                    ? "border-teal-500 bg-slate-800/80 shadow-md shadow-teal-500/10"
                    : isCurrent
                    ? "border-teal-500/30 bg-slate-800/40"
                    : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600"
                }`}
                onClick={() => !isCurrent && setSelectedPlan(plan.id)}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2 pt-5">
                  <CardTitle className="text-lg text-slate-100">
                    {plan.name}
                  </CardTitle>
                  <p className="text-xs text-slate-400">{plan.description}</p>

                  <div className="mt-3">
                    {plan.monthlyPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-100">
                          ${plan.monthlyPrice}
                        </span>
                        <span className="text-slate-400 text-xs">/month</span>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold text-slate-100">
                        Custom
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pt-0">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <SuccessMark
                          className="text-teal-400 mt-0.5 shrink-0"
                          size={14}
                        />
                        <span className="text-xs text-slate-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedPlan(null);
            }}
            disabled={isSubmitting}
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelectPlan}
            disabled={!selectedPlan || isSubmitting}
            className="bg-teal-500 hover:bg-teal-600 text-white border-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Switch Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
