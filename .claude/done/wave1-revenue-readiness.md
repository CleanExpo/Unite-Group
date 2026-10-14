# Done contract — Wave 1 revenue-readiness (Unite-Group)

- **Authority:** founder "go" on Wave 1, 14/10/2026 (orchestrator brief). Locked scope = items 1–5 below; nothing else.
- **Branch / base:** `wave1/revenue-readiness` off `origin/main` @ `76c56b6c6fc9ae27ad15f461e0163261fafa507d`.
- **Out of scope (founder decision):** the public `/aiw` offer page, prices, checkout, live payments, any DB migration *applied* anywhere.
- **Waterline target for this contract:** rung 3 (LOCALLY_VERIFIED). Rungs 4+ (independent review, CI, staging, release) belong to the orchestrator.

All commands run from `apps/web` with Node 24 unless noted. A command "proves" an item only with exit 0 **and** the named assertions present in its output.

## Item 1 — ABN on privacy and terms

Acceptance:
- A single `COMPANY_ABN` env read lives in `src/lib/legal/company.ts`; pages never read `process.env` directly.
- Set to a checksum-valid 11-digit ABN → both pages render `ABN NN NNN NNN NNN`.
- Unset, blank or checksum-invalid → both pages render `ABN pending`. A malformed value is never rendered.
- Neither page source nor rendered HTML contains the bare `Pty Ltd ABN (` or `— ABN ·` strings.
- No ABN number is invented anywhere in source (tests use the ATO's published example ABN only as a fixture).

Proof:
- `pnpm exec vitest run src/lib/legal` → exit 0 (unit + page-render tests, both branches).
- `grep -rnE "Pty Ltd ABN|— ABN ·|\} ABN \(" src/app/privacy-policy src/app/terms-of-service` → exit 1 (no match).

## Item 2 — public `/llms.txt`, dead parent domain removed

Acceptance:
- `/llms.txt` is in `PUBLIC_PATHS`; `/robots.txt` and `/sitemap.xml` remain public (already were).
- Negative controls stay gated: `/llms.txtx`, `/founder`, `/api/founder/wiki`.
- `public/llms.txt` contains no `unite-group.com.au` reference and names `https://unite-group.in` as this site.
- No other in-repo `parentOrganization` reference to `unite-group.com.au` exists in `apps/web/src` or `apps/web/public`.

Proof:
- `pnpm exec vitest run src/__tests__/proxy-matcher.test.ts src/__tests__/llms-txt.test.ts` → exit 0.
- `grep -rn "unite-group.com.au" public src` → exit 1 (no match).

## Item 3 — lead capture from the site agent

Acceptance (as briefed): `/api/agent` gains a lead-capture tool writing a founder-scoped `crm_leads` row.
**Pre-check:** the governing product spec `docs/superpowers/specs/2026-07-10-ai-websites-design.md` §5.2(3) forbids
data tools on the public chat agent and forbids public routes writing `crm_leads`. If that conflict holds, the item is
recorded **BLOCKED (founder decision)** with the conflict quoted, and no code is written for it.

Proof: `grep -n "ZERO data read/write tools\|Never write \`crm_leads\` from a public route" ../../docs/superpowers/specs/2026-07-10-ai-websites-design.md` → exit 0.

## Item 4 — founder site-key admin page `/founder/site-agent`

Acceptance:
- `GET /api/founder/site-agent` → 401 unauthenticated; otherwise returns businesses, site keys, kill-switch controls and
  today's usage, each section carrying an explicit `status` (`ok` | `error`) — a failed read never presents as empty.
- `POST /api/founder/site-agent` actions, all founder-auth and `founder_id = user.id` scoped:
  - `create_site` — reuses or creates the `businesses` row by slug, then mints a key via `generateSiteKey()`;
    rejects (400) an empty or non-http(s) `allowedOrigins`.
  - `update_key` — edits `allowed_origins` (non-empty) and/or `active`; 404 when the key is not the founder's.
  - `set_controls` — toggles the kill switch (`public_agent_controls.enabled`) and optionally applies a plan ceiling (item 5).
- Page `src/app/(founder)/founder/site-agent/` has `page.tsx`, `loading.tsx`, `error.tsx`; shows usage and a copyable embed snippet.
- Existing tables only; no migration.

Proof:
- `pnpm exec vitest run src/app/api/founder/site-agent` → exit 0 (401, 400 empty origins, 404 foreign key, scoping, error-not-empty).
- `ls "src/app/(founder)/founder/site-agent/"{page,loading,error}.tsx` → exit 0.

## Item 5 — plan → `chat_daily_per_key` mapping (config only)

Acceptance:
- `src/lib/site-agent/plan-quota.ts` maps plan id → `chat_daily_per_key`; no prices anywhere.
- Only values with a source in the repo are filled; any plan without a founder-set ceiling resolves to an explicit
  "unset" result (fails closed), never a guessed number.

Proof: `pnpm exec vitest run src/lib/site-agent/__tests__/plan-quota.test.ts` → exit 0.

## Whole-change gates (repo definition of done)

- `python3 ~/.claude/skills/pr-release-gate/scripts/pr_release_gate.py provision` → exit 0 (repo root).
- `npm run verify:web` (repo root: install, type-check, lint, test, CI build) → exit 0.
- `node scripts/preflight.mjs --keep-going` (repo root) → exit 0.
- `npm run check:nul-bytes`, `npm run check:home-paths` (repo root) → exit 0.
- `git status --porcelain` → empty at hand-off.
