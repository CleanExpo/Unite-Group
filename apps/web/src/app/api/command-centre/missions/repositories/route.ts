import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  listDeliveryRepositories,
  parseRepositoryCursor,
} from "@/lib/command-centre/delivery-repositories";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!(await getUser()))
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401, headers },
    );
  const params = new URL(request.url).searchParams;
  if (
    [...params.keys()].some((key) => key !== "cursor") ||
    params.getAll("cursor").length > 1 ||
    parseRepositoryCursor(params.get("cursor")) === null
  )
    return NextResponse.json(
      { error: "Invalid repository page." },
      { status: 400, headers },
    );
  return NextResponse.json(
    await listDeliveryRepositories(params.get("cursor")),
    { headers },
  );
}
