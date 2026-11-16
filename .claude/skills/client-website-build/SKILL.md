---
name: client-website-build
description: 'Build, migrate and maintain a small-business client website with the client-site tool: scaffold a client, export an old WordPress site without logging in, bring in approved photos, run the build and change loop, draft client emails, check the live site and offboard. Use when Phill or a session says "new client website", "build a site for", "migrate their WordPress", "the client sent changes", "draft the client email", "is the client site live", or starts work on anything under sites/<slug>.'
---

# Client website build

One tool runs the whole flow: `node scripts/website/client-site.mjs <command>`. It never deploys,
never changes DNS and never sends email. Those stay with Phill.

## Where things live

| What | Where | Public? |
|---|---|---|
| Site source (Astro, static) | `sites/<slug>/` in this repo | Yes. This repo is public. |
| Client material: `incoming/`, `outgoing/`, `NOTES.md`, email drafts, original photos | `$CLIENT_PROJECTS_ROOT/<slug>/` (default `~/client-projects/<slug>`) | No |

The client projects folder must be outside every git repository and on an encrypted volume. Every
command checks both first and refuses otherwise. On macOS the boot disk is FileVault encrypted; the
external SSD at `/Volumes/MacBook SSD EXT` is not, so never point `--root` there. On Windows and
Linux the tool cannot read encryption yet, so it refuses; that is expected until the follow-up lands.

## Session start

1. Run `client-site.mjs status --all`. Exit 3 means something needs attention: a change request
   older than 24 hours, or an offboarded workspace past its 90-day retention. Deal with those first.
2. Open the client's `NOTES.md` and read the last entry. That is where the previous session stopped.
3. Before any design work, read the founder specs: wiki `open-horizon-design-system-2026-10-25` and
   `nexus-niche-agentic-products-v2-2026-10-25`. Unite-Group sites never show Phill's own businesses.

## Commands

| Step | Command |
|---|---|
| Scaffold | `new <slug> --name "Business" --domain example.com.au [--contact "First name"]` |
| Export an old WordPress site | `wp-export <slug> --url https://old-site.example` |
| Put the redirect map into the site | `redirects <slug>` |
| List photos the client sent | `ingest <slug>` |
| Bring in approved photos | `ingest <slug> --select a.jpg,b.png --approved-by "client owner"` |
| Record where you stopped | `note <slug> --done "..." --next "..."` |
| See what is waiting | `status <slug>` or `status --all` |
| Draft a client email | `email <slug> --kind change-preview|change-live|handover --summary "..." [--url https://...]` |
| Check the live site | `live <slug>` |
| End the engagement | `offboard <slug>` |
| Check site and workspace | `check <slug>` (or `--site-only`) |

Every command takes `--root <folder>` to override the client projects folder.

In words: `client-site.mjs new`, `client-site.mjs wp-export`, `client-site.mjs redirects`,
`client-site.mjs ingest`, `client-site.mjs note`, `client-site.mjs status`, `client-site.mjs email`,
`client-site.mjs live`, `client-site.mjs offboard` and `client-site.mjs check`.

Exit codes: 0 ok, 1 failed or problems found, 2 usage error, 3 status needs attention.

## The flow

1. **Scaffold.** `new` builds the private workspace and `sites/<slug>` together; a failed `new`
   keeps neither. Then `cd sites/<slug> && npm ci`. Install with `npm ci` only, never `npm install`:
   the template pins exact versions, commits its lockfile and turns install scripts off.
2. **Migrate (if they have WordPress).** `wp-export` reads pages, posts and media through the public
   REST API. Pages and posts must come back complete or nothing is written. Media may come back
   short: WordPress counts images attached to draft or private posts but does not list them. The tool
   prints a `WARNING:` line with the hidden count and records `visible-only` in `export-summary.json`.
   A blocked API (401, 403, a security page) stops the export; crawl the public sitemap instead.
   Then `redirects` writes the old addresses into `sites/<slug>/vercel.json`. Over 2,048 entries
   it refuses; use Vercel Bulk Redirects.
3. **Photos.** Clients send photos into `incoming/`. `ingest` with no selection only lists them.
   Choose with `--select`; `--approved-by` must be one of four roles: `client owner`,
   `client manager`, `client staff` or `operator`. It goes into the public manifest, so a name, email
   address or phone number is refused in any spelling; keep who held the role in the client's
   private records. The tool strips location and camera data, names each file by its content hash
   and caps it at 1 MB. `check` holds the public manifest to a fixed set of keys and value shapes;
   `credit` and `alt` are the only free text in it, so read them in the pull request like page copy.
4. **Build loop.** `npm run dev`, then look at every page in a real browser at desktop (1440 wide),
   tablet (768) and phone (390), section by section. Fix what you see, not what the code says.
   Then `npm run build`, `npm run check:site` (no `TODO(client)` left, internal links resolve, one
   `<h1>` per page, title, description, canonical and `lang` present, no images loaded from another
   site, sitemap, robots and 404 present) and `client-site.mjs check <slug>`. Image text (alt) is not
   checked by the tool: read it yourself. Lighthouse is a manual check for now:
   run it in Chrome on the built preview and aim for 90 or better on mobile.
5. **Stop cleanly.** Run `note` when a milestone lands or before the context ceiling. Write what was
   done and the very next step, so the next session starts from the note, not from memory.
6. **Release.** A branch and a draft PR into `main` through pr-release-gate. Creating the Vercel
   project, adding the domain and changing DNS are Phill's steps. For Phill's checklist: Vercel
   Root Directory `sites/<slug>`, the bare domain as primary, `www` redirecting to it permanently,
   and only `main` deploying to production.
7. **Changes.** Save each client request into `incoming/changes/`. Build it, preview it, then
   `email --kind change-preview`. After it is live, run `live <slug>`: it passes only when the live
   build contains the site's latest commit and `www` redirects. `email --kind change-live` refuses
   until a live check has passed in the last 24 hours. Drafts land in `outgoing/emails/`; Phill sends.
8. **Offboard.** `offboard` records the date. Delete the workspace by hand after 90 days; `status`
   warns when it is due.

## Privacy and erasure

- The template's privacy page names Vercel as the host and keeps both complaint lines (OAIC for
  Australia, Office of the Privacy Commissioner for New Zealand). Keep the one that fits the client.
- The template has no enquiry form. Contact is phone and email links until the form follow-up lands.
- An erasure request for a committed photo: remove it from the site and commit. Removing it from git
  history needs a GitHub support request, which is Phill's step. Tell the client this before handover.

## Hosting

Vercel only for now. `--host cloudflare` is refused: there is no verified Cloudflare account and no
Worker to forward leads. Cloudflare Workers Builds does support a monorepo root directory, so the
same layout will work when that follow-up is done.
