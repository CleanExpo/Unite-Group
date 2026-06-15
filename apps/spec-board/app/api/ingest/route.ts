import { NextResponse } from "next/server";
import { ingestKnowledgeRepo } from "@/lib/knowledge";

export const maxDuration = 300;

// Syncs the 2nd Brain vault repo (KNOWLEDGE_REPO) into knowledge_docs.
export async function POST() {
  try {
    const result = await ingestKnowledgeRepo();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
