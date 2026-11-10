#!/usr/bin/env node
/**
 * Turn a non-draft pull request back to draft when a gate that `main` requires is red.
 *
 * WHY THIS EXISTS. On 05/11/2026 the same kind of failure happened four times in one day:
 * a PR sat in front of the founder as "ready" while a gate that main requires was red.
 *   - #1366 and #1367: an unresolved CodeRabbit thread (main requires conversation
 *     resolution) and no nexus/release-receipt.
 *   - #1371 (a Cursor cloud agent) and #1372 (Claude off the PC): the commit-message
 *     check was red and there was no receipt. Cloud agents do not run the local
 *     pr-release-gate hooks, so nothing on their side stopped them.
 * Nothing turned a blocked PR back to draft. This script is that step. It runs on GitHub
 * for every agent, so it does not depend on any local hook being installed.
 *
 * ONE OWNER FOR "REQUIRED". The script does not keep its own list of required checks.
 * GitHub answers `isRequired(pullRequestNumber:)` for every check run and status on the
 * PR's head, from main's own protection rules. The one name written here is
 * nexus/release-receipt, because a receipt that was never posted does not appear on the
 * head at all, so GitHub cannot report it as failing.
 *
 * WHEN IT RUNS. No pull_request trigger, on purpose (UNI-3289):
 *   - workflow_run: Monorepo CI completed on a head; open PRs with that exact head are judged.
 *   - schedule / workflow_dispatch: a sweep judges every open non-draft PR on main, so a PR
 *     that was opened, marked ready or reviewed while red is caught even if CI did not re-run.
 *
 * WHEN A MISSING RECEIPT COUNTS. Only after Monorepo CI has finished on the PR's head: the
 * release gate publishes the receipt after GitHub is green, so before that it cannot exist.
 * One function owns "finished", `ciFinishedOnHead`, for both events. It reads GitHub's own
 * list of Monorepo CI runs for that exact commit and says yes only when at least one run
 * exists and every one is completed. It does not infer this from individual check runs (one
 * job can finish while the run's later jobs have not appeared yet), nor from the
 * workflow_run event (another run on the same commit can still be going). A failed required
 * check and an open review thread count at any time.
 * GitHub runs both from the default branch only, so PR code never runs with this token.
 *
 * WHAT IT MAY DO. Exactly two writes, both checked at run time by `guardedApi`:
 *   1. the GraphQL mutation convertPullRequestToDraft;
 *   2. one issue comment on that PR (POST /repos/{owner}/{repo}/issues/{n}/comments).
 * It never merges, closes, readies, labels, edits or re-runs anything. Any other write
 * throws before it is sent.
 *
 * FAIL LOUD. A read that fails, a page that is not complete, or required flags that
 * cannot be read all throw. The workflow run then shows red. A failed read must never
 * look like a clean PR.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const RECEIPT_CONTEXT = 'nexus/release-receipt';
export const BASE_BRANCH = 'main';
/**
 * The CI workflow whose completion this script waits for: its `name:` (which draft-on-red.yml's
 * workflow_run trigger names) and its file (which the run list is read from). A test checks
 * that this file exists and carries this name.
 */
export const CI_WORKFLOW = 'Monorepo CI';
export const CI_WORKFLOW_FILE = 'ci.yml';

/** Check-run conclusions that GitHub's branch protection treats as not passing. */
export const RED_CONCLUSIONS = Object.freeze([
  'FAILURE',
  'TIMED_OUT',
  'CANCELLED',
  'ACTION_REQUIRED',
  'STARTUP_FAILURE',
  'STALE',
]);
/** Commit-status states that are not passing. */
export const RED_STATES = Object.freeze(['FAILURE', 'ERROR']);

/** Events that sweep every open PR on main instead of one head. */
export const SWEEP_EVENTS = Object.freeze(['schedule', 'workflow_dispatch']);
/** A sweep reads at most this many pages of 100 PRs; more than that fails the run. */
export const MAX_SWEEP_PAGES = 10;

/** The one REST read a sweep may send: one page of open PRs on main. */
export function sweepPath(owner, repo, page) {
  return `/repos/${owner}/${repo}/pulls?state=open&base=${BASE_BRANCH}&per_page=100&page=${page}`;
}

/** The one Actions read: every CI_WORKFLOW run on one commit (one page of 100). */
export function ciRunsPath(owner, repo, sha) {
  return `/repos/${owner}/${repo}/actions/workflows/${CI_WORKFLOW_FILE}/runs?head_sha=${sha}&per_page=100`;
}

