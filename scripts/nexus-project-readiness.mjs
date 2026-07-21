#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_CONFIG_PATH = 'config/nexus-project-readiness.json';
const IGNORED_DIRECTORY_NAMES = new Set([
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);
const ARCHIVE_DIRECTORY = /^(?:archive|archives|archived|legacy)$|(?:^|[-_.])archive(?:d|s)?(?:[-_.]|$)/i;
const RUNTIME_EXTENSIONS = new Set([
  '.bash',
  '.cjs',
  '.js',
  '.json',
  '.mjs',
  '.sh',
  '.toml',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
  '.zsh',
]);
const RUNTIME_ROOTS = ['apps/', 'config/', 'deploy/', 'infra/', 'packages/', 'scripts/'];
const LOCKFILES = {
  npm: 'package-lock.json',
  pnpm: 'pnpm-lock.yaml',
  yarn: 'yarn.lock',
  bun: 'bun.lockb',
};
const BASE_FINDING_IDS = new Set([
  'ci.active-package-coverage',
  'ci.nested-workflows',
  'containers.floating-images',
  'containers.missing-local-inputs',
  'runtime.implicit-production-url-defaults',
  'scanner.configuration',
  'security.ssh-home-exposure',
  'security.tracked-auth-artifacts',
  'toolchain.package-lock-node-matrix',
]);
const FAIL_CLOSED_CONFIG = {
  p0FindingIds: ['scanner.configuration'],
  activePackages: [],
  sourceOfTruthChecks: [],
};

function toPosix(path) {
  return path.split('\\').join('/');
}

function stableCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isIgnoredDirectory(name) {
  return IGNORED_DIRECTORY_NAMES.has(name) || ARCHIVE_DIRECTORY.test(name);
}

function isIgnoredPath(path) {
  return toPosix(path).split('/').some(isIgnoredDirectory);
}

function isWithinRoot(root, candidate) {
  const path = toPosix(relative(resolve(root), resolve(candidate)));
  return path === '' || (path !== '..' && !path.startsWith('../') && !isAbsolute(path));
}

function walkFiles(root) {
  const files = [];

  function visit(directory) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => stableCompare(left.name, right.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && isIgnoredDirectory(entry.name)) continue;

      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        files.push(toPosix(relative(root, absolute)));
      }
    }
  }

  visit(root);
  return files;
}

function readText(root, path) {
  try {
    return readFileSync(join(root, path), 'utf8');
  } catch {
    return null;
  }
}

function readJson(root, path) {
  const text = readText(root, path);
  if (text === null) return { value: null, error: `Missing ${path}` };
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    return { value: null, error: `${path} is not valid JSON: ${error.message}` };
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unknownKeys(value, allowed) {
  return Object.keys(value).filter((key) => !allowed.has(key)).sort(stableCompare);
}

function safeRelativePath(value) {
  if (typeof value !== 'string' || value.trim() !== value || value === '' || isAbsolute(value)) return false;
  const path = toPosix(value);
  return path !== '.' && path !== '..' && !path.startsWith('../') && !path.includes('/../') && !path.endsWith('/..');
}

function stringArrayErrors(value, label, { nonempty = false } = {}) {
  const errors = [];
  if (!Array.isArray(value)) return [`${label} must be an array.`];
  if (nonempty && value.length === 0) errors.push(`${label} must not be empty.`);
  const seen = new Set();
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() !== item || item === '') {
      errors.push(`${label}[${index}] must be a non-empty trimmed string.`);
    } else if (seen.has(item)) {
      errors.push(`${label} contains duplicate value ${item}.`);
    } else {
      seen.add(item);
    }
  });
  return errors;
}

