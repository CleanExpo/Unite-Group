# The Fable System

From idea to production: type a vague vision in plain English, get back a
verified, build-ready spec — backed by a Claude operating system, a board of
advisors, and an evidence-first research loop. Internal, single-user, private.

Built in four phases, smallest first. **Phases 0 and 1 are in this repo.**

| Phase | What you get | Status |
|---|---|---|
| **0 — OS Layer** | The engine + board + folders, usable in Cowork/Claude Code today, no code | ✅ here |
| **1 — Thin App** | A private web page: type a vision → get a saved, sourced spec | ✅ here |
| **2 — Cockpit + Verify** | Mission-control UI wired to `[STATUS]` lines + critic model + approval gate | planned |
| **3 — Board + Ingest** | "Ask the Board" with real advisor content + Obsidian vault ingestion | planned (needs the vault) |

## Phase 0 — the OS Layer (no code needed)

The repo doubles as a Cowork/Claude Code project:

- `CLAUDE.md` — the brain file: how the folders and skills fit together.
- `knowledge/` — what the system should know (board profiles, notes, frameworks).
- `skills/` — the routines: `fable-engine` (the v2 engine with the Evidence
  Standard), `ask-the-board`, `improve`, `ingest`.
- `projects/` — what's actively being built.

**Definition of done:** paste a vision into Cowork and get a sourced spec
back. That works as soon as this repo is opened as a Cowork project — ask it
to run the `fable-engine` skill on your vision.

## Phase 1 — the thin app

One page → text box → **Run** → serverless function calls Claude with the
engine prompt → spec comes back, gets saved to Supabase, and is shown with a
copy button.

**Stack:** Next.js (App Router) · Vercel · Supabase · Anthropic API
(`claude-opus-4-8` — switch the model string in `app/api/run/route.ts` to
`claude-fable-5` if you want the top-tier model).

### Run locally

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY (Supabase optional)
npm run dev
```

The app works without Supabase — it just skips saving and tells you so.

### Set up Supabase (optional but intended)

Run `supabase/migrations/0001_init.sql` against your project (SQL editor or
`supabase db push`), then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### Deploy to Vercel

1. Import the repo into Vercel.
2. Add the env vars from `.env.example` as **server-side environment
   variables** — keys never reach the browser and never enter the repo
   (`.gitignore` excludes `.env*`).
3. Turn on **Deployment Protection → Password Protection** — one shared
   passphrase, no account system. This is what keeps a metered API behind a
   private URL.
4. Set a monthly **API spend cap / alert** in the Anthropic console. The
   password gate plus the cap is what prevents a runaway bill.

## Security guardrails (non-negotiable)

- All API keys live in Vercel environment variables, server-side only.
- `.gitignore` excludes `.env*`.
- Vercel password protection on the URL.
- Monthly API spend cap alarm.
- Supabase Row-Level Security: deliberately deferred at single-user scale.

## Kickoff brief (paste into Cowork to start Phase 0)

> Set up a new project called "The Fable System" using this repo. Read
> CLAUDE.md for how the knowledge/skills/projects folders work, confirm the
> structure back to me and wait. Once confirmed, I'll give you a vision to
> run through the fable-engine skill.
