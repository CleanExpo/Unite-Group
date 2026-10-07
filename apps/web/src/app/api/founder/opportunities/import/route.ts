import { NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { sanitiseError } from "@/lib/error-reporting";
import { getImportProjects } from "@/lib/synthex/import-projects";
import { SynthexImportRequestSchema } from "@/lib/synthex/import-schema";
import { MAX_IMPORT_REQUEST_BYTES } from "@/lib/synthex/import-limits";
import {
  createOpportunityImportStore,
  importSynthexOpportunity,
  OpportunityImportError,
  previewSynthexOpportunity,
} from "@/lib/synthex/opportunity-import";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = MAX_IMPORT_REQUEST_BYTES;

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401, headers },
    );
  try {
    return NextResponse.json({ projects: getImportProjects() }, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: sanitiseError(error, "Portfolio registry unavailable", {
          route: "/api/founder/opportunities/import",
        }),
      },
      { status: 500, headers },
    );
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401, headers },
    );
  // Cap the untrusted stream before parsing/allocating an oversized bundle.
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    return NextResponse.json(
      { error: "Export JSON is too large" },
      { status: 413, headers },
    );
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers },
      );
    const decoder = new TextDecoder();
    let bytes = 0;
    let raw = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Export JSON is too large" },
          { status: 413, headers },
        );
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers },
    );
  }
  const parsed = SynthexImportRequestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid accepted, blocked Synthex proposal bundle" },
      { status: 400, headers },
    );
  try {
    const { bundle, targetRepository, previewOnly } = parsed.data;
    const projects = getImportProjects();
    const preview = previewSynthexOpportunity(
      bundle,
      targetRepository,
      projects,
    );
    if (previewOnly) return NextResponse.json({ preview }, { headers });
    const client = await createClient();
    const result = await importSynthexOpportunity({
      bundle,
      targetRepository,
      projects,
      founderId: user.id,
      store: createOpportunityImportStore(client),
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof OpportunityImportError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers },
      );
    return NextResponse.json(
      {
        error: sanitiseError(error, "Failed to import Synthex opportunity", {
          route: "/api/founder/opportunities/import",
        }),
      },
      { status: 500, headers },
    );
  }
}
