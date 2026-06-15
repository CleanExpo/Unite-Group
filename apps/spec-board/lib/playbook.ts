// Fable Playbook Generator — the distiller.
//
// The technique (after Mark Kashef, "Make ANY Model Think Like Fable in
// Minutes", YouTube B95cu7seTm8, corroborated by the public HuggingFace
// Fable-5 trace datasets and Anthropic's official "Prompting Claude Fable 5"
// doc): Claude Code conversations live as JSONL on disk. Each line tags the
// model that produced it (`message.model`), the text, and the tool calls in
// order. Strip the bloat, filter by model, measure the *working rhythm* as
// real numbers, then diff your fallback model against Fable to find the gap.
//
// This module is pure (no fs, no env): the local CLI (scripts/fable-distill.mjs)
// feeds it file contents; the serverless route feeds it an already-built
// corpus. Keep it that way so it stays testable under `node --test`.

export type Role = "user" | "assistant" | "system";

export interface Turn {
  ts: string | null;
  role: Role;
  model: string | null;
  text: string;
  tools: string[]; // tool_use names, in content order
}

export interface Session {
  id: string;
  turns: Turn[];
}

export interface Metrics {
  model: string;
  sessions: number;
  turns: number;
  assistantTurns: number;
  toolCalls: number;
  avgToolsPerAssistantTurn: number;
  toolHistogram: Record<string, number>;
  readToolShare: number; // reads / toolCalls
  editToolShare: number; // edits / toolCalls
  readsBeforeEditsRatio: number; // edits preceded by a read in-session / edits
  testsAfterEditsRatio: number; // edits followed by a verify in-session / edits
  planBeforeActRatio: number; // assistant turns whose text precedes first tool
  avgAssistantTextChars: number;
}

// Tool classification by name (we only ever have the tool name, never the
// command). Bash stands in for the "verify / run" step.
const READ_TOOLS = new Set(["Read", "Glob", "Grep", "LS", "NotebookRead"]);
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const VERIFY_TOOLS = new Set(["Bash", "BashOutput"]);

const TEXT_CAP = 600; // keep sample turns lightweight

// Pull a single normalised Turn out of one parsed JSONL object, or null if the
// line carries no conversational content (tool_result echoes, meta, summaries).
export function parseEvent(obj: unknown): Turn | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, any>;
  const msg = o.message ?? o;
  const rawRole = msg?.role ?? o.type;
  const role: Role | null =
    rawRole === "assistant" ? "assistant" : rawRole === "user" ? "user" : rawRole === "system" ? "system" : null;
  if (!role) return null;

  const model: string | null =
    typeof msg?.model === "string" ? msg.model : typeof o.model === "string" ? o.model : null;
  const ts: string | null = typeof o.timestamp === "string" ? o.timestamp : null;

  let text = "";
  const tools: string[] = [];
  let sawText = false;
  let textBeforeTool = false;

  const content = msg?.content;
  if (typeof content === "string") {
    text = content;
    sawText = content.trim().length > 0;
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const t = (block as any).type;
      if (t === "text" && typeof (block as any).text === "string") {
        text += (text ? "\n" : "") + (block as any).text;
        sawText = true;
        if (tools.length === 0) textBeforeTool = true;
      } else if (t === "tool_use" && typeof (block as any).name === "string") {
        tools.push((block as any).name);
      }
      // thinking and tool_result blocks are deliberately ignored.
    }
  }

  // A pure tool_result carrier (user line with only tool_result blocks) has no
  // text and no tools — drop it as bloat.
  if (!sawText && tools.length === 0) return null;

  // Stash the ordering signal on the text via a sentinel-free flag: we encode
  // it by trimming, and recompute plan-before-act from textBeforeTool at the
  // metrics layer. To keep Turn serialisable we fold it into a leading marker.
  const turn: Turn & { _textBeforeTool?: boolean } = {
    ts,
    role,
    model,
    text: text.trim().slice(0, TEXT_CAP),
    tools,
  };
  turn._textBeforeTool = textBeforeTool;
  return turn;
}

// Parse one JSONL session file's contents into a Session.
export function distillSession(jsonl: string, id: string): Session {
  const turns: Turn[] = [];
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue; // skip malformed lines rather than failing the whole file
    }
    const turn = parseEvent(obj);
    if (turn) turns.push(turn);
  }
  return { id, turns };
}

// Claude Code tags injected/sidechain messages with a pseudo-model like
// "<synthetic>" — not a real model, so it must never enter the corpus.
function isRealModel(model: string | null): model is string {
  return Boolean(model) && !/^<.*>$/.test(model!);
}

// Every distinct real model id that appears across the corpus.
export function modelsInCorpus(sessions: Session[]): string[] {
  const seen = new Set<string>();
  for (const s of sessions) for (const t of s.turns) if (isRealModel(t.model)) seen.add(t.model);
  return [...seen].sort();
}

