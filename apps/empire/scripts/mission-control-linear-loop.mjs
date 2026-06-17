#!/usr/bin/env node

/**
 * Mission Control Linear autonomous loop.
 *
 * This is the repo-local contract for:
 *   Linear issue -> claim -> agent command -> verify -> commit/push -> Linear update -> repeat
 *
 * It is deliberately environment-driven so the same loop can be run by Codex,
 * Claude Code, a local launchd job, Railway, or Pi-CEO without hardcoding a
 * specific paid-plan CLI.
 */

import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { parseRunnerRegistry, resolveRunnerForIssue } from './lib/runner-registry.mjs';

// Self-load the repo-root env file. The worker is environment-driven but had no
// way to read LINEAR_API_KEY unless the caller pre-exported it — so launching
// via `npm run`, launchd, or cron left process.env.LINEAR_API_KEY empty and the
// preflight failed with "missing LINEAR_API_KEY" even though the key was present
// in .env.local. Node applies env-file vars at LOWER precedence than vars
// already in process.env, so an explicit export by a launcher still wins. We
// load the first file that exists; both are gitignored. [UNI-2151]
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
for (const candidate of ['.env.local', '.env.vercel']) {
  const envPath = join(repoRoot, candidate);
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Malformed env file — skip rather than crash the worker.
    }
    break;
  }
}

const LINEAR_API = 'https://api.linear.app/graphql';

const env = {
  token: process.env.LINEAR_API_KEY?.trim() ?? '',
  teamKey: process.env.MISSION_CONTROL_LINEAR_TEAM_KEY?.trim() || 'UNI',
  projectName: process.env.MISSION_CONTROL_LINEAR_PROJECT?.trim() || 'Unite-Group',
  requiredLabels: (process.env.MISSION_CONTROL_LINEAR_LABELS?.trim() || 'mesh:auto,pi-dev:autonomous')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  blockedLabels: (process.env.MISSION_CONTROL_BLOCKED_LABELS?.trim() ||
    'pi-dev:blocked-reason:credentials,pi-dev:blocked-reason:external-dep,pi-dev:blocked-reason:ambiguous-spec,pi-dev:blocked-reason:scope-creep,Manual Task')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  verifyCommand: process.env.MISSION_CONTROL_VERIFY_CMD?.trim() || 'npm run type-check && npm run lint',
  handoffUrl: process.env.MISSION_CONTROL_HANDOFF_URL?.trim() ?? '',
  cronSecret: process.env.MISSION_CONTROL_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim() || '',
  commit: process.env.MISSION_CONTROL_COMMIT !== '0',
  push: process.env.MISSION_CONTROL_PUSH === '1',
  pushTarget: process.env.MISSION_CONTROL_PUSH_TARGET?.trim() || '',
  completeOnSuccess: process.env.MISSION_CONTROL_COMPLETE_ON_SUCCESS === '1',
  preflight: process.argv.includes('--preflight'),
  once: process.argv.includes('--once') || process.env.MISSION_CONTROL_LOOP !== '1',
  intervalMs: Number(process.env.MISSION_CONTROL_LOOP_INTERVAL_MS ?? 60_000),
};

// Multi-runner registry, built once from the environment. With only the legacy
// MISSION_CONTROL_RUNNER_CMD set, this yields a single `default` runner and the
// loop behaves exactly as it did before. [UNI-2135]
const runnerRegistry = parseRunnerRegistry(process.env);

// True when at least one runner has a command (legacy default or a named one).
function hasConfiguredRunner() {
  return runnerRegistry.runners.some((runner) => runner.configured);
}

function log(message) {
  const at = new Date().toISOString();
  console.log(`[mission-control-loop ${at}] ${message}`);
}

function fail(message, code = 1) {
  console.error(`[mission-control-loop] ${message}`);
  process.exitCode = code;
}

async function linear(query, variables = {}) {
  if (!env.token) throw new Error('LINEAR_API_KEY is not configured');
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      Authorization: env.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors ?? json, null, 2));
  }
  return json.data;
}

