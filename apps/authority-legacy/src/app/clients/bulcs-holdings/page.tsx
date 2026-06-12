// src/app/clients/bulcs-holdings/page.tsx
// UNI-1947 Pillar 2: Server component — loads portal_content for
// bulcs-holdings and hands it to the client portal UI. Hardcoded
// DELIVERABLES / DIVISIONS arrays are gone; they live in
// nexus_clients.portal_content now.

import type { Metadata } from "next";
import { getPortalContent } from "@/lib/branding/getPortalContent";
import BulcsHoldingsPortalClient from "./BulcsHoldingsPortalClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bulcs Holdings Portal",
  description: "Bulcs Holdings client portal — agency deliverables and division overview.",
};

export default async function BulcsHoldingsPortalPage() {
  const row = await getPortalContent("bulcs-holdings");
  const initialContent = row?.portal_content ?? {};
  return <BulcsHoldingsPortalClient initialContent={initialContent} />;
}
