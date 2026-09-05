import { z } from "zod";

export interface DeliveryRepository {
  fullName: string;
  private: boolean;
  archived: boolean;
}
export type RepositoryCatalogueStatus =
  | "complete"
  | "partial"
  | "not_connected"
  | "auth_error"
  | "rate_limited"
  | "unavailable";
export interface DeliveryRepositoryCatalogue {
  repositories: DeliveryRepository[];
  status: RepositoryCatalogueStatus;
  message: string;
  nextCursor: string | null;
  observedAt: string;
  coverage: string;
  incomplete: boolean;
  retryAfterSeconds?: number;
}
interface GithubReadDeps {
  token?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}
export const repositoryFullNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/)
  .refine((name) => ![".", ".."].includes(name.split("/")[1]));
const githubRepositorySchema = z.object({
  full_name: repositoryFullNameSchema,
  private: z.boolean(),
  archived: z.boolean(),
});
const COVERAGE =
  "Repositories available through the Mission Control GitHub connection, including private and organisation repositories. GitHub permissions determine which repositories are visible.";
const MAX_PAGE = 10000;
export function parseRepositoryCursor(cursor: string | null): number | null {
  if (cursor === null) return 1;
  if (!/^[1-9][0-9]{0,4}$/.test(cursor)) return null;
  const page = Number(cursor);
  return page <= MAX_PAGE ? page : null;
}

