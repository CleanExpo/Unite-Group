import fs from "node:fs";
import path from "node:path";

// In the thin web app there is no attached vault or web tool, so the engine
// must skip those channels honestly per its own rules.
const APP_CONTEXT = `

---

## Runtime context (Phase 1 thin app)

You are running inside the Fable System web app, not Cowork. The Obsidian and
Project channels have no attached material in this environment — mark them
skipped. No web research tool is available — mark the Web channel skipped and
tag claims that would have needed it as [UNCONFIRMED]. Produce the full spec
in Markdown, ending at the approval gate.`;

let cached: string | null = null;

export function getEnginePrompt(): string {
  if (cached === null) {
    const skillPath = path.join(
      process.cwd(),
      "skills",
      "fable-engine",
      "SKILL.md",
    );
    cached = fs.readFileSync(skillPath, "utf8") + APP_CONTEXT;
  }
  return cached;
}
