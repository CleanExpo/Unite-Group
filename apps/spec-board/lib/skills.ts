import fs from "node:fs";
import path from "node:path";

// The OS layer's installed skills, read from skills/*/SKILL.md frontmatter
// so the app can show what routines exist and which are wired in.

export interface SkillInfo {
  name: string;
  description: string;
}

export function loadSkills(): SkillInfo[] {
  const dir = path.join(process.cwd(), "skills");
  if (!fs.existsSync(dir)) return [];

  const skills: SkillInfo[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;
    const text = fs.readFileSync(skillPath, "utf8");
    const name = text.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? entry.name;
    const description = text.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
    skills.push({ name, description });
  }
  return skills;
}