class GithubRepositoryReadError extends Error {
  constructor(
    public status: Exclude<RepositoryCatalogueStatus, "complete" | "partial">,
    message: string,
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

async function githubRead(
  path: string,
  deps: GithubReadDeps,
): Promise<{ response: Response; body: unknown }> {
  const token = (deps.token ?? process.env.GITHUB_TOKEN)?.trim();
  if (!token)
    throw new GithubRepositoryReadError(
      "not_connected",
      "Connect GitHub to list and select accessible repositories.",
    );
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await (deps.fetchFn ?? fetch)(
          `https://api.github.com${path}`,
          {
            method: "GET",
            cache: "no-store",
            redirect: "error",
            signal: controller.signal,
            headers: {
              authorization: `Bearer ${token}`,
              accept: "application/vnd.github+json",
              "x-github-api-version": "2022-11-28",
            },
          },
        );
        if (!response.ok) {
          const retry = response.headers.get("retry-after");
          const reset = Number(response.headers.get("x-ratelimit-reset"));
          const limited =
            response.status === 429 ||
            (response.status === 403 &&
              (retry !== null ||
                response.headers.get("x-ratelimit-remaining") === "0"));
          if (limited) {
            const seconds =
              retry && /^\d+$/.test(retry)
                ? Number(retry)
                : Number.isFinite(reset) && reset > 0
                  ? Math.max(
                      1,
                      Math.ceil(reset - (deps.now ?? Date.now)() / 1000),
                    )
                  : 60;
            throw new GithubRepositoryReadError(
              "rate_limited",
              "GitHub has temporarily limited repository reads. Try again later.",
              Math.min(86400, Math.max(1, seconds)),
            );
          }
          if ([401, 403].includes(response.status))
            throw new GithubRepositoryReadError(
              "auth_error",
              "The GitHub connection cannot read repositories. Check its permissions and organisation authorisation.",
            );
          if (response.status === 404)
            throw new GithubRepositoryReadError(
              "unavailable",
              "The selected repository is unavailable to the Mission Control GitHub connection. Its access or name may have changed.",
            );
          throw new GithubRepositoryReadError(
            "unavailable",
            "GitHub repository data is temporarily unavailable. Retry later.",
          );
        }
        return { response, body: (await response.json()) as unknown };
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new GithubRepositoryReadError(
              "unavailable",
              "The GitHub repository read timed out. Retry later.",
            ),
          );
        }, deps.timeoutMs ?? 10000);
      }),
    ]);
  } catch (error) {
    if (error instanceof GithubRepositoryReadError) throw error;
    throw new GithubRepositoryReadError(
      "unavailable",
      "GitHub repository data could not be read. Retry later.",
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function repository(raw: unknown): DeliveryRepository | null {
  const parsed = githubRepositorySchema.safeParse(raw);
  return parsed.success
    ? {
        fullName: parsed.data.full_name,
        private: parsed.data.private,
        archived: parsed.data.archived,
      }
    : null;
}

/** One bounded read per request; callers explicitly traverse all nextCursor pages. */
export async function listDeliveryRepositories(
  cursor: string | null = null,
  deps: GithubReadDeps = {},
): Promise<DeliveryRepositoryCatalogue> {
  const base = {
    repositories: [] as DeliveryRepository[],
    nextCursor: null,
    observedAt: new Date((deps.now ?? Date.now)()).toISOString(),
    coverage: COVERAGE,
    incomplete: true,
  };
  const page = parseRepositoryCursor(cursor);
  if (page === null)
    return {
      ...base,
      status: "unavailable",
      message: "The repository page is invalid. Restart the repository list.",
    };
  try {
    const query = new URLSearchParams({
      visibility: "all",
      affiliation: "owner,collaborator,organization_member",
      sort: "full_name",
      direction: "asc",
      per_page: "100",
      page: String(page),
    });
    const { response, body } = await githubRead(`/user/repos?${query}`, deps);
    if (!Array.isArray(body) || body.length > 100)
      throw new Error("invalid_repository_page");
    const repositories = new Map<string, DeliveryRepository>();
    let malformed = false;
    for (const raw of body) {
      const value = repository(raw);
      if (value) repositories.set(value.fullName.toLowerCase(), value);
      else malformed = true;
    }
    const link = response.headers.get("link");
    const hasNext = !!link && /rel="next"/.test(link);
    // Never follow provider URLs. Only generate the next numeric page on this fixed endpoint.
    const nextCursor =
      (hasNext || (!link && body.length === 100)) && page < MAX_PAGE
        ? String(page + 1)
        : null;
    const incomplete =
      malformed || (page === MAX_PAGE && (hasNext || body.length === 100));
    const partial = !!nextCursor || incomplete;
    return {
      ...base,
      repositories: [...repositories.values()],
      nextCursor,
      incomplete,
      status: partial ? "partial" : "complete",
      message: malformed
        ? "Some GitHub repository entries could not be read. This list is incomplete; refresh it."
        : nextCursor
          ? "More accessible repositories are available. Load the next page to continue."
          : partial
            ? "The repository page safety limit was reached. This list is incomplete."
            : "This is the final page of repositories available through the Mission Control GitHub connection.",
    };
  } catch (error) {
    if (error instanceof GithubRepositoryReadError)
      return {
        ...base,
        status: error.status,
        message: error.message,
        ...(error.retryAfterSeconds
          ? { retryAfterSeconds: error.retryAfterSeconds }
          : {}),
      };
    return {
      ...base,
      status: "unavailable",
      message: "GitHub returned an unreadable repository page. Retry later.",
    };
  }
}

export async function readDeliveryRepository(
  fullName: string,
  deps: GithubReadDeps = {},
): Promise<DeliveryRepository> {
  const valid = repositoryFullNameSchema.safeParse(fullName);
  if (!valid.success)
    throw new GithubRepositoryReadError(
      "unavailable",
      "Select an exact GitHub owner/repository name.",
    );
  const { body } = await githubRead(
    `/repos/${valid.data.split("/").map(encodeURIComponent).join("/")}`,
    deps,
  );
  const found = repository(body);
  if (!found || found.fullName.toLowerCase() !== fullName.toLowerCase())
    throw new GithubRepositoryReadError(
      "unavailable",
      "The repository identity changed. Refresh the repository list and select it again.",
    );
  return found;
}

export function repositoryReadFailure(error: unknown): {
  code: string;
  message: string;
} {
  return error instanceof GithubRepositoryReadError
    ? { code: `repository_${error.status}`, message: error.message }
    : {
        code: "repository_unavailable",
        message:
          "The selected repository could not be verified. Retry when the GitHub connection is available.",
      };
}
