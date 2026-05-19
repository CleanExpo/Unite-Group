---
title: "synthex Tech Stack"
source: "https://github.com/CleanExpo/Synthex"
repo: "CleanExpo/Synthex"
file_type: "tech-stack"
captured: "2026-05-19"
tags:
  - clippings
  - github
  - synthex
---

# synthex — Tech Stack

## package.json
```
{
  "name": "synthex",
  "version": "2.0.1",
  "description": "AI-Powered Social Media Automation Platform",
  "private": true,
  "packageManager": "npm@11.8.0",
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack --port 3008",
    "build": "next build --webpack",
    "lint": "eslint . --max-warnings 0",
    "test": "jest --config jest.worktree.cjs",
    "type-check": "tsc --noEmit",
    "dev:next": "next dev --port 3008",
    "validate:env": "node scripts/validate-env.js",
    "validate:claude": "node scripts/validate-claude-settings.js",
    "validate:all": "npm run validate:env && npm run validate:claude",
    "validate:google": "npx tsx scripts/validate-google-config.ts",
    "build:vercel": "npx prisma@7.5.0 generate && NODE_OPTIONS=--max-old-space-size=7680 next build --webpack && npx tsx scripts/validate-schema.ts",
    "vercel-build": "prisma generate && next build",
    "start": "next start",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepare": "husky install",
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "node scripts/db/migrate.js up",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:migrate:dry-run": "node scripts/db/migrate.js up --dry-run",
    "db:migrate:production": "node scripts/db/migrate.js up --backup",
    "db:status": "node scripts/db/migrate.js status --verbose",
    "db:rollback": "node scripts/db/migrate.js rollback",
    "db:backup": "node scripts/db/migrate.js backup",
    "db:backup:production": "node scripts/db/migrate.js backup",
    "db:restore": "node scripts/db/migrate.js restore",
    "db:integrity-check": "node scripts/data/data-integrity-check.js",
    "db:cleanup": "node scripts/data/data-cleanup.js",
    "db:cleanup:dry-run": "node scripts/data/data-cleanup.js --dry-run --all",
    "db:studio": "prisma studio",
    "db:verify": "node scripts/verify-db-connection.mjs",
    "analyze": "ANALYZE=true next build",
    "clean": "rm -rf .next out dist node_modules",
    "clean:cache": "node -e \"process.platform === 'win32' ? require('child_process').execSync('scripts\\\\clear-build-cache.bat', {stdio: 'inherit'}) : require('child_process').execSync('sh scripts/clear-build-cache.sh', {stdio: 'inherit'})\"",
    "build:fresh": "npm run clean:cache && npm run build",
    "reinstall": "npm run clean && npm install",
    "setup:db": "echo \"Run the SQL from supabase/complete-schema.sql in Supabase dashboard\"",
    "test:integration": "node scripts/run-integration-tests.js",
    "test:integration:ci": "node scripts/run-integration-tests.js --ci --coverage",
    "test:integration:verbose": "node scripts/run-integration-tests.js --verbose",
    "test:integration:health": "RUN_INTEGRATION_TESTS=true jest tests/integration/health-check.test.ts --runInBand",
    "test:integration:quotes": "RUN_INTEGRATION_TESTS=true jest tests/integration/quotes-api.test.ts --runInBand",
    "check:env": "node -e \"console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('OPENROUTER')))\"",
    "deploy:prod": "vercel --prod --yes",
    "ws:dev": "npx tsx scripts/websocket-server.ts",
    "ws:prod": "NODE_ENV=production npx tsx scripts/websocket-server.ts",
    "dev:full": "concurrently \"npm run dev\" \"npm run ws:dev\"",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "e2e": "playwright test",
    "e2e:prod:critical:bash": "PW_SKIP_WEBSERVER=1 BASE_URL=https://synthex.social playwright test tests/e2e/production-critical-paths.spec.ts",
    "e2e:prod:critical:cmd": "set PW_SKIP_WEBSERVER=1&& set BASE_URL=https://synthex.social&& playwright test tests/e2e/production-critical-paths.spec.ts",
    "e2e:prod:critical:ps": "powershell -NoProfile -Command \"$env:PW_SKIP_WEBSERVER='1'; $env:BASE_URL='https://synthex.social'; npx playwright test tests/e2e/production-critical-paths.spec.ts\"",
    "e2e:ui": "playwright test --ui",
    "test:e2e:staging": "BASE_URL=${STAGING_URL:-http://localhost:3008} npm run e2e",
    "audit": "npm audit --omit=dev",
    "release:check": "npm run db:verify && npm run type-check && npm run lint && npm test && npm run e2e && npm run build",
    "validate:env:enhanced": "node scripts/validate-env-enhanced.js",
    "env:generate": "node scripts/generate-env-docs.js",
    "security:audit": "npm run env:generate && npm run validate:env:enhanced && npm audit",
    "security:check": "node scripts/validate-env-enhanced.js",
    "build:production": "NODE_ENV=production next build",
    "db:validate": "npx prisma validate && npx prisma generate",
    "seed:templates": "npx tsx scripts/seed-templates.ts",
    "backup:verify": "node scripts/backup-verification.js verify",
    "backup:verify-all": "node scripts/backup-verification.js verify-all",
    "backup:run-verification": "node scripts/run-backup-verification.js",
    "backup:checksum": "node scripts/generate-backup-checksum.js",
    "backup:checksum-all": "node scripts/generate-backup-checksum.js generate-all",
```
