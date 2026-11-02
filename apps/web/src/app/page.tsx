import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { hasPrivateAccess } from "@/lib/auth/private-access";
import { serializeJsonLd } from "@/app/grow/packages";
import { PublicHome } from "@/public/home/public-home";
import { entityJsonLd } from "@/lib/entity";
import { SITE_URL } from "@/lib/public-site";

// Auth redirect — must render at request time, not build time
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Unite Group | Living business cards & growth for Australian businesses",
  description:
    "Living business cards, Starter plans and email signatures for businesses in Australia and New Zealand. One system to be found, impress and convert — with Margot as your AI guide.",
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Unite Group | Every business. One system.",
    description: "Living business cards and clear growth paths for Australian businesses.",
    url: SITE_URL,
  },
};

export default async function RootPage() {
  const user = await getUser();

  if (user) {
    // The founder goes to the command centre. Any other signed-in user is a business owner (or wants to be one):
    // the founder area would only refuse them, so send them to their portal, which decides what they can see.
    redirect(hasPrivateAccess(user) ? "/founder/command-centre" : "/portal");
  }

  // Signed-out visitors see the public home; the founder's sign-in is its small footer link.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(entityJsonLd()) }} />
      <PublicHome />
    </>
  );
}
