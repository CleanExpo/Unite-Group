#!/usr/bin/env node
// Client website-build tool. See .claude/skills/client-website-build/SKILL.md for the flow.
//
// Client material (incoming/, outgoing/, NOTES.md, email drafts) lives in a private workspace at
// $CLIENT_PROJECTS_ROOT/<slug> (default ~/client-projects/<slug>), never in this public repo.
// The public site source lives in sites/<slug>. This tool never deploys, never changes DNS and
// never sends email.
//
// Exit codes: 0 ok, 1 failed or problems found, 2 usage error, 3 status needs attention.
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';

import {
  ToolError, ensureEncryptedRoot, invokedDirectly, resolveClientRoot, resolveSitesDir, systemEncryptionProbe,
} from './lib/common.mjs';
import { ingest } from './lib/images.mjs';
import { applyRedirects, wpExport } from './lib/wordpress.mjs';
import {
  checkProject, draftEmail, liveCheck, newProject, note, offboard, status,
} from './lib/workspace.mjs';

export const USAGE = `Usage: node scripts/website/client-site.mjs <command> [options]

  new <slug> --name "Business" --domain example.com.au [--host vercel] [--contact "First name"]
  wp-export <slug> --url https://old-site.example [--allow-empty]
  redirects <slug>                     write the WordPress redirect map into sites/<slug>/vercel.json
  ingest <slug>                        list images waiting in incoming/
  ingest <slug> --select a.jpg,b.png --approved-by "Name"
  note <slug> --done "..." --next "..."
  status <slug> | status --all [--max-change-hours 24] [--retention-days 90]
  email <slug> --kind change-preview|change-live|handover --summary "..." [--url https://...]
  live <slug>                          read-only: live build contains the latest site commit; www redirects
  offboard <slug>
  check <slug> [--site-only]

Options for every command: --root <client projects folder> (default $CLIENT_PROJECTS_ROOT or ~/client-projects).
The folder must be outside any git repository and on an encrypted volume, or every command refuses.`;

const FLAGS_WITH_VALUES = new Set(['--name', '--domain', '--host', '--contact', '--url', '--select', '--approved-by', '--done', '--next',
  '--kind', '--summary', '--root', '--sites', '--max-change-hours', '--retention-days']);
const BOOLEAN_FLAGS = new Set(['--all', '--allow-empty', '--site-only', '--help', '-h']);

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (FLAGS_WITH_VALUES.has(a)) {
      if (i + 1 >= argv.length) throw new ToolError(`${a} needs a value`, 2);
      out[a.slice(2)] = argv[++i];
    } else if (BOOLEAN_FLAGS.has(a)) out[a.replace(/^-+/, '')] = true;
    else if (a.startsWith('-')) throw new ToolError(`unknown option ${a}`, 2);
    else out._.push(a);
  }
  return out;
}

function num(v, fallback) {
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new ToolError(`expected a positive number, got "${v}"`, 2);
  return n;
}

const COMMANDS = new Set(['new', 'wp-export', 'redirects', 'ingest', 'note', 'status', 'email', 'live', 'offboard', 'check']);

