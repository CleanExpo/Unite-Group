import { NextResponse } from "next/server";
import {
  getDeveloperByEmail,
  buildSnapshot,
} from "@/lib/developers/repository";
import { checkAdminToken } from "@/lib/auth/check-admin-token";

export const runtime = "nodejs";

if (!process.env.PI_CEO_API_KEY && !process.env.ADMIN_JWT_SECRET) {
  console.warn(
    "[empire/developers/:email] neither PI_CEO_API_KEY nor ADMIN_JWT_SECRET is set — all requests will 401",
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const auth = req.headers.get("x-admin-token");
  const result = await checkAdminToken(auth);
  if (!result.ok) {
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
