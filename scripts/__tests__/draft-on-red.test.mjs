/**
 * Tests for scripts/draft-on-red.mjs and .github/workflows/draft-on-red.yml.
 *
 * Planted red PRs must be turned back to draft with one comment naming the red gate.
 * Green, draft, pending, non-required-red and moved-head PRs must be left alone.
 * A failed or partial read must fail the run with no write at all.
 * A fake GitHub records every call, so "no write" is observed, not assumed.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DRAFT_MUTATION,
  MAX_SWEEP_PAGES,
  PR_QUERY,
  RECEIPT_CONTEXT,
  commentFor,
  decide,
  guardedApi,
  normalisePr,
  run,
  sweepPath,
} from '../draft-on-red.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OWNER = 'CleanExpo';
const REPO = 'Unite-Group';
const HEAD = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

const check = (name, conclusion, { isRequired = true, status = 'COMPLETED' } = {}) => ({
  __typename: 'CheckRun', name, status, conclusion, isRequired,
});
const status = (context, state, { isRequired = true } = {}) => ({
  __typename: 'StatusContext', context, state, isRequired,
});
const GREEN_CONTEXTS = () => [
  check('apps/web — lint, type-check, test, build', 'SUCCESS'),
  check('gitleaks — secret scan (git commits)', 'SUCCESS'),
  check('Commit-message convention (Linear ref + Gate line)', 'SUCCESS'),
  check('apps/empire — type-check, test', 'SUCCESS', { isRequired: false }),
  status(RECEIPT_CONTEXT, 'SUCCESS'),
];

/** A GraphQL answer for one PR. */
function prData({
  number = 1371, isDraft = false, state = 'OPEN', base = 'main', head = HEAD, rollup = HEAD,
  contexts = GREEN_CONTEXTS(), threads = [], threadsMore = false, contextsMore = false,
} = {}) {
  return {
    repository: {
      pullRequest: {
        id: `PR_${number}`, number, state, isDraft, baseRefName: base, headRefOid: head,
        reviewThreads: { totalCount: threads.length, pageInfo: { hasNextPage: threadsMore }, nodes: threads },
        commits: { nodes: [{ commit: { oid: rollup, statusCheckRollup: { contexts: { pageInfo: { hasNextPage: contextsMore }, nodes: contexts } } } }] },
      },
    },
  };
}

/**
 * Fake GitHub. Records every call; answers from `prs` (number -> data) and `pulls`
 * (a list, or a function of the request path for paged sweeps).
 */
function fakeGithub({ prs = {}, pulls = [], failQuery = false } = {}) {
  const calls = [];
  return {
    calls,
    writes: () => calls.filter((c) => c.kind === 'mutation' || (c.kind === 'rest' && c.method !== 'GET')),
    api: {
      async graphql(query, variables) {
        if (/^\s*mutation\b/.test(query)) {
          calls.push({ kind: 'mutation', query, variables });
          return { convertPullRequestToDraft: { pullRequest: { isDraft: true } } };
        }
        calls.push({ kind: 'query', variables });
        if (failQuery) throw new Error('GraphQL 403: Resource not accessible by integration');
        return prs[variables.number];
      },
      async rest(method, path, body) {
        calls.push({ kind: 'rest', method, path, body });
        if (method === 'GET') return typeof pulls === 'function' ? pulls(path) : pulls;
        return { id: 1 };
      },
    },
  };
}

const ciDone = (sha = HEAD, conclusion = 'success') => ({ workflow_run: { status: 'completed', conclusion, head_sha: sha } });
const listed = (number, sha = HEAD, extra = {}) => ({
  number, state: 'open', draft: false, base: { ref: 'main' }, head: { sha, repo: { full_name: `${OWNER}/${REPO}` } }, ...extra,
});