function validateConfig(parsed) {
  if (!isPlainObject(parsed)) return ['Configuration root must be an object.'];

  const errors = [];
  const topLevelKeys = new Set(['schemaVersion', 'p0FindingIds', 'activePackages', 'sourceOfTruthChecks']);
  const extras = unknownKeys(parsed, topLevelKeys);
  if (extras.length > 0) errors.push(`Configuration has unknown keys: ${extras.join(', ')}.`);
  if (parsed.schemaVersion !== 1) errors.push('schemaVersion must equal 1.');
  errors.push(...stringArrayErrors(parsed.p0FindingIds, 'p0FindingIds', { nonempty: true }));

  if (!Array.isArray(parsed.activePackages)) {
    errors.push('activePackages must be an array.');
  } else {
    const packagePaths = new Set();
    parsed.activePackages.forEach((activePackage, index) => {
      const label = `activePackages[${index}]`;
      if (!isPlainObject(activePackage)) {
        errors.push(`${label} must be an object.`);
        return;
      }
      const packageExtras = unknownKeys(activePackage, new Set(['path', 'manager', 'lockfile', 'requiredScripts']));
      if (packageExtras.length > 0) errors.push(`${label} has unknown keys: ${packageExtras.join(', ')}.`);
      if (!safeRelativePath(activePackage.path)) {
        errors.push(`${label}.path must be a safe relative path.`);
      } else if (packagePaths.has(activePackage.path)) {
        errors.push(`activePackages contains duplicate path ${activePackage.path}.`);
      } else {
        packagePaths.add(activePackage.path);
      }
      if (!Object.hasOwn(LOCKFILES, activePackage.manager)) {
        errors.push(`${label}.manager must be one of ${Object.keys(LOCKFILES).join(', ')}.`);
      } else if (activePackage.lockfile !== LOCKFILES[activePackage.manager]) {
        errors.push(`${label}.lockfile must be ${LOCKFILES[activePackage.manager]} for manager ${activePackage.manager}.`);
      }
      errors.push(...stringArrayErrors(activePackage.requiredScripts, `${label}.requiredScripts`, { nonempty: true }));
    });
  }

  const sourceFindingIds = new Set();
  if (!Array.isArray(parsed.sourceOfTruthChecks)) {
    errors.push('sourceOfTruthChecks must be an array.');
  } else {
    const checkIds = new Set();
    parsed.sourceOfTruthChecks.forEach((check, checkIndex) => {
      const label = `sourceOfTruthChecks[${checkIndex}]`;
      if (!isPlainObject(check)) {
        errors.push(`${label} must be an object.`);
        return;
      }
      const checkExtras = unknownKeys(check, new Set(['id', 'description', 'assertions']));
      if (checkExtras.length > 0) errors.push(`${label} has unknown keys: ${checkExtras.join(', ')}.`);
      if (typeof check.id !== 'string' || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(check.id)) {
        errors.push(`${label}.id must be a lowercase finding identifier.`);
      } else if (checkIds.has(check.id)) {
        errors.push(`sourceOfTruthChecks contains duplicate id ${check.id}.`);
      } else {
        checkIds.add(check.id);
        sourceFindingIds.add(`source-of-truth.${check.id}`);
      }
      if (typeof check.description !== 'string' || check.description.trim() !== check.description || check.description === '') {
        errors.push(`${label}.description must be a non-empty trimmed string.`);
      }
      if (!Array.isArray(check.assertions) || check.assertions.length === 0) {
        errors.push(`${label}.assertions must be a non-empty array.`);
        return;
      }
      check.assertions.forEach((assertion, assertionIndex) => {
        const assertionLabel = `${label}.assertions[${assertionIndex}]`;
        if (!isPlainObject(assertion)) {
          errors.push(`${assertionLabel} must be an object.`);
          return;
        }
        const assertionExtras = unknownKeys(assertion, new Set(['path', 'require', 'forbid']));
        if (assertionExtras.length > 0) errors.push(`${assertionLabel} has unknown keys: ${assertionExtras.join(', ')}.`);
        if (!safeRelativePath(assertion.path)) errors.push(`${assertionLabel}.path must be a safe relative path.`);
        if (assertion.require === undefined && assertion.forbid === undefined) {
          errors.push(`${assertionLabel} must declare require or forbid values.`);
        }
        if (assertion.require !== undefined) {
          errors.push(...stringArrayErrors(assertion.require, `${assertionLabel}.require`, { nonempty: true }));
        }
        if (assertion.forbid !== undefined) {
          errors.push(...stringArrayErrors(assertion.forbid, `${assertionLabel}.forbid`, { nonempty: true }));
        }
      });
    });
  }

  if (Array.isArray(parsed.p0FindingIds)) {
    const knownFindingIds = new Set([...BASE_FINDING_IDS, ...sourceFindingIds]);
    parsed.p0FindingIds.forEach((id) => {
      if (typeof id === 'string' && id !== '' && !knownFindingIds.has(id)) {
        errors.push(`p0FindingIds contains unknown finding id ${id}.`);
      }
    });
  }

  return errors;
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function evidence(path, detail, line) {
  const result = { path: toPosix(path), detail };
  if (line !== undefined) result.line = line;
  return result;
}

function sortEvidence(items) {
  return items.sort((left, right) => {
    const byPath = stableCompare(left.path, right.path);
    if (byPath !== 0) return byPath;
    const byLine = (left.line ?? 0) - (right.line ?? 0);
    if (byLine !== 0) return byLine;
    return stableCompare(left.detail, right.detail);
  });
}

function finding(config, definition) {
  const configuredP0 = config.p0FindingIds.includes(definition.id);
  return {
    id: definition.id,
    severity: configuredP0 ? 'P0' : definition.severity,
    status: definition.status,
    blocking: configuredP0 && definition.status !== 'pass',
    evidence: sortEvidence(definition.evidence),
    remediation: definition.remediation,
    verification: definition.verification,
    rollback: definition.rollback,
  };
}

function loadConfig(root, requestedPath) {
  const absolute = isAbsolute(requestedPath) ? requestedPath : resolve(root, requestedPath);
  const path = toPosix(relative(root, absolute));
  let parsed;

  try {
    parsed = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    return {
      config: FAIL_CLOSED_CONFIG,
      configPath: path,
      error: error.message,
    };
  }

  const validationErrors = validateConfig(parsed);
  if (validationErrors.length > 0) {
    return {
      config: FAIL_CLOSED_CONFIG,
      configPath: path,
      error: validationErrors.join(' '),
    };
  }

  return {
    config: parsed,
    configPath: path,
    error: null,
  };
}

function scanConfiguration(config, configPath, error) {
  return finding(config, {
    id: 'scanner.configuration',
    severity: 'P1',
    status: error ? 'unknown' : 'pass',
    evidence: [evidence(configPath, error ?? 'Readiness configuration loaded.')],
    remediation: 'Restore a valid machine-readable readiness configuration before relying on gate results.',
    verification: 'Run the scanner with --json and confirm scanner.configuration is pass.',
    rollback: 'Restore the last reviewed configuration from version control.',
  });
}

function scanNestedWorkflows(root, files, config) {
  const nested = files.filter((path) => path.includes('/.github/workflows/') && !path.startsWith('.github/workflows/'));
  return finding(config, {
    id: 'ci.nested-workflows',
    severity: 'P1',
    status: nested.length > 0 ? 'fail' : 'pass',
    evidence: nested.length > 0
      ? nested.map((path) => evidence(path, 'Nested workflow is inert in a GitHub monorepo checkout.'))
      : [evidence('.github/workflows', 'No nested workflow definitions found.')],
    remediation: 'Move required jobs into root .github/workflows and classify or remove reference-only nested workflows.',
    verification: 'List workflow files and confirm every enforced workflow is directly under root .github/workflows.',
    rollback: 'Restore the prior workflow file while retaining its root replacement if branch protection depends on its check name.',
  });
}

function uncommentedWorkflowText(text) {
  return text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
}

function workflowJobIsUnconditional(text) {
  return !uncommentedWorkflowText(text)
    .split('\n')
    .some((line) => /^\s*(?:-\s*)?(?:if|continue-on-error):/i.test(line));
}

function workflowRunCommands(text) {
  const lines = text.split('\n');
  const commands = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trimStart().startsWith('#')) continue;
    const match = line.match(/^\s*(?:-\s*)?run:\s*(.*)$/);
    if (!match) continue;
    const value = match[1].trim();
    if (value !== '|' && value !== '>') {
      commands.push(value);
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const block = [];
    for (index += 1; index < lines.length; index += 1) {
      const blockLine = lines[index];
      if (blockLine.trim() === '') continue;
      const blockIndent = blockLine.length - blockLine.trimStart().length;
      if (blockIndent <= indent) {
        index -= 1;
        break;
      }
      if (!blockLine.trimStart().startsWith('#')) block.push(blockLine.trim());
    }
    commands.push(block.join('\n'));
  }
  return commands;
}

