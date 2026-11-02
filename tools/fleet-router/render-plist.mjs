#!/usr/bin/env node
/**
 * Renders the launchd template and lints it with plutil. It only writes the file (and creates the log
 * folder launchd needs); loading the agent is a separate, deliberate step.
 * Usage: node render-plist.mjs --out <file> [--node <path>] [--router-dir <dir>] [--log-dir <dir>]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FLAGS = { '--out': 'out', '--node': 'node', '--router-dir': 'routerDir', '--log-dir': 'logDir' };

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderPlist(template, { node, routerDir, logDir }) {
  for (const [name, value] of Object.entries({ node, routerDir, logDir })) {
    if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error(`${name} must be an absolute path`);
  }
  // A replacer function, so a `$` in a path is taken literally.
  const rendered = template
    .replace(/__NODE_PATH__/g, () => escapeXml(node))
    .replace(/__ROUTER_DIR__/g, () => escapeXml(routerDir))
    .replace(/__LOG_DIR__/g, () => escapeXml(logDir));
  const left = rendered.match(/__[A-Z_]+__/);
  if (left) throw new Error(`template placeholder not filled: ${left[0]}`);
  return rendered;
}

export function parseArgs(argv) {
  const home = os.homedir();
  const options = {
    node: path.join(home, '.local', 'node22', 'bin', 'node'),
    routerDir: HERE,
    logDir: path.join(home, '.unite-fleet', 'router', 'logs'),
  };
  for (let i = 0; i < argv.length; i += 2) {
    const field = FLAGS[argv[i]];
    if (!field || argv[i + 1] === undefined) throw new Error(`unknown or incomplete argument: ${argv[i]}`);
    options[field] = argv[i + 1];
  }
  if (!options.out) throw new Error('--out is required');
  return options;
}

export function renderToFile(options) {
  const template = fs.readFileSync(path.join(HERE, 'com.unite.fleet-router.plist.template'), 'utf8');
  const rendered = renderPlist(template, options);
  const tmp = `${options.out}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, rendered, { mode: 0o644 });
    execFileSync('/usr/bin/plutil', ['-lint', tmp], { stdio: ['ignore', 'ignore', 'inherit'] });
    fs.mkdirSync(options.logDir, { recursive: true, mode: 0o700 });
    fs.renameSync(tmp, options.out);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    renderToFile(options);
    console.log(JSON.stringify({ rendered: options.out }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}
