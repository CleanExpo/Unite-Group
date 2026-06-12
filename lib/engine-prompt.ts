import fs from "node:fs";
import path from "node:path";
import type { KnowledgeHit } from "./knowledge";
import type { WebSource } from "./research";

let cachedSkill: string | null = null;

function engineSkill(): string {
  if (cachedSkill === null) {
    const skillPath = path.join(process.cwd(), "skills", "fable-engine", "SKILL.md");
    cachedSkill = fs.readFileSync(skillPath, "utf8");
  }
  return cachedSkill;
}

// Builds the engine system prompt for a run. When vault notes are attached
// (Phase 3), the Obsidian channel has real material; when fresh web sources
// are attached, the Web channel has real material; otherwise the engine
// must skip those channels honestly per its own rules.
export function buildSystemPrompt(knowledge: KnowledgeHit[], web: WebSource[] = []): string {
  const webLine =
    web.length === 0
      ? `No web research material was retrieved for this run — mark the Web
channel skipped and tag claims that would have needed it as [UNCONFIRMED].`
      : `Fresh web research material is attached below — treat it as the Web
channel's findings.`;

  let prompt = `${engineSkill()}

---

## Runtime context (Fable web app)

You are running inside the Fable System web app, not Cowork. The Project
channel has no attached material in this environment — mark it skipped.
${webLine} Produce the full spec in Markdown, ending at the approval gate.`;

  if (knowledge.length === 0) {
    prompt += `

The Obsidian channel has no attached material for this vision — mark it
skipped (0 findings).`;
  } else {
    const notes = knowledge
      .map((hit) => `### ${hit.title} (\`${hit.path}\`)\n\n${hit.excerpt}`)
      .join("\n\n---\n\n");
    prompt += `

## Obsidian channel material (${knowledge.length} note${knowledge.length === 1 ? "" : "s"} from the user's vault)

The notes below were retrieved from the user's 2nd Brain vault as relevant to
this vision. Treat them as the Obsidian channel's findings. Cite them by file
path; claims grounded in a note are [VERIFIED] with the path as the source.
Notes may be excerpts — do not assume a note ends where the excerpt ends.

${notes}`;
  }

  if (web.length > 0) {
    const sources = web
      .map((s) => `### ${s.title}\n${s.url}\n\n${s.excerpt}`)
      .join("\n\n---\n\n");
    prompt += `

## Web channel material (${web.length} fresh source${web.length === 1 ? "" : "s"}, fetched for this run)

The sources below were just retrieved by live web search for this vision —
articles, papers, and videos. Treat them as the Web channel's findings. Cite
them by URL; claims grounded in a source are [VERIFIED] with the URL. Excerpts
are partial — do not invent content beyond them.

${sources}`;
  }

  return prompt;
}

// Back-compat for callers that don't attach knowledge.
export function getEnginePrompt(): string {
  return buildSystemPrompt([]);
}