/** Judge one PR the way the CI-completion run does: Monorepo CI finished on `eventSha`. */
async function judge(data, { eventSha = HEAD } = {}) {
  const { number } = data.repository.pullRequest;
  const gh = fakeGithub({ prs: { [number]: data }, pulls: [listed(number, eventSha)] });
  const out = await run({ eventName: 'workflow_run', event: ciDone(eventSha), api: gh.api, owner: OWNER, repo: REPO, log: () => {} });
  return { gh, out };
}

/** Run the sweep (schedule or workflow_dispatch) against a fake with paged PR lists. */
async function sweep({ prs, pages, eventName = 'schedule' }) {
  const gh = fakeGithub({
    prs,
    pulls: (path) => {
      const m = path.match(/[?&]page=(\d+)$/);
      assert.ok(m && path === sweepPath(OWNER, REPO, Number(m[1])), `unexpected list path ${path}`);
      return pages[Number(m[1]) - 1] ?? [];
    },
  });
  const out = await run({ eventName, event: {}, api: gh.api, owner: OWNER, repo: REPO, log: () => {} });
  return { gh, out };
}

function assertDrafted(gh, number, gateText) {
  const writes = gh.writes();
  assert.equal(writes.length, 2, `expected exactly 2 writes, got ${JSON.stringify(writes)}`);
  assert.equal(writes[0].kind, 'mutation');
  assert.equal(writes[0].query, DRAFT_MUTATION);
  assert.deepEqual(writes[0].variables, { id: `PR_${number}` });
  assert.equal(writes[1].method, 'POST');
  assert.equal(writes[1].path, `/repos/${OWNER}/${REPO}/issues/${number}/comments`);
  const body = writes[1].body.body;
  assert.ok(!body.includes('\n'), 'comment is one line');
  assert.ok(body.includes(gateText), `comment names the gate "${gateText}": ${body}`);
}

// ---------------------------------------------------------------- planted red PRs

test('RED: a failed required check turns the PR to draft and names that check (#1371/#1372)', async () => {
  const contexts = GREEN_CONTEXTS().map((c) => (c.name === 'Commit-message convention (Linear ref + Gate line)'
    ? { ...c, conclusion: 'FAILURE' } : c));
  const { gh, out } = await judge(prData({ contexts }));
  assert.equal(out[0].action, 'draft');
  assertDrafted(gh, 1371, 'Commit-message convention (Linear ref + Gate line)');
});

test('RED: every not-passing conclusion of a required check counts', async () => {
  for (const conclusion of ['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'STALE']) {
    const contexts = GREEN_CONTEXTS().map((c) => (c.name === 'gitleaks — secret scan (git commits)' ? { ...c, conclusion } : c));
    const { gh } = await judge(prData({ contexts }));
    assertDrafted(gh, 1371, 'gitleaks — secret scan (git commits)');
  }
});

test('RED: a failed required commit status counts (status, not check run)', async () => {
  const contexts = [...GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT), status(RECEIPT_CONTEXT, 'FAILURE')];
  const { gh, out } = await judge(prData({ contexts }));
  assertDrafted(gh, 1371, RECEIPT_CONTEXT);
  assert.equal(out[0].gates.filter((g) => g.startsWith(RECEIPT_CONTEXT)).length, 1, 'receipt named once');
});

test('RED: no nexus/release-receipt on the head after CI completes (#1366/#1367/#1371/#1372)', async () => {
  const contexts = GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT);
  const gh = fakeGithub({ prs: { 1366: prData({ number: 1366, contexts }) }, pulls: [
    { number: 1366, state: 'open', head: { sha: HEAD, repo: { full_name: `${OWNER}/${REPO}` } } },
  ] });
  const event = { workflow_run: { status: 'completed', conclusion: 'success', head_sha: HEAD } };
  const out = await run({ eventName: 'workflow_run', event, api: gh.api, owner: OWNER, repo: REPO, log: () => {} });
  assert.equal(out[0].action, 'draft');
  assertDrafted(gh, 1366, `${RECEIPT_CONTEXT} (missing)`);
});

