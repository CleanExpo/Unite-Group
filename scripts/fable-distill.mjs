#!/usr/bin/env node
// Fable Playbook distiller — local CLI.
//
// Scans your Claude Code JSONL sessions, strips the bloat, and emits a corpus
// of per-model behavioural metrics. Feed the resulting corpus.json to the
// /playbook page (or POST it to /api/playbook) to synthesise a FABLE_PLAYBOOK.md.
//
// Usage:
//   node scripts/fable-distill.mjs                       # ~/.claude/projects → corpus.json
//   node scripts/fable-distill.mjs --dir ./hf-traces     # a folder of downloaded HF .jsonl
//   node scripts/fable-distill.mjs --out my-corpus.json
//   node scripts/fable-distill.mjs --fable claude-fable-5 --baseline claude-opus-4-8
//
// No history of your own? Download a public corpus first, then point --dir at it:
//   huggingface-cli download armand0e/claude-fable-5-claude-code --repo-type dataset --local-dir ./hf-traces
//
// Requires Node >= 22.18 (native TypeScript type-stripping for the lib import).

import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { distillSession, buildCorpus } from "../lib/playbook.ts";

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const dir = arg("--dir", join(homedir(), ".claude", "projects"));
const out = arg("--out", "corpus.json");
const fableModel = arg("--fable", null);
const baselineModel = arg("--baseline", null);

async function findJsonl(root) {
  const found = [];
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.endsWith(".jsonl")) found.push(p);
    }
  }
  const s = await stat(root).catch(() => null);
  if (!s) {
    console.error(`No such directory: ${root}`);
    process.exit(1);
  }
  await walk(root);
  return found;
}

const files = await findJsonl(dir);
if (files.length === 0) {
  console.error(`No .jsonl files under ${dir}`);
  process.exit(1);
}
console.error(`Scanning ${files.length} JSONL files under ${dir} …`);

const sessions = [];
for (const file of files) {
  try {
    const text = await readFile(file, "utf8");
    const session = distillSession(text, basename(file).replace(/\.jsonl$/, ""));
    if (session.turns.length > 0) sessions.push(session);
  } catch {
    // unreadable file — skip
  }
}

const corpus = buildCorpus(sessions, { fableModel, baselineModel });
await writeFile(out, JSON.stringify(corpus, null, 2));

const models = Object.keys(corpus.models);
console.error(`\nDistilled ${sessions.length} sessions → ${models.length} models:`);
for (const m of models) {
  const x = corpus.models[m];
  const tag = m === corpus.fableModel ? "  ← Fable" : m === corpus.baselineModel ? "  ← baseline" : "";
  console.error(`  ${m}: ${x.assistantTurns} turns, ${x.toolCalls} tool calls, plan-before-act ${x.planBeforeActRatio}${tag}`);
}
console.error(`\nWrote ${out}. Paste it into the /playbook page, or:`);
console.error(`  curl -sX POST "$APP_URL/api/playbook" -H 'content-type: application/json' --data @${out}`);