export async function run(argv, {
  env = process.env, fetchImpl = globalThis.fetch, git, now = new Date(), log = console, encryptionProbe = systemEncryptionProbe,
} = {}) {
  const args = parseArgs(argv);
  const [command, slug] = args._;
  if (args.help || args.h || !command) {
    log.log(USAGE);
    return command ? 0 : 2;
  }
  if (!COMMANDS.has(command)) throw new ToolError(`unknown command "${command}"\n${USAGE}`, 2);
  const clientRoot = resolveClientRoot({ clientRoot: args.root, env });
  ensureEncryptedRoot(clientRoot, encryptionProbe);
  const ctx = { clientRoot, sitesDir: resolveSitesDir({ sitesDir: args.sites }) };
  const needSlug = () => {
    if (!slug) throw new ToolError(`${command} needs a <slug>`, 2);
    return slug;
  };
  switch (command) {
    case 'new': {
      const r = newProject(ctx, { slug: needSlug(), name: args.name, domain: args.domain, host: args.host ?? 'vercel', contactName: args.contact ?? '', now });
      log.log(`workspace (private): ${r.workspace}\nsite (public):       ${r.site}\nnext: cd ${r.site} && npm ci && npm run dev`);
      return 0;
    }
    case 'wp-export': {
      if (!args.url) throw new ToolError('give the old site with --url', 2);
      const r = await wpExport(ctx, { slug: needSlug(), url: args.url, fetchImpl, allowEmpty: Boolean(args['allow-empty']), now, log: (l) => log.log(l) });
      log.log(`exported to ${r.dir}\nredirects: ${r.redirects} (run redirects ${slug}); by hand: ${r.manual}`);
      return 0;
    }
    case 'redirects': {
      const r = applyRedirects(ctx, { slug: needSlug() });
      log.log(`wrote ${r.applied} redirect(s) into sites/${slug}/vercel.json`);
      for (const m of r.manual) log.log(`add by hand: ${m.from} -> ${m.to}`);
      return 0;
    }
    case 'ingest': {
      const select = args.select ? args.select.split(',').map((s) => s.trim()).filter(Boolean) : null;
      const r = ingest(ctx, { slug: needSlug(), select, approvedBy: args['approved-by'], now });
      if (!select) {
        log.log(r.listed.length ? `images waiting (nothing copied; choose with --select):\n${r.listed.map((f) => `  ${f}`).join('\n')}` : 'no images waiting in incoming/');
        return 0;
      }
      for (const i of r.ingested) log.log(`ingested ${i.from} -> src/assets/client/${i.file}`);
      for (const s of r.skipped) log.log(`already in the site: ${s}`);
      return 0;
    }
    case 'note': {
      const r = note(ctx, { slug: needSlug(), done: args.done, next: args.next, now });
      log.log(`noted in ${r.file}`);
      return 0;
    }
    case 'status': {
      const r = status(ctx, { slug: args.all ? null : needSlug(), all: Boolean(args.all), now,
        maxChangeHours: num(args['max-change-hours'], 24), retentionDays: num(args['retention-days'], 90) });
      log.log(`client projects folder: ${r.root}`);
      let attention = false;
      for (const p of r.projects) {
        log.log(`${p.slug} (${p.name}) host=${p.host} status=${p.status} last note: ${p.last_note} | incoming ${p.incoming_waiting}, changes ${p.changes_waiting}, drafts ${p.drafts_waiting}`);
        for (const a of p.attention) log.log(`  ATTENTION: ${a}`);
        if (p.attention.length) attention = true;
      }
      if (!r.projects.length) log.log('no client projects on this machine');
      return attention ? 3 : 0;
    }
    case 'email': {
      const r = draftEmail(ctx, { slug: needSlug(), kind: args.kind, summary: args.summary, url: args.url ?? '', now });
      log.log(`draft written (not sent): ${r.file}`);
      return 0;
    }
    case 'live': {
      const r = await liveCheck(ctx, { slug: needSlug(), fetchImpl, git, now });
      log.log(`live sha ${r.deployed_sha ?? 'unknown'}; expected to contain ${r.expected_sha ?? 'unknown'}`);
      for (const p of r.problems) log.error(`[live] ${p}`);
      log.log(r.ok ? 'PASS' : 'FAIL');
      return r.ok ? 0 : 1;
    }
    case 'offboard': {
      const r = offboard(ctx, { slug: needSlug(), now });
      log.log(`${slug} marked offboarded at ${r.project.offboarded_at}. Delete ${r.workspace} by hand after the retention period; status warns when it is due.`);
      return 0;
    }
    case 'check': {
      const r = checkProject(ctx, { slug: needSlug(), siteOnly: Boolean(args['site-only']) });
      for (const n of r.notes) log.log(n);
      for (const p of r.problems) log.error(p);
      log.log(r.problems.length ? `CHECK FAIL ${slug}: ${r.problems.length} problem(s)` : `CHECK PASS ${slug}`);
      return r.problems.length ? 1 : 0;
    }
    default:
      throw new ToolError(`unknown command "${command}"\n${USAGE}`, 2);
  }
}

if (invokedDirectly(import.meta.url)) {
  // Node tries IPv6 and IPv4 in turn and gives each attempt 250 ms by default. From Australia an
  // IPv4 connection to an overseas WordPress host can take longer, so every attempt timed out
  // (ETIMEDOUT) where curl succeeded. Two seconds per attempt still fails fast on a dead host.
  setDefaultAutoSelectFamilyAttemptTimeout(2000);
  run(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (err) => {
      console.error(err instanceof ToolError ? err.message : err.stack || String(err));
      process.exitCode = err instanceof ToolError ? err.code : 1;
    },
  );
}