test('RED: a pending receipt is not a passing receipt', async () => {
  const contexts = [...GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT), status(RECEIPT_CONTEXT, 'PENDING')];
  const { gh } = await judge(prData({ contexts }));
  assertDrafted(gh, 1371, `${RECEIPT_CONTEXT} (missing)`);
});

test('RED: an unresolved review thread (main requires conversation resolution, #1366)', async () => {
  const { gh } = await judge(prData({ threads: [{ isResolved: true }, { isResolved: false }] }));
  assertDrafted(gh, 1371, 'conversation resolution (1 unresolved review thread)');
});

test('RED: several red gates are all named in the one comment', async () => {
  const contexts = GREEN_CONTEXTS()
    .filter((c) => c.context !== RECEIPT_CONTEXT)
    .map((c) => (c.name === 'apps/web — lint, type-check, test, build' ? { ...c, conclusion: 'FAILURE' } : c));
  const { gh } = await judge(prData({ contexts, threads: [{ isResolved: false }, { isResolved: false }] }));
  const body = gh.writes()[1].body.body;
  for (const part of ['apps/web — lint, type-check, test, build', `${RECEIPT_CONTEXT} (missing)`, '2 unresolved review threads']) {
    assert.ok(body.includes(part), `missing "${part}" in ${body}`);
  }
});

// ---------------------------------------------------------------- left alone

test('GREEN: every required gate green, no threads open -> no write at all', async () => {
  const { gh, out } = await judge(prData());
  assert.equal(out[0].action, 'none');
  assert.deepEqual(gh.writes(), []);
});

test('GREEN: a red check that main does not require is not a reason to draft', async () => {
  const contexts = [...GREEN_CONTEXTS(), check('swarm review', 'FAILURE', { isRequired: false })];
  const { gh } = await judge(prData({ contexts }));
  assert.deepEqual(gh.writes(), []);
});

test('GREEN: a required check still running is not red (the CI completion run decides)', async () => {
  const contexts = GREEN_CONTEXTS().map((c) => (c.name === 'apps/web — lint, type-check, test, build'
    ? { ...c, status: 'IN_PROGRESS', conclusion: null } : c));
  const { gh } = await judge(prData({ contexts }));
  assert.deepEqual(gh.writes(), []);
});

test('GREEN: skipped and neutral required checks pass, as in branch protection', async () => {
  const contexts = GREEN_CONTEXTS().map((c) => (c.name === 'gitleaks — secret scan (git commits)' ? { ...c, conclusion: 'SKIPPED' } : c))
    .map((c) => (c.name === 'apps/web — lint, type-check, test, build' ? { ...c, conclusion: 'NEUTRAL' } : c));
  const { gh } = await judge(prData({ contexts }));
  assert.deepEqual(gh.writes(), []);
});

test('LEFT ALONE: a draft, a closed PR and a PR not on main are never touched', async () => {
  const red = GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT);
  for (const data of [
    prData({ isDraft: true, contexts: red }),
    prData({ state: 'CLOSED', contexts: red }),
    prData({ state: 'MERGED', contexts: red }),
    prData({ base: 'release', contexts: red }),
  ]) {
    const { gh } = await judge(data);
    assert.deepEqual(gh.writes(), [], JSON.stringify(data.repository.pullRequest.state));
  }
});

test('LEFT ALONE: the head moved since the event; the run for the new head decides', async () => {
  const red = GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT);
  const { gh } = await judge(prData({ head: OTHER, rollup: OTHER, contexts: red }), { eventSha: HEAD });
  assert.deepEqual(gh.writes(), []);
  const stale = await judge(prData({ head: HEAD, rollup: OTHER, contexts: red }));
  assert.deepEqual(stale.gh.writes(), [], 'rollup for another commit is not judged');
});

