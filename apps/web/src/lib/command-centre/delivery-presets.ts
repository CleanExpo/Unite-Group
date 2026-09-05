import type { DeliveryPreset } from "./delivery-types";

export const DELIVERY_PRESETS: readonly DeliveryPreset[] = [
  {
    id: "customer-portal",
    version: 1,
    label: "Customer portal",
    description: "Give customers a secure place to see their work.",
    requirements: [
      "Provide an authenticated customer workspace scoped to the intended customer.",
    ],
    acceptanceCriteria: [
      "A customer can access their own records and cannot access another customer’s records.",
    ],
    dependencies: ["access-control"],
    availability: "new_work",
    implementationRef: "apps/web/src/lib/supabase",
  },
  {
    id: "access-control",
    version: 1,
    label: "Secure access",
    description: "Keep access limited to the right people.",
    requirements: [
      "Reuse existing authentication and enforce record ownership on the server.",
    ],
    acceptanceCriteria: [
      "Unauthenticated and unauthorised requests are refused without exposing private records.",
    ],
    dependencies: [],
    availability: "ready_to_reuse",
    implementationRef: "apps/web/src/lib/supabase/server.ts",
  },
  {
    id: "approvals",
    version: 1,
    label: "Review & approval",
    description: "Let the right person review before consequential actions.",
    requirements: [
      "Bind approval to the exact item version and show what the decision authorises.",
    ],
    acceptanceCriteria: [
      "Editing an approved item invalidates its earlier approval.",
    ],
    dependencies: ["access-control", "audit-history"],
    availability: "ready_to_reuse",
    implementationRef: "apps/web/src/lib/command-centre/approvals.ts",
  },
  {
    id: "reporting",
    version: 1,
    label: "Reporting",
    description: "Show business results with clear sources.",
    requirements: [
      "Display relevant metrics with source, observation time and honest unavailable states.",
    ],
    acceptanceCriteria: [
      "A disconnected source displays unavailable rather than invented or zero values.",
    ],
    dependencies: [],
    availability: "new_work",
    implementationRef: "apps/web/src/lib/command-centre/verified-snapshot.ts",
  },
  {
    id: "payments",
    version: 1,
    label: "Payments",
    description: "Include a payment journey and its connection requirements.",
    requirements: [
      "Use the project’s existing payment integration and keep payment credentials on the server.",
    ],
    acceptanceCriteria: [
      "Payment success is confirmed by the provider, and an unavailable provider cannot appear paid.",
    ],
    dependencies: ["access-control", "audit-history"],
    availability: "needs_connection",
    implementationRef: "apps/web/src/lib/integrations",
  },
  {
    id: "audit-history",
    version: 1,
    label: "Activity history",
    description: "Keep a trace of decisions and meaningful changes.",
    requirements: [
      "Record actor, item version, timestamp and outcome for consequential changes.",
    ],
    acceptanceCriteria: [
      "A saved change has a retrievable activity record linked to the correct item.",
    ],
    dependencies: [],
    availability: "ready_to_reuse",
    implementationRef: "apps/web/src/lib/command-centre/tasks.ts",
  },
];

export function resolveDeliveryPresets(
  ids: readonly string[],
): DeliveryPreset[] {
  const found = new Map<string, DeliveryPreset>();
  function include(id: string) {
    if (found.has(id)) return;
    const preset = DELIVERY_PRESETS.find((entry) => entry.id === id);
    if (!preset) throw new Error(`Unknown preset: ${id}`);
    found.set(id, preset);
    preset.dependencies.forEach(include);
  }
  ids.forEach(include);
  return [...found.values()].sort((a, b) => a.id.localeCompare(b.id));
}
