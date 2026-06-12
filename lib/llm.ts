import Anthropic from "@anthropic-ai/sdk";
import { getEnginePrompt } from "./engine-prompt";

// Provider routing: the engine can run on whichever plan currently has
// budget. Flip LLM_PROVIDER in env — no code change needed.
//   anthropic  → first-party API (claude-opus-4-8), needs ANTHROPIC_API_KEY
//   openrouter → OpenRouter credit as the metered bridge, needs OPENROUTER_API_KEY
//   minimax    → MiniMax plan (also the Phase 2 critic), needs MINIMAX_API_KEY
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
    const models = (process.env.OPENROUTER_MODEL ?? "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
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

export async function runEngine(vision: string): Promise<EngineResult> {
  const provider = getProvider();
  if (provider === "anthropic") return runAnthropic(vision);
  if (provider === "openrouter") {
    return runChatCompletions({
      provider,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      // Comma-separated list of slugs from openrouter.ai/models. The first
      // model is tried first; the rest are OpenRouter-side fallbacks (used
      // automatically when a model is rate-limited, down, or removed —
      // common with :free models).
      models: requireEnv("OPENROUTER_MODEL")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      vision,
    });
  }
  return runChatCompletions({
    provider,
    baseUrl: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1",
    apiKey: requireEnv("MINIMAX_API_KEY"),
    models: [process.env.MINIMAX_MODEL ?? "MiniMax-M2"],
    vision,
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (required for LLM_PROVIDER=${process.env.LLM_PROVIDER})`);
  return value;
}

async function runAnthropic(vision: string): Promise<EngineResult> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    system: getEnginePrompt(),
    messages: [{ role: "user", content: vision }],
  });
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
async function runChatCompletions(opts: {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  models: string[]; // first entry primary; extras are OpenRouter fallbacks
  vision: string;
}): Promise<EngineResult> {
  if (opts.models.length === 0) throw new Error(`${opts.provider}: no model configured`);

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
      max_tokens: 32000,
      messages: [
        { role: "system", content: getEnginePrompt() },
        { role: "user", content: opts.vision },
      ],
    }),
  });

  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    throw new Error(`${opts.provider} API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text: unknown = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error(`${opts.provider} returned no text content`);
  }
  return {
    text,
    provider: opts.provider,
    // OpenRouter reports which model actually served the request
    model: typeof data?.model === "string" ? data.model : opts.models[0],
    usage: data?.usage,
    stopReason: data?.choices?.[0]?.finish_reason ?? null,
  };
}
