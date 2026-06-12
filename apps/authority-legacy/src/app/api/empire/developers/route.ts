import { NextResponse } from "next/server";
import { listDevelopers, buildSnapshot } from "@/lib/developers/repository";
import { checkAdminToken } from "@/lib/auth/check-admin-token";

export const runtime = "nodejs";

if (!process.env.PI_CEO_API_KEY && !process.env.ADMIN_JWT_SECRET) {
  console.warn(
    "[empire/developers] neither PI_CEO_API_KEY nor ADMIN_JWT_SECRET is set — all requests will 401",
  );
}

export async function GET(req: Request) {
  const auth = req.headers.get("x-admin-token");
  const result = await checkAdminToken(auth);
  if (!result.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await listDevelopers();
  const snapshots = await Promise.all(profiles.map((p) => buildSnapshot(p)));
  return NextResponse.json(
    { developers: snapshots },
    { headers: { "Cache-Control": "no-store" } },
  );
}
