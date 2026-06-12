# ShipIt Validation Command Plan

Generated: 2026-06-06T06:31:37Z

## Safe to run now
- `npm run type-check` — tsc --noEmit
- `npm run lint` — eslint .
- `npm run build` — next build
- `npm run test` — jest --testPathPattern=tests/pipelines --runInBand
- `npm run security:routes-check` — ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node"}' scripts/check-route-inventory.ts
- `git diff --check` — whitespace check
- `local smoke: npm run build then start server on 127.0.0.1 and curl safe routes` — safe local runtime smoke; no DB writes

## Requires preflight
- `npm run test:all` — jest; potentially longer full-suite; safe local if time permits

## Requires database approval/readiness or credentials
- `npm run check:schema-drift` — supabase gen types typescript --project-id lksfwktwtmyznckodsau > /tmp/supabase-fresh.ts && diff types/supabase.ts /tmp/supabase-fresh.ts && echo 'No schema drift' || (echo 'SCHEMA DRIFT DETECTED — run npm run gen:types' && exit 1); contacts Supabase/project schema; read-only generation but requires Supabase credentials/network; no production write
- `npm run gen:types` — supabase gen types typescript --project-id lksfwktwtmyznckodsau > types/supabase.ts; contacts Supabase/project schema; read-only generation but requires Supabase credentials/network; no production write

## Requires deployment gate
- `npx vercel --prod or GitHub/Vercel main deployment path` — only after gates green; verify project target and rollback first

## Prohibited in this run unless separately verified safe
- Printing .env values
- Production DB writes/migrations without sandbox validation
- Stripe/payment activation
- Client-facing email
- Claims/orders
- Destructive deletes
- Nango/new vendor signup
