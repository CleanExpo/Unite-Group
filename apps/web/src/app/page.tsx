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
  title: "Unite Group | Video business cards that open on your logo",
  description:
    "Unite Group makes video business cards: one link or QR code that plays a short film, then shows your details. Online business serving Australia and New Zealand.",
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
