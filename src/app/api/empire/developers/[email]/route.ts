import { NextResponse } from "next/server";
import {
  getDeveloperByEmail,
  buildSnapshot,
} from "@/lib/developers/repository";

export const runtime = "nodejs";

if (!process.env.PI_CEO_API_KEY) {
  console.warn(
    "[empire/developers/:email] PI_CEO_API_KEY is not set — all requests will 401",
  );
}

// Auth path mirrors /api/empire/integrations — static `PI_CEO_API_KEY` compare.
function isAuthorized(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.PI_CEO_API_KEY ?? "";
  if (!expected) return false;
  return token === expected;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const auth = req.headers.get("x-admin-token");
  if (!isAuthorized(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await params;
  const profile = await getDeveloperByEmail(decodeURIComponent(email));
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    { developer: await buildSnapshot(profile) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