test('workflow_run: only open PRs whose head is this exact SHA in this repo are judged', async () => {
  const red = GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT);
  const gh = fakeGithub({ prs: { 5: prData({ number: 5, contexts: red }) }, pulls: [
    { number: 4, state: 'closed', head: { sha: HEAD, repo: { full_name: `${OWNER}/${REPO}` } } },
    { number: 5, state: 'open', head: { sha: HEAD, repo: { full_name: `${OWNER}/${REPO}` } } },
    { number: 6, state: 'open', head: { sha: OTHER, repo: { full_name: `${OWNER}/${REPO}` } } },
    { number: 7, state: 'open', head: { sha: HEAD, repo: { full_name: 'someone/fork' } } },
  ] });
  const event = { workflow_run: { status: 'completed', conclusion: 'failure', head_sha: HEAD } };
  const out = await run({ eventName: 'workflow_run', event, api: gh.api, owner: OWNER, repo: REPO, log: () => {} });
  assert.deepEqual(out.map((o) => o.number), [5]);
  assertDrafted(gh, 5, RECEIPT_CONTEXT);
});

// ---------------------------------------------------------------- the sweep (schedule, workflow_dispatch)

test('SWEEP: a red PR is drafted and a green PR is left alone, on schedule and on dispatch', async () => {
  const red = GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT);
  for (const eventName of ['schedule', 'workflow_dispatch']) {
    const { gh, out } = await sweep({
      eventName,
      prs: { 1371: prData({ number: 1371, contexts: red }), 1380: prData({ number: 1380 }) },
      pages: [[listed(1371), listed(1380)]],
    });
    assert.deepEqual(out.map((o) => [o.number, o.action]), [[1371, 'draft'], [1380, 'none']], eventName);
    assertDrafted(gh, 1371, `${RECEIPT_CONTEXT} (missing)`);
  }
});

test('SWEEP: drafts, closed PRs and PRs not on main in the list are not even queried', async () => {
  const { gh, out } = await sweep({
    prs: {},
    pages: [[listed(1, HEAD, { draft: true }), listed(2, HEAD, { state: 'closed' }), listed(3, HEAD, { base: { ref: 'release' } })]],
  });
  assert.deepEqual(out, []);
  assert.deepEqual(gh.calls.filter((c) => c.kind !== 'rest'), [], 'no PR query, no write');
});

test('SWEEP: reads every page until a short one, so PR 101 is judged too', async () => {
  const red = GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT);
  const page1 = Array.from({ length: 100 }, (_, i) => listed(i + 1, HEAD, { draft: true }));
  const { gh, out } = await sweep({ prs: { 101: prData({ number: 101, contexts: red }) }, pages: [page1, [listed(101)]] });
  assert.deepEqual(out.map((o) => o.number), [101]);
  assertDrafted(gh, 101, `${RECEIPT_CONTEXT} (missing)`);
});

test('SWEEP: the head moving between the list and the query leaves the PR alone', async () => {
  const red = GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT);
  const { gh } = await sweep({ prs: { 7: prData({ number: 7, head: OTHER, rollup: OTHER, contexts: red }) }, pages: [[listed(7, HEAD)]] });
  assert.deepEqual(gh.writes(), []);
});

test('FAIL LOUD: a sweep that cannot read every page throws and writes nothing', async () => {
  const full = Array.from({ length: 100 }, (_, i) => listed(i + 1, HEAD, { draft: true }));
  const tooMany = await sweep({ prs: {}, pages: Array.from({ length: MAX_SWEEP_PAGES }, () => full) }).catch((e) => e);
  assert.match(String(tooMany), /partial sweep/);
  const notAList = await sweep({ prs: {}, pages: [{ message: 'Bad credentials' }] }).catch((e) => e);
  assert.match(String(notAList), /did not return a list/);
  const noSha = await sweep({ prs: {}, pages: [[listed(9, undefined, { head: {} })]] }).catch((e) => e);
  assert.match(String(noSha), /no usable head sha/);
});

// ---------------------------------------------------------------- fail loud, write nothing

