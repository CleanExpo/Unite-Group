import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  hasPrivateAccess,
  isPrivateAccessConfigured,
} from "@/lib/auth/private-access";
import {
  loadLocalPortfolioManifest,
  loadPortfolioControlPlaneRegistry,
} from "@/lib/command-centre/portfolio-drift-collector";
import { buildPortfolioControlPlaneProjection } from "@/lib/command-centre/portfolio-control-plane";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    const user = await getUser();
    if (!user)
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401, headers: NO_STORE },
      );
    if (
      !isPrivateAccessConfigured() ||
      !hasPrivateAccess({ id: user.id, email: user.email })
    )
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: NO_STORE },
      );

    let registry: unknown = null;
    let manifest: unknown = null;
    try {
      registry = await loadPortfolioControlPlaneRegistry();
      manifest = await loadLocalPortfolioManifest();
    } catch {
      registry = null;
      manifest = null;
    }
    const projection = buildPortfolioControlPlaneProjection({
      registry,
      manifest,
      keyResolver: (_signerId, keyRef) => process.env[keyRef]?.trim() || null,
    });
    return NextResponse.json(projection, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "Portfolio control-plane status unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}
