# SPM Spec — Client website-build flow for the Website Creator

<!-- header (append-only): created 2026-11-16T00:40Z by side session started from local_0e3ab3e3 (Opus 5.5) · amended 2026-11-16T01:05Z (uncommitted) to answer bench round 1: approved-only ingest with metadata stripping and a size cap, Vercel-only v1 (Cloudflare refused with a named blocker), no form in the template, partial-read-proof wp-export, two-phase new, lockfile + npm ci + ignore-scripts, redirect map rendered into vercel.json, build stamp and live check, status as the stall signal, offboard and retention, mutation controls replace the import-failure control -->
<!-- round-1 spec preserved at the scratchpad copy spec-round1.md; amendments replace §5, §8, §9, §11, §12, §14, §15, §17, §18, §19 -->
<!-- amended 2026-11-16T01:40Z (uncommitted) to answer bench round 2: encrypted-volume refusal for the client projects folder, per-site lockfiles derived in the dependency-audit test, approved_by may not hold an email address, redirects refuse above Vercel's 2,048 limit, live uses an ancestry check, superseded round-0 text removed, forcing conditions for the two open deferrals -->

**Amendment R2 rulings adopted (bench round 2).** Every command refuses to run when the client projects folder is on a volume that does not report encryption; on macOS the tool reads `diskutil info -plist` for the folder's volume and passes only when `FileVault` or `Encryption` is true, and refuses with the reason when it cannot tell, including on any other operating system. The dependency-audit test derives the expected `sites/*/package-lock.json` entries from tracked `sites/*/package.json` files that declare dependencies, so a client site's lockfile never needs a hand edit to the test and a lockfile with no matching site still fails.

**Amendment R1 rulings adopted (bench round 1).** v1 accepts only `--host vercel`; `--host cloudflare` exits non-zero naming the blocker. The template ships with no enquiry form. `ingest` copies only images the operator names with `--select` and `--approved-by`, strips metadata, refuses anything else, and caps each image at 1 MB.

### Contents
1 Task · 2 Context · 3 Problem and value · 4 Outcome · 5 Scope · 6 Existing capability ·
7 Bench receipt · 8 Judge · 9 Solution · 10 UX · 11 Technical · 12 Security · 13 Verification ·
14 Stress · 15 Acceptance criteria · 16 Goal · 17 Sequence and crew · 18 Handoff seed · 19 Recommendation

