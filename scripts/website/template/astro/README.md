# {{NAME}} website

Static Astro site, made from the Unite-Group client site template. The flow is in
`.claude/skills/client-website-build/SKILL.md` at the repository root.

- Private client material (copy, photos, notes, email drafts) is in the client workspace,
  `$CLIENT_PROJECTS_ROOT/{{SLUG}}`, never in this folder.
- Images go in through `node scripts/website/client-site.mjs ingest {{SLUG}}`, which strips location data and records provenance in `src/assets/client/manifest.json`.

| Command | What it does |
|---|---|
| `npm ci` | Install exactly what `package-lock.json` records (install scripts are off in `.npmrc`) |
| `npm run dev` | Local preview at http://localhost:4321 |
| `npm run build` | Stamp `version.json`, then build `dist/` |
| `npm run check:site` | Check the built site; fails while any `TODO(client)` remains |
| `node ../../scripts/website/client-site.mjs check {{SLUG}}` | Structure, privacy and dependency checks |

Hosting: Vercel project with Root Directory `sites/{{SLUG}}`, production branch `main`. Add `{{DOMAIN}}`
and `www.{{DOMAIN}}` to the project, with www set to redirect to `{{DOMAIN}}`. Creating the project and the
domains is the founder's step.
