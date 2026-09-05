import { z } from "zod";
import { readDeliveryMetadata } from "./delivery-types";
import type { CommandCentreTask } from "./tasks";
import type { CommandCentreProject } from "./registry";

/** GitHub observations are read-only signals, never admission or completion receipts.
 * Docs verified 05/09/2026: https://docs.github.com/en/rest/pulls/reviews,
 * https://docs.github.com/en/rest/checks/runs, https://docs.github.com/en/rest/deployments/deployments.
 * Keep the existing REST version/token convention used by team-activity-github.
 */
const sha = z.string().regex(/^[a-f0-9]{40}$/i);
const id = z.number().int().positive().safe();
const text = z.string().max(1000);
const prSchema = z.object({
  number: id,
  head: z.object({ sha }),
  base: z.object({ repo: z.object({ full_name: text }) }),
  draft: z.boolean(),
  state: z.enum(["open", "closed"]),
  merged: z.boolean(),
  updated_at: z.string().datetime(),
});
const checkSchema = z.object({
  id,
  head_sha: sha,
  name: text,
  status: text,
  conclusion: text.nullable(),
});
const statusSchema = z.object({
  id,
  context: text,
  state: z.enum(["error", "failure", "pending", "success"]),
});
const reviewSchema = z.object({
  id,
  commit_id: sha,
  state: z.enum([
    "APPROVED",
    "CHANGES_REQUESTED",
    "COMMENTED",
    "DISMISSED",
    "PENDING",
  ]),
  user: z.object({ login: text }).nullable(),
  submitted_at: z.string().datetime().nullable().optional(),
});
const deploymentSchema = z.object({ id, sha, environment: text });
const deploymentStatusSchema = z.object({
  id,
  state: z.enum([
    "error",
    "failure",
    "pending",
    "in_progress",
    "queued",
    "success",
    "inactive",
  ]),
});

interface ObservationBinding {
  receiptId: string;
  commitSha: string;
  specRevision: number;
  specVersion: string;
  observedAt: string;
}
export interface CheckObservation extends ObservationBinding {
  name: string;
  status: string;
  conclusion: string | null;
}
export interface StatusObservation extends ObservationBinding {
  context: string;
  state: string;
}
export interface ReviewObservation extends ObservationBinding {
  reviewer: string | null;
  state: string;
  submittedAt: string | null;
  currentHead: boolean;
}
export interface DeploymentObservation extends ObservationBinding {
  environment: string;
  state: string;
  statusReceiptId: string | null;
}
export interface ObservationSource<T> {
  state: "observed" | "partial" | "unavailable";
  items: T[];
  detail?: string;
}
export interface DeliveryObservations {
  taskId: string;
  projectKey: string | null;
  specRevision: number | null;
  specVersion: string | null;
  source: "github";
  observedAt: string;
  state: "observed" | "partial" | "not_connected" | "unavailable" | "stale";
  headSha: string | null;
  pr: {
    reference: string;
    draft: boolean;
    state: "open" | "closed";
    merged: boolean;
  } | null;
  checks: ObservationSource<CheckObservation>;
  statuses: ObservationSource<StatusObservation>;
  reviews: ObservationSource<ReviewObservation>;
  deployments: ObservationSource<DeploymentObservation>;
  limitations: string[];
  liveVerification: "not_connected";
}

/** Only this exact registered repository can be queried; URLs are never fetched. */
export function registeredPullRequest(
  reference: string,
  repo: string | null,
): { repo: string; number: number; reference: string } | null {
  if (
    !repo ||
    !/^[a-z0-9][a-z0-9-]*\/[a-z0-9_.-]+$/i.test(repo) ||
    repo.endsWith("/.") ||
    repo.endsWith("/..")
  )
    return null;
  const match =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/([1-9][0-9]*)$/.exec(
      reference,
    );
  if (!match || `${match[1]}/${match[2]}`.toLowerCase() !== repo.toLowerCase())
    return null;
  const number = Number(match[3]);
  return Number.isSafeInteger(number)
    ? { repo, number, reference: `https://github.com/${repo}/pull/${number}` }
    : null;
}

const unavailable = <T>(detail: string): ObservationSource<T> => ({
  state: "unavailable",
  items: [],
  detail,
});
type Deps = {
  token: string | undefined;
  fetchFn?: typeof fetch;
  now?: () => Date;
};

