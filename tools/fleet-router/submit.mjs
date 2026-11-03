#!/usr/bin/env node
/**
 * Validates a probe request and drops it into the router inbox atomically.
 * Usage: node submit.mjs [--machine <id>] [--repo <name>] [--note <text>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { defaultHome, ensureDirs, validateRequest, writeJsonAtomic } from './router.mjs';

export function submit(value, home = defaultHome()) {
  const checked = validateRequest(value);
  if (!checked.ok) throw new Error(checked.error);
  ensureDirs(home);
  // The time prefix makes the router's name order first-in, first-out.
  const file = `${String(Date.now()).padStart(15, '0')}-${randomUUID()}.json`;
  writeJsonAtomic(home, path.join(home, 'inbox', file), checked.request);
  return file;
}

export function parseArgs(argv) {
  const flags = { '--machine': 'machineId', '--repo': 'repo', '--note': 'note' };
  const request = { type: 'probe' };
  for (let i = 0; i < argv.length; i += 2) {
    const field = flags[argv[i]];
    if (!field || argv[i + 1] === undefined) throw new Error(`unknown or incomplete argument: ${argv[i]}`);
    request[field] = argv[i + 1];
  }
  return request;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    console.log(JSON.stringify({ submitted: submit(parseArgs(process.argv.slice(2))) }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(2);
  }
}
