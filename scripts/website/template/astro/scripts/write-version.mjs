// Stamps the commit being built into public/version.json, so `client-site.mjs live <slug>` can
// prove which build a live site is serving. Vercel sets VERCEL_GIT_COMMIT_SHA during builds.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

let sha = process.env.VERCEL_GIT_COMMIT_SHA || '';
if (!sha) {
  try {
    sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    sha = 'unknown';
  }
}
mkdirSync('public', { recursive: true });
writeFileSync('public/version.json', `${JSON.stringify({ sha, built_at: new Date().toISOString() })}\n`);
