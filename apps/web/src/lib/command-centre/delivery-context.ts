import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Reuses the knowledge console's search RPC and founder-scoped note reader.
 * DB gate 05/09/2026, prod lksfwktwtmyznckodsau (read-only): knowledge_notes
 * id/founder_id/project_key/title/content/updated_at/is_deleted; knowledge_projects
 * key/label/founder_id; SELECT policies founder_id=auth.uid(); search_knowledge_notes
 * is SECURITY INVOKER, requires auth.uid(), excludes deleted rows and caps p_limit.
 * No new schema, provider, fallback search syntax or service-role client.
 */
export interface DeliveryContextNote {
  id: string;
  title: string;
  reference: string;
  excerpt: string;
  projectKey: string;
  updatedAt: string;
  ageDays: number;
  excerptTruncated: boolean;
  authority: "source_material_only";
}
export interface DeliveryContext {
  state: "available" | "partial" | "empty" | "unavailable";
  source: "knowledge_notes";
  observedAt: string;
  coverage: string;
  notes: DeliveryContextNote[];
  truncated: boolean;
}
type QueryResult = { data: unknown; error: unknown };
interface ContextQuery extends PromiseLike<QueryResult> {
  select(columns: string): ContextQuery;
  eq(column: string, value: string | boolean): ContextQuery;
  in(column: string, values: string[]): ContextQuery;
  limit(count: number): ContextQuery;
  abortSignal(signal: AbortSignal): ContextQuery;
}
export interface DeliveryContextClient {
  from(table: string): ContextQuery;
  rpc(
    name: string,
    args: {
      p_founder_id: string;
      p_query: string;
      p_project_key?: string;
      p_limit: number;
    },
  ): ContextQuery;
}
const uuid = z.string().uuid();
const projectSchema = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(240),
  founder_id: uuid,
});
const noteSchema = z.object({
  id: uuid,
  founder_id: uuid,
  project_key: z.string().min(1).max(120),
  title: z.string().min(1).max(1000),
  content: z.string().max(500_000),
  updated_at: z.string().datetime({ offset: true }),
  is_deleted: z.literal(false),
});
const MAX_QUERY_CHARS = 240;
const MAX_NOTES = 3;
const MAX_EXCERPT_CHARS = 800;

/** Pass only server-resolved identity. Returned text remains untrusted data: callers
 * must keep it structurally separate from system instructions and current approval.
 * Coverage is at most three matched saved notes, never all conversations/history.
 */
