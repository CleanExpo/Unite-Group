// Client project workspace (private, outside the repo) and site scaffold (public, sites/<slug>).
import { execFileSync } from 'node:child_process';
import {
  appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  CLOUDFLARE_BLOCKER, HOSTS, INCOMING_RESERVED, REPO_ROOT, TEMPLATE_DIR, ToolError, auDateTime, freeName, isoDate,
  readProject, requireWorkspace, validateDomain, validateSlug, workspacePath, writeJsonAtomic,
} from './common.mjs';
import { auditClientAssets } from './images.mjs';
import { missingRedirects } from './wordpress.mjs';

export const TEMPLATE_VERSION = '2026-11-16';
const TEXT_EXT = /\.(astro|mjs|js|json|md|txt|css|svg|html|xml|npmrc|gitignore)$|^\.npmrc$|^\.gitignore$|^\.node-version$/;
// Never inside the public site folder: these hold client material or workspace state.
const PRIVATE_NAMES = new Set(['incoming', 'outgoing', 'NOTES.md', 'project.json', 'live-checks.json']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.vercel']);

// The one owner of "put a client-supplied value into a generated file". A value is written only through
// the form its token names, so no generator hand-escapes anything:
//   {{NAME_JS}}  a JavaScript string literal (quotes, backslashes, line breaks and "<" escaped)
//   {{NAME}}     the raw name, allowed in Markdown only (never inside source code)
//   {{DOMAIN}}, {{SLUG}}, {{BUSINESS_KEY}}  values already limited to letters, digits, dots and hyphens
export function jsStringLiteral(value) {
  return JSON.stringify(String(value)).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function renderTokens(text, fileName, { name, domain, slug }) {
  const raw = { NAME: name, DOMAIN: domain, SLUG: slug, BUSINESS_KEY: slug };
  const isMarkdown = /\.md$/.test(fileName);
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (whole, token) => {
    if (token === 'NAME_JS') return jsStringLiteral(name);
    if (token === 'NAME') {
      if (!isMarkdown) throw new ToolError(`template ${fileName} puts the raw business name in source code; use {{NAME_JS}}`);
      return name;
    }
    if (token in raw) return raw[token];
    throw new ToolError(`template ${fileName} has an unknown token ${whole}`);
  });
}

function fillTokens(dir, values) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) fillTokens(full, values);
    else if (TEXT_EXT.test(entry.name)) {
      const text = readFileSync(full, 'utf8');
      const out = renderTokens(text, entry.name, values);
      if (out !== text) writeFileSync(full, out);
    }
  }
}

function notesHeader(project) {
  return [
    `# ${project.name} - project notes`,
    '',
    'Private working log. One dated entry per session: what was done and the next step.',
    'Add entries with: node scripts/website/client-site.mjs note <slug> --done "..." --next "..."',
    '',
  ].join('\n');
}

