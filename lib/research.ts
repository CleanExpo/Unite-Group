import { runPersona } from "./llm";

// Web channel (live research): before a run, hunt for fresh sources on the
// vision — articles, white papers/PDFs, and YouTube material — via the
// Tavily search API. Best-effort and optional: without TAVILY_API_KEY the
// channel skips exactly as before.

export interface WebSource {
  title: string;
  url: string;
  excerpt: string;
}

const MAX_SOURCES = 10;
const EXCERPT_CHARS = 2000;

export function researchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

const QUERY_PROMPT = `You turn a product/build vision into web search queries.
Output the 3 search queries most likely to surface high-quality, current
material (articles, white papers, research, expert videos) that would sharpen
a build spec for this vision. Each query 3-8 words. Output ONLY a numbered
list, one query per line. No commentary.`;

async function deriveQueries(vision: string): Promise<string[]> {
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

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

async function tavilySearch(
  query: string,
  maxResults: number,
  includeDomains?: string[],
): Promise<TavilyResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
      ...(includeDomains ? { include_domains: includeDomains } : {}),
    }),
  });
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

export async function webResearch(vision: string): Promise<WebSource[]> {
  if (!researchConfigured()) return [];

  const queries = await deriveQueries(vision);
  const searches = [
    ...queries.map((q) => tavilySearch(q, 4)),
    // dedicated video sweep on the strongest query
    tavilySearch(queries[0], 3, ["youtube.com"]),
  ];
  const settled = await Promise.allSettled(searches);

  const seen = new Set<string>();
  const sources: WebSource[] = [];
  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    for (const r of outcome.value) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      sources.push({
        title: r.title?.trim() || r.url,
        url: r.url,
        excerpt: (r.content ?? "").slice(0, EXCERPT_CHARS),
      });
      if (sources.length >= MAX_SOURCES) return sources;
    }
  }
  return sources;
}
