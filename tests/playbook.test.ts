import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEvent,
  distillSession,
  computeMetrics,
  buildCorpus,
  modelsInCorpus,
  summarizeCorpus,
} from "../lib/playbook.ts";

// A tiny synthetic Claude Code JSONL session: a Fable run that reads before it
// edits and verifies after, plus an Opus run that edits blind.
const FABLE = "claude-fable-5";
const OPUS = "claude-opus-4-8";

function line(obj: unknown): string {
  return JSON.stringify(obj);
}

const fableJsonl = [
  line({ type: "user", message: { role: "user", content: "build the thing" }, timestamp: "2026-06-15T00:00:00Z" }),
  line({
    type: "assistant",
    timestamp: "2026-06-15T00:00:01Z",
    message: {
      role: "assistant",
      model: FABLE,
      content: [
        { type: "thinking", thinking: "hidden" },
        { type: "text", text: "I'll read the file before changing it." },
        { type: "tool_use", name: "Read", input: {} },
      ],
    },
  }),
  // a tool_result echo — must be ignored as bloat
  line({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "...500 lines..." }] } }),
  line({
    type: "assistant",
    timestamp: "2026-06-15T00:00:02Z",
    message: {
      role: "assistant",
      model: FABLE,
      content: [
        { type: "text", text: "Now editing, then I'll run the tests." },
        { type: "tool_use", name: "Edit", input: {} },
        { type: "tool_use", name: "Bash", input: {} },
      ],
    },
  }),
].join("\n");

const opusJsonl = [
  line({
    type: "assistant",
    timestamp: "2026-06-15T01:00:00Z",
    message: {
      role: "assistant",
      model: OPUS,
      content: [{ type: "tool_use", name: "Edit", input: {} }], // edits blind, no read, no verify
    },
  }),
].join("\n");

test("parseEvent extracts model, text and tool_use names; drops tool_result-only lines", () => {
  const a = parseEvent(JSON.parse(fableJsonl.split("\n")[1]));
  assert.ok(a);
  assert.equal(a!.model, FABLE);
  assert.equal(a!.role, "assistant");
  assert.deepEqual(a!.tools, ["Read"]);
  assert.ok(a!.text.includes("read the file"));

  const echo = parseEvent(JSON.parse(fableJsonl.split("\n")[2]));
  assert.equal(echo, null);
});

test("distillSession keeps only conversational turns", () => {
  const s = distillSession(fableJsonl, "s1");
  // user + 2 assistant turns; the tool_result echo is dropped
  assert.equal(s.turns.length, 3);
  assert.equal(s.turns.filter((t) => t.role === "assistant").length, 2);
});

test("computeMetrics measures the working rhythm per model", () => {
  const sessions = [distillSession(fableJsonl, "s1"), distillSession(opusJsonl, "s2")];
  const fable = computeMetrics(sessions, FABLE);
  const opus = computeMetrics(sessions, OPUS);

  assert.equal(fable.assistantTurns, 2);
  assert.equal(fable.toolCalls, 3); // Read, Edit, Bash
  // the single Edit was preceded by a Read and followed by a Bash, in-session
  assert.equal(fable.readsBeforeEditsRatio, 1);
  assert.equal(fable.testsAfterEditsRatio, 1);
  assert.equal(fable.planBeforeActRatio, 1); // both turns lead with text

  // Opus edits blind — no read before, no verify after, no planning text
  assert.equal(opus.readsBeforeEditsRatio, 0);
  assert.equal(opus.testsAfterEditsRatio, 0);
  assert.equal(opus.planBeforeActRatio, 0);
});

test("metrics never leak across sessions", () => {
  // Read lives in session A; the blind edit is in session B — must not count.
  const readOnly = distillSession(
    line({ type: "assistant", message: { role: "assistant", model: OPUS, content: [{ type: "tool_use", name: "Read" }] } }),
    "a",
  );
  const editOnly = distillSession(
    line({ type: "assistant", message: { role: "assistant", model: OPUS, content: [{ type: "tool_use", name: "Edit" }] } }),
    "b",
  );
  const m = computeMetrics([readOnly, editOnly], OPUS);
  assert.equal(m.readsBeforeEditsRatio, 0);
});

test("buildCorpus auto-detects Fable and a baseline and samples turns", () => {
  const sessions = [distillSession(fableJsonl, "s1"), distillSession(opusJsonl, "s2")];
  assert.deepEqual(modelsInCorpus(sessions), [FABLE, OPUS].sort());

  const corpus = buildCorpus(sessions);
  assert.equal(corpus.fableModel, FABLE);
  assert.equal(corpus.baselineModel, OPUS);
  assert.ok(corpus.models[FABLE]);
  assert.ok(corpus.sampleTurns[FABLE].length > 0);

  const summary = summarizeCorpus(corpus);
  assert.ok(summary.includes("FABLE — target rhythm"));
  assert.ok(summary.includes("BASELINE — model to lift"));
});