function ratio(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

// Measure one model's working rhythm across the corpus. Session-scoped ratios
// (reads-before-edits, tests-after-edits) are computed per session so a read in
// session A can't "cover" an edit in session B.
export function computeMetrics(sessions: Session[], model: string): Metrics {
  const histogram: Record<string, number> = {};
  let turns = 0;
  let assistantTurns = 0;
  let toolCalls = 0;
  let reads = 0;
  let edits = 0;
  let assistantTextChars = 0;
  let planBeforeAct = 0;
  let editsWithPriorRead = 0;
  let editsWithLaterVerify = 0;
  let totalEdits = 0;

  for (const session of sessions) {
    const flat: string[] = []; // ordered tool names for this model in this session
    for (const turn of session.turns) {
      if (turn.model !== model) continue;
      turns++;
      if (turn.role === "assistant") {
        assistantTurns++;
        assistantTextChars += turn.text.length;
        if (turn.tools.length > 0 && (turn as any)._textBeforeTool) planBeforeAct++;
        if (turn.tools.length === 0 && turn.text.length > 0) planBeforeAct++;
      }
      for (const name of turn.tools) {
        histogram[name] = (histogram[name] ?? 0) + 1;
        toolCalls++;
        if (READ_TOOLS.has(name)) reads++;
        if (EDIT_TOOLS.has(name)) edits++;
        flat.push(name);
      }
    }
    // sequence ratios within this session
    for (let i = 0; i < flat.length; i++) {
      if (!EDIT_TOOLS.has(flat[i])) continue;
      totalEdits++;
      if (flat.slice(0, i).some((n) => READ_TOOLS.has(n))) editsWithPriorRead++;
      if (flat.slice(i + 1).some((n) => VERIFY_TOOLS.has(n))) editsWithLaterVerify++;
    }
  }

  const sessionsWithModel = sessions.filter((s) => s.turns.some((t) => t.model === model)).length;

  return {
    model,
    sessions: sessionsWithModel,
    turns,
    assistantTurns,
    toolCalls,
    avgToolsPerAssistantTurn: ratio(toolCalls, assistantTurns),
    toolHistogram: histogram,
    readToolShare: ratio(reads, toolCalls),
    editToolShare: ratio(edits, toolCalls),
    readsBeforeEditsRatio: ratio(editsWithPriorRead, totalEdits),
    testsAfterEditsRatio: ratio(editsWithLaterVerify, totalEdits),
    planBeforeActRatio: ratio(planBeforeAct, assistantTurns),
    avgAssistantTextChars: Math.round(ratio(assistantTextChars, assistantTurns)),
  };
}

export interface Corpus {
  generatedAt: string;
  fableModel: string | null;
  baselineModel: string | null;
  models: Record<string, Metrics>;
  // a small capped sample of lightweight turns per model, for qualitative grounding
  sampleTurns: Record<string, Pick<Turn, "role" | "text" | "tools">[]>;
}

// Build the corpus the route consumes from already-distilled sessions.
export function buildCorpus(
  sessions: Session[],
  opts: { fableModel?: string | null; baselineModel?: string | null; sampleSize?: number } = {},
): Corpus {
  const present = modelsInCorpus(sessions);
  const models: Record<string, Metrics> = {};
  const sampleTurns: Record<string, Pick<Turn, "role" | "text" | "tools">[]> = {};
  const sampleSize = opts.sampleSize ?? 12;
  for (const m of present) {
    models[m] = computeMetrics(sessions, m);
    const sample: Pick<Turn, "role" | "text" | "tools">[] = [];
    for (const s of sessions) {
      for (const t of s.turns) {
        if (t.model === m && (t.text.length > 0 || t.tools.length > 0)) {
          sample.push({ role: t.role, text: t.text, tools: t.tools });
          if (sample.length >= sampleSize) break;
        }
      }
      if (sample.length >= sampleSize) break;
    }
    sampleTurns[m] = sample;
  }
  return {
    generatedAt: new Date().toISOString(),
    fableModel: opts.fableModel ?? present.find((m) => /fable/i.test(m)) ?? null,
    baselineModel:
      opts.baselineModel ?? present.find((m) => /opus|sonnet|haiku|gpt|minimax|qwen/i.test(m)) ?? null,
    models,
    sampleTurns,
  };
}

// Render the measured corpus as a compact, model-readable brief for synthesis.
export function summarizeCorpus(corpus: Corpus): string {
  const lines: string[] = [];
  const order = [corpus.fableModel, corpus.baselineModel, ...Object.keys(corpus.models)].filter(
    (m, i, a): m is string => Boolean(m) && a.indexOf(m) === i,
  );
  for (const m of order) {
    const x = corpus.models[m];
    if (!x) continue;
    const tag = m === corpus.fableModel ? " (FABLE — target rhythm)" : m === corpus.baselineModel ? " (BASELINE — model to lift)" : "";
    const topTools = Object.entries(x.toolHistogram)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([n, c]) => `${n}:${c}`)
      .join(", ");
    lines.push(
      `### ${m}${tag}\n` +
        `- sessions ${x.sessions}, assistant turns ${x.assistantTurns}, tool calls ${x.toolCalls}\n` +
        `- avg tools/turn ${x.avgToolsPerAssistantTurn}, avg reply ${x.avgAssistantTextChars} chars\n` +
        `- plan-before-act ${x.planBeforeActRatio}, reads-before-edits ${x.readsBeforeEditsRatio}, tests-after-edits ${x.testsAfterEditsRatio}\n` +
        `- read share ${x.readToolShare}, edit share ${x.editToolShare}\n` +
        `- top tools: ${topTools || "none"}`,
    );
  }
  return lines.join("\n\n");
}
