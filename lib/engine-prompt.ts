import fs from "node:fs";
import path from "node:path";
import type { KnowledgeHit } from "./knowledge";

let cachedSkill: string | null = null;

function engineSkill(): string {
  if (cachedSkill === null) {
    const skillPath = path.join(process.cwd(), "skills", "fable-engine", "SKILL.md");
    cachedSkill = fs.readFileSync(skillPath, "utf8");
  }
  return cachedSkill;
}

// Builds the engine system prompt for a run. When vault notes are attached
// (Phase 3), the Obsidian channel has real material; otherwise the engine
// must skip it honestly per its own rules.
export function buildSystemPrompt(knowledge: KnowledgeHit[]): string {
  const base = `${engineSkill()}

---

## Runtime context (Fable web app)

You are running inside the Fable System web app, not Cowork. The Project
channel has no attached material in this environment — mark it skipped. No
web research tool is available — mark the Web channel skipped and tag claims
that would have needed it as [UNCONFIRMED]. Produce the full spec in
Markdown, ending at the approval gate.`;

  if (knowledge.length === 0) {
    return `${base}

The Obsidian channel has no attached material for this vision — mark it
skipped (0 findings).`;
  }

  const notes = knowledge
    .map((hit) => `### ${hit.title} (\`${hit.path}\`)\n\n${hit.excerpt}`)
    .join("\n\n---\n\n");

  return `${base}

## Obsidian channel material (${knowledge.length} note${knowledge.length === 1 ? "" : "s"} from the user's vault)

The notes below were retrieved from the user's 2nd Brain vault as relevant to
this vision. Treat them as the Obsidian channel's findings. Cite them by file
path; claims grounded in a note are [VERIFIED] with the path as the source.
Notes may be excerpts — do not assume a note ends where the excerpt ends.

${notes}`;
}

// Back-compat for callers that don't attach knowledge.
export function getEnginePrompt(): string {
  return buildSystemPrompt([]);
}