export async function observeDelivery(
  task: CommandCentreTask,
  project: CommandCentreProject | undefined,
  deps: Deps,
): Promise<DeliveryObservations> {
  const meta = readDeliveryMetadata(task);
  const observedAt = (deps.now?.() ?? new Date()).toISOString();
  const result: DeliveryObservations = {
    taskId: task.id,
    projectKey: task.project_key,
    specRevision: meta?.revision ?? null,
    specVersion: meta?.specVersion ?? null,
    source: "github",
    observedAt,
    state: "unavailable",
    headSha: null,
    pr: null,
    checks: unavailable("No current PR observation"),
    statuses: unavailable("No current PR observation"),
    reviews: unavailable("No current PR observation"),
    deployments: unavailable("No current PR observation"),
    liveVerification: "not_connected",
    limitations: [
      "GitHub signals do not prove independent full review, release permission or a working authenticated user journey.",
      "Branch protection requirements and reviewer eligibility are not evaluated; observed does not mean approved or passing.",
      "Only deployments of the observed PR head are included; deployments of a different merge or squash commit are not verified here.",
      "Observations are a point-in-time snapshot and do not change mission status.",
      "The specification binding comes from the saved build handoff; this does not certify that later PR edits implement that specification.",
    ],
  };
  const stop = (
    message: string,
    state: DeliveryObservations["state"] = "unavailable",
  ) => {
    result.state = state;
    result.limitations.push(message);
    return result;
  };
  if (!meta?.build || !meta.specVersion)
    return stop(
      "A valid saved build reference and specification are required.",
    );
  if (
    meta.build.specRevision !== meta.revision ||
    meta.build.specFingerprint !== meta.specVersion
  )
    return stop("The saved build belongs to an older specification.", "stale");
  if (
    !project ||
    task.project_key !== meta.projectKey ||
    project.name.toLowerCase() !== meta.projectKey?.toLowerCase()
  )
    return stop(
      "The mission project cannot be matched to its registered repository.",
    );
  const pr = registeredPullRequest(meta.build.prRef, project.github_repo);
  if (!pr)
    return stop(
      "The saved pull request does not match the registered project repository.",
    );
  if (!deps.token?.trim())
    return stop(
      "GitHub evidence access is unavailable in this runtime.",
      "not_connected",
    );

  const fetchFn = deps.fetchFn ?? fetch;
  const deadline = AbortSignal.timeout(20_000);
  const headers = {
    authorization: `Bearer ${deps.token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  const root = `https://api.github.com/repos/${pr.repo}`;
  const get = async (path: string) => {
    const response = await fetchFn(`${root}${path}`, {
      headers,
      signal: AbortSignal.any([deadline, AbortSignal.timeout(8000)]),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const body = await response.text();
    if (body.length > 2_000_000)
      throw new Error("GitHub response exceeded observation limit");
    return {
      body: JSON.parse(body) as unknown,
      more: /rel="next"/.test(response.headers.get("link") ?? ""),
    };
  };
  const list = async <T>(
    path: string,
    schema: z.ZodType<T>,
    key?: string,
    expectedSha?: string,
  ): Promise<ObservationSource<T>> => {
    const items: T[] = [];
    try {
      for (let page = 1; page <= 3; page++) {
        const { body, more } = await get(
          `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
        );
        if (expectedSha && z.object({ sha }).parse(body).sha !== expectedSha)
          throw new Error("Provider SHA mismatch");
        const payload = key
          ? z
              .object({
                [key]: z.array(schema),
                total_count: z.number().int().nonnegative(),
              })
              .parse(body)
          : z.array(schema).parse(body);
        const batch = (
          key ? (payload as Record<string, unknown>)[key] : payload
        ) as T[];
        if (batch.length > 100)
          throw new Error("Unexpected provider page size");
        items.push(...batch);
        const count = key
          ? ((payload as Record<string, unknown>).total_count as number)
          : undefined;
        const hasMore =
          more ||
          (count !== undefined && count > items.length) ||
          batch.length === 100;
        if (!hasMore) return { state: "observed", items };
        if (page === 3 || batch.length === 0)
          return {
            state: "partial",
            items,
            detail:
              "Provider pagination limit reached; coverage is incomplete.",
          };
      }
    } catch {
      return {
        state: items.length ? "partial" : "unavailable",
        items,
        detail: "Provider access failed or returned malformed evidence.",
      };
    }
    return { state: "partial", items };
  };
  try {
    const initial = prSchema.parse((await get(`/pulls/${pr.number}`)).body);
    if (
      initial.number !== pr.number ||
      initial.base.repo.full_name.toLowerCase() !== pr.repo.toLowerCase()
    )
      return stop(
        "Provider PR identity does not match the registered repository.",
      );
    const head = initial.head.sha;
    const binding = (
      receiptId: string,
      commitSha = head,
    ): ObservationBinding => ({
      receiptId,
      commitSha,
      specRevision: meta.revision,
      specVersion: meta.specVersion!,
      observedAt,
    });
    const [checks, statuses, reviews, deployments] = await Promise.all([
      list(
        `/commits/${head}/check-runs?filter=latest`,
        checkSchema,
        "check_runs",
      ),
      list(`/commits/${head}/status`, statusSchema, "statuses", head),
      list(`/pulls/${pr.number}/reviews`, reviewSchema),
      // At most ten deployment status requests, independent of repository history.
      get(`/deployments?sha=${head}&per_page=10&page=1`)
        .then(
          async ({
            body,
            more,
          }): Promise<ObservationSource<DeploymentObservation>> => {
            const rows = z.array(deploymentSchema).max(10).parse(body);
            if (rows.some((row) => row.sha !== head))
              return unavailable(
                "Deployment SHA did not match the observed PR head.",
              );
            const entries = await Promise.all(
              rows.map(async (row) => {
                try {
                  const payload = await get(
                    `/deployments/${row.id}/statuses?per_page=1&page=1`,
                  );
                  const status = z
                    .array(deploymentStatusSchema)
                    .max(1)
                    .parse(payload.body)[0];
                  return {
                    ...binding(`deployment:${row.id}`),
                    environment: row.environment,
                    state: status?.state ?? "unknown",
                    statusReceiptId: status
                      ? `deployment-status:${status.id}`
                      : null,
                  };
                } catch {
                  return {
                    ...binding(`deployment:${row.id}`),
                    environment: row.environment,
                    state: "unavailable",
                    statusReceiptId: null,
                  };
                }
              }),
            );
            return {
              state:
                more ||
                rows.length === 10 ||
                entries.some((entry) => entry.state === "unavailable")
                  ? "partial"
                  : "observed",
              items: entries,
            };
          },
        )
        .catch(() =>
          unavailable<DeploymentObservation>(
            "Deployment access failed or returned malformed evidence.",
          ),
        ),
    ]);
    const final = prSchema.parse((await get(`/pulls/${pr.number}`)).body);
    if (
      final.head.sha !== head ||
      final.updated_at !== initial.updated_at ||
      final.base.repo.full_name.toLowerCase() !== pr.repo.toLowerCase() ||
      final.number !== pr.number ||
      final.merged !== initial.merged ||
      final.draft !== initial.draft ||
      final.state !== initial.state
    )
      return stop(
        "The pull request changed during observation. Refresh to obtain a consistent snapshot.",
        "stale",
      );
    result.headSha = head;
    result.pr = {
      reference: pr.reference,
      draft: initial.draft,
      merged: initial.merged,
      state: initial.state,
    };
    result.checks = checks.items.some((check) => check.head_sha !== head)
      ? unavailable("Check SHA did not match the observed PR head.")
      : {
          ...checks,
          items: checks.items.map((check) => ({
            ...binding(`check:${check.id}`),
            name: check.name,
            status: check.status,
            conclusion: check.conclusion,
          })),
        };
    result.statuses = {
      ...statuses,
      items: statuses.items.map((status) => ({
        ...binding(`status:${status.id}`),
        context: status.context,
        state: status.state,
      })),
    };
    result.reviews = {
      ...reviews,
      items: reviews.items.map((review) => ({
        ...binding(`review:${review.id}`, review.commit_id),
        reviewer: review.user?.login ?? null,
        state: review.state,
        submittedAt: review.submitted_at ?? null,
        currentHead: review.commit_id === head,
      })),
    };
    result.deployments = deployments;
    result.state = [
      result.checks,
      result.statuses,
      result.reviews,
      result.deployments,
    ].every((source) => source.state === "observed")
      ? "observed"
      : "partial";
    return result;
  } catch {
    return stop(
      "GitHub access failed or returned malformed PR evidence. Try refreshing later.",
    );
  }
}
