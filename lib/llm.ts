import Anthropic from "@anthropic-ai/sdk";
import { getEnginePrompt } from "./engine-prompt";

// Provider routing: the engine can run on whichever plan currently has
// budget. Flip LLM_PROVIDER in env — no code change needed.
//   anthropic  → first-party API (claude-opus-4-8), needs ANTHROPIC_API_KEY
//   openrouter → OpenRouter credit as the metered bridge, needs OPENROUTER_API_KEY
//   minimax    → MiniMax plan (also the default critic), needs MINIMAX_API_KEY
export type Provider = "anthropic" | "openrouter" | "minimax";

export interface EngineResult {
  text: string;
  provider: Provider;
  model: string;
  usage?: unknown;
  stopReason?: string | null;
}

export function getProvider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  if (p === "anthropic" || p === "openrouter" || p === "minimax") return p;
  throw new Error(
    `Unknown LLM_PROVIDER "${p}" — use anthropic, openrouter, or minimax`,
  );
}

export interface EngineStatus {
  provider: string;
  models: string[];
  ready: boolean;
  problem: string | null;
}

// Config-only check for the health endpoint — makes no LLM calls.
export function describeEngine(): EngineStatus {
  let provider: Provider;
  try {
    provider = getProvider();
  } catch (error) {
    return {
      provider: process.env.LLM_PROVIDER ?? "(unset)",
      models: [],
      ready: false,
      problem: error instanceof Error ? error.message : String(error),
    };
  }

  if (provider === "anthropic") {
    const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
    return process.env.ANTHROPIC_API_KEY
      ? { provider, models: [model], ready: true, problem: null }
      : { provider, models: [model], ready: false, problem: "ANTHROPIC_API_KEY is not set" };
  }

  if (provider === "openrouter") {
    const models = openrouterModels();
    if (!process.env.OPENROUTER_API_KEY) {
      return { provider, models, ready: false, problem: "OPENROUTER_API_KEY is not set" };
    }
    if (models.length === 0) {
      return { provider, models, ready: false, problem: "OPENROUTER_MODEL is not set" };
    }
    return { provider, models, ready: true, problem: null };
  }

  const models = [process.env.MINIMAX_MODEL ?? "MiniMax-M2"];
  return process.env.MINIMAX_API_KEY
    ? { provider, models, ready: true, problem: null }
    : { provider, models, ready: false, problem: "MINIMAX_API_KEY is not set" };
}

