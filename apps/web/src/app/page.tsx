import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { serializeJsonLd } from "@/app/grow/packages";
import { PublicHome } from "@/components/public/public-home";
import { entityJsonLd } from "@/lib/entity";
import { SITE_URL } from "@/lib/public-site";

// Auth redirect — must render at request time, not build time
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Unite Group | Every business. One system.",
  description:
    "Unite-Group Nexus is the CRM and operating system we are building to run the businesses behind it, from Disaster Recovery and NRPG to CARSI, RestoreAssist and Trade Hall. Online business serving Australia and New Zealand.",
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
};

export default async function RootPage() {
  const user = await getUser();

  if (user) {
    redirect("/founder/command-centre");
  }

  // Signed-out visitors see the public home; the founder's sign-in is its small footer link.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(entityJsonLd()) }} />
      <PublicHome />
    </>
  );
}