async function fetchHandoff() {
  if (!env.handoffUrl) return null;
  if (!env.cronSecret) throw new Error('MISSION_CONTROL_HANDOFF_URL requires MISSION_CONTROL_CRON_SECRET or CRON_SECRET');
  const res = await fetch(env.handoffUrl, {
    headers: { Authorization: `Bearer ${env.cronSecret}` },
  });
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(`handoff failed: ${JSON.stringify(json)}`);
  }
  return json;
}

async function getLinearContext() {
  const data = await linear(
    `query Context($teamKey: String!, $projectName: String!) {
      teams(filter: { key: { eq: $teamKey } }, first: 1) {
        nodes {
          id
          key
          states { nodes { id name type } }
          labels { nodes { id name } }
        }
      }
      projects(filter: { name: { eq: $projectName } }, first: 1) {
        nodes { id name }
      }
    }`,
    { teamKey: env.teamKey, projectName: env.projectName },
  );
  const team = data.teams.nodes[0];
  const project = data.projects.nodes[0];
  if (!team) throw new Error(`Linear team ${env.teamKey} not found`);
  if (!project) throw new Error(`Linear project ${env.projectName} not found`);
  const stateByType = new Map(team.states.nodes.map((s) => [s.type, s]));
  const stateByName = new Map(team.states.nodes.map((s) => [s.name.toLowerCase(), s]));
  return { team, project, stateByType, stateByName };
}

function labelNames(issue) {
  return new Set((issue.labels?.nodes ?? []).map((label) => label.name));
}

function isClaimable(issue) {
  const labels = labelNames(issue);
  const hasRequired = env.requiredLabels.some((label) => labels.has(label));
  const hasBlocked = env.blockedLabels.some((label) => labels.has(label));
  const stateType = issue.state?.type;
  return hasRequired && !hasBlocked && (stateType === 'backlog' || stateType === 'unstarted');
}

async function findNextIssue(context) {
  const handoff = await fetchHandoff();
  if (handoff) {
    const packet = handoff.execution_packet;
    if (!packet) return null;
    return {
      id: packet.issue.id,
      identifier: packet.issue.identifier,
      title: packet.issue.title,
      description: packet.prompt,
      priority: packet.issue.priority,
      url: packet.issue.url,
      branchName: packet.branchName,
      state: { name: 'Todo', type: 'unstarted' },
      labels: { nodes: env.requiredLabels.map((name) => ({ id: name, name })) },
      handoffPacket: packet,
    };
  }

  const data = await linear(
    `query NextIssues($teamId: ID!, $projectId: ID!) {
      issues(
        filter: {
          team: { id: { eq: $teamId } }
          project: { id: { eq: $projectId } }
          state: { type: { in: ["backlog", "unstarted"] } }
        }
        first: 50
      ) {
        nodes {
          id
          identifier
          title
          description
          priority
          url
          branchName
          state { id name type }
          labels { nodes { id name } }
        }
      }
    }`,
    { teamId: context.team.id, projectId: context.project.id },
  );
  const candidates = data.issues.nodes.filter(isClaimable);
  candidates.sort((a, b) => {
    const ap = a.priority || 99;
    const bp = b.priority || 99;
    if (ap !== bp) return ap - bp;
    return a.identifier.localeCompare(b.identifier);
  });
  return candidates[0] ?? null;
}

async function updateIssue(issueId, input) {
  await linear(
    `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier state { name type } }
      }
    }`,
    { id: issueId, input },
  );
}

async function comment(issueId, body) {
  await linear(
    `mutation Comment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
      }
    }`,
    { issueId, body },
  );
}

function runShell(command, options = {}) {
  log(`run: ${command}`);
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
  return result.status ?? 1;
}