## 1. Task
| Field | Detail |
|---|---|
| Original request (verbatim) | "How do we add this idea into our Website Creator within our system and then also add our methods and systems? ... add the requirements into the system without needing me to interrupt ... take over until 100% completed, landed, updated, and working green." (Phill, 16/11/2026, relayed by the starting session with a summary of a creator's 7-step Claude Code + Astro + Cloudflare method) |
| Interpreted task | Turn the useful parts of the creator's method into one repeatable flow inside Unite-Group: a client project scaffold (private `incoming/` and `outgoing/`), a WordPress content export, a build loop with preview and visual checks, per-client session notes, a release path to GitHub and hosting, and a client change-request loop with drafted (never sent) emails. Deliver it as a repo tool plus a repo skill, proven on one sample client. |
| Lane · tier | full · T2 (F2 I2 N2 X1 S2: new tooling across scaffold, network fetch and client data handling; no schema, no auth, no production) |
| Target outcome | A builder agent can run one command to start a client site, export a WordPress site without logging in, ingest client images with provenance, keep per-client notes, and draft client emails; every step is gated by our existing checks. |

## 2. Current context
| Field | Detail |
|---|---|
| Repo · branch · HEAD · tree | CleanExpo/Unite-Group · `feat/website-client-flow` · base `f3077e791` (origin/main) · clean worktree at `/Volumes/MacBook SSD EXT/agent-work/website-client-flow-1116` |
| Done preflight | `donectl selftest` passed 8 checks (exit 0); spec-work contract `w_31a38e3e71a6` locked |
| North Star source + revision | NORTH-STAR.md on origin/main; founder queue oldest open: F2 "Connect Google" (133 days) via `node scripts/founder-queue.mjs` (exit 0) |
| Files, PRs, tickets inspected | `sites/bewg/{README.md,package.json,tests/check_site.py}`, `apps/web/src/lib/portal/changes/{types,publisher}.ts` (via recon agent), Linear UNI-3140, UNI-3143, UNI-3144, UNI-3172, UNI-3173, UNI-3334, wiki `website-operating-system-charter-2026-10-24`, `website-factory-plan-and-schedule-2026-10-24`, `open-horizon-design-system-2026-10-25`, `nexus-niche-agentic-products-v2-2026-10-25` |
| Known current behaviour | see Grounded lines below |
| Unknowns | Whether a Cloudflare account exists for the estate (no `wrangler.*` file found 4 levels under the home folder: UNVERIFIED); whether `unite-group.in/api/leads` accepts cross-origin form posts (unknown); Workers Builds free-plan build minutes (UNVERIFIED) |

Grounded 16/11/2026: the monorepo is public — `gh repo view CleanExpo/Unite-Group --json visibility` (exit 0) printed PUBLIC.
Grounded 16/11/2026: client sites already live in the monorepo as `sites/<slug>` — `ls sites` (exit 0) printed `bewg`; `git log -- sites` shows UNI-3334 PRs #1397 and #1398.
Grounded 16/11/2026: bewg is a static Python generator on Vercel with one function forwarding enquiries to `/api/leads` — `sites/bewg/README.md:1-20`.
Grounded 16/11/2026: the portal change-request publisher is an interface with an in-memory stub only — `apps/web/src/lib/portal/changes/publisher.ts` (recon agent; re-read before any change there).
Grounded 16/11/2026: latest Astro is 7.4.12 — `npm view astro version` (exit 0).
Verified live 16/11/2026: Cloudflare Pages landing tells new projects to start on Workers — https://developers.cloudflare.com/pages/
Verified live 16/11/2026: a static Astro site on Workers needs only `assets.directory: ./dist` in `wrangler.jsonc` and no adapter — https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
Verified live 16/11/2026: Workers Builds has an optional "Root directory" setting for monorepos — https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
Verified live 16/11/2026: www to apex on Cloudflare is a Redirect Rule (`https://www.*` to `https://${1}`, 301) — https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/
Verified live 16/11/2026: a static Astro site deploys to Vercel with no extra configuration — https://docs.astro.build/en/guides/deploy/vercel/
Verified live 16/11/2026: static asset requests on Workers are free and unlimited; 20,000 files and 25 MiB per file on Free — https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ and https://developers.cloudflare.com/workers/platform/limits/

## 3. Problem and value
| Field | Detail |
|---|---|
| User / customer | Builder agents and Phill delivering the "Website + Found" package ($2,495 + $497/month ex GST, wiki business plan) to small businesses; their clients |
| Pain and current workaround | Each site is hand-built in a different style (bewg Python, BRII Python outside git, RACKVANT Astro); client material arrives ad hoc; no WordPress export path; no per-client notes; change requests stop at a stub publisher; no client email drafts |
| Revenue path | Lower build time per site and a 30-minute change loop make the monthly care fee profitable and let one operator run many clients |
| Incremental cost | $0: Node standard library, Astro (MIT, npm), subscriptions already paid; hosting project creation stays founder-gated |
| Why now | Phill asked for it today; UNI-3140 Website System is in progress and lacks the build-side flow |

## 4. Desired outcome
User-facing: Phill asks "build a site for X" and a builder agent follows one skill from intake to a draft PR with screenshots and a drafted client email. System: one tool `scripts/website/client-site.mjs` with `new`, `wp-export`, `ingest`, `note`, `status`, `email`, `check` and a checker `scripts/website/check-built-site.mjs`. Success: the sample client scaffolds, builds, fails the checker while placeholders remain, passes once filled, and is screenshotted at desktop and phone size. Must not happen: client material committed to the public repo; an email sent; a deploy, DNS or hosting change made by the tool. Promise served: truthful delivery to small-business clients. Hard-day case: a client's WordPress site blocks the REST API — the tool must say so plainly and point to the crawl fallback, never write an empty export that looks complete.

## 5. Scope
In scope: the tool, the checker, a template folder for new Astro sites with a committed lockfile, a repo skill `client-website-build`, a root `.gitignore` guard, tests wired into `verify:readiness`, the template lockfile added to the dependency-audit list and to Dependabot, a sample proof outside the repo, wiki write-back, Linear updates.
Out of scope: changes to `apps/web` (real `SitePublisher`, multi-tenant page lists — follow-up), creating any Vercel or Cloudflare project, DNS, domains, sending email, migrating bewg or BRII, an enquiry form in the template (follow-up: move the bewg same-origin forwarder into the template as its single owner), Cloudflare hosting (follow-up: needs a verified account and a Worker forwarder), auditing `sites/*` lockfiles in their own CI shard (follow-up, needed before the sixth client site), building the template in CI (follow-up).
Non-goals: a visual page builder UI; AI copy generation (existing copy gates apply).
Assumptions: [A1] Astro static is the default for new client sites [INFERENCE from creator method plus RACKVANT precedent]; [A2] Vercel stays the default host [INFERENCE: estate account and the form-to-CRM function pattern exist there]; [A3] client material lives outside the public repo under `$CLIENT_PROJECTS_ROOT` (default `~/client-projects`) [VERIFIED need: repo is PUBLIC].
Constraints: no new repos (SOURCE-OF-TRUTH rule 4); no API keys; Node >= 24 standard library only for the tool.

## 6. Existing capability
Search terms used: `Website Creator`, `website-creator`, `site-template`, `client-projects`, `incoming`, `outgoing`, `WordPress`, `wp-json`, `Astro`, `wrangler`, `Lighthouse`, `change request`, `draft email`, `handoff`.
| Capability | Location / source | Reuse? | Notes |
|---|---|---:|---|
| Client site in monorepo | `sites/bewg/` | yes | layout precedent `sites/<slug>`; its `check_site.py` rules generalised into the checker |
| Lead capture | `apps/web/src/app/api/leads/route.ts` | yes | sites forward with `business_key` |
| Change requests | `apps/web/src/lib/portal/changes/*` | later | stub publisher; follow-up ticket |
| Visual checks | `visual-qa`, `playwright-cli` skills | yes | referenced from the skill |
| Session handoff | `session-handoff` skill | yes | per-client NOTES.md complements it |
| Release | `pr-release-gate`, `keeper-gate` | yes | unchanged |
| Email drafting | `mail-overseer` (draft only) | partly | no client-site templates; added |
| WordPress migration | none | no | built: REST export |
| Client scaffold | none | no | built |

## 7. Specialist bench receipt
`T2 (F2 I2 N2 X1 S2) · seats boris, eng-failure, eng-observability, eng-test, eng-compliance, eng-supply-chain, eng-release · rounds 2` — verdicts recorded in `engineering.md`.

## 8. Judge challenge
| Category | Score | Notes |
|---|---:|---|
| First-source evidence | 25/25 | live docs and repo reads above |
| Clear user / business problem | 20/20 | |
| Reuse of existing capability | 15/15 | reuses sites/ layout, leads route, gates |
| Security / privacy safety | 15/15 | approved-only stripped ingest; workspace outside the repo, on an encrypted volume, refused inside a git tree; `check` refuses private folders and unmanifested assets |
| UX clarity | 10/10 | one tool, one skill |
| Testability | 10/10 | node:test with injected fetch and temp dirs |
| Cost / control simplicity | 5/5 | $0, no deps in the tool |
| **Total** | **100/100** | APPROVE BUILD (after amendment R1; see below) |

Round 1 correction: the chair overruled the first 100/100. Security was 5/15 (ingest would have published unapproved client photos with location data into a public repo, which no revert can undo) and reuse/interface 10/15 (a Cloudflare host with no lead path). Round-1 total was 85 (REDUCE SCOPE). Amendment R1 closes both: approved-only, metadata-stripped, size-capped ingest, and Vercel-only v1. Round 2: the chair ruled 16 of 18 findings resolved and named one sentence to adopt for each of the other two (encrypted volume, per-site lockfile derivation), with no round 3; amendment R2 adopts both, so the rescore to 100 rests on those two sentences being present when the Done contract locks.
Hard floors: security clear after R1 · rollback: the tool's code reverts with the PR; the one irreversible outcome (client material in public history) is prevented, not reversed · authority clear (Phill asked to build; release stays gated) · evidence clear.
Decision card: impact medium · unknowns: Cloudflare account, cross-origin form posts · options: Vercel only (chosen in R1) / Vercel default with Cloudflare selectable (rejected: no verified account, no lead path) / Cloudflare default (rejected, same reasons) · dissent: creator uses a private repo per site; we keep source in the monorepo and client material private, because rule 4 forbids new repos · owner: this session · authority: tool never deploys · next check: GitHub CI on the PR head.

## 9. Proposed solution
User flow: (1) `new <slug> --name --domain --host vercel` checks that neither target exists, builds the workspace and the site in sibling temp folders, renames both into place, and removes the first if the second rename fails, so a failed `new` keeps nothing. (2) `wp-export` paginates by `X-WP-TotalPages`, fails unless every endpoint returns exactly `X-WP-Total` items, treats any 401, 403, 404, 5xx after one retry, non-JSON or non-list body as blocked, gives every request a 20 s timeout, refuses an export with 0 pages unless `--allow-empty`, reads only pages, posts and media with no `_embed` and no users, writes `export-summary.json` and prints one count line per endpoint, and builds the export in a temp folder renamed into place only when complete. (3) `redirects <slug>` writes the export's redirect map into the site's `vercel.json`, and `check` fails while any map entry is missing from it. (4) `ingest <slug>` with no selection only lists images waiting; with `--select` and `--approved-by` it copies only those images, strips JPEG APP1, APP13 and COM segments and PNG eXIf, tEXt, iTXt, zTXt and tIME chunks, refuses other formats, refuses anything over 1 MB after stripping, names each file by its content hash, writes the manifest atomically with only `id`, `sha256`, `source`, `approved_by`, `approved_at`, `credit` and `alt`, then files the originals privately with a private name log. `check` fails on any client asset without a manifest entry, with a hash mismatch, or still carrying metadata. (5) `status <slug>` and `status --all` print the folder being read and list waiting change requests, waiting images and unsent email drafts with ages, and exit 3 when a change request is older than 24 hours or an offboarded workspace is past its 90-day retention. (6) `live <slug>` reads `https://<domain>/version.json` and passes only when the live build contains the latest commit for `sites/<slug>` on origin/main and `www` answers a permanent redirect to the bare domain; `email --kind change-live` refuses unless a live check passed in the last 24 hours. (7) `offboard <slug>` records the offboarding date; deletion of the workspace stays a manual step after the retention period. (8) The tool refuses a client projects folder inside any git work tree, and any command on a workspace that is not on this machine exits non-zero saying so.
R2 additions to the flow: (9) every command first checks the client projects folder is on an encrypted volume (see the R2 rulings above). (10) `redirects` refuses a map of more than 2,048 entries, Vercel's limit for the `redirects` array, and names Vercel Bulk Redirects as the next step. (11) `ingest --approved-by` takes a role or a reference into the private name log, never an email address or phone number; the tool refuses a value holding `@` or eight or more digits, and `check` fails on a manifest entry that holds one. (12) `live` compares commits by ancestry (`git merge-base --is-ancestor <latest sites/<slug> commit> <live sha>`), so a live build of a later, unrelated main commit passes and one older than the site's latest commit fails. (13) A missing `X-WP-Total` or `X-WP-TotalPages` header counts as blocked.
Build and change loop: the builder runs `npm run dev`, checks the pages by eye at 1440 and 390 wide, runs `npm run build` and `npm run check:site`, then `check <slug>`. `note <slug> --done --next` appends a dated entry; the session stops at the context ceiling or a milestone. Release is a branch and a PR into main through pr-release-gate; creating the hosting project and the domain stays the founder's step. A change request is saved into `incoming/changes/`, built, previewed, and `email <slug> --kind change-preview|change-live|handover` writes a draft into `outgoing/emails/`.
Failure flow: every command exits non-zero with a plain message and the next step; exit 2 is a usage error, 3 is "needs attention" from `status`.
Rollback: revert the PR; generated folders are new and never overwrite (tested).

## 10. UX requirements
Entry point: the skill and `--help`. Errors name the next step. The template is bright, calm, high-contrast, semantic HTML, skip link, visible navigation, reduced-motion safe (Open Horizon). Placeholders are `TODO(client)` and the checker fails while any remain, so an unfinished page cannot pass.

## 11. Technical requirements
New: `scripts/website/client-site.mjs`, `scripts/website/lib/*.mjs`, `scripts/website/check-built-site.mjs`, `scripts/website/template/astro/**`, `scripts/__tests__/client-site.test.mjs`, `scripts/__tests__/check-built-site.test.mjs`, `.claude/skills/client-website-build/SKILL.md`. Changed: root `package.json` (`verify:readiness` list), root `.gitignore`. No schema, no env vars in apps; `CLIENT_PROJECTS_ROOT` is a local path setting only. Astro pinned to an exact version in the template.
R1 additions: the template ships a committed `package-lock.json`, exact versions only, `packageManager`, `engines.node` equal to the root range, `.npmrc` with `ignore-scripts=true`, and `vercel.json` with `installCommand: npm ci`; `check` fails when the lockfile or `.npmrc` is missing or any dependency is not an exact version. `scripts/__tests__/dependency-audit.test.mjs` `EXPECTED_LOCKS` gains `scripts/website/template/astro/package-lock.json` in its static list (11 lockfiles, 3 scan waves at concurrency 5, 900 s worst case, under the 1,200 s cap), and R2 adds the derived `sites/*` entries to it. At 16 lockfiles the scan needs a fourth wave and the existing wave-budget test fails on its own; that is the fifth client site with a lockfile, which forces the `sites/*` audit shard follow-up. `.github/dependabot.yml` gains the template directory. The template build writes `public/version.json` from `VERCEL_GIT_COMMIT_SHA`. The template includes a privacy page naming the host and Unite-Group as service providers.
The checker fails on a missing folder, on fewer than `--min-pages` HTML pages (at least 1), on missing `index.html`, `404.html`, `robots.txt` or sitemap, and prints how many pages, links and images it checked.

## 12. Security and privacy
Client copy, photos, emails and notes may hold personal information: they never enter the public repo (workspace outside the repo, `.gitignore` guard, `check` refuses a site folder holding `incoming/` or `outgoing/`). No secrets handled. Fetched WordPress content is untrusted data: saved as JSON, never executed. Email drafts are files; nothing sends. Deploy, DNS and hosting are founder-gated (A3).
R1: client images reach the public site only through approved-only `ingest`, stripped of metadata; the public manifest never holds an original filename, a path or a sender. An erasure request for a committed image means removing it from HEAD; removing it from git history is a founder-gated GitHub support request, and the client is told this before handover. Workspaces carry `client_status` and `offboarded_at`; the skill sets a 90-day retention after offboarding, after which the workspace is deleted by hand, and the skill's session-start step runs `status --all` so a passed retention date is seen.
R2: the encrypted-storage rule is enforced by the tool, not stated: every command refuses a client projects folder on a volume that does not report encryption, and refuses when it cannot tell. `approved_by` never holds an email address or a phone number.

## 13. Verification plan
Environment: local, temp folders from `os.tmpdir()`; prod impossible (no network except `wp-export`, injected in tests); teardown removes temp folders in tests.
Static: `node scripts/check-no-absolute-home-paths.mjs`, `node scripts/check-no-nul-bytes.mjs` — PLANNED.
Unit: `node --test scripts/__tests__/client-site.test.mjs scripts/__tests__/check-built-site.test.mjs` — PLANNED.
Integration: `npm run verify:readiness` — PLANNED.
Browser: sample site built and screenshotted at 1440x900 and 390x844 with Playwright — PLANNED.
Controls: the AC-2 mutation controls, each turning a named test red — PLANNED.

## 14. Loop and stress testing
Normal: scaffold and build. Edge: slug with capitals or dots refused. Malformed: non-WordPress URL. Large: paginated REST (2 pages). Empty: empty `incoming/`. Duplicate: `new` twice refuses; `ingest` twice does not duplicate. Permission failure: unwritable root reported. Network failure: fetch rejects, exit non-zero, nothing written. Regression: checker still catches bewg-class defects (two h1, missing canonical, broken internal link, hot-linked image).
Bypass attempt (client data reaching the public repo): place `sites/<slug>/incoming/photo.jpg` → `git check-ignore` must report it ignored and `check` must exit non-zero.
R1 bypass attempt (the plausible input): a JPEG carrying an EXIF APP1 segment, ingested with `--select` → the copied file holds no APP1 segment; the same JPEG copied straight into `src/assets/client/` by hand → `check` exits non-zero. An image left unselected in `incoming/` never appears under `src/assets/client/`.
R1 stress cases: page 2 of a paginated endpoint returns 503 twice → non-zero, no export folder; a 401 JSON body → non-zero; an HTML 200 page → non-zero; `pages` 200 with `[]` → non-zero unless `--allow-empty`; `new` with an unwritable sites folder → non-zero and no workspace left behind; two different photos both named `IMG_0001.jpg` in two batches → two assets; checker on an empty folder or a missing path → non-zero.
R2 stress cases: an encryption probe answering "not encrypted" and one that errors → every command exits non-zero naming the reason; a redirect map of 2,049 entries → `redirects` exits non-zero and writes nothing; `--approved-by jane@example.com` → refused; a live build of a later unrelated main commit → `live` passes, one older than the site's latest commit → fails; a tracked `sites/x/package-lock.json` with no dependency-declaring `sites/x/package.json` → the derivation test fails.

## 15. Acceptance criteria (become the Done contract)
- [ ] AC-1 `node --test scripts/__tests__/client-site.test.mjs scripts/__tests__/check-built-site.test.mjs` exits 0.
- [ ] AC-2 (R1) Mutation controls, each recorded in the evidence file with the named test that went red: (a) the checker's `TODO(client)` rule disabled; (b) `wp-export` accepting a short page count; (c) `new` no longer refusing an existing slug; (d) `ingest` skipping metadata stripping; (e) `check` no longer refusing a private folder inside the site; (f, R2) the encryption probe's answer ignored; (g, R2) the per-site lockfile derivation removed from the dependency-audit test. Every mutation must turn at least one named test red.
- [ ] AC-3 `npm run verify:readiness` exits 0 and its script list contains both new test files.
- [ ] AC-4 `git check-ignore -q sites/anything/incoming/x.jpg` and `.../outgoing/x.md` exit 0, and `git check-ignore -q sites/anything/src/pages/index.astro` and `sites/anything/package.json` exit 1; asserted inside the test suite.
- [ ] AC-5 `node scripts/check-no-absolute-home-paths.mjs` and `node scripts/check-no-nul-bytes.mjs` exit 0.
- [ ] AC-6 Sample proof: scaffold, `npm ci` against the committed lockfile with install scripts off, `npm run build`, checker fails with placeholders and passes once filled (quoting its `checked N pages` line), `check <slug>` passes; screenshots at desktop and phone saved under the evidence folder (outside the repo).
- [ ] AC-7 `.claude/skills/client-website-build/SKILL.md` exists, names every tool command, and contains no emoji.
- [ ] AC-8 (human-gated) GitHub checks green on the exact pushed head, independent Cursor review, release receipt, draft PR into main.

## 16. Goal command
```text
/goal Land the client website-build flow (tool, checker, template, skill) on feat/website-client-flow as a draft PR into main with AC-1..AC-8 met, the sample proof screenshotted, Linear UNI-3140 updated and the wiki write-back done. Never deploy, send email or create hosting.
```

## 17. Implementation sequence and crew
| Phase | Objective | Crew · model | Validation command | State |
|---|---|---|---|---|
| 1 | Tests first (red) | senior (this session) · opus | `node --test scripts/__tests__/client-site.test.mjs` exits 1 | idle |
| 2 | Tool, checker, template | senior · opus | AC-1 | idle |
| 3 | Wire into verify:readiness, .gitignore | senior | AC-3, AC-4, AC-5 | idle |
| 4 | Sample proof with screenshots | senior | AC-6 | idle |
| 5 | Skill, wiki, Linear | senior | AC-7 | idle |
| 6 | Release gate | Cursor `agent` reviewer; GitHub CI | AC-8 | idle |
Pi Durable: UNAVAILABLE → this session.
Skill loadout: spm (front door) · engineering-requirements (gate) · done-harness (contract) · pr-release-gate (release) · playwright-cli (screenshots) · unslop (PR body and skill text).

## 18. Session-handoff seed
Planned: tool, checker, template, skill. Key files listed in §11. Verification in §13. Deferred risks, each with a follow-up ticket: Cloudflare hosting (needs a verified account and a Worker lead forwarder); portal publisher still a stub; template enquiry form (move the bewg forwarder in); `sites/*` lockfile audit shard before the fifth client site with a lockfile (the wave-budget test fails at that point); template build in CI and template upgrades reaching existing sites, both before a second `sites/*` site is scaffolded from the template; encryption probe for Windows and Linux, before an operator on either needs the tool; DNS cutover rollback sequence before the first client domain moves; the client workspace sits on one machine with no backup (owner: the lead session for each client, recorded in NOTES.md). Pickup: read this spec, run AC-1.

## 19. Recommendation
Proceed to build. Founder batch (one decision): should each client site get its own private GitHub repo (the creator's model) instead of `sites/<slug>` in our public monorepo? Recommendation: no for now — keep source in the monorepo and client material private and local; revisit when a client needs private source. yes/no. (R1: this is defensible only because nothing reaches the public repo before the operator approves it and metadata is stripped; without those two rules the real question would be whether to publish client material before sign-off.)

Waterline: Class 1 · Stage PLANNED (rung 1/12 Design) · A — evidence: this spec; build not started
