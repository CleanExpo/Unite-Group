import { getSupabase } from "./supabase";

// Phase 3 ingestion: pulls Markdown notes from the knowledge repo (the
// Obsidian vault, e.g. CleanExpo/brain-1) into Supabase, where engine runs
// search them. The vault repo stays the source of truth; this is a synced
// read-only copy.

const MAX_FILES = 800;
const MAX_FILE_BYTES = 150_000;
const BATCH = 10;

interface RepoRef {
  owner: string;
  repo: string;
}

function knowledgeRepo(): RepoRef | null {
  const slug = process.env.KNOWLEDGE_REPO;
  if (!slug) return null;
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) throw new Error(`KNOWLEDGE_REPO must be owner/repo, got "${slug}"`);
  return { owner, repo };
}

function githubHeaders(raw = false): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function github(url: string, raw = false): Promise<Response> {
  const res = await fetch(url, { headers: githubHeaders(raw) });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`GitHub API ${res.status} on ${url.split("?")[0]}: ${body}`);
  }
  return res;
}

export interface IngestResult {
  repo: string;
  markdownFiles: number;
  ingested: number;
  skippedLarge: number;
  truncatedAt: number | null;
}

export async function ingestKnowledgeRepo(): Promise<IngestResult> {
  const ref = knowledgeRepo();
  if (!ref) throw new Error("KNOWLEDGE_REPO is not set");
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const repoInfo = await (await github(`https://api.github.com/repos/${ref.owner}/${ref.repo}`)).json();
  const branch: string = repoInfo.default_branch;

  const tree = await (
    await github(`https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${branch}?recursive=1`)
  ).json();

  const all = (tree.tree as Array<{ path: string; type: string; sha: string; size?: number }>)
    .filter((entry) => entry.type === "blob" && entry.path.toLowerCase().endsWith(".md"));
  const small = all.filter((entry) => (entry.size ?? 0) <= MAX_FILE_BYTES);
  const files = small.slice(0, MAX_FILES);

  let ingested = 0;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const rows = await Promise.all(
      batch.map(async (file) => {
        const res = await github(
          `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${encodeURIComponent(file.path).replaceAll("%2F", "/")}?ref=${branch}`,
          true,
        );
        const content = await res.text();
        const title = file.path.split("/").pop()!.replace(/\.md$/i, "");
        return {
          source_repo: `${ref.owner}/${ref.repo}`,
          path: file.path,
          title,
          content,
          sha: file.sha,
          updated_at: new Date().toISOString(),
        };
      }),
    );
    const { error } = await supabase
      .from("knowledge_docs")
      .upsert(rows, { onConflict: "source_repo,path" });
    if (error) throw new Error(`supabase knowledge upsert: ${error.message}`);
    ingested += rows.length;
  }

  return {
    repo: `${ref.owner}/${ref.repo}`,
    markdownFiles: all.length,
    ingested,
    skippedLarge: all.length - small.length,
    truncatedAt: small.length > MAX_FILES ? MAX_FILES : null,
  };
}

export interface KnowledgeHit {
  path: string;
  title: string;
  excerpt: string;
}

const MAX_HITS = 5;
const EXCERPT_CHARS = 3500;

// Full-text search over ingested notes; used to assemble the engine's
// Obsidian-channel material for a run.
export async function searchKnowledge(query: string): Promise<KnowledgeHit[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("knowledge_docs")
    .select("path, title, content")
    .textSearch("fts", query, { type: "websearch" })
    .limit(MAX_HITS);
  if (error || !data) return [];

  return data.map((doc) => ({
    path: doc.path,
    title: doc.title,
    excerpt: doc.content.slice(0, EXCERPT_CHARS),
  }));
}

export async function knowledgeCount(): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { count, error } = await supabase
    .from("knowledge_docs")
    .select("id", { count: "exact", head: true });
  if (error) return null;
  return count ?? 0;
}