export function newProject(ctx, { slug, name, domain, host = 'vercel', contactName = '', now = new Date() }) {
  validateSlug(slug);
  if (host === 'cloudflare') throw new ToolError(CLOUDFLARE_BLOCKER, 2);
  if (!HOSTS.includes(host)) throw new ToolError(`unknown host "${host}"; use --host vercel`, 2);
  validateDomain(domain);
  if (!name || !name.trim()) throw new ToolError('give the business name with --name', 2);
  const ws = workspacePath(ctx, slug);
  const site = join(ctx.sitesDir, slug);
  const wsExists = existsSync(ws);
  const siteExists = existsSync(site);
  if (wsExists && siteExists) throw new ToolError(`"${slug}" already exists (${ws} and ${site}); nothing changed`);
  if (wsExists) throw new ToolError(`the workspace ${ws} exists but the site folder ${site} does not; restore or remove the workspace by hand`);
  if (siteExists) throw new ToolError(`the site folder ${site} exists but the workspace ${ws} does not; this machine may not hold the workspace`);
  if (!existsSync(ctx.sitesDir)) throw new ToolError(`sites folder ${ctx.sitesDir} does not exist`);

  const project = {
    schema: 1, slug, name: name.trim(), domain, host, business_key: slug, contact_name: contactName.trim(),
    template_version: TEMPLATE_VERSION, created_at: now.toISOString(), client_status: 'active', offboarded_at: null,
    site_path: `sites/${slug}`,
  };
  mkdirSync(ctx.clientRoot, { recursive: true });
  const tmpWs = join(ctx.clientRoot, `.${slug}.tmp-${process.pid}`);
  const tmpSite = join(ctx.sitesDir, `.${slug}.tmp-${process.pid}`);
  let wsPlaced = false;
  try {
    for (const d of ['incoming/reference', 'incoming/changes', 'incoming/done', 'outgoing/emails/sent']) mkdirSync(join(tmpWs, d), { recursive: true });
    writeFileSync(join(tmpWs, 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
    writeFileSync(join(tmpWs, 'NOTES.md'), notesHeader(project));
    cpSync(TEMPLATE_DIR, tmpSite, { recursive: true, filter: (src) => !SKIP_DIRS.has(src.split(sep).pop()) });
    fillTokens(tmpSite, { name: project.name, domain, slug });
    renameSync(tmpWs, ws);
    wsPlaced = true;
    renameSync(tmpSite, site);
  } catch (err) {
    rmSync(tmpWs, { recursive: true, force: true });
    rmSync(tmpSite, { recursive: true, force: true });
    if (wsPlaced) rmSync(ws, { recursive: true, force: true });
    throw new ToolError(`new stopped, nothing kept: ${err.message}`);
  }
  return { workspace: ws, site, project };
}

export function note(ctx, { slug, done, next, now = new Date() }) {
  const ws = requireWorkspace(ctx, slug);
  if (!done || !done.trim() || !next || !next.trim()) throw new ToolError('give both --done and --next', 2);
  appendFileSync(join(ws, 'NOTES.md'), `\n## ${auDateTime(now)}\n\n- Done: ${done.trim()}\n- Next: ${next.trim()}\n`);
  return { file: join(ws, 'NOTES.md') };
}

function filesUnder(dir, { skipReservedAtTop = false } = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        if (skipReservedAtTop && d === dir && INCOMING_RESERVED.has(e.name)) continue;
        if (d === dir && e.name === 'sent') continue;
        walk(full);
      } else if (e.isFile() && !e.name.startsWith('.')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function oldestHours(files, now) {
  if (!files.length) return 0;
  return Math.max(...files.map((f) => (now - statSync(f).mtimeMs) / 3600000));
}

export function projectStatus(ctx, ws, { now = new Date(), maxChangeHours = 24, retentionDays = 90 } = {}) {
  const project = readProject(ws);
  const notes = readFileSync(join(ws, 'NOTES.md'), 'utf8');
  const headings = [...notes.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  const changes = filesUnder(join(ws, 'incoming', 'changes'));
  const waiting = filesUnder(join(ws, 'incoming'), { skipReservedAtTop: true });
  const drafts = filesUnder(join(ws, 'outgoing', 'emails'));
  const attention = [];
  const changeAge = oldestHours(changes, now);
  if (changes.length && changeAge > maxChangeHours) {
    attention.push(`${changes.length} change request(s) waiting, oldest ${Math.round(changeAge)} h (limit ${maxChangeHours} h)`);
  }
  if (drafts.length) attention.push(`${drafts.length} email draft(s) not yet sent (move to outgoing/emails/sent/ once sent)`);
  if (project.client_status === 'offboarded' && project.offboarded_at) {
    const days = (now - new Date(project.offboarded_at)) / 86400000;
    if (days > retentionDays) attention.push(`offboarded ${Math.round(days)} days ago; past the ${retentionDays}-day retention, delete the workspace by hand`);
  }
  return {
    slug: project.slug, name: project.name, host: project.host, workspace: ws, status: project.client_status,
    last_note: headings.length ? headings[headings.length - 1] : 'none yet', incoming_waiting: waiting.length,
    changes_waiting: changes.length, drafts_waiting: drafts.length, attention,
  };
}

export function status(ctx, { slug = null, all = false, now = new Date(), maxChangeHours, retentionDays }) {
  const opts = { now, maxChangeHours, retentionDays };
  if (all) {
    if (!existsSync(ctx.clientRoot)) throw new ToolError(`client projects folder ${ctx.clientRoot} is not on this machine`);
    const slugs = readdirSync(ctx.clientRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && existsSync(join(ctx.clientRoot, d.name, 'project.json'))).map((d) => d.name).sort();
    return { root: ctx.clientRoot, projects: slugs.map((s) => projectStatus(ctx, join(ctx.clientRoot, s), opts)) };
  }
  return { root: ctx.clientRoot, projects: [projectStatus(ctx, requireWorkspace(ctx, slug), opts)] };
}

export function offboard(ctx, { slug, now = new Date() }) {
  const ws = requireWorkspace(ctx, slug);
  const project = readProject(ws);
  project.client_status = 'offboarded';
  project.offboarded_at = now.toISOString();
  writeJsonAtomic(join(ws, 'project.json'), project);
  return { workspace: ws, project };
}

const EMAIL_KINDS = {
  'change-preview': (p, o) => ({
    subject: `Your website change is ready to review`,
    body: [`The change you asked for is ready for you to look at before it goes live:`, '', o.summary, '',
      `Preview link: ${o.url}`, '', 'Please check it on your phone and on a computer. Reply to say it is approved, or tell us what to adjust.'],
  }),
  'change-live': (p, o) => ({
    subject: `Your website change is now live`,
    body: [`The change below is now live on ${p.domain}:`, '', o.summary, '', `You can see it here: ${o.url}`, '',
      'If anything looks wrong, reply to this email and we will fix it.'],
  }),
  handover: (p, o) => ({
    subject: `Your new website: handover`,
    body: [`Your new website is live at https://${p.domain}.`, '', o.summary, '',
      'To request a change, reply to this email or send it through your client portal. We will send a preview before anything goes live.'],
  }),
};

export function draftEmail(ctx, { slug, kind, summary, url = '', now = new Date(), liveWithinHours = 24 }) {
  const ws = requireWorkspace(ctx, slug);
  const project = readProject(ws);
  const make = EMAIL_KINDS[kind];
  if (!make) throw new ToolError(`unknown email kind "${kind}"; use ${Object.keys(EMAIL_KINDS).join(', ')}`, 2);
  if (!summary || !summary.trim()) throw new ToolError('describe the change with --summary', 2);
  if ((kind === 'change-preview' || kind === 'change-live') && !/^https:\/\//.test(url)) throw new ToolError('give the https link with --url', 2);
  if (kind === 'change-live') {
    const checks = readLiveChecks(ws);
    const last = checks[checks.length - 1];
    const fresh = last && last.ok && (now - new Date(last.checked_at)) / 3600000 <= liveWithinHours;
    if (!fresh) throw new ToolError(`no passing live check in the last ${liveWithinHours} h; run live ${slug} first so the email does not claim a change that is not live`);
  }
  const { subject, body } = make(project, { summary: summary.trim(), url });
  const greeting = project.contact_name ? `Hello ${project.contact_name},` : 'Hello,';
  const text = [
    'DRAFT - not sent. The owner reviews, edits and sends this. Move it to outgoing/emails/sent/ once sent.',
    '',
    `To: ${project.name}`,
    `Subject: ${subject}`,
    '',
    greeting,
    '',
    ...body,
    '',
    'Kind regards,',
    '',
  ].join('\n');
  const dir = join(ws, 'outgoing', 'emails');
  mkdirSync(dir, { recursive: true });
  const file = freeName(dir, `${isoDate(now)}-${kind}`, '.md');
  writeFileSync(file, text, { flag: 'wx' });
  return { file };
}

export function readLiveChecks(ws) {
  const path = join(ws, 'live-checks.json');
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8'));
}

function defaultGit(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// Read-only: is the live site serving a build that contains the latest site commit on main,
// and does www redirect to the bare domain?
export async function liveCheck(ctx, { slug, fetchImpl = globalThis.fetch, git = defaultGit, now = new Date(), timeoutMs = 15000 }) {
  const ws = requireWorkspace(ctx, slug);
  const project = readProject(ws);
  const problems = [];
  let deployed = null;
  try {
    const res = await fetchImpl(`https://${project.domain}/version.json`, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
    if (res.status !== 200) problems.push(`version.json returned ${res.status}`);
    else deployed = (await res.json()).sha || null;
  } catch (err) {
    problems.push(`version.json could not be read (${err.message})`);
  }
  let expected = null;
  try {
    expected = git(['log', '-1', '--format=%H', 'origin/main', '--', `sites/${slug}`]);
  } catch (err) {
    problems.push(`could not read the latest site commit on origin/main (${err.message})`);
  }
  if (!expected && !problems.length) problems.push(`no commit for sites/${slug} on origin/main yet`);
  if (deployed && expected) {
    try {
      git(['merge-base', '--is-ancestor', expected, deployed]);
    } catch {
      problems.push(`live build ${deployed.slice(0, 12)} does not contain the latest site commit ${expected.slice(0, 12)}`);
    }
  } else if (!deployed && !problems.length) problems.push('version.json has no sha');
  try {
    const res = await fetchImpl(`https://www.${project.domain}/`, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    const loc = res.headers.get('location') || '';
    const okCode = [301, 308].includes(res.status);
    let host = '';
    try { host = new URL(loc, `https://www.${project.domain}/`).host; } catch { host = ''; }
    if (!okCode || host !== project.domain) problems.push(`www.${project.domain} answered ${res.status} to "${loc}", expected a permanent redirect to ${project.domain}`);
  } catch (err) {
    problems.push(`www.${project.domain} could not be reached (${err.message})`);
  }
  const record = { checked_at: now.toISOString(), ok: problems.length === 0, deployed_sha: deployed, expected_sha: expected, problems };
  const checks = readLiveChecks(ws);
  checks.push(record);
  writeJsonAtomic(join(ws, 'live-checks.json'), checks.slice(-50));
  return record;
}

function walkSite(dir, onEntry, root = dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    onEntry(e, full, relative(root, full).split(sep).join('/'));
    if (e.isDirectory()) walkSite(full, onEntry, root);
  }
}

// Structure and privacy checks. With siteOnly, the private workspace checks are skipped and the
// result says so; otherwise a missing workspace is a failure.
export function checkProject(ctx, { slug, siteOnly = false }) {
  validateSlug(slug);
  const problems = [];
  const notes = [];
  const site = join(ctx.sitesDir, slug);
  if (!existsSync(site)) return { problems: [`[site] ${site} does not exist`], notes };

  walkSite(site, (e, full, rel) => {
    if (PRIVATE_NAMES.has(e.name)) problems.push(`[private] ${rel} must not be inside the public site folder; client material belongs in the workspace`);
  });
  const vercel = join(site, 'vercel.json');
  if (!existsSync(vercel)) problems.push('[host] vercel.json is missing');
  else {
    const cfg = JSON.parse(readFileSync(vercel, 'utf8'));
    if (cfg.installCommand !== 'npm ci') problems.push('[host] vercel.json installCommand must be "npm ci" so the host installs the committed lockfile');
  }
  if (!existsSync(join(site, 'package-lock.json'))) problems.push('[deps] package-lock.json is missing');
  const pkgPath = join(site, 'package.json');
  if (!existsSync(pkgPath)) problems.push('[deps] package.json is missing');
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    for (const [dep, ver] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (!/^\d+\.\d+\.\d+$/.test(ver)) problems.push(`[deps] ${dep}@${ver} is not an exact version`);
    }
  }
  const npmrc = join(site, '.npmrc');
  if (!existsSync(npmrc) || !/^ignore-scripts=true$/m.test(readFileSync(npmrc, 'utf8'))) problems.push('[deps] .npmrc must contain ignore-scripts=true');
  problems.push(...auditClientAssets(ctx.sitesDir, slug));

  const ws = workspacePath(ctx, slug);
  if (existsSync(join(ws, 'project.json'))) {
    const project = readProject(ws);
    if (project.slug !== slug) problems.push(`[workspace] project.json slug "${project.slug}" does not match "${slug}"`);
    for (const d of ['incoming', 'outgoing/emails']) if (!existsSync(join(ws, d))) problems.push(`[workspace] ${d}/ is missing`);
    problems.push(...missingRedirects(ctx, slug, ws));
    if (project.client_status === 'offboarded') notes.push('client is offboarded; see status for retention');
  } else if (siteOnly) {
    notes.push('UNKNOWN: private workspace not on this machine; workspace and redirect checks were not run');
  } else {
    problems.push(`[workspace] ${ws} is not on this machine; run on the machine that holds it, or pass --site-only`);
  }
  return { problems, notes };
}