export async function readDeliveryContext(
  input: { founderId: string; idea: string; projectKey: string | null },
  deps: { client?: DeliveryContextClient; now?: () => Date } = {},
): Promise<DeliveryContext> {
  const now = deps.now?.() ?? new Date();
  const result: DeliveryContext = {
    state: "unavailable",
    source: "knowledge_notes",
    observedAt: now.toISOString(),
    coverage:
      "Saved knowledge notes only; this does not search every conversation or establish current authority.",
    notes: [],
    truncated: false,
  };
  const stop = (
    detail: string,
    state: DeliveryContext["state"] = "unavailable",
  ) => {
    result.state = state;
    result.coverage += ` ${detail}`;
    return result;
  };
  if (
    !uuid.safeParse(input.founderId).success ||
    typeof input.idea !== "string" ||
    !input.idea.trim() ||
    (input.projectKey !== null &&
      (typeof input.projectKey !== "string" ||
        !input.projectKey.trim() ||
        input.projectKey.length > 120))
  )
    return stop("A valid founder, idea and project scope are required.");
  // The existing RPC also uses ILIKE: do not let wildcard-only text select
  // unrelated notes. Values still travel exclusively as RPC parameters.
  const query = input.idea
    .trim()
    .slice(0, MAX_QUERY_CHARS)
    .replace(/[%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!query)
    return stop("The idea has no searchable text within the context limit.");
  result.truncated = input.idea.trim().length > MAX_QUERY_CHARS;
  if (result.truncated)
    result.coverage +=
      " Search uses only the first 240 characters of the idea.";
  try {
    const db =
      deps.client ??
      ((await createClient()) as unknown as DeliveryContextClient);
    const signal = AbortSignal.timeout(10_000);
    let projectKey: string | undefined;
    if (input.projectKey) {
      const projects = await db
        .from("knowledge_projects")
        .select("key,label,founder_id")
        .eq("founder_id", input.founderId)
        .limit(100)
        .abortSignal(signal);
      if (projects.error)
        return stop("The saved knowledge project mapping is unavailable.");
      const parsed = z.array(projectSchema).max(100).safeParse(projects.data);
      if (
        !parsed.success ||
        parsed.data.some((project) => project.founder_id !== input.founderId)
      )
        return stop(
          "The saved knowledge project mapping could not be validated.",
        );
      if (parsed.data.length === 100)
        return stop(
          "The project lookup reached its coverage limit; project matching is unresolved.",
        );
      const requested = input.projectKey.trim().toLowerCase();
      const matches = parsed.data.filter(
        (project) =>
          project.key.toLowerCase() === requested ||
          project.label.toLowerCase() === requested,
      );
      if (matches.length !== 1)
        return stop(
          "The selected business has no unambiguous saved knowledge project mapping.",
        );
      projectKey = matches[0]!.key;
    }
    // The existing RPC uses parameterised plainto_tsquery/ILIKE. Project is omitted
    // only when the mission intentionally has no project, never on mapping failure.
    const search = await db
      .rpc("search_knowledge_notes", {
        p_founder_id: input.founderId,
        p_query: query,
        ...(projectKey ? { p_project_key: projectKey } : {}),
        p_limit: MAX_NOTES,
      })
      .select("id")
      .abortSignal(signal);
    if (search.error)
      return stop(
        "Knowledge search is unavailable; no substitute notes were used.",
      );
    const candidates = z
      .array(z.object({ id: uuid }))
      .max(MAX_NOTES)
      .safeParse(search.data);
    if (!candidates.success)
      return stop("Knowledge search returned an invalid result.");
    const ids = [...new Set(candidates.data.map((note) => note.id))];
    if (!ids.length)
      return stop("No saved notes matched this bounded search.", "empty");
    // Do not accept RPC-supplied excerpt, URL, identity or timestamps. Re-read the
    // selected IDs through exactly the authenticated note detail filters.
    let read = db
      .from("knowledge_notes")
      .select("id,founder_id,project_key,title,content,updated_at,is_deleted")
      .eq("founder_id", input.founderId)
      .eq("is_deleted", false)
      .in("id", ids)
      .limit(MAX_NOTES);
    if (projectKey) read = read.eq("project_key", projectKey);
    const notes = await read.abortSignal(signal);
    if (notes.error) return stop("Matched note contents could not be read.");
    if (!Array.isArray(notes.data) || notes.data.length > MAX_NOTES)
      return stop("Matched note contents returned an invalid result.");
    let omitted = false;
    const validated = new Map<string, z.infer<typeof noteSchema>>();
    for (const raw of notes.data) {
      const note = noteSchema.safeParse(raw);
      if (
        !note.success ||
        note.data.founder_id !== input.founderId ||
        !ids.includes(note.data.id) ||
        (projectKey && note.data.project_key !== projectKey) ||
        Date.parse(note.data.updated_at) > now.getTime() + 300_000 ||
        validated.has(note.data.id)
      ) {
        omitted = true;
        continue;
      }
      validated.set(note.data.id, note.data);
    }
    for (const id of ids) {
      const note = validated.get(id);
      if (!note) {
        omitted = true;
        continue;
      }
      const content = note.content.trim();
      if (!content) {
        omitted = true;
        continue;
      }
      result.notes.push({
        id,
        title: note.title.slice(0, 240),
        reference: `/api/knowledge/notes/${id}`,
        excerpt: content.slice(0, MAX_EXCERPT_CHARS),
        projectKey: note.project_key,
        updatedAt: note.updated_at,
        ageDays: Math.max(
          0,
          Math.floor(
            (now.getTime() - Date.parse(note.updated_at)) / 86_400_000,
          ),
        ),
        excerptTruncated: content.length > MAX_EXCERPT_CHARS,
        authority: "source_material_only",
      });
    }
    result.truncated ||=
      candidates.data.length === MAX_NOTES ||
      result.notes.some((note) => note.excerptTruncated);
    if (!result.notes.length)
      return stop(
        "Matched notes could not be validated within the current founder/project scope.",
      );
    result.state = omitted ? "partial" : "available";
    result.coverage += ` Read ${result.notes.length} matched note${result.notes.length === 1 ? "" : "s"}; maximum three, excerpts maximum 800 characters each. Note update times describe the saved copy, not freshness of its underlying claims.`;
    if (omitted)
      result.coverage +=
        " Some matches were omitted because their contents, scope or provenance could not be validated.";
    return result;
  } catch {
    return stop("The saved knowledge source is unavailable in this runtime.");
  }
}
