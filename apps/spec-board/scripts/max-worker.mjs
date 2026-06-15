#!/usr/bin/env node
// The Max-plan worker: runs Fable engine jobs on your Claude Max
// subscription instead of metered API credit.
//
// How it works: the web app's "Queue for Max" button inserts a vision with
// status 'queued'. This script — running on YOUR machine, where the Claude
// Code CLI is logged in to your Max plan — polls Supabase, builds the same
// engine prompt the app uses (fable-engine SKILL.md + vault retrieval),
// executes it via `claude -p` (first-party CLI, covered by the
// subscription), and writes the spec back. It appears in the app's Spec
// Library like any other run, behind the same approval gate.
//
// Run on the Mac (from the repo root, after `npm install`):
//   SUPABASE_URL=https://yhteftfnoegmdkimzzjd.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/max-worker.mjs
//
// Optional env: WORKER_POLL_SECONDS (default 30), CLAUDE_BIN (default
// "claude"), WORKER_ONCE=1 to process one job and exit.

import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const POLL_MS = Math.max(5, Number(process.env.WORKER_POLL_SECONDS ?? 30)) * 1000;
const CLAUDE = process.env.CLAUDE_BIN ?? "claude";

const skill = readFileSync(new URL("../skills/fable-engine/SKILL.md", import.meta.url), "utf8");

async function vaultNotes(vision) {
  const { data } = await supabase
    .from("knowledge_docs")
    .select("path, title, content")
    .textSearch("fts", vision.slice(0, 200), { type: "websearch" })
    .limit(5);
  return data ?? [];
}

function buildPrompt(vision, notes) {
  let prompt = `${skill}\n\n---\n\n## Runtime context (Max-plan worker)\n\nYou are running via the Fable System's local worker on the user's machine.\nYou have web access through your own tools — research the Web channel\nproperly (dog with a bone: search, follow gaps, cite URLs). The Project\nchannel has no attached material — mark it skipped. Produce the full spec\nin Markdown, ending at the approval gate.`;
  if (notes.length > 0) {
    prompt += `\n\n## Obsidian channel material (${notes.length} notes from the user's vault)\n\nCite by file path; claims grounded in a note are [VERIFIED].\n\n`;
    prompt += notes
      .map((n) => `### ${n.title} (\`${n.path}\`)\n\n${n.content.slice(0, 3500)}`)
      .join("\n\n---\n\n");
  }
  prompt += `\n\n---\n\nThe vision:\n\n${vision}`;
  return prompt;
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      CLAUDE,
      ["-p", "--output-format", "text"],
      { maxBuffer: 32 * 1024 * 1024, timeout: 15 * 60 * 1000 },
      (error, stdout) => {
        if (error) return reject(error);
        resolve(stdout);
      },
    );
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function claimJob() {
  const { data: job } = await supabase
    .from("visions")
    .select("id, raw_text")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!job) return null;
  const { data: claimed } = await supabase
    .from("visions")
    .update({ status: "running" })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  return claimed ? job : null;
}

async function processJob(job) {
  console.log(`[${new Date().toISOString()}] running vision ${job.id}`);
  try {
    const notes = await vaultNotes(job.raw_text);
    const spec = await runClaude(buildPrompt(job.raw_text, notes));
    if (!spec || spec.trim().length < 500) throw new Error("claude returned a stub");
    const { error: specError } = await supabase
      .from("specs")
      .insert({ vision_id: job.id, content: spec });
    if (specError) throw new Error(specError.message);
    await supabase.from("visions").update({ status: "spec_generated" }).eq("id", job.id);
    console.log(`  done: spec saved (${(spec.length / 1000).toFixed(1)}k chars, ${notes.length} vault notes attached)`);
  } catch (error) {
    console.error(`  failed: ${error.message}`);
    await supabase.from("visions").update({ status: "error" }).eq("id", job.id);
  }
}

console.log(`Max worker polling every ${POLL_MS / 1000}s — queue visions in the app with "Queue for Max"`);
for (;;) {
  const job = await claimJob();
  if (job) {
    await processJob(job);
    if (process.env.WORKER_ONCE) break;
    continue;
  }
  if (process.env.WORKER_ONCE) {
    console.log("queue empty");
    break;
  }
  await new Promise((r) => setTimeout(r, POLL_MS));
}
