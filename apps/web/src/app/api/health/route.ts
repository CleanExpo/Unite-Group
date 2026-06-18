import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { captureApiError } from "@/lib/error-reporting";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { isGoogleConfigured } from "@/lib/integrations/google-oauth";
import { isXeroConfigured } from "@/lib/integrations/xero/client";
import { SOCIAL_PLATFORMS, isPlatformConfigured } from "@/lib/integrations/social";

export const dynamic = "force-dynamic";

// Provider OAuth *config* presence — booleans/keys only, never secrets. Lets the
// operator verify "is GOOGLE_CLIENT_ID / XERO_CLIENT_* / social creds set?" in one
// unauthenticated call (mirrors the existing /api/health/google check). Does NOT
// indicate whether a token is connected — that needs an authenticated session.
function integrationConfig() {
  return {
    google: isGoogleConfigured(),
    xero: isXeroConfigured(),
    social: SOCIAL_PLATFORMS.filter((p) => isPlatformConfigured(p.key)).map((p) => p.key),
  };
}

export async function GET() {
  const connections: Record<string, string> = {};

  try {
    if (!hasSupabaseConfig()) {
      connections.supabase = "error";
      return NextResponse.json(
        {
          status: "degraded",
          timestamp: new Date().toISOString(),
          connections,
        },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Route handlers cannot set cookies — expected
            }
          },
        },
      }
    );

    // Ping Supabase — PGRST116 = table exists but empty (connection is fine)
    const { error } = await supabase
      .from("nexus_pages")
      .select("id")
      .limit(1)
      .maybeSingle();

    connections.supabase =
      !error || error.code === "PGRST116" ? "ok" : "error";
  } catch (error) {
    captureApiError(error, { route: '/api/health', method: 'GET' });
    connections.supabase = "error";
  }

  const allOk = Object.values(connections).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      connections,
      // Informational only — integration config does not affect overall status
      // (these providers are optional).
      integrations: integrationConfig(),
    },
    { status: allOk ? 200 : 503 }
  );
}
