import Anthropic from "@anthropic-ai/sdk";
import { runPersona } from "./llm";

// Web channel (live research): before a run, hunt for fresh sources on the
// vision — articles, white papers/PDFs, and YouTube material — using the
// web-search capability of the LLM provider already configured. No extra
// service or key needed:
//   anthropic  → native web_search server tool
//   openrouter → built-in web plugin (Exa) on the existing key
// Best-effort and optional: without a capable provider the channel skips
// honestly, exactly as before.

import { parseSources, harvestSources, MAX_SOURCES, type WebSource } from "./sources";

export { parseSources };
export type { WebSource };

export type ResearchProvider = "anthropic" | "openrouter" | null;

export function researchProvider(): ResearchProvider {
  const preferred = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  if (preferred === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (preferred === "openrouter" && process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return null;
}

export function researchConfigured(): boolean {
  return researchProvider() !== null;
}

const RESEARCH_PROMPT = `You are the Web channel researcher for The Fable
System. Search the web for the 5-10 most valuable, current sources on the
vision you are given — articles, white papers, research documents, and
YouTube videos. Prefer recent, authoritative, and diverse sources; include
at least one video if a relevant one exists.

Do not give up: if a search angle returns nothing useful, rephrase and
search again with different terms before answering. Returning fewer than 5
sources is a failure unless the topic is genuinely obscure.

Output ONLY a numbered list, one source per line, in exactly this form:
N. Title | URL | 1-2 sentences on what it contributes to this vision
No preamble, no commentary, no closing remarks.`;

const QUERY_PROMPT = `You turn a product/build vision into search queries.
Output the 3 search queries most likely to surface high-quality, current
material (articles, white papers, research, expert videos) that would sharpen
a build spec for this vision. Each query 3-8 words. Output ONLY a numbered
list, one query per line. No commentary.`;

// Short, targeted queries derived from the brief — shared by the Web channel
// and the vault (Obsidian) FTS retrieval.
export async function deriveQueries(vision: string): Promise<string[]> {
  try {
    const result = await runPersona(QUERY_PROMPT, `The vision:\n\n${vision}`, 300);
    const queries = (result?.text ?? "")
      .split("\n")
      .map((line) => line.match(/^\s*\d+[.)]\s*(.+)$/)?.[1]?.trim())
      .filter((q): q is string => Boolean(q))
      .slice(0, 3);
    if (queries.length > 0) return queries;
  } catch {
    // fall through to the raw vision
  }
  return [vision.slice(0, 300)];
}


// Multi-round seeking ("dog with a bone"): search, look at what came back,
// name the evidence gaps, and search again for those — up to RESEARCH_ROUNDS
// (default 2) or until the source cap is hit.
export async function webResearch(
  vision: string,
  presetQueries?: string[],
): Promise<WebSource[]> {
  const provider = researchProvider();
  if (!provider) return [];

  const queries =
    presetQueries && presetQueries.length > 0 ? presetQueries : await deriveQueries(vision);
  const rounds = Math.min(4, Math.max(1, Number(process.env.RESEARCH_ROUNDS ?? 2) || 2));

  const seen = new Set<string>();
  const sources: WebSource[] = [];
  let user = `Research this vision:\n\n${vision}\n\nStart from these search angles:\n${queries
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n")}`;

  for (let round = 1; round <= rounds; round++) {
    const text =
      provider === "anthropic" ? await anthropicResearch(user) : await openrouterResearch(user);
    let found = parseSources(text);
    // A flaky model writing prose instead of the list must not kill the
    // channel — harvest any URLs it mentioned.
    if (found.length === 0 && text.trim().length > 0) found = harvestSources(text);
    for (const source of found) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push(source);
    }
    if (sources.length >= MAX_SOURCES || round === rounds) break;

    user = `Vision:\n\n${vision}\n\nSources already found:\n${sources
      .map((s) => `- ${s.title} (${s.url})`)
      .join(
        "\n",
      )}\n\nName the biggest remaining evidence gaps for a build spec on this vision (market numbers, technical feasibility, competing products, real costs, expert walkthroughs) and SEARCH for sources that fill them. Do not repeat URLs already found.`;
  }
  return sources.slice(0, MAX_SOURCES);
}

async function anthropicResearch(user: string): Promise<string> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: process.env.RESEARCH_MODEL ?? process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
    max_tokens: 2000,
    system: RESEARCH_PROMPT,
    messages: [{ role: "user", content: user }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
  });
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

// Bulldog mode: walk the whole configured model list (RESEARCH_MODEL first if
// set). A model that errors or returns nothing usable hands off to the next —
// the free-tier primary flaking must never kill the channel.
async function openrouterResearch(user: string): Promise<string> {
  const configured = (process.env.OPENROUTER_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const models = [
    ...(process.env.RESEARCH_MODEL ? [process.env.RESEARCH_MODEL] : []),
    ...configured,
  ];
  if (models.length === 0) throw new Error("OPENROUTER_MODEL is not set");

  let lastError = "all research models returned nothing";
  for (const model of models) {
    try {
      const res = await fetch(
        `${process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            // OpenRouter's web plugin grounds the call with live search results.
            plugins: [{ id: "web", max_results: 5 }],
            // Reasoning models (e.g. Kimi K2.6) burn budget thinking before
            // they emit content — give headroom and ask for minimal effort.
            max_tokens: 8000,
            reasoning: { effort: "low" },
            messages: [
              { role: "system", content: RESEARCH_PROMPT },
              { role: "user", content: user },
            ],
          }),
        },
      );
      if (!res.ok) {
        lastError = `openrouter research ${res.status} on ${model}: ${(await res.text()).slice(0, 300)}`;
        continue;
      }
      const data = await res.json();
      const message = data?.choices?.[0]?.message;
      // Reasoning models may leave content empty and put everything in the
      // reasoning field — its prose still names URLs the harvester can mine.
      const candidates: unknown[] = [message?.content, message?.reasoning, message?.reasoning_content];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
      }
      lastError = `${model} returned empty research output (finish: ${data?.choices?.[0]?.finish_reason ?? "?"})`;
    } catch (error) {
      lastError = `${model}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  throw new Error(lastError);
}
