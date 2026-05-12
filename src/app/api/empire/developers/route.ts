import { NextResponse } from "next/server";
import { listDevelopers, buildSnapshot } from "@/lib/developers/repository";

export const runtime = "nodejs";

if (!process.env.PI_CEO_API_KEY) {
  console.warn(
    "[empire/developers] PI_CEO_API_KEY is not set — all requests will 401",
  );
}

// Auth path mirrors /api/empire/integrations — static `PI_CEO_API_KEY` compare.
// The `@/lib/auth/admin-jwt` helper does not yet exist (Plan 1 follow-up);
// swap to it when JWT lands.
function isAuthorized(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.PI_CEO_API_KEY ?? "";
  if (!expected) return false;
  return token === expected;
}

export async function GET(req: Request) {
  const auth = req.headers.get("x-admin-token");
  if (!isAuthorized(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await listDevelopers();
  const snapshots = await Promise.all(profiles.map((p) => buildSnapshot(p)));
  return NextResponse.json(
    { developers: snapshots },
    { headers: { "Cache-Control": "no-store" } },
  );
}
