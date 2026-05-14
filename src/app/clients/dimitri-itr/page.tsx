// src/app/clients/dimitri-itr/page.tsx
// Server component — loads portal_content from nexus_clients and dispatches
// to the right portal renderer based on schema_version:
//
//   - schema_version === "hour1-v1"  → HourOnePortal (CMO 6-section template,
//                                       populated by the swarm provisioner)
//   - anything else                  → DimitriPortalClient (legacy Duncan view,
//                                       deliverables/touchpoints/quick-links)
//
// The Hour-1 template fires automatically when the swarm provisioner runs
// (after Duncan's deposit clears). Pre-provisioning, the existing legacy
// portal continues to render — non-destructive rollout.

import type { Metadata } from "next";
import { getPortalContent } from "@/lib/branding/getPortalContent";
import DimitriPortalClient from "./DimitriPortalClient";
import HourOnePortal from "@/components/clients/HourOnePortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dimitri ITR Portal",
  description: "Duncan Perkins — Dimitri ITR Platform engagement portal at Unite-Group.",
};

export default async function DimitriItrPortalPage() {
  const row = await getPortalContent("dimitri-itr");
  const initialContent = (row?.portal_content ?? {}) as Record<string, any>;

  if (initialContent.schema_version === "hour1-v1") {
    return (
      <HourOnePortal
        slug="dimitri-itr"
        clientName="Duncan Perkins — Home Loan Essentials"
        content={initialContent as any}
      />
    );
  }

  // Legacy: pass through to the pre-Hour-1 Duncan view.
  return <DimitriPortalClient initialContent={initialContent} />;
}