export const PR_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
      number
      state
      isDraft
      baseRefName
      headRefOid
      reviewThreads(first: 100) {
        totalCount
        pageInfo { hasNextPage }
        nodes { isResolved }
      }
      commits(last: 1) {
        nodes {
          commit {
            oid
            statusCheckRollup {
              contexts(first: 100) {
                pageInfo { hasNextPage }
                nodes {
                  __typename
                  ... on CheckRun { name status conclusion isRequired(pullRequestNumber: $number) }
                  ... on StatusContext { context state isRequired(pullRequestNumber: $number) }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

export const DRAFT_MUTATION = `mutation($id: ID!) {
  convertPullRequestToDraft(input: { pullRequestId: $id }) {
    pullRequest { number isDraft }
  }
}`;

/**
 * Normalise the GraphQL answer into the plain shape `decide` reads.
 * Throws on anything incomplete, so a partial read can never look clean.
 */
export function normalisePr(data) {
  const pr = data?.repository?.pullRequest;
  if (!pr) throw new Error('GraphQL returned no pullRequest');
  if (pr.reviewThreads?.pageInfo?.hasNextPage) {
    throw new Error(`PR #${pr.number}: more than 100 review threads; refusing to judge from a partial page`);
  }
  const commit = pr.commits?.nodes?.[0]?.commit;
  if (!commit) throw new Error(`PR #${pr.number}: no head commit in the answer`);
  const contextsPage = commit.statusCheckRollup?.contexts;
  if (contextsPage?.pageInfo?.hasNextPage) {
    throw new Error(`PR #${pr.number}: more than 100 checks on the head; refusing to judge from a partial page`);
  }
  const contexts = (contextsPage?.nodes ?? []).map((node) => (node.__typename === 'StatusContext'
    ? { kind: 'status', name: node.context, state: node.state, isRequired: node.isRequired === true }
    : { kind: 'check', name: node.name, status: node.status, conclusion: node.conclusion, isRequired: node.isRequired === true }));
  return {
    id: pr.id,
    number: pr.number,
    state: pr.state,
    isDraft: pr.isDraft === true,
    baseRefName: pr.baseRefName,
    headSha: pr.headRefOid,
    rollupSha: commit.oid,
    unresolvedThreads: (pr.reviewThreads?.nodes ?? []).filter((t) => t.isResolved !== true).length,
    contexts,
  };
}

function isRed(ctx) {
  if (ctx.kind === 'status') return RED_STATES.includes(String(ctx.state).toUpperCase());
  return String(ctx.status).toUpperCase() === 'COMPLETED'
    && RED_CONCLUSIONS.includes(String(ctx.conclusion).toUpperCase());
}

function isGreen(ctx) {
  if (ctx.kind === 'status') return String(ctx.state).toUpperCase() === 'SUCCESS';
  return String(ctx.status).toUpperCase() === 'COMPLETED' && String(ctx.conclusion).toUpperCase() === 'SUCCESS';
}

/**
 * Has CI_WORKFLOW finished on this commit? The only owner of that answer, for every event.
 * Reads GitHub's list of CI_WORKFLOW runs for `sha`. True only when at least one run exists
 * and every run is completed (a re-run puts its run back to queued). No run yet means CI has
 * not started, so the answer is no. A partial page, an answer that is not a run list, or a
 * run for another commit throws: a read that cannot be trusted must not look finished.
 */
export async function ciFinishedOnHead({ api, owner, repo, sha }) {
  const answer = await api.rest('GET', ciRunsPath(owner, repo, sha));
  const runs = answer?.workflow_runs;
  if (!Array.isArray(runs) || !Number.isInteger(answer.total_count)) {
    throw new Error(`listing ${CI_WORKFLOW} runs for ${sha.slice(0, 8)} did not return a run list`);
  }
  if (answer.total_count > runs.length) {
    throw new Error(`${answer.total_count} ${CI_WORKFLOW} runs on ${sha.slice(0, 8)} but ${runs.length} read; refusing to judge from a partial page`);
  }
  for (const r of runs) {
    if (r?.head_sha !== sha) {
      throw new Error(`asked for ${CI_WORKFLOW} runs on ${sha.slice(0, 8)}, got one on ${String(r?.head_sha).slice(0, 8)}; the commit filter cannot be trusted`);
    }
  }
  return runs.length > 0 && runs.every((r) => r.status === 'completed');
}

/**
 * Pure decision. Returns { action: 'none' | 'draft', reason, gates }.
 * `expectedHeadSha`, when given, is the SHA the triggering event was about.
 * `ciFinished` is `ciFinishedOnHead`'s answer for that SHA.
 * A missing receipt counts as red only after CI has finished on the head: before that, the
 * receipt cannot exist yet (the release gate publishes it only after GitHub is green).
 * A required check that has already failed counts at any time.
 */
export function decide(pr, { expectedHeadSha = null, ciFinished = false } = {}) {
  if (pr.state !== 'OPEN') return { action: 'none', reason: `PR is ${pr.state}`, gates: [] };
  if (pr.isDraft) return { action: 'none', reason: 'PR is already a draft', gates: [] };
  if (pr.baseRefName !== BASE_BRANCH) {
    return { action: 'none', reason: `PR targets ${pr.baseRefName}, not ${BASE_BRANCH}`, gates: [] };
  }
  if (pr.rollupSha !== pr.headSha) {
    return { action: 'none', reason: 'check rollup is not for the current head; the next event decides', gates: [] };
  }
  if (expectedHeadSha && expectedHeadSha !== pr.headSha) {
    return { action: 'none', reason: `head moved from ${expectedHeadSha.slice(0, 8)}; the run for the new head decides`, gates: [] };
  }

  const receipts = pr.contexts.filter((c) => c.name === RECEIPT_CONTEXT);
  // Positive control on GitHub's required flags. The receipt is required on main; if GitHub
  // says it is not, the flags are unreadable here and every "not required" answer is suspect.
  if (receipts.length > 0 && !receipts.some((c) => c.isRequired)) {
    throw new Error(
      `${RECEIPT_CONTEXT} is on the head but GitHub reports it as not required; ` +
        'required flags cannot be trusted, so nothing is decided',
    );
  }

  const gates = [];
  for (const ctx of pr.contexts) {
    if (ctx.isRequired && isRed(ctx) && !gates.includes(ctx.name)) gates.push(ctx.name);
  }
  const ciDone = ciFinished === true;
  if (ciDone && !receipts.some(isGreen) && !gates.includes(RECEIPT_CONTEXT)) {
    gates.push(`${RECEIPT_CONTEXT} (missing)`);
  }
  if (pr.unresolvedThreads > 0) {
    gates.push(`conversation resolution (${pr.unresolvedThreads} unresolved review thread${pr.unresolvedThreads === 1 ? '' : 's'})`);
  }

  if (gates.length === 0) {
    const reason = ciDone
      ? 'every required gate on the head is green or still running'
      : `${CI_WORKFLOW} has not finished on this head; the receipt is judged after it does`;
    return { action: 'none', reason, gates };
  }
  return { action: 'draft', reason: 'a required gate is red', gates };
}

/** The one-line comment posted when a PR is turned back to draft. */
export function commentFor(pr, gates) {
  return `Turned back to draft by draft-on-red: required gate red on ${pr.headSha.slice(0, 8)}: ` +
    `${gates.join('; ')}. Fix it, get GitHub green on the new head, then mark it ready.`;
}

/**
 * Wrap an API client so only the two permitted writes can be sent.
 * `api` is { graphql(query, variables), rest(method, path, body) }.
 */
export function guardedApi(api, { owner, repo }) {
  const commentPath = new RegExp(`^/repos/${owner}/${repo}/issues/\\d+/comments$`);
  const pullsForCommit = new RegExp(`^/repos/${owner}/${repo}/commits/[0-9a-f]{40}/pulls$`);
  const openPullsPage = new RegExp(`^/repos/${owner}/${repo}/pulls\\?state=open&base=${BASE_BRANCH}&per_page=100&page=\\d+$`);
  const ciRunsForCommit = new RegExp(`^/repos/${owner}/${repo}/actions/workflows/ci\\.yml/runs\\?head_sha=[0-9a-f]{40}&per_page=100$`);
  return {
    graphql(query, variables) {
      const isMutation = /^\s*mutation\b/.test(query);
      if (isMutation && query !== DRAFT_MUTATION) {
        throw new Error('draft-on-red may send only the convertPullRequestToDraft mutation');
      }
      if (!isMutation && query !== PR_QUERY) {
        throw new Error('draft-on-red may send only its own PR query');
      }
      return api.graphql(query, variables);
    },
    rest(method, path, body) {
      if (method === 'GET' && (pullsForCommit.test(path) || openPullsPage.test(path) || ciRunsForCommit.test(path))) {
        return api.rest(method, path, body);
      }
      if (method === 'POST' && commentPath.test(path)) return api.rest(method, path, body);
      throw new Error(`draft-on-red may not call ${method} ${path}`);
    },
  };
}

/** Which PRs, and which head SHA, does this event concern? */
export async function targetsFor({ eventName, event, api, owner, repo }) {
  if (eventName === 'workflow_run') {
    const run = event.workflow_run;
    if (!run || run.status !== 'completed') return [];
    const sha = run.head_sha;
    if (!/^[0-9a-f]{40}$/.test(String(sha))) throw new Error(`workflow_run has no usable head_sha: ${sha}`);
    const pulls = await api.rest('GET', `/repos/${owner}/${repo}/commits/${sha}/pulls`);
    if (!Array.isArray(pulls)) throw new Error('listing PRs for the commit did not return a list');
    return pulls
      .filter((p) => p.state === 'open' && p.head?.sha === sha && p.head?.repo?.full_name === `${owner}/${repo}`)
      .map((p) => ({ number: p.number, expectedHeadSha: sha }));
  }
  if (SWEEP_EVENTS.includes(eventName)) {
    const targets = [];
    for (let page = 1; page <= MAX_SWEEP_PAGES; page += 1) {
      const list = await api.rest('GET', sweepPath(owner, repo, page));
      if (!Array.isArray(list)) throw new Error(`listing open PRs (page ${page}) did not return a list`);
      for (const p of list) {
        if (p.state !== 'open' || p.draft === true || p.base?.ref !== BASE_BRANCH) continue;
        const sha = p.head?.sha;
        if (!/^[0-9a-f]{40}$/.test(String(sha))) throw new Error(`PR #${p.number} has no usable head sha: ${sha}`);
        targets.push({ number: p.number, expectedHeadSha: sha });
      }
      if (list.length < 100) return targets;
    }
    throw new Error(`more than ${MAX_SWEEP_PAGES * 100} open PRs on ${BASE_BRANCH}; refusing to judge from a partial sweep`);
  }
  throw new Error(`draft-on-red does not handle event ${eventName}`);
}

/** Run once for one event. Returns the list of outcomes; throws on any failed read or write. */
export async function run({ eventName, event, api, owner, repo, log = console.log }) {
  const safe = guardedApi(api, { owner, repo });
  const outcomes = [];
  for (const target of await targetsFor({ eventName, event, api: safe, owner, repo })) {
    const data = await safe.graphql(PR_QUERY, { owner, name: repo, number: target.number });
    const pr = normalisePr(data);
    const ciFinished = await ciFinishedOnHead({ api: safe, owner, repo, sha: target.expectedHeadSha });
    const verdict = decide(pr, { expectedHeadSha: target.expectedHeadSha, ciFinished });
    if (verdict.action === 'draft') {
      await safe.graphql(DRAFT_MUTATION, { id: pr.id });
      await safe.rest('POST', `/repos/${owner}/${repo}/issues/${pr.number}/comments`, { body: commentFor(pr, verdict.gates) });
      log(`#${pr.number}: turned back to draft (${verdict.gates.join('; ')})`);
    } else {
      log(`#${pr.number}: no change (${verdict.reason})`);
    }
    outcomes.push({ number: pr.number, ...verdict });
  }
  if (outcomes.length === 0) log('no open non-draft PR on main to judge for this event');
  return outcomes;
}

/** Minimal GitHub client on fetch. Every non-2xx answer, and every GraphQL error, throws. */
export function githubClient({ token, apiUrl = 'https://api.github.com', fetchImpl = fetch }) {
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'unite-group-draft-on-red',
  };
  return {
    async graphql(query, variables) {
      const res = await fetchImpl(`${apiUrl}/graphql`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.errors) {
        throw new Error(`GraphQL ${res.status}: ${JSON.stringify(json?.errors ?? json)}`);
      }
      return json.data;
    },
    async rest(method, path, body) {
      const res = await fetchImpl(`${apiUrl}${path}`, {
        method,
        headers: body ? { ...headers, 'content-type': 'application/json' } : headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
      return json;
    },
  };
}

export async function main(env = process.env) {
  const [owner, repo] = String(env.GITHUB_REPOSITORY ?? '').split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPOSITORY is not set');
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const api = githubClient({ token: env.GITHUB_TOKEN, apiUrl: env.GITHUB_API_URL || undefined });
  await run({ eventName: env.GITHUB_EVENT_NAME, event, api, owner, repo });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`draft-on-red: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
