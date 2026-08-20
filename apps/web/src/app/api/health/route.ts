import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { captureApiError } from "@/lib/error-reporting";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { isGoogleConfigured } from "@/lib/integrations/google-oauth";
import { isXeroConfigured } from "@/lib/integrations/xero/client";
import { SOCIAL_PLATFORMS, isPlatformConfigured } from "@/lib/integrations/social";

export const dynamic = "force-dynamic";

// Error codes that prove Postgres received the query and replied. Any of these
// means the connection is healthy, whatever the answer was.
//   PGRST116 — PostgREST: zero rows matched (table reachable, simply empty)
//   42501    — Postgres:  permission denied (the server evaluated grants and said no)
// Anything else, or a thrown exception, is treated as unreachable.
const DB_ANSWERED_CODES = new Set(["PGRST116", "42501"]);

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

    // Ping Supabase. This is a *connection* probe, so the question is only ever
    // "did Postgres answer?" — not "was the answer permissive?".
    //
    // `nexus_pages` is owner-scoped and, along with the other nine `nexus_*`
    // tables, is one of only 10 tables out of 1,771 that deliberately withhold
    // the SELECT grant from `anon`. This route uses an anonymous client, so the
    // probe could never succeed: Postgres returns 42501 before RLS is consulted.
    // Treating that as a connection failure pinned /api/health at a permanent
    // 503 and made the endpoint useless to the uptime monitors it exists for.
    //
    // A definitive Postgres/PostgREST error code proves the round trip
    // completed. Only transport, DNS, TLS or auth failures — which surface as a
    // thrown exception or an uncoded error — mean the database is unreachable.
    const { error } = await supabase
      .from("nexus_pages")
      .select("id")
      .limit(1)
      .maybeSingle();

    connections.supabase =
      !error || DB_ANSWERED_CODES.has(error.code ?? "") ? "ok" : "error";
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
