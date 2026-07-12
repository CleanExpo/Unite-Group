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

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      config: FAIL_CLOSED_CONFIG,
      configPath: path,
      error: 'Configuration root must be an object.',
    };
  }

  return {
    config: {
      p0FindingIds: Array.isArray(parsed.p0FindingIds) ? parsed.p0FindingIds.filter((item) => typeof item === 'string') : [],
      activePackages: Array.isArray(parsed.activePackages) ? parsed.activePackages : [],
      sourceOfTruthChecks: Array.isArray(parsed.sourceOfTruthChecks) ? parsed.sourceOfTruthChecks : [],
    },
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

function workflowCoversPackage(text, packagePath) {
  const escaped = packagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [
    new RegExp(`working-directory:\\s*["']?${escaped}(?:["']|\\s|$)`),
    new RegExp(`(?:^|\\s)cd\\s+["']?${escaped}(?:["']|\\s|$)`, 'm'),
    new RegExp(`(?:--prefix|-C)\\s+["']?${escaped}(?:["']|\\s|$)`),
  ].some((pattern) => pattern.test(text));
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

function jobRunsScript(text, script) {
  const escaped = script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:npm|pnpm|yarn|bun)(?:\\s+run)?\\s+${escaped}(?:\\s|$)`, 'm').test(text);
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
    const coveredBy = packageJobs.filter((job) => requiredScripts.every((script) => jobRunsScript(job.text, script)));
    if (coveredBy.length === 0) {
      failed = true;
      const missingDetail = packageJobs.length === 0
        ? 'Active package has no executable root CI job.'
        : `Root CI package job is missing required scripts: ${requiredScripts.filter((script) => !packageJobs.some((job) => jobRunsScript(job.text, script))).join(', ') || requiredScripts.join(', ')}`;
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
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      let image = null;
      const composeImage = trimmed.match(/^image:\s*(.+)$/i);
      const dockerImage = trimmed.match(/^FROM\s+(?:--platform=\S+\s+)?(\S+)/i);
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

function scanSshExposure(root, files, config) {
  const matches = scanRuntimeLines(root, files, (line) => {
    const exposesHomeSsh = /homedir\(\).*['"]\.ssh['"]/i.test(line)
      || /\bhome\b.*['"]\.ssh['"]/i.test(line)
      || /(?:~|\$HOME|\$\{HOME\})\/\.ssh(?:\/|['"\s,)]|$)/i.test(line);
    return exposesHomeSsh ? 'Agent-visible configuration references the SSH home directory.' : null;
  });
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
    for (const match of text.matchAll(/NODE_VERSION:\s*["']?(\d+)/g)) {
      exactNodeMajors.set(Number(match[1]), [...(exactNodeMajors.get(Number(match[1])) ?? []), path]);
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
