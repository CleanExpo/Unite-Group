# Convergence Playbook — One Repo, One Product

Operating procedure for the Unite-Group convergence: CleanExpo/Unite-Group
absorbs the whole ecosystem. Derived from the approved designs
(`docs/legacy/authority-site/` carries the originals; sources:
Unite-Hub `docs/superpowers/specs/2026-06-08-unite-group-single-source-of-truth-design.md`
and `docs/migration/unite-group-to-unite-hub-consolidation-plan.md`) plus
Phill's 12/06/2026 decisions: true monorepo, autonomous loop, hard-delete
end state.

## Target layout

```
apps/web/                      # survivor engine: Unite-Hub codebase, rebranded Unite-Group
apps/workspace/                # hermes-workspace
apps/authority-legacy/         # old Authority-Site app — TEMPORARY harvest source
packages/spine/                # Unite-Group-Spine
packages/pi-ceo-operator-mcp/  # MCP server
docs/brain/                    # brain-1 vault
docs/legacy/authority-site/    # old Authority-Site docs
docs/convergence/              # migration map, decision log, cutover runbook
```

## Import order and mechanics (Phase 1)

History is preserved with `git subtree add` from the local clones (no network):

```bash
git remote add hub /home/user/Unite-Hub
git subtree add --prefix=apps/web hub claude/intelligent-davinci-xmyla2
# repeat: hermes-workspace → apps/workspace, Unite-Group-Spine → packages/spine,
# pi-ceo-operator-mcp → packages/pi-ceo-operator-mcp, brain-1 → docs/brain
```

Never flat-copy (`cp -R`) a repo in. Never `git merge` an unrelated repo at root.

## C-then-A port list (Phase 2): apps/authority-legacy → apps/web

Port (adapting to Hub conventions — founder_id scoping, server-side PKCE,
Scientific Luxury tokens):

1. Stripe billing + webhooks: `src/app/api/webhooks/stripe`, `src/lib/api/stripe`,
   `src/app/api/cron/integrations/stripe`, `src/app/api/billing/webhook`
2. Command-centre dashboard pages
3. GitHub + Telegram webhook handlers
4. CRM slices already inventoried in the migration plan: margot docs,
   `src/lib/crm/approval-lifecycle.ts`, activity-timeline helpers + tests
5. Needed Supabase migrations — re-timestamped, sandbox-verified ONLY

**Conflict rule:** on path collision, the `apps/web` (Unite-Hub) side wins
unless the file is on the port list above. Record every override in the
migration map.

**Hard safety rules (inherited, still binding):**
- No edits to `.env`, secrets, or Vercel env vars
- No production Supabase migrations; sandbox only
- No `workspace_id` scoping — `founder_id` only
- No bulk copies; named files/hunks only
- Every slice documents source path + source commit/PR + omissions + evidence

## Migration map (Phase 2 exit gate)

`docs/convergence/migration-map.md` — every `apps/authority-legacy` path
classified **migrated / rejected / obsolete / deferred**. No unclassified
file may remain when `apps/authority-legacy/` is deleted.

## Verify loop (Phase 3)

Per package: `typecheck → lint → unit tests → build`. Then the route gate:

> `apps/web`'s built route manifest must be a superset of the union of both
> legacy apps' routes, minus routes explicitly rejected in the migration map.

On failure: PM (Opus 4.8) diagnoses → worker fixes → re-run. Cap 3 iterations
per failure class, then escalate in the PR thread. CI on the draft PR is the
external arbiter; stay subscribed and re-kick until green. Merge is human-gated.

## Cutover & deletion (Phase 4 — runbook, never autonomous)

`docs/convergence/cutover-and-deletion-runbook.md` holds the exact steps:
Vercel root-dir repoint + domain, Stripe webhook URLs, the counted OAuth
redirect-URI checklist, Supabase canonical-DB decision, automation re-aiming.

**Hard-delete gate (non-negotiable):** repos/projects are deleted only after
ALL of: unified app live on `unite-group.in` → soak passed (test payment +
real logins) → final backup bundle taken → **Phill types approval for each
deletion**. Until then nothing is switched off. No agent ever deletes a repo,
database, or Vercel project autonomously.
