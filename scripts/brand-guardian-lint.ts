// scripts/brand-guardian-lint.ts
// Walks src/app/(public)/**/*.tsx + src/components/marketing/**/*.tsx
// Extracts every JSX text node + every string literal that looks like prose
// (>= 12 chars, contains a space) and runs voice-rules against it.
// Exits non-zero with a per-file report.

import { Project, SyntaxKind } from "ts-morph";
import { globby } from "globby";
import { lintSentence, VOICE_RULES } from "../src/lib/brand/voice-rules";

const TARGETS = [
  "src/app/(public)/**/*.{tsx,mdx}",
  "src/components/marketing/**/*.tsx",
];

const PROSE_RE = /[a-z][a-z ,.'!?;:—-]{12,}/i;
const IGNORE_RE = /^(href|src|className|id|aria-|data-)/;

interface Hit {
  file: string;
  line: number;
  text: string;
  ruleId: string;
  severity: "error" | "warn";
  fix: string;
}

async function main() {
  const files = await globby(TARGETS, { gitignore: true });
  const project = new Project({ tsConfigFilePath: "tsconfig.json", skipAddingFilesFromTsConfig: true });
  files.forEach((f) => project.addSourceFileAtPath(f));

  const hits: Hit[] = [];
  for (const sf of project.getSourceFiles()) {
    const file = sf.getFilePath();

    sf.getDescendantsOfKind(SyntaxKind.JsxText).forEach((node) => {
      const text = node.getText().trim();
      if (!PROSE_RE.test(text)) return;
      for (const issue of lintSentence(text)) {
        hits.push({ file, line: node.getStartLineNumber(), text, ...issue });
      }
    });

    sf.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach((node) => {
      const parent = node.getParent();
      if (parent && parent.getKindName() === "JsxAttribute") {
        // ts-morph v28 JsxAttribute exposes getNameNode().getText() (not getName())
        const name = (parent as { getNameNode: () => { getText: () => string } }).getNameNode().getText();
        if (IGNORE_RE.test(name)) return;
      }
      const text = node.getLiteralValue();
      if (!PROSE_RE.test(text)) return;
      for (const issue of lintSentence(text)) {
        hits.push({ file, line: node.getStartLineNumber(), text, ...issue });
      }
    });

    sf.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral).forEach((node) => {
      const text = node.getLiteralValue();
      if (!PROSE_RE.test(text)) return;
      for (const issue of lintSentence(text)) {
        hits.push({ file, line: node.getStartLineNumber(), text, ...issue });
      }
    });
  }

  const errors = hits.filter((h) => h.severity === "error");
  const warns = hits.filter((h) => h.severity === "warn");

  if (hits.length === 0) {
    console.log("✓ brand-guardian: 0 violations");
    process.exit(0);
  }

  console.log(`brand-guardian — ${errors.length} error(s), ${warns.length} warning(s)`);
  for (const h of hits) {
    const symbol = h.severity === "error" ? "✗" : "⚠";
    console.log(`${symbol} ${h.file}:${h.line}  [${h.ruleId}]`);
    console.log(`    ${h.text.slice(0, 140)}`);
    console.log(`    fix: ${h.fix}\n`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main();