test('FAIL LOUD: a failed read throws and writes nothing', async () => {
  const gh = fakeGithub({ failQuery: true, pulls: [listed(1371)] });
  await assert.rejects(run({ eventName: 'workflow_run', event: ciDone(), api: gh.api, owner: OWNER, repo: REPO, log: () => {} }), /403/);
  assert.deepEqual(gh.writes(), []);
});

test('FAIL LOUD: a partial page of checks or threads throws and writes nothing', async () => {
  for (const data of [prData({ contextsMore: true, contexts: [] }), prData({ threadsMore: true, threads: [] })]) {
    const gh = fakeGithub({ prs: { 1371: data }, pulls: [listed(1371)] });
    await assert.rejects(run({ eventName: 'workflow_run', event: ciDone(), api: gh.api, owner: OWNER, repo: REPO, log: () => {} }), /partial page/);
    assert.deepEqual(gh.writes(), []);
  }
});

test('FAIL LOUD: required flags that read false for the receipt throw (positive control)', async () => {
  const contexts = [...GREEN_CONTEXTS().filter((c) => c.context !== RECEIPT_CONTEXT), status(RECEIPT_CONTEXT, 'SUCCESS', { isRequired: false })];
  const gh = fakeGithub({ prs: { 1371: prData({ contexts: contexts.map((c) => ({ ...c, isRequired: false })) }) }, pulls: [listed(1371)] });
  await assert.rejects(run({ eventName: 'workflow_run', event: ciDone(), api: gh.api, owner: OWNER, repo: REPO, log: () => {} }), /cannot be trusted/);
  assert.deepEqual(gh.writes(), []);
});

test('FAIL LOUD: an event it does not handle is refused, including the pull_request family', async () => {
  for (const eventName of ['push', 'pull_request', 'pull_request_target', 'pull_request_review']) {
    const gh = fakeGithub();
    await assert.rejects(run({ eventName, event: { pull_request: { number: 1, head: { sha: HEAD } } }, api: gh.api, owner: OWNER, repo: REPO, log: () => {} }), /does not handle/);
    assert.deepEqual(gh.calls, [], eventName);
  }
});

// ---------------------------------------------------------------- only two writes exist

test('guardedApi lets through only the PR query, the draft mutation, the two PR lists and a comment', async () => {
  const gh = fakeGithub();
  const safe = guardedApi(gh.api, { owner: OWNER, repo: REPO });
  await safe.graphql(PR_QUERY, {});
  await safe.graphql(DRAFT_MUTATION, { id: 'x' });
  await safe.rest('GET', `/repos/${OWNER}/${REPO}/commits/${HEAD}/pulls`);
  await safe.rest('GET', sweepPath(OWNER, REPO, 3));
  await safe.rest('POST', `/repos/${OWNER}/${REPO}/issues/12/comments`, { body: 'x' });
  assert.equal(gh.calls.length, 5);

  const refused = [
    () => safe.graphql('mutation($id: ID!) { mergePullRequest(input: { pullRequestId: $id }) { clientMutationId } }', {}),
    () => safe.graphql('mutation($id: ID!) { closePullRequest(input: { pullRequestId: $id }) { clientMutationId } }', {}),
    () => safe.graphql('mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId } }', {}),
    () => safe.graphql('query { viewer { login } }', {}),
    () => safe.rest('PUT', `/repos/${OWNER}/${REPO}/pulls/12/merge`),
    () => safe.rest('PATCH', `/repos/${OWNER}/${REPO}/pulls/12`, { state: 'closed' }),
    () => safe.rest('POST', `/repos/${OWNER}/${REPO}/issues/12/labels`, { labels: ['x'] }),
    () => safe.rest('DELETE', `/repos/${OWNER}/${REPO}/git/refs/heads/x`),
    () => safe.rest('POST', `/repos/other/repo/issues/12/comments`, { body: 'x' }),
    () => safe.rest('GET', `/repos/${OWNER}/${REPO}/actions/secrets`),
    () => safe.rest('GET', `/repos/${OWNER}/${REPO}/pulls?state=all&base=main&per_page=100&page=1`),
    () => safe.rest('POST', sweepPath(OWNER, REPO, 1), { title: 'x' }),
  ];
  for (const call of refused) assert.throws(call, /draft-on-red may/);
  assert.equal(gh.calls.length, 5, 'nothing refused reached the API');
});

