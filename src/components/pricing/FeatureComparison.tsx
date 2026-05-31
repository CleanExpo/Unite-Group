import { Fragment } from "react";
import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureValue = boolean | string;

interface FeatureRow {
  feature: string;
  starter: FeatureValue;
  professional: FeatureValue;
  enterprise: FeatureValue;
}

interface FeatureCategory {
  category: string;
  features: FeatureRow[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    category: "Core Platform",
    features: [
      { feature: "Team members", starter: "Up to 5", professional: "Up to 25", enterprise: "Unlimited" },
      { feature: "Job tracking", starter: true, professional: true, enterprise: true },
      { feature: "Client portal", starter: "Basic", professional: "Custom", enterprise: "White-label" },
      { feature: "File storage", starter: "1 GB", professional: "10 GB", enterprise: "Unlimited" },
      { feature: "Mobile app", starter: true, professional: true, enterprise: true },
    ],
  },
  {
    category: "CRM & Sales",
    features: [
      { feature: "Contact management", starter: true, professional: true, enterprise: true },
      { feature: "Sales pipelines", starter: false, professional: true, enterprise: true },
      { feature: "Automated workflows", starter: false, professional: true, enterprise: true },
      { feature: "Custom fields", starter: false, professional: "10 fields", enterprise: "Unlimited" },
      { feature: "Lead scoring", starter: false, professional: true, enterprise: true },
    ],
  },
  {
    category: "Billing & Finance",
    features: [
      { feature: "Invoicing", starter: false, professional: true, enterprise: true },
      { feature: "Payment processing", starter: false, professional: true, enterprise: true },
      { feature: "Recurring billing", starter: false, professional: true, enterprise: true },
      { feature: "Financial reports", starter: "Basic", professional: "Advanced", enterprise: "Custom" },
      { feature: "Tax management", starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: "Integrations & API",
    features: [
      { feature: "API access", starter: false, professional: true, enterprise: true },
      { feature: "Webhooks", starter: false, professional: true, enterprise: true },
      { feature: "Zapier integration", starter: true, professional: true, enterprise: true },
      { feature: "Custom integrations", starter: false, professional: false, enterprise: true },
      { feature: "SSO / SAML", starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: "Security & Compliance",
    features: [
      { feature: "Two-factor auth", starter: true, professional: true, enterprise: true },
      { feature: "Role-based access", starter: "Basic", professional: "Advanced", enterprise: "Custom" },
      { feature: "Audit logs", starter: false, professional: "90 days", enterprise: "Unlimited" },
      { feature: "Data encryption", starter: true, professional: true, enterprise: true },
      { feature: "Compliance reports", starter: false, professional: false, enterprise: true },
      { feature: "SLA guarantee", starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: "Support",
    features: [
      { feature: "Email support", starter: true, professional: true, enterprise: true },
      { feature: "Chat support", starter: false, professional: true, enterprise: true },
      { feature: "Phone support", starter: false, professional: false, enterprise: true },
      { feature: "Dedicated account manager", starter: false, professional: false, enterprise: true },
      { feature: "Onboarding assistance", starter: false, professional: true, enterprise: true },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FeatureCell({ value }: { value: FeatureValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-teal-400 mx-auto" />
    ) : (
      <X className="h-4 w-4 text-slate-600 mx-auto" />
    );
  }
  return <span className="text-sm text-slate-300">{value}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeatureComparison() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Compare Plans
        </h2>
        <p className="text-slate-400">
          See which plan is right for your team
        </p>
      </div>

      <div className="border border-slate-700/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700/50 hover:bg-transparent">
              <TableHead className="text-slate-100 font-semibold w-[280px]">
                Feature
              </TableHead>
              <TableHead className="text-center text-slate-100 font-semibold">
                Starter
              </TableHead>
              <TableHead className="text-center text-teal-400 font-semibold">
                Professional
              </TableHead>
              <TableHead className="text-center text-slate-100 font-semibold">
                Enterprise
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURE_CATEGORIES.map((category) => (
              <Fragment key={category.category}>
                {/* Category header row */}
                <TableRow
                  className="bg-slate-800/30 hover:bg-slate-800/30"
                >
                  <TableCell
                    colSpan={4}
                    className="font-semibold text-slate-200 text-sm uppercase tracking-wider py-2"
                  >
                    {category.category}
                  </TableCell>
                </TableRow>

                {/* Feature rows */}
                {category.features.map((row) => (
                  <TableRow
                    key={row.feature}
                    className="border-slate-700/30"
                  >
                    <TableCell className="text-slate-300 text-sm">
                      {row.feature}
                    </TableCell>
                    <TableCell className="text-center">
                      <FeatureCell value={row.starter} />
                    </TableCell>
                    <TableCell className="text-center bg-teal-500/[0.03]">
                      <FeatureCell value={row.professional} />
                    </TableCell>
                    <TableCell className="text-center">
                      <FeatureCell value={row.enterprise} />
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