function commandExists(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${command} >/dev/null 2>&1`], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function firstCommandToken(command) {
  return command.trim().split(/\s+/)[0] ?? '';
}

function runPreflight() {
  // The "a runner is configured" gate is satisfied by the legacy
  // MISSION_CONTROL_RUNNER_CMD OR any configured named runner in the registry.
  const runnerConfigured = hasConfiguredRunner();
  const defaultRunner = runnerRegistry.runners.find((runner) => runner.name === runnerRegistry.defaultRunner);
  const defaultRunnerCli = defaultRunner?.configured ? firstCommandToken(defaultRunner.command) : '';
  const defaultRunnerCliPresent = !defaultRunnerCli || commandExists(defaultRunnerCli);
  const checks = [
    ['LINEAR_API_KEY', Boolean(env.token), 'required to claim/update Linear issues'],
    ['MISSION_CONTROL_RUNNER_CMD', runnerConfigured, 'required to run the local agent CLI (legacy var or a named runner)'],
    ['default runner CLI', !runnerConfigured || defaultRunnerCliPresent, `required for default runner${defaultRunner ? ` (${defaultRunner.name})` : ''}`],
    ['MISSION_CONTROL_HANDOFF_URL auth', !env.handoffUrl || Boolean(env.cronSecret), 'required when using the web handoff endpoint'],
    ['git', commandExists('git'), 'required to commit/push work'],
    ['gh auth', spawnSync('gh', ['auth', 'status'], { stdio: 'ignore' }).status === 0, 'recommended for GitHub push auth'],
  ];

  let ok = true;
  for (const [name, passed, why] of checks) {
    const status = passed ? 'ok' : 'missing';
    console.log(`${status.padEnd(8)} ${name} — ${why}`);
    if (!passed && (
      name === 'LINEAR_API_KEY' ||
      name === 'MISSION_CONTROL_RUNNER_CMD' ||
      name === 'default runner CLI' ||
      name === 'MISSION_CONTROL_HANDOFF_URL auth'
    )) ok = false;
  }

  // Honest per-runner reporting: for each configured named runner (i.e. not the
  // legacy `default`), show whether its CLI (first token of the command) exists.
  // Never print command values beyond the leading token — env var names only.
  const namedRunners = runnerRegistry.runners.filter((runner) => runner.name !== 'default');
  if (namedRunners.length > 0) {
    console.log('\nRunners:');
    for (const runner of namedRunners) {
      if (!runner.configured) {
        console.log(`${'missing'.padEnd(8)} runner:${runner.name} — no MISSION_CONTROL_RUNNER_CMD_${runner.name.toUpperCase()} configured`);
        continue;
      }
      const cli = firstCommandToken(runner.command);
      const present = commandExists(cli);
      const status = present ? 'ok' : 'missing';
      console.log(`${status.padEnd(8)} runner:${runner.name} — CLI \`${cli}\` ${present ? 'found' : 'not on PATH'}`);
    }
    if (runnerRegistry.defaultRunner) {
      console.log(`default runner: ${runnerRegistry.defaultRunner}`);
    }
  }

  if (!ok) {
    console.log('\nRequired worker configuration is missing. The loop will not start.');
    process.exitCode = 1;
    return false;
  }
  console.log('\nPreflight passed. The loop can start.');
  return true;
}

function writePrompt(issue) {
  const dir = mkdtempSync(join(tmpdir(), 'mission-control-linear-'));
  const file = join(dir, `${issue.identifier}.md`);
  const prompt = issue.handoffPacket?.prompt ?? `# ${issue.identifier}: ${issue.title}

Linear: ${issue.url}

## Mission

Work this issue end-to-end in the current repository.

## Required behaviour

- Inspect the existing code before editing.
- Keep changes scoped to this Linear issue.
- Run the repo verification command before committing.
- Do not read or print secrets.
- If blocked, stop with a clear blocker comment in Linear.
- If successful, leave a concise completion note with verification evidence.

## Issue description

${issue.description || '(No description provided.)'}
`;
  writeFileSync(file, prompt);
  return file;
}

