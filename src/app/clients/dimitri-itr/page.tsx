// src/app/clients/dimitri-itr/page.tsx
// UNI-1947 Pillar 2: Server component that loads portal_content from
// nexus_clients via getPortalContent and hands it to the client UI.
// All hardcoded DELIVERABLES / TOUCHPOINTS arrays have been removed —
// content lives in the DB now and seeds via 20260513170200_seed_portal_content.sql.

import { getPortalContent } from "@/lib/branding/getPortalContent";
import DimitriPortalClient from "./DimitriPortalClient";

export const dynamic = "force-dynamic";

export default async function DimitriItrPortalPage() {
  const row = await getPortalContent("dimitri-itr");
  // Pass an empty PortalContent when the row is missing — the client
  // component renders EmptyState tiles rather than crashing.
  const initialContent = row?.portal_content ?? {};
  return <DimitriPortalClient initialContent={initialContent} />;
}