function openrouterModels(): string[] {
  return (process.env.OPENROUTER_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// ── Engine (streaming) ────────────────────────────────────────────────────

export async function runEngineStream(
  vision: string,
  onDelta: (text: string) => void,
): Promise<EngineResult> {
  const provider = getProvider();
  const system = getEnginePrompt();

  if (provider === "anthropic") {
    return runAnthropic({ system, user: vision, onDelta });
  }
  if (provider === "openrouter") {
    const models = openrouterModels();
    if (models.length === 0) throw new Error("OPENROUTER_MODEL is not set");
    return chatCompletions({
      provider,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      models,
      system,
      user: vision,
      maxTokens: 32000,
      onDelta,
    });
  }
  return chatCompletions({
    provider,
    baseUrl: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1",
    apiKey: requireEnv("MINIMAX_API_KEY"),
    models: [process.env.MINIMAX_MODEL ?? "MiniMax-M2"],
    system,
    user: vision,
    maxTokens: 32000,
    onDelta,
  });
}

// ── Critic (Phase 2 verify loop) ─────────────────────────────────────────

const CRITIC_PROMPT = `You are the Verify Loop critic for The Fable System.
You review a build spec before the human sees it. You are a lens, not an
oracle — the human decides; your job is to sharpen, not to gatekeep.

Review the spec against:
1. The Evidence Standard — every factual claim carries exactly one tag
   ([VERIFIED] / [INFERENCE] / [UNCONFIRMED]); untagged claims are defects;
   every [UNCONFIRMED] item must appear in the risk/assumption register.
2. The finish line — is it a single testable "done when" sentence?
3. Phases — smallest first, each with a definition of done.
4. Guardrails — secrets handling, access control, cost caps: structural,
   not advice.
5. Feasibility — anything overbuilt, underspecified, or contradictory.

Output format:
- First line: "VERDICT: APPROVE" or "VERDICT: REVISE"
- Then "## Critic Review" with numbered findings, each one line of the form
  severity (high/med/low) — finding — concrete fix.
- Maximum 10 findings. No preamble, no flattery.`;

export interface CriticConfig {
  provider: Provider;
  model: string;
}

// Critic provider: CRITIC_PROVIDER env wins; otherwise first configured of
// minimax → openrouter → anthropic. "off" disables the verify loop.
export function describeCritic(): CriticConfig | null {
  const pref = (process.env.CRITIC_PROVIDER ?? "").toLowerCase();
  if (pref === "off") return null;

  const minimax = process.env.MINIMAX_API_KEY
    ? { provider: "minimax" as const, model: process.env.CRITIC_MODEL ?? process.env.MINIMAX_MODEL ?? "MiniMax-M2" }
    : null;
  const openrouter =
    process.env.OPENROUTER_API_KEY && (process.env.CRITIC_MODEL ?? openrouterModels()[0])
      ? { provider: "openrouter" as const, model: process.env.CRITIC_MODEL ?? openrouterModels()[0] }
      : null;
  const anthropic = process.env.ANTHROPIC_API_KEY
    ? { provider: "anthropic" as const, model: process.env.CRITIC_MODEL ?? process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8" }
    : null;

  if (pref === "minimax") return minimax;
  if (pref === "openrouter") return openrouter;
  if (pref === "anthropic") return anthropic;
  return minimax ?? openrouter ?? anthropic;
}

export async function runCritic(spec: string): Promise<EngineResult | null> {
  const config = describeCritic();
  if (!config) return null;

  const user = `Review this spec:\n\n${spec}`;
  if (config.provider === "anthropic") {
    return runAnthropic({ system: CRITIC_PROMPT, user, model: config.model, maxTokens: 8000 });
  }
  if (config.provider === "openrouter") {
    return chatCompletions({
      provider: config.provider,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      models: [config.model],
      system: CRITIC_PROMPT,
      user,
      maxTokens: 8000,
    });
  }
  return chatCompletions({
    provider: config.provider,
    baseUrl: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1",
    apiKey: requireEnv("MINIMAX_API_KEY"),
    models: [config.model],
    system: CRITIC_PROMPT,
    user,
    maxTokens: 8000,
  });
}

// ── Providers ────────────────────────────────────────────────────────────

async function runAnthropic(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  onDelta?: (text: string) => void;
}): Promise<EngineResult> {
  const client = new Anthropic();
  const model = opts.model ?? process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
  const stream = client.messages.stream({
    model,
    max_tokens: opts.maxTokens ?? 64000,
    thinking: { type: "adaptive" },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  if (opts.onDelta) stream.on("text", opts.onDelta);
  const message = await stream.finalMessage();
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return {
    text,
    provider: "anthropic",
    model,
    usage: message.usage,
    stopReason: message.stop_reason,
  };
}

// OpenRouter and MiniMax both speak the OpenAI chat-completions wire format.
// With onDelta set, the request streams (SSE) and deltas are forwarded.
async function chatCompletions(opts: {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  models: string[]; // first entry primary; extras are OpenRouter fallbacks
  system: string;
  user: string;
  maxTokens: number;
  onDelta?: (text: string) => void;
}): Promise<EngineResult> {
  if (opts.models.length === 0) throw new Error(`${opts.provider}: no model configured`);
  const streaming = Boolean(opts.onDelta);

  const res = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.models[0],
      // OpenRouter model-routing fallback list; harmlessly ignored elsewhere
      ...(opts.models.length > 1 ? { models: opts.models } : {}),
      max_tokens: opts.maxTokens,
      stream: streaming,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    throw new Error(`${opts.provider} API error ${res.status}: ${body}`);
  }

  if (!streaming) {
    const data = await res.json();
    const text: unknown = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.length === 0) {
      throw new Error(`${opts.provider} returned no text content`);
    }
    return {
      text,
      provider: opts.provider,
      model: typeof data?.model === "string" ? data.model : opts.models[0],
      usage: data?.usage,
      stopReason: data?.choices?.[0]?.finish_reason ?? null,
    };
  }

  // Parse the SSE stream: lines of `data: {json}` ending with `data: [DONE]`
  if (!res.body) throw new Error(`${opts.provider}: empty stream body`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let model = opts.models[0];
  let stopReason: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue; // skips SSE comments/heartbeats
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let json: any;
      try {
        json = JSON.parse(payload);
      } catch {
        continue;
      }
      if (typeof json?.model === "string") model = json.model;
      const delta: unknown = json?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        text += delta;
        opts.onDelta!(delta);
      }
      const finish: unknown = json?.choices?.[0]?.finish_reason;
      if (typeof finish === "string") stopReason = finish;
    }
  }

  if (text.length === 0) throw new Error(`${opts.provider} streamed no text content`);
  return { text, provider: opts.provider, model, stopReason };
}