function gitHasChanges() {
  const result = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function commitAndMaybePush(issue) {
  if (!gitHasChanges()) {
    log('no git changes to commit');
    return 0;
  }

  if (!env.commit) {
    log('MISSION_CONTROL_COMMIT=0, leaving changes uncommitted');
    return 0;
  }

  const add = runShell('git add -A');
  if (add !== 0) return add;

  const commit = runShell(`git commit -m "${issue.identifier}: ${issue.title.replaceAll('"', '\\"')}"`);
  if (commit !== 0) return commit;

  if (!env.push) {
    log('MISSION_CONTROL_PUSH is not 1, commit created but not pushed');
    return 0;
  }

  const target = env.pushTarget ? ` ${env.pushTarget}` : '';
  return runShell(`git push${target}`);
}

async function runOnce() {
  const context = await getLinearContext();
  const issue = await findNextIssue(context);
  if (!issue) {
    log(`no claimable issues for ${env.teamKey}/${env.projectName}`);
    return false;
  }

  const inProgress = context.stateByName.get('in progress') ?? context.stateByType.get('started');
  const inReview = context.stateByName.get('in review') ?? context.stateByType.get('started');
  const done = context.stateByName.get('done') ?? context.stateByType.get('completed');

  log(`claiming ${issue.identifier}: ${issue.title}`);
  if (inProgress) await updateIssue(issue.id, { stateId: inProgress.id });
  await comment(issue.id, `Mission Control loop claimed this issue at ${new Date().toISOString()}.`);

  const runner = resolveRunnerForIssue(labelNames(issue), runnerRegistry);
  if (!runner || !runner.configured) {
    const promptFile = writePrompt(issue);
    await comment(
      issue.id,
      `Mission Control loop found this issue, but no runner is configured (set \`MISSION_CONTROL_RUNNER_CMD\` or a named runner via \`MISSION_CONTROL_RUNNERS\` + \`MISSION_CONTROL_RUNNER_CMD_<NAME>\`). Prompt written locally: \`${promptFile}\`.`,
    );
    throw new Error('no runner configured (MISSION_CONTROL_RUNNER_CMD or a named MISSION_CONTROL_RUNNERS entry)');
  }

  log(`using runner: ${runner.name}`);
  const promptFile = writePrompt(issue);
  const command = runner.command
    .replaceAll('{issue}', issue.identifier)
    .replaceAll('{title}', issue.title)
    .replaceAll('{prompt}', promptFile);

  let status = runShell(command);
  if (status !== 0) {
    await comment(issue.id, `Runner command failed for ${issue.identifier} with exit code ${status}.`);
    return true;
  }

  if (env.verifyCommand) {
    status = runShell(env.verifyCommand);
    if (status !== 0) {
      await comment(issue.id, `Verification failed for ${issue.identifier} with exit code ${status}.`);
      return true;
    }
  }

  status = commitAndMaybePush(issue);
  if (status !== 0) {
    await comment(issue.id, `Commit/push step failed for ${issue.identifier} with exit code ${status}.`);
    return true;
  }

  const finalState = env.completeOnSuccess ? done : inReview;
  if (finalState) await updateIssue(issue.id, { stateId: finalState.id });
  await comment(
    issue.id,
    `Mission Control loop completed ${issue.identifier}. Verification command: \`${env.verifyCommand || 'none'}\`. Push: \`${env.push ? 'attempted' : 'not configured'}\`.`,
  );
  return true;
}

async function main() {
  if (env.preflight) {
    runPreflight();
    return;
  }

  log(`starting for project=${env.projectName} labels=${env.requiredLabels.join('|')} mode=${env.once ? 'once' : 'loop'}`);
  do {
    try {
      await runOnce();
    } catch (err) {
      log(err instanceof Error ? err.message : String(err));
      if (env.once) {
        fail('loop failed');
        return;
      }
    }
    if (!env.once) {
      await new Promise((resolve) => setTimeout(resolve, env.intervalMs));
    }
  } while (!env.once);
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