function workflowDefaultWorkingDirectory(text) {
  const lines = text.split('\n');
  const jobIndent = lines.find((line) => line.trim() !== '')?.search(/\S/) ?? -1;
  let defaultsIndent = null;
  let runIndent = null;

  for (const line of lines) {
    if (line.trimStart().startsWith('#') || line.trim() === '') continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    if (defaultsIndent !== null && indent <= defaultsIndent && !/^defaults:\s*$/.test(trimmed)) {
      defaultsIndent = null;
      runIndent = null;
    }
    if (indent === jobIndent + 2 && /^defaults:\s*$/.test(trimmed)) {
      defaultsIndent = indent;
      runIndent = null;
      continue;
    }
    if (defaultsIndent !== null && indent === defaultsIndent + 2 && /^run:\s*$/.test(trimmed)) {
      runIndent = indent;
      continue;
    }
    if (runIndent !== null && indent === runIndent + 2) {
      const match = trimmed.match(/^working-directory:\s*(.+)$/);
      if (match) return toPosix(stripYamlScalar(match[1]).replace(/^\.\//, '').replace(/\/$/, ''));
    }
  }
  return null;
}

function workflowCoversPackage(text, packagePath) {
  return workflowJobIsUnconditional(text)
    && workflowDefaultWorkingDirectory(text) === packagePath;
}

function workflowJobBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let inJobs = false;
  let current = null;

  function finish() {
    if (current) blocks.push({ id: current.id, text: current.lines.join('\n') });
    current = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    if (!inJobs) {
      if (indent === 0 && /^jobs:\s*$/.test(trimmed)) inJobs = true;
      continue;
    }
    if (trimmed !== '' && indent === 0) {
      finish();
      break;
    }
    const job = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (job) {
      finish();
      current = { id: job[1], lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  finish();
  return blocks;
}

function managerExecutablePattern(manager) {
  if (manager === 'pnpm') return '(?:corepack\\s+)?pnpm(?:@[^\\s]+)?';
  if (manager === 'yarn') return '(?:corepack\\s+)?yarn(?:@[^\\s]+)?';
  if (manager === 'bun') return 'bun';
  return 'npm';
}

function jobRunsLockedInstall(text, manager) {
  const commands = workflowRunCommands(text);
  const executable = managerExecutablePattern(manager);
  if (manager === 'npm') {
    return commands.some((command) => /(?:^|[;&|]\s*)npm\s+ci(?:\s|$)/m.test(command));
  }
  const install = new RegExp(`(?:^|[;&|]\\s*)${executable}\\s+install(?:\\s|$)`, 'm');
  const frozen = manager === 'yarn'
    ? /(?:^|\s)(?:--immutable|--frozen-lockfile)(?:\s|$)/m
    : /(?:^|\s)--frozen-lockfile(?:\s|$)/m;
  return commands.some((command) => install.test(command) && frozen.test(command));
}

function jobRunsScript(text, script, manager) {
  const escaped = script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const commands = workflowRunCommands(text);
  const executable = managerExecutablePattern(manager);
  const scriptCommand = new RegExp(`(?:^|[;&|]\\s*)${executable}(?:\\s+run)?\\s+${escaped}(?:\\s|$)`, 'm');
  if (commands.some((command) => scriptCommand.test(command))) {
    return true;
  }
  if (script === 'type-check') {
    if (manager === 'npm' && commands.some((command) => /(?:^|[;&|]\s*)npx\s+tsc\s+--noEmit(?:\s|$)/m.test(command))) return true;
    if (manager === 'pnpm' && commands.some((command) => /(?:^|[;&|]\s*)(?:corepack\s+)?pnpm(?:@[^\s]+)?\s+exec\s+tsc\s+--noEmit(?:\s|$)/m.test(command))) return true;
  }
  return script === 'build'
    && commands.some((command) => /(?:^|[;&|]\s*)node\s+\.\.\/\.\.\/scripts\/verify-web-ci-build\.mjs(?:\s|$)/m.test(command));
}

function scanCiCoverage(root, files, config) {
  const workflowFiles = files.filter((path) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path));
  const workflows = workflowFiles.map((path) => ({
    path,
    jobs: workflowJobBlocks(readText(root, path) ?? ''),
  }));
  const items = [];
  let failed = false;
  let unknown = false;

  if (config.activePackages.length === 0) {
    unknown = true;
    items.push(evidence(DEFAULT_CONFIG_PATH, 'No activePackages are configured; CI coverage cannot be established.'));
  }

  for (const activePackage of config.activePackages) {
    if (!activePackage || typeof activePackage.path !== 'string') {
      unknown = true;
      items.push(evidence(DEFAULT_CONFIG_PATH, 'An activePackages entry has no path.'));
      continue;
    }

    const packagePath = toPosix(activePackage.path.replace(/^\.\//, '').replace(/\/$/, ''));
    const packageManifest = `${packagePath}/package.json`;
    if (!existsSync(join(root, packageManifest))) {
      unknown = true;
      items.push(evidence(packageManifest, 'Configured active package is missing from this checkout.'));
      continue;
    }

    const requiredScripts = Array.isArray(activePackage.requiredScripts)
      ? activePackage.requiredScripts.filter((script) => typeof script === 'string')
      : [];
    const packageJobs = workflows.flatMap((workflow) => workflow.jobs
      .filter((job) => workflowCoversPackage(job.text, packagePath))
      .map((job) => ({ ...job, path: workflow.path })));
    const coveredBy = packageJobs.filter((job) => jobRunsLockedInstall(job.text, activePackage.manager)
      && requiredScripts.every((script) => jobRunsScript(job.text, script, activePackage.manager)));
    if (coveredBy.length === 0) {
      failed = true;
      let missingDetail = 'Active package has no unconditional root CI job with defaults.run.working-directory bound to its configured path.';
      if (packageJobs.length > 0) {
        const missing = [];
        if (!packageJobs.some((job) => jobRunsLockedInstall(job.text, activePackage.manager))) {
          missing.push(`${activePackage.manager} frozen install`);
        }
        missing.push(...requiredScripts.filter((script) => !packageJobs.some((job) => jobRunsScript(job.text, script, activePackage.manager))));
        missingDetail = `Root CI package job is missing required locked commands: ${missing.join(', ') || requiredScripts.join(', ')}`;
      }
      items.push(evidence(packageManifest, missingDetail));
    } else {
      items.push(evidence(coveredBy[0].path, `Root CI job ${coveredBy[0].id} covers ${packagePath}.`));
    }
  }

  return finding(config, {
    id: 'ci.active-package-coverage',
    severity: 'P1',
    status: failed ? 'fail' : unknown ? 'unknown' : 'pass',
    evidence: items,
    remediation: 'Add a root CI job for every configured active package using its locked package manager and real test/type/build scripts.',
    verification: 'Run the scanner and inspect the root workflow run for every active package.',
    rollback: 'Remove only the new root job or revert the active-package classification; do not restore inert nested workflows as a substitute.',
  });
}

function trackedFiles(root) {
  try {
    const output = execFileSync('git', ['-C', root, 'ls-files', '--cached', '-z'], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { files: output.split('\0').filter(Boolean).map(toPosix).sort(stableCompare), error: null };
  } catch (error) {
    return { files: [], error: error.message };
  }
}

function isAuthArtifact(path) {
  return basename(path) === 'settings.local.json'
    || /(^|\/)\.auth\/[^/]+\.json$/i.test(path)
    || /(^|\/)(auth|storage)[-_]?state[^/]*\.json$/i.test(path);
}

function scanTrackedAuthArtifacts(root, config) {
  const tracked = trackedFiles(root);
  if (tracked.error) {
    return finding(config, {
      id: 'security.tracked-auth-artifacts',
      severity: 'P0',
      status: 'unknown',
      evidence: [evidence('.git', `Unable to establish tracked files: ${tracked.error}`)],
      remediation: 'Run this check in a Git checkout and remove machine-local settings and reusable browser authentication state from version control.',
      verification: 'Use git ls-files and confirm no sensitive local-settings or auth-state path remains tracked.',
      rollback: 'Restore only a redacted template; rotate any credential or session that was previously committed.',
    });
  }

  const sensitive = tracked.files.filter((path) => !isIgnoredPath(path) && existsSync(join(root, path)) && isAuthArtifact(path));
  return finding(config, {
    id: 'security.tracked-auth-artifacts',
    severity: 'P0',
    status: sensitive.length > 0 ? 'fail' : 'pass',
    evidence: sensitive.length > 0
      ? sensitive.map((path) => evidence(path, 'Tracked machine-local settings or authentication state.'))
      : [evidence('.git', 'No tracked machine-local settings or authentication-state files found.')],
    remediation: 'Remove the artifact from version control, add an ignore rule, retain a redacted template where necessary, and rotate reusable sessions.',
    verification: 'Run git ls-files plus the scanner and confirm this finding passes without reading credential contents.',
    rollback: 'Restore only a redacted, non-authenticated template; never restore a reusable session token.',
  });
}

function stripYamlScalar(value) {
  const trimmed = value.trim().replace(/\s+#.*$/, '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseCopySources(line) {
  let body = line.replace(/^\s*(COPY|ADD)\s+/i, '').trim();
  if (/^--from(?:=|\s)/i.test(body)) return [];
  while (/^--(?:chown|chmod|link|parents)(?:=\S+|\s+\S+)\s+/i.test(body)) {
    body = body.replace(/^--(?:chown|chmod|link|parents)(?:=\S+|\s+\S+)\s+/i, '');
  }

  if (body.startsWith('[')) {
    try {
      const values = JSON.parse(body);
      return Array.isArray(values) ? values.slice(0, -1) : [];
    } catch {
      return null;
    }
  }

  const tokens = body.match(/"(?:[^"\\]|\\.)*"|'[^']*'|\S+/g)?.map((token) => token.replace(/^["']|["']$/g, '')) ?? [];
  return tokens.length >= 2 ? tokens.slice(0, -1) : null;
}

function dockerCopyInputs(root, composePath, contextValue, dockerfileValue) {
  const results = { missing: [], unknown: [] };
  if (!contextValue || contextValue.includes('${')) {
    results.unknown.push(evidence(composePath, 'Compose build context is dynamic or absent.'));
    return results;
  }

  const composeDirectory = dirname(join(root, composePath));
  const context = resolve(composeDirectory, contextValue);
  if (!isWithinRoot(root, context)) {
    results.unknown.push(evidence(composePath, `Compose build context escapes the requested project root: ${contextValue}`));
    return results;
  }
  if (!existsSync(context)) {
    results.missing.push(evidence(composePath, `Compose build context does not exist: ${contextValue}`));
    return results;
  }

  const dockerfile = resolve(context, dockerfileValue || 'Dockerfile');
  if (!isWithinRoot(root, dockerfile)) {
    results.unknown.push(evidence(composePath, `Compose Dockerfile escapes the requested project root: ${dockerfileValue || 'Dockerfile'}`));
    return results;
  }
  if (!existsSync(dockerfile)) {
    results.missing.push(evidence(composePath, `Compose Dockerfile does not exist: ${dockerfileValue || 'Dockerfile'}`));
    return results;
  }

  const dockerfilePath = toPosix(relative(root, dockerfile));
  const text = readFileSync(dockerfile, 'utf8').replace(/\\\r?\n\s*/g, ' ');
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*(COPY|ADD)\s+/i.test(lines[index])) continue;
    const sources = parseCopySources(lines[index]);
    if (sources === null) {
      results.unknown.push(evidence(dockerfilePath, 'Unable to parse COPY/ADD instruction.', index + 1));
      continue;
    }
    for (const source of sources) {
      if (source === '.' || /^https?:\/\//i.test(source)) continue;
      if (source.includes('$') || /[*?[]/.test(source)) {
        results.unknown.push(evidence(dockerfilePath, `Dynamic COPY/ADD source requires build-time verification: ${source}`, index + 1));
        continue;
      }
      const sourcePath = resolve(context, source);
      if (!isWithinRoot(context, sourcePath)) {
        results.missing.push(evidence(dockerfilePath, `COPY/ADD source escapes the build context: ${source}`, index + 1));
      } else if (!existsSync(sourcePath)) {
        results.missing.push(evidence(dockerfilePath, `COPY/ADD source does not exist in build context: ${source}`, index + 1));
      }
    }
  }
  return results;
}

function inspectCompose(root, composePath) {
  const missing = [];
  const unknown = [];
  const text = readText(root, composePath) ?? '';
  const lines = text.split('\n');
  let build = null;

  function finishBuild() {
    if (!build) return;
    const copyInputs = dockerCopyInputs(root, composePath, build.context, build.dockerfile);
    missing.push(...copyInputs.missing);
    unknown.push(...copyInputs.unknown);
    build = null;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;

    if (build && indent <= build.indent) finishBuild();

    const inlineBuild = trimmed.match(/^build:\s*(.+)$/);
    if (inlineBuild) {
      finishBuild();
      build = { indent, context: stripYamlScalar(inlineBuild[1]), dockerfile: 'Dockerfile' };
      finishBuild();
    } else if (/^build:\s*$/.test(trimmed)) {
      finishBuild();
      build = { indent, context: '.', dockerfile: 'Dockerfile' };
    } else if (build) {
      const context = trimmed.match(/^context:\s*(.+)$/);
      const dockerfile = trimmed.match(/^dockerfile:\s*(.+)$/);
      if (context) build.context = stripYamlScalar(context[1]);
      if (dockerfile) build.dockerfile = stripYamlScalar(dockerfile[1]);
    }

    const volume = trimmed.match(/^-\s*["']?(\.{1,2}\/[^:"']+):[^#]+/);
    if (volume) {
      const hostPath = volume[1];
      const sourcePath = resolve(dirname(join(root, composePath)), hostPath);
      if (!isWithinRoot(root, sourcePath)) {
        unknown.push(evidence(composePath, `Local volume source escapes the requested project root: ${hostPath}`, index + 1));
      } else if (!existsSync(sourcePath)) {
        missing.push(evidence(composePath, `Local volume source does not exist: ${hostPath}`, index + 1));
      }
    }
  }
  finishBuild();
  return { missing, unknown };
}

function composeFiles(files) {
  return files.filter((path) => /(^|\/)(?:docker-)?compose(?:\.[^/]+)?\.ya?ml$/i.test(path));
}

function scanContainerInputs(root, files, config) {
  const missing = [];
  const unknown = [];
  for (const composePath of composeFiles(files)) {
    const result = inspectCompose(root, composePath);
    missing.push(...result.missing);
    unknown.push(...result.unknown);
  }

  return finding(config, {
    id: 'containers.missing-local-inputs',
    severity: 'P1',
    status: missing.length > 0 ? 'fail' : unknown.length > 0 ? 'unknown' : 'pass',
    evidence: missing.length > 0
      ? [...missing, ...unknown]
      : unknown.length > 0
        ? unknown
        : [evidence('.', 'All statically resolvable Compose build, COPY/ADD, and local-volume inputs exist.')],
    remediation: 'Repair or remove stale Compose references and ensure every Dockerfile COPY source exists inside its declared build context.',
    verification: 'Run this scanner, docker compose config, and an offline container build using only reviewed lockfiles and pinned bases.',
    rollback: 'Restore the previous Compose/Dockerfile pair together; never restore a swallowed build failure or production secret mount.',
  });
}

function isFloatingImage(image) {
  if (!image || image === 'scratch' || image.includes('${')) return false;
  if (/^nexus\/.+:local$/i.test(image)) return false;
  return !/@sha256:[a-f0-9]{64}$/i.test(image);
}

function scanFloatingImages(root, files, config) {
  const floating = [];
  const dynamic = [];
  const candidates = files.filter((path) => composeFiles([path]).length > 0 || /(^|\/)Dockerfile(?:\.[^/]+)?$/i.test(path));

  for (const path of candidates) {
    const text = readText(root, path) ?? '';
    const lines = text.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (trimmed === '') continue;
      let image = null;
      const dockerFrontend = trimmed.match(/^#\s*syntax\s*=\s*(\S+)/i);
      if (trimmed.startsWith('#') && !dockerFrontend) continue;
      const composeImage = trimmed.match(/^image:\s*(.+)$/i);
      const dockerImage = trimmed.match(/^FROM\s+(?:--platform=\S+\s+)?(\S+)/i);
      if (dockerFrontend) image = dockerFrontend[1];
      if (composeImage) image = stripYamlScalar(composeImage[1]);
      if (dockerImage) image = dockerImage[1];
      if (!image || image === 'scratch') continue;
      if (image.includes('${')) {
        dynamic.push(evidence(path, 'Dynamic container image cannot be checked for digest pinning.', index + 1));
      } else if (isFloatingImage(image)) {
        floating.push(evidence(path, `Container image is not digest-pinned: ${image}`, index + 1));
      }
    }
  }

  return finding(config, {
    id: 'containers.floating-images',
    severity: 'P1',
    status: floating.length > 0 ? 'fail' : dynamic.length > 0 ? 'unknown' : 'pass',
    evidence: floating.length > 0
      ? [...floating, ...dynamic]
      : dynamic.length > 0
        ? dynamic
        : [evidence('.', 'All discovered external container images are digest-pinned.')],
    remediation: 'Resolve approved image versions to immutable sha256 digests and record the update process.',
    verification: 'Run the scanner and inspect docker image metadata for each recorded digest.',
    rollback: 'Restore the previously reviewed digest, not a floating tag.',
  });
}

function isRuntimeFile(path) {
  if (!RUNTIME_ROOTS.some((prefix) => path.startsWith(prefix))) return false;
  if (path === 'scripts/nexus-project-readiness.mjs' || path.startsWith('scripts/__tests__/')) return false;
  if (/(^|\/)[^/]+\.(?:test|spec)\.[^/]+$/i.test(path) || path.includes('/__tests__/')) return false;
  if (path.endsWith('settings.local.json')) return false;
  if (basename(path).includes('lock')) return false;
  return RUNTIME_EXTENSIONS.has(extname(path)) || basename(path).includes('.env');
}

function scanRuntimeLines(root, files, matcher) {
  const matches = [];
  for (const path of files.filter(isRuntimeFile)) {
    let size;
    try {
      size = statSync(join(root, path)).size;
    } catch {
      continue;
    }
    if (size > 1024 * 1024) continue;
    const text = readText(root, path) ?? '';
    const lines = text.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const detail = matcher(lines[index]);
      if (detail) matches.push(evidence(path, detail, index + 1));
    }
  }
  return matches;
}

function containsSshHomeReference(value) {
  return /homedir\(\).*['"]\.ssh['"]/i.test(value)
    || /\bhome\b.*['"]\.ssh['"]/i.test(value)
    || /(?:~|\$HOME|\$\{HOME\})\/\.ssh(?:\/|['"\s,:)]|$)/i.test(value);
}

function isAgentVisibleRootName(value) {
  const normalized = value.replace(/[^a-z]/gi, '').toLowerCase();
  return /^(?:writable|readonly|readable|allowed|selectable|selection|workspace|project)(?:roots?|paths?|dirs?|directories?)$/.test(normalized)
    || /^(?:mounts?|volumes?|binds?)$/.test(normalized);
}

function taintedSshBindings(lines) {
  const definitions = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const declaration = lines[index].match(/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(.*)$/);
    if (!declaration) continue;
    const name = declaration[1];
    const parts = [declaration[2]];
    let depth = (declaration[2].match(/\[/g) ?? []).length - (declaration[2].match(/\]/g) ?? []).length;
    while (depth > 0 && index + 1 < lines.length) {
      index += 1;
      parts.push(lines[index]);
      depth += (lines[index].match(/\[/g) ?? []).length - (lines[index].match(/\]/g) ?? []).length;
    }
    definitions.set(name, parts.join('\n'));
  }

  const tainted = new Set(
    [...definitions.entries()]
      .filter(([, value]) => containsSshHomeReference(value))
      .map(([name]) => name),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, value] of definitions) {
      if (tainted.has(name)) continue;
      if ([...tainted].some((binding) => new RegExp(`\\b${binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(value))) {
        tainted.add(name);
        changed = true;
      }
    }
  }
  return tainted;
}

function expressionUsesSshHome(value, taintedBindings) {
  if (containsSshHomeReference(value)) return true;
  return [...taintedBindings].some((binding) => new RegExp(`\\b${binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(value));
}

function scanSshExposure(root, files, config) {
  const matches = [];
  const exposureFiles = files.filter((path) => isRuntimeFile(path)
    || composeFiles([path]).length > 0
    || /(^|\/)Dockerfile(?:\.[^/]+)?$/i.test(path));
  for (const path of exposureFiles) {
    let size;
    try {
      size = statSync(join(root, path)).size;
    } catch {
      continue;
    }
    if (size > 1024 * 1024) continue;

    const lines = (readText(root, path) ?? '').split('\n');
    const taintedBindings = taintedSshBindings(lines);
    let visibleContext = null;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
      const indent = line.length - line.trimStart().length;
      if (visibleContext && indent <= visibleContext.indent && index > visibleContext.line) visibleContext = null;

      const property = line.match(/^\s*["']?([A-Za-z0-9_$-]+)["']?\s*:\s*(.*)$/);
      if (property) {
        visibleContext = isAgentVisibleRootName(property[1])
          ? { name: property[1], indent, line: index }
          : null;
        if (visibleContext && expressionUsesSshHome(property[2], taintedBindings)) {
          matches.push(evidence(path, `Agent-visible ${property[1]} exposes the SSH home directory.`, index + 1));
          continue;
        }
      }

      const declaration = line.match(/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(.*)$/);
      if (declaration && isAgentVisibleRootName(declaration[1]) && expressionUsesSshHome(declaration[2], taintedBindings)) {
        matches.push(evidence(path, `Agent-visible ${declaration[1]} exposes the SSH home directory.`, index + 1));
        continue;
      }

      if (visibleContext && expressionUsesSshHome(line, taintedBindings)) {
        matches.push(evidence(path, `Agent-visible ${visibleContext.name} exposes the SSH home directory.`, index + 1));
        continue;
      }

      const commandMount = /(?:^|\s)(?:--mount|--volume|-v)\s+/i.test(line)
        || /^\s*VOLUME\s+/i.test(line);
      if (commandMount && expressionUsesSshHome(line, taintedBindings)) {
        matches.push(evidence(path, 'Container or command mount exposes the SSH home directory.', index + 1));
      }
    }
  }
  return finding(config, {
    id: 'security.ssh-home-exposure',
    severity: 'P1',
    status: matches.length > 0 ? 'fail' : 'pass',
    evidence: matches.length > 0 ? matches : [evidence('.', 'No agent-visible SSH home-directory exposure found in runtime inputs.')],
    remediation: 'Remove SSH key directories from agent-visible roots; use SSH_AUTH_SOCK, host allowlists, pinned known hosts, and bounded commands.',
    verification: 'Run the scanner and a denied-path test proving the workspace cannot select or read ~/.ssh.',
    rollback: 'Restore only the prior host allowlist or agent-socket configuration, never direct private-key access.',
  });
}

function scanImplicitProductionDefaults(root, files, config) {
  const shellDefault = /\$\{(?:[A-Z0-9_]*(?:SUPABASE|DATABASE)[A-Z0-9_]*_URL|SUPABASE_URL|DATABASE_URL):-https?:\/\/(?!localhost|127\.0\.0\.1|example\.)[^}]+\}/i;
  const codeDefault = /(?:process\.env\.)?(?:[A-Z0-9_]*(?:SUPABASE|DATABASE)[A-Z0-9_]*_URL|SUPABASE_URL|DATABASE_URL)\s*(?:\?\?|\|\|)\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1|example\.)/i;
  const matches = scanRuntimeLines(root, files, (line) => {
    if (shellDefault.test(line) || codeDefault.test(line)) {
      return 'Database/Supabase URL falls back to a non-local HTTPS endpoint.';
    }
    return null;
  });
  return finding(config, {
    id: 'runtime.implicit-production-url-defaults',
    severity: 'P1',
    status: matches.length > 0 ? 'fail' : 'pass',
    evidence: matches.length > 0 ? matches : [evidence('.', 'No implicit non-local database URL defaults found in runtime inputs.')],
    remediation: 'Require an explicit environment-specific URL and fail closed when it is absent.',
    verification: 'Run the scanner and execute the wrapper with the URL unset; it must exit before any connection attempt.',
    rollback: 'Restore the prior wrapper only with its network execution disabled; never restore an implicit production fallback.',
  });
}

function scanToolchainMatrix(root, files, config) {
  const items = [];
  let failed = false;
  let unknown = false;
  const rootManifestResult = readJson(root, 'package.json');
  const rootNode = rootManifestResult.value?.engines?.node ?? null;

  for (const activePackage of config.activePackages) {
    if (!activePackage || typeof activePackage.path !== 'string') {
      unknown = true;
      continue;
    }
    const packagePath = toPosix(activePackage.path.replace(/^\.\//, '').replace(/\/$/, ''));
    const manifestPath = `${packagePath}/package.json`;
    const manifestResult = readJson(root, manifestPath);
    if (!manifestResult.value) {
      unknown = true;
      items.push(evidence(manifestPath, manifestResult.error));
      continue;
    }

    const manager = typeof activePackage.manager === 'string' ? activePackage.manager : null;
    const expectedLock = typeof activePackage.lockfile === 'string'
      ? activePackage.lockfile
      : manager ? LOCKFILES[manager] : null;
    const observedLocks = Object.entries(LOCKFILES)
      .filter(([, lockfile]) => existsSync(join(root, packagePath, lockfile)))
      .map(([name, lockfile]) => `${name}:${lockfile}`);
    const effectiveNode = manifestResult.value.engines?.node ?? rootNode;

    if (!manager || !expectedLock || !existsSync(join(root, packagePath, expectedLock))) failed = true;
    if (!effectiveNode) unknown = true;
    items.push(evidence(manifestPath, [
      `manager=${manager ?? 'unknown'}`,
      `expectedLock=${expectedLock ?? 'unknown'}`,
      `observedLocks=${observedLocks.join(',') || 'none'}`,
      `node=${effectiveNode ?? 'unknown'}`,
    ].join('; ')));
  }

  if (config.activePackages.length === 0) {
    unknown = true;
    items.push(evidence(DEFAULT_CONFIG_PATH, 'No active packages configured for toolchain inspection.'));
  }

  const exactNodeMajors = new Map();
  for (const path of files.filter((entry) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry))) {
    const text = readText(root, path) ?? '';
    for (const declaration of text.matchAll(/^\s*(?:NODE_VERSION|node-version):\s*(.+)$/gim)) {
      const value = declaration[1].replace(/\s+#.*$/, '').trim();
      if (value.includes('${{')) continue;
      for (const match of value.matchAll(/(?:^|[\s,\[])["']?(\d+)(?:\.(?:\d+|[xX])){0,2}["']?(?=$|[\s,\]])/g)) {
        exactNodeMajors.set(Number(match[1]), [...(exactNodeMajors.get(Number(match[1])) ?? []), path]);
      }
    }
  }
  for (const path of files.filter((entry) => /(^|\/)Dockerfile(?:\.[^/]+)?$/i.test(entry))) {
    const text = readText(root, path) ?? '';
    for (const match of text.matchAll(/^\s*FROM\s+(?:--platform=\S+\s+)?node:(\d+)/gim)) {
      exactNodeMajors.set(Number(match[1]), [...(exactNodeMajors.get(Number(match[1])) ?? []), path]);
    }
  }
  for (const [major, paths] of [...exactNodeMajors.entries()].sort((left, right) => left[0] - right[0])) {
    items.push(evidence(paths.sort(stableCompare)[0], `Observed exact Node major ${major} in ${[...new Set(paths)].sort(stableCompare).join(', ')}.`));
  }
  if (exactNodeMajors.size > 1) failed = true;

  return finding(config, {
    id: 'toolchain.package-lock-node-matrix',
    severity: 'P1',
    status: failed ? 'fail' : unknown ? 'unknown' : 'pass',
    evidence: items,
    remediation: 'Declare each active package manager and lockfile, restore missing locks, and document one supported Node matrix across CI and containers.',
    verification: 'Run locked clean installs plus each package test/type/build command on the declared Node versions.',
    rollback: 'Restore the prior lockfile and runtime selector as one atomic change; do not mix regenerated locks from another manager.',
  });
}

function scanSourceOfTruth(root, config) {
  const findings = [];
  for (const check of config.sourceOfTruthChecks) {
    if (!check || typeof check.id !== 'string' || !Array.isArray(check.assertions)) continue;
    const items = [];
    let failed = false;
    let unknown = false;

    for (const assertion of check.assertions) {
      if (!assertion || typeof assertion.path !== 'string') {
        unknown = true;
        items.push(evidence(DEFAULT_CONFIG_PATH, `Source-of-truth check ${check.id} has an invalid assertion.`));
        continue;
      }
      const text = readText(root, assertion.path);
      if (text === null) {
        unknown = true;
        items.push(evidence(assertion.path, 'Required source-of-truth document is missing.'));
        continue;
      }

      for (const required of Array.isArray(assertion.require) ? assertion.require : []) {
        if (typeof required !== 'string') continue;
        const index = text.indexOf(required);
        if (index === -1) {
          failed = true;
          items.push(evidence(assertion.path, `Required claim is absent: ${required}`));
        } else {
          items.push(evidence(assertion.path, `Required claim present: ${required}`, lineNumber(text, index)));
        }
      }
      for (const forbidden of Array.isArray(assertion.forbid) ? assertion.forbid : []) {
        if (typeof forbidden !== 'string') continue;
        const index = text.indexOf(forbidden);
        if (index !== -1) {
          failed = true;
          items.push(evidence(assertion.path, `Contradictory claim present: ${forbidden}`, lineNumber(text, index)));
        }
      }
    }

    findings.push(finding(config, {
      id: `source-of-truth.${check.id}`,
      severity: 'P1',
      status: failed ? 'fail' : unknown ? 'unknown' : 'pass',
      evidence: items.length > 0 ? items : [evidence(DEFAULT_CONFIG_PATH, `No assertions evaluated for ${check.id}.`)],
      remediation: check.description || 'Reconcile the conflicting claim in the newest authoritative project documents.',
      verification: 'Run the scanner and have the source-of-truth owner confirm the same current-state claim across all asserted documents.',
      rollback: 'Restore the last internally consistent source-of-truth set as one change, preserving historical evidence in explicitly archival material.',
    }));
  }
  return findings;
}

export function evaluateGate(report) {
  const blockingFindingIds = report.findings
    .filter((entry) => entry.blocking && entry.status !== 'pass')
    .map((entry) => entry.id)
    .sort(stableCompare);
  return { blockingFindingIds, exitCode: blockingFindingIds.length > 0 ? 1 : 0 };
}

export function scanProject(requestedRoot, options = {}) {
  const root = resolve(requestedRoot);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    throw new Error(`Project root is not a directory: ${root}`);
  }

  const files = walkFiles(root);
  const loaded = loadConfig(root, options.configPath ?? DEFAULT_CONFIG_PATH);
  const config = loaded.config;
  const findings = [
    scanConfiguration(config, loaded.configPath, loaded.error),
    scanNestedWorkflows(root, files, config),
    scanCiCoverage(root, files, config),
    scanTrackedAuthArtifacts(root, config),
    scanContainerInputs(root, files, config),
    scanFloatingImages(root, files, config),
    scanSshExposure(root, files, config),
    scanImplicitProductionDefaults(root, files, config),
    scanToolchainMatrix(root, files, config),
    ...scanSourceOfTruth(root, config),
  ].sort((left, right) => stableCompare(left.id, right.id));

  const summary = {
    pass: findings.filter((entry) => entry.status === 'pass').length,
    fail: findings.filter((entry) => entry.status === 'fail').length,
    unknown: findings.filter((entry) => entry.status === 'unknown').length,
    blocking: findings.filter((entry) => entry.blocking).length,
    configuredP0FindingIds: [...config.p0FindingIds].sort(stableCompare),
  };

  return {
    schemaVersion: 1,
    root,
    configPath: loaded.configPath,
    findings,
    summary,
  };
}

function parseArguments(argv) {
  let root = process.cwd();
  let configPath = DEFAULT_CONFIG_PATH;
  let json = false;
  let gate = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      json = true;
    } else if (argument === '--gate') {
      gate = true;
    } else if (argument === '--root' || argument === '--config') {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value.`);
      if (argument === '--root') root = value;
      else configPath = value;
      index += 1;
    } else if (argument.startsWith('--root=')) {
      root = argument.slice('--root='.length);
    } else if (argument.startsWith('--config=')) {
      configPath = argument.slice('--config='.length);
    } else if (argument === '--help' || argument === '-h') {
      return { help: true, root, configPath, json, gate };
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { help: false, root, configPath, json, gate };
}

function renderText(report) {
  const lines = [
    `Nexus Project Readiness: ${report.root}`,
    `pass=${report.summary.pass} fail=${report.summary.fail} unknown=${report.summary.unknown} blocking=${report.summary.blocking}`,
  ];
  for (const entry of report.findings) {
    lines.push(`${entry.status.toUpperCase()} ${entry.severity} ${entry.id}`);
    for (const item of entry.evidence) {
      lines.push(`  ${item.path}${item.line ? `:${item.line}` : ''} — ${item.detail}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function printHelp() {
  process.stdout.write([
    'Usage: node scripts/nexus-project-readiness.mjs [options]',
    '',
    '  --root <path>    Project root to inspect (default: current directory)',
    '  --config <path>  Readiness config path, relative to root by default',
    '  --json           Emit deterministic machine-readable JSON',
    '  --gate           Exit non-zero only for configured P0 findings',
    '',
  ].join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      const report = scanProject(options.root, { configPath: options.configPath });
      process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
      if (options.gate) process.exitCode = evaluateGate(report).exitCode;
    }
  } catch (error) {
    process.stderr.write(`nexus-project-readiness: ${error.message}\n`);
    process.exitCode = 2;
  }
}
