import Anthropic from "@anthropic-ai/sdk";

// Web channel (live research): before a run, hunt for fresh sources on the
// vision — articles, white papers/PDFs, and YouTube material — using the
// web-search capability of the LLM provider already configured. No extra
// service or key needed:
//   anthropic  → native web_search server tool
//   openrouter → built-in web plugin (Exa) on the existing key
// Best-effort and optional: without a capable provider the channel skips
// honestly, exactly as before.

export interface WebSource {
  title: string;
  url: string;
  excerpt: string;
}

const MAX_SOURCES = 10;

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

Output ONLY a numbered list, one source per line, in exactly this form:
N. Title | URL | 1-2 sentences on what it contributes to this vision
No preamble, no commentary, no closing remarks.`;

// Parses the researcher's numbered "Title | URL | summary" lines, tolerating
// missing pipes by falling back to any numbered line that contains a URL.
export function parseSources(text: string): WebSource[] {
  const sources: WebSource[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    if (!/^\s*\d+[.)]/.test(line)) continue;
    let title: string | undefined;
    let url: string | undefined;
    let excerpt = "";
    const piped = line.match(/^\s*\d+[.)]\s*(.+?)\s*\|\s*(https?:\/\/[^\s|]+)\s*\|\s*(.+)$/);
    if (piped) {
      [, title, url, excerpt] = piped;
    } else {
      url = line.match(/https?:\/\/[^\s)\]"']+/)?.[0];
      if (!url) continue;
      title = line
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(url, "")
        .replace(/[|\\—–\-:()[\]]+/g, " ")
        .trim();
    }
    url = url.replace(/[.,;)\]]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: (title || url).trim(), url, excerpt: excerpt.trim() });
    if (sources.length >= MAX_SOURCES) break;
  }
  return sources;
}

export async function webResearch(vision: string): Promise<WebSource[]> {
  const provider = researchProvider();
  if (!provider) return [];
  const user = `Research this vision:\n\n${vision}`;
  const text =
    provider === "anthropic" ? await anthropicResearch(user) : await openrouterResearch(user);
  return parseSources(text);
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

async function openrouterResearch(user: string): Promise<string> {
  const models = (process.env.OPENROUTER_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const model = process.env.RESEARCH_MODEL ?? models[0];
  if (!model) throw new Error("OPENROUTER_MODEL is not set");

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
        max_tokens: 2000,
        messages: [
          { role: "system", content: RESEARCH_PROMPT },
          { role: "user", content: user },
        ],
      }),
    },
  );
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`openrouter research ${res.status}: ${body}`);
  }
  const data = await res.json();
  const text: unknown = data?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text : "";
}
