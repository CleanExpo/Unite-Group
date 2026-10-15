import { NextResponse } from "next/server";
import { z } from "zod";
import {
  admitExternalIdeaEvidence,
  IdeaEvidenceError,
} from "@/lib/command-centre/idea-evidence-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 1_048_576;
const upload = z
  .object({ envelope: z.unknown(), signature: z.string().max(128) })
  .strict();

/** Public transport authenticates only enrolled Ed25519 issuers; cookies confer no authority. */
export async function POST(request: Request) {
  if (process.env.IDEA_EVIDENCE_ENABLED !== "1")
    return NextResponse.json(
      { error: "Evidence ingestion unavailable" },
      { status: 503 },
    );
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    return NextResponse.json({ error: "JSON required" }, { status: 400 });
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES))
    return NextResponse.json(
      { error: "Invalid evidence body" },
      { status: 400 },
    );
  let input: z.infer<typeof upload>;
  const reader = request.body?.getReader();
  try {
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Body limit");
      }
      chunks.push(part.value);
    }
    const body = Buffer.concat(chunks);
    input = upload.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)),
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid evidence body" },
      { status: 400 },
    );
  } finally {
    reader?.releaseLock();
  }
  try {
    const event = await admitExternalIdeaEvidence(input);
    return NextResponse.json(
      { eventId: event.id, admittedAt: event.admitted_at },
      { status: 200 },
    );
  } catch (error) {
    const status =
      error instanceof IdeaEvidenceError
        ? { invalid: 400, unauthorized: 401, conflict: 409, unavailable: 503 }[
            error.kind
          ]
        : 503;
    return NextResponse.json(
      {
        error:
          status === 503
            ? "Evidence ingestion unavailable"
            : "Evidence rejected",
      },
      { status },
    );
  }
}