test('normalisePr and decide agree with the comment format', () => {
  const pr = normalisePr(prData({ contexts: [] }));
  const verdict = decide(pr);
  assert.equal(verdict.action, 'draft');
  assert.match(commentFor(pr, verdict.gates), /^Turned back to draft by draft-on-red: required gate red on aaaaaaaa: nexus\/release-receipt \(missing\)\./);
});

// ---------------------------------------------------------------- the workflow wiring

const WORKFLOW = readFileSync(join(ROOT, '.github', 'workflows', 'draft-on-red.yml'), 'utf8').replace(/\r\n/g, '\n');
const WF_CODE = WORKFLOW.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const CI = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8').replace(/\r\n/g, '\n');

test('workflow: watches the CI workflow by its real name (a renamed CI would never fire this)', () => {
  const ciName = CI.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  assert.ok(ciName, 'ci.yml has a name');
  assert.match(WF_CODE, new RegExp(`workflows:\\s*\\[\\s*["']${ciName}["']\\s*\\]`));
  assert.match(WF_CODE, /^ {2}workflow_run:\n {4}workflows:.*\n {4}types:\s*\[\s*completed\s*\]/m);
});

test('workflow: the sweep runs on a schedule and by hand, with no pull_request trigger at all', () => {
  const on = WF_CODE.match(/^on:\n((?: {2,}.*\n|\n)+?)(?=^\S)/m)?.[1];
  assert.ok(on, 'top-level on: block');
  const events = [...on.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]);
  assert.deepEqual(events, ['workflow_run', 'schedule', 'workflow_dispatch']);
  assert.match(on, /^ {2}schedule:\n {4}- cron: "\*\/15 \* \* \* \*"$/m);
  // pull_request_target hands fork PRs a write token, and the release gate's CI mirror
  // replays any pull_request workflow locally, where this job must never run.
  assert.doesNotMatch(WF_CODE, /pull_request/);
  assert.match(WF_CODE, /^concurrency:\n {2}group: draft-on-red\n {2}cancel-in-progress: false$/m, 'one run at a time');
});

test('workflow: the only write permission is pull-requests: write', () => {
  const block = WF_CODE.match(/^permissions:\n((?: {2}.+\n)+)/m)?.[1];
  assert.ok(block, 'top-level permissions block');
  const perms = Object.fromEntries(block.trim().split('\n').map((l) => l.trim().split(/:\s*/)));
  assert.deepEqual(perms, { contents: 'read', checks: 'read', statuses: 'read', 'pull-requests': 'write' });
  assert.doesNotMatch(WF_CODE, /^ +permissions:/m, 'no job widens permissions');
  assert.doesNotMatch(WF_CODE, /write-all|: write\b(?<!pull-requests: write)/);
});

test('workflow: runs main\'s copy of the script, never the PR head\'s code', () => {
  assert.match(WF_CODE, /^ {10}ref: main$/m);
  assert.match(WF_CODE, /persist-credentials:\s*false/);
  assert.doesNotMatch(WF_CODE, /github\.event\.pull_request\.head|head_ref|head\.sha/);
  assert.match(WF_CODE, /run:\s*node scripts\/draft-on-red\.mjs\s*$/m);
  assert.doesNotMatch(WF_CODE, /^\s+if:/m, 'no condition can skip the judgement');
});

test('the script itself names no merge, close or ready operation outside its refusals', () => {
  const src = readFileSync(join(ROOT, 'scripts', 'draft-on-red.mjs'), 'utf8');
  assert.doesNotMatch(src, /mergePullRequest|closePullRequest|markPullRequestReadyForReview|enablePullRequestAutoMerge/);
  assert.doesNotMatch(src, /'(PUT|PATCH|DELETE)'/);
});
