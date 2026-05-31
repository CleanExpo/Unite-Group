"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Crown,
  Database,
  Loader2,
  Users,
  Zap,
} from "lucide-react";
import { BillingPlanModal } from "@/components/billing/BillingPlanModal";
import { CancelConfirmDialog } from "@/components/billing/CancelConfirmDialog";
import { toast } from "sonner";

// ── Mock data types & values ──────────────────────────────────────────────────

interface UsageMetric {
  label: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
  unit: string;
}

interface BillingHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  invoiceUrl: string;
}

interface SubscriptionInfo {
  planId: string;
  planName: string;
  period: "monthly" | "annual";
  nextBillingDate: string;
  amount: string;
  status: "active" | "cancelling" | "past_due";
}

// Mock subscription data — will be replaced with real Supabase/Stripe queries
const MOCK_SUBSCRIPTION: SubscriptionInfo = {
  planId: "professional",
  planName: "Professional",
  period: "monthly",
  nextBillingDate: "2026-07-01",
  amount: "$149",
  status: "active",
};

const MOCK_USAGE: UsageMetric[] = [
  {
    label: "API Calls",
    icon: <Zap className="h-4 w-4" />,
    current: 8432,
    limit: 25000,
    unit: "calls",
  },
  {
    label: "Storage",
    icon: <Database className="h-4 w-4" />,
    current: 4.2,
    limit: 10,
    unit: "GB",
  },
  {
    label: "Team Members",
    icon: <Users className="h-4 w-4" />,
    current: 8,
    limit: 25,
    unit: "seats",
  },
];

const MOCK_HISTORY: BillingHistoryItem[] = [
  {
    id: "inv_001",
    date: "2026-06-01",
    description: "Professional Plan — Monthly",
    amount: "$149.00",
    status: "paid",
    invoiceUrl: "#",
  },
  {
    id: "inv_002",
    date: "2026-05-01",
    description: "Professional Plan — Monthly",
    amount: "$149.00",
    status: "paid",
    invoiceUrl: "#",
  },
  {
    id: "inv_003",
    date: "2026-04-01",
    description: "Professional Plan — Monthly",
    amount: "$149.00",
    status: "paid",
    invoiceUrl: "#",
  },
  {
    id: "inv_004",
    date: "2026-03-01",
    description: "Professional Plan — Monthly",
    amount: "$149.00",
    status: "paid",
    invoiceUrl: "#",
  },
  {
    id: "inv_005",
    date: "2026-02-01",
    description: "Professional Plan — Monthly",
    amount: "$149.00",
    status: "paid",
    invoiceUrl: "#",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProgressColor(pct: number): string {
  if (pct >= 85) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-teal-500";
}

function formatUsage(current: number, unit: string): string {
  if (unit === "GB") return `${current} ${unit}`;
  return current.toLocaleString();
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState(MOCK_SUBSCRIPTION);

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open portal");
      window.location.href = data.url;
    } catch (err: any) {
      toast.error("Failed to open billing portal", {
        description: err.message ?? "Please try again.",
      });
      setPortalLoading(false);
    }
  }

  function handlePlanChanged() {
    // In production, re-fetch subscription from API
    setSubscription((prev) => ({ ...prev }));
  }

  function handleSubscriptionCancelled() {
    setSubscription((prev) => ({
      ...prev,
      status: "cancelling",
    }));
  }

  const nextBillingFormatted = new Date(
    subscription.nextBillingDate
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <Link
          href="#"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">
              Billing & Subscription
            </h1>
            <p className="text-slate-400 mt-1">
              Manage your plan, usage, and payment details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {subscription.status === "active" && (
              <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/10">
                Active
              </Badge>
            )}
            {subscription.status === "cancelling" && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10">
                Cancelling
              </Badge>
            )}
            {subscription.status === "past_due" && (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/10">
                Past Due
              </Badge>
            )}
          </div>
        </div>

        {/* ── Current Plan Card ─────────────────────────────────── */}
        <Card className="border-slate-700/50 bg-slate-900/50 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <Crown className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-100">
                    {subscription.planName}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Billed {subscription.period} — {subscription.amount}/
                    {subscription.period === "monthly" ? "mo" : "yr"}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="h-4 w-4 text-slate-500" />
                Next billing date:{" "}
                <span className="text-slate-200 font-medium">
                  {nextBillingFormatted}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setPlanModalOpen(true)}
                  className="bg-teal-500 hover:bg-teal-600 text-white border-0"
                >
                  Change Plan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  className="border-slate-600 text-slate-200 hover:bg-slate-800"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-1.5" />
                  )}
                  Update Payment
                </Button>
                {subscription.status === "active" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Usage Metrics ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {MOCK_USAGE.map((metric) => {
            const pct = Math.round((metric.current / metric.limit) * 100);
            return (
              <Card
                key={metric.label}
                className="border-slate-700/50 bg-slate-900/50"
              >
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{metric.icon}</span>
                      <span className="text-sm font-medium text-slate-300">
                        {metric.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2 bg-slate-800"
                    style={
                      {
                        "--progress-bg": getProgressColor(pct),
                      } as React.CSSProperties
                    }
                  />
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-slate-400">
                      {formatUsage(metric.current, metric.unit)} used
                    </span>
                    <span className="text-slate-500">
                      {formatUsage(metric.limit, metric.unit)} limit
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Billing History ───────────────────────────────────── */}
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">
              Billing History
            </CardTitle>
            <CardDescription className="text-slate-400">
              Recent invoices and payment records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Description</TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Invoice
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_HISTORY.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-slate-700/30 hover:bg-slate-800/30"
                  >
                    <TableCell className="text-slate-300">
                      {new Date(item.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-slate-200 text-right font-medium">
                      {item.amount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          item.status === "paid"
                            ? "border-teal-500/30 text-teal-400 bg-teal-500/5"
                            : item.status === "pending"
                            ? "border-amber-500/30 text-amber-400 bg-amber-500/5"
                            : "border-red-500/30 text-red-400 bg-red-500/5"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-slate-400 hover:text-teal-400 h-7 px-2 text-xs"
                      >
                        <Link href={item.invoiceUrl}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Modals ────────────────────────────────────────────── */}
        <BillingPlanModal
          open={planModalOpen}
          onOpenChange={setPlanModalOpen}
          currentPlanId={subscription.planId}
          onSuccess={handlePlanChanged}
        />
        <CancelConfirmDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          currentPlanName={subscription.planName}
          onSuccess={handleSubscriptionCancelled}
        />
      </div>
    </main>
  );
}
