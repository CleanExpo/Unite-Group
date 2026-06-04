# React 19 / Next.js 16 Migration Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Upgrade React 18.2.0 → 19.2.6 and Next.js 15.5.18 → 16.2.6 while keeping the application buildable, type-safe, and production-deployable at every phase gate.

**Architecture:** Incremental dependency upgrade with codemod automation for forwardRef→ref migration, followed by manual cleanup of React.FC and edge cases. Each phase commits independently so any phase can be reverted without losing prior work.

**Tech Stack:** Next.js App Router (app/), React Server Components, TypeScript 5.8, TailwindCSS 3.4 (v4 deferred), shadcn/ui, Radix UI primitives, Supabase SSR, Framer Motion.

---

## Executive Summary

| From | To | Risk |
|------|-----|------|
| React 18.2.0 | React 19.2.6 | LOW (codemod for forwardRef) |
| React DOM 18.2.0 | React DOM 19.2.6 | LOW |
| @types/react 18.2.0 | @types/react 19.2.15 | LOW |
| @types/react-dom 18.2.0 | @types/react-dom 19.2.3 | LOW |
| Next.js 15.5.18 | Next.js 16.2.6 | MEDIUM (API changes, peer deps) |
| eslint-config-next 15.5.15 | eslint-config-next 16.2.6 | LOW |
| TailwindCSS 3.4.17 | TailwindCSS 4.3.0 | **DEFERRED** — separate migration |

**Estimated effort:** 2–3 days active work + 1 day smoke testing.
**Recommended branch:** `margot/react-19-next-16-migration`

---

## Phase 0: Pre-Migration Hardening

### Task 0.1: Create migration branch

**Objective:** Isolate all migration work from DR branch.

**Files:**
- Modify: `.git/` (branch)

**Step 1: Checkout fresh branch from main**

```bash
git checkout main
git pull origin main
git checkout -b margot/react-19-next-16-migration
```

**Step 2: Verify clean state**

Run: `git status`
Expected: `nothing to commit, working tree clean`

**Step 3: Copy lockfile as rollback checkpoint**

```bash
cp package-lock.json package-lock.json.pre-migration.backup
git add package-lock.json.pre-migration.backup
git commit -m "chore(migration): pre-migration checkpoint — package-lock backup"
```

---

### Task 0.2: Verify current build passes

**Objective:** Establish baseline — build, type-check, and lint must all pass before touching any dependency.

**Files:**
- None (read-only verification)

**Step 1: Type check**

Run: `npm run type-check`
Expected: `error TS0: no errors` (currently `ignoreBuildErrors: true` in next.config.js but we want the type check pass to be clean)

**Step 2: Full build**

Run: `npm run build`
Expected: `Build completed successfully`

**Step 3: Lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Test suite**

Run: `npm test`
Expected: All tests pass

**Step 5: Record baseline commit**

```bash
git add -A  # if any auto-formatting occurred
git commit -m "chore(migration): Phase 0 baseline verified — build, types, tests green" || echo "nothing to commit"
```

---

### Task 0.3: Inventory breaking-change risks

**Objective:** Identify files that will need human attention beyond automated codemods.

**Step 1: Count forwardRef usages**

Run: `grep -r "forwardRef" src/ --include="*.tsx" --include="*.ts" | wc -l`
Current: **162** (mostly in `src/components/ui/*` — shadcn/ui primitives)

**Step 2: Count React.FC usages**

Run: `grep -r "React\.FC\|React\.FunctionComponent\|FunctionComponent" src/ --include="*.tsx" --include="*.ts" | wc -l`
Current: **9**

**Step 3: Count use client directives**

Run: `grep -r "use client" src/ --include="*.tsx" --include="*.ts" | wc -l`
Current: **144**

**Step 4: List React.CSSProperties usages**

Run: `grep -r "React\.CSSProperties" src/ --include="*.tsx" | wc -l`
Current: **~25** (inline style typing — may need `CSSProperties` import change in React 19)

**Step 5: Check for legacy APIs**

Run: `grep -r "defaultProps\|propTypes\|contextType\|getDerivedStateFromProps\|componentWill" src/ --include="*.tsx" --include="*.ts" | wc -l`
Current: **0** (clean — no legacy class component patterns)

**Step 6: Verify no React 19 blocked deps**

Check these dependencies manually for React 19 compatibility issues:

| Dependency | Current | React 19 Status | Action |
|------------|---------|-----------------|--------|
| @radix-ui/react-slot | 1.2.3 | OK — update to 1.2.4 | Upgrade |
| @tsparticles/react | 3.0.0 | **RISKY** — v3 may not support R19 | Pin/test or upgrade to 4.x |
| @xyflow/react | 12.10.2 | LIKELY OK | Verify after install |
| framer-motion | 12.38.0 | OK | No action |
| recharts | 2.15.3 | OK | No action |
| react-hook-form | 7.56.4 | OK | Upgrade to 7.76.1 |
| @hookform/resolvers | 5.0.1 | OK | Upgrade to 5.4.0 |
| sonner | 2.0.3 | OK | No action |
| vaul | 1.1.2 | OK | No action |
| next-intl | 4.11.1 | OK | Upgrade to 4.13.0 |
| lucide-react | 0.511.0 | OK | Upgrade to 1.17.0 |

**Step 7: Commit inventory**

```bash
git add docs/plans/
git commit -m "docs(migration): Phase 0 inventory — forwardRef 162, React.FC 9, legacy APIs 0"
```

---

## Phase 1: React 18 → 19 Core Upgrade

### Task 1.1: Update react + react-dom + @types

**Objective:** Install React 19 and its type definitions.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Update core React packages**

```bash
npm install react@19.2.6 react-dom@19.2.6 @types/react@19.2.15 @types/react-dom@19.2.3
```

**Step 2: Verify installed versions**

Run: `npm ls react react-dom @types/react @types/react-dom --depth=0`
Expected: All show target versions, no peer dependency warnings.

**Step 3: Attempt build**

Run: `npm run build`
Expected: Likely FAILS due to forwardRef type mismatches — this is expected. We fix in Task 1.2.

**Step 4: Commit the bump**

```bash
git add package.json package-lock.json
git commit -m "chore(react): Phase 1 — React 18.2.0 → 19.2.6, types upgraded"
```

---

### Task 1.2: Run React 19 legacy codemod (forwardRef → ref)

**Objective:** Automate the bulk of React 19 migration using the official React codemod.

**Files:**
- Modify: All `src/components/ui/*.tsx` files
- Modify: Other files using `forwardRef`

**Step 1: Install @react/codemod globally (or use npx)**

```bash
npx -y @react/codemod@latest legacy src/
```

This codemod converts:
- `React.forwardRef<HTMLDivElement, Props>((props, ref) => ...)` → `(props: Props & { ref?: React.Ref<HTMLDivElement> }) => ...`
- Removes `forwardRef` imports where no longer needed

**Step 2: Review codemod diff**

Run: `git diff --stat`
Expected: ~40–60 files changed (mostly in `src/components/ui/`)

**Step 3: Run type-check**

Run: `npm run type-check`
Expected: Should be significantly cleaner. There may still be edge cases.

**Step 4: Fix any remaining forwardRef issues manually**

If type-check still reports forwardRef errors:

```bash
grep -r "forwardRef" src/ --include="*.tsx" --include="*.ts" -l
```

For each file, convert manually:

**Before (React 18):**
```tsx
const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border", className)} {...props} />
))
Card.displayName = "Card"
```

**After (React 19):**
```tsx
const Card = ({ className, ref, ...props }: CardProps & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("rounded-xl border", className)} {...props} />
)
```

Or use the simpler pattern if the component doesn't need ref:
```tsx
const Card = ({ className, ...props }: CardProps) => (
  <div className={cn("rounded-xl border", className)} {...props} />
)
```

**Step 5: Commit codemod results**

```bash
git add -A
git commit -m "refactor(react): Phase 1 — legacy codemod forwardRef→ref (React 19 compat)"
```

---

### Task 1.3: Remove React.FC usages

**Objective:** Clean up the 9 remaining `React.FC` / `FunctionComponent` usages. React 19 still supports `FC` but it's discouraged and can cause subtle type issues with `ref` props.

**Files:**
- Modify: 9 files with `React.FC` usage

**Step 1: Find all occurrences**

Run: `grep -r "React\.FC\|React\.FunctionComponent\|FunctionComponent" src/ --include="*.tsx" --include="*.ts" -n`

**Step 2: Convert each manually**

Pattern:
```tsx
// Before
const MyComponent: React.FC<MyProps> = ({ prop1, prop2 }) => { ... }

// After
const MyComponent = ({ prop1, prop2 }: MyProps) => { ... }
```

**Step 3: Type-check after all 9**

Run: `npm run type-check`
Expected: Clean

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(react): Phase 1 — remove React.FC, use plain function types"
```

---

### Task 1.4: Fix React.CSSProperties imports

**Objective:** React 19 may move CSSProperties from `React.CSSProperties` to `React.JSX.CSSProperties` or require direct import. Verify and fix.

**Files:**
- Modify: ~25 files using inline style typing

**Step 1: Attempt build**

Run: `npm run build`
If errors reference `CSSProperties`, fix them.

**Step 2: Common fix pattern**

If `React.CSSProperties` is flagged:
```tsx
// Before
const style: React.CSSProperties = { ... }

// After (if needed)
import type { CSSProperties } from 'react'
const style: CSSProperties = { ... }
```

React 19 typically still supports `React.CSSProperties`, so this task may be a no-op. Only modify if the compiler complains.

**Step 3: Commit (if changes made)**

```bash
git add -A
git commit -m "refactor(react): Phase 1 — fix CSSProperties type imports (React 19)" || echo "no changes"
```

---

### Task 1.5: Phase 1 gate — build + type-check + test

**Objective:** Ensure React 19 alone is stable before introducing Next.js 16.

**Step 1: Full type check**

Run: `npm run type-check`
Expected: 0 errors

**Step 2: Full build**

Run: `npm run build`
Expected: Build success

**Step 3: Test suite**

Run: `npm test`
Expected: All pass

**Step 4: Lint**

Run: `npm run lint`
Expected: Clean

**Step 5: Tag Phase 1 complete**

```bash
git tag -a phase1-react19 -m "Phase 1 complete: React 19 stable"
```

---

## Phase 2: Next.js 15 → 16 Upgrade

### Task 2.1: Update Next.js + eslint-config-next

**Objective:** Bump Next.js to v16 and align ESLint config.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Update packages**

```bash
npm install next@16.2.6 eslint-config-next@16.2.6
```

**Step 2: Verify versions**

Run: `npm ls next eslint-config-next --depth=0`
Expected: next@16.2.6, eslint-config-next@16.2.6

**Step 3: Read Next.js 16 breaking changes**

Run: `cat node_modules/next/CHANGELOG.md | head -200` or visit https://nextjs.org/docs/app/building-your-application/upgrading/version-16

Key changes to watch for:
- `next.config.js` schema changes
- Image optimization API changes
- Middleware behavior changes
- `headers()` / `cookies()` API changes in App Router
- Turbopack default (if applicable)

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(next): Phase 2 — Next.js 15.5.18 → 16.2.6, eslint-config aligned"
```

---

### Task 2.2: Review and fix next.config.js

**Objective:** Ensure next.config.js is compatible with Next.js 16 schema.

**Files:**
- Modify: `next.config.js`

**Step 1: Attempt build**

Run: `npm run build`
Expected: May warn about deprecated options.

**Step 2: Check for Next.js 16 deprecations**

Common items to verify:
- `images.domains` → still valid in v16 but may warn. Consider migrating to `images.remotePatterns`.
- `webpack` config → still valid.
- `distDir: '.next'` → still valid (default anyway, can be removed).
- `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` → still valid.

**Step 3: If images.domains warning appears, migrate to remotePatterns**

```js
// Before
images: {
  domains: ['localhost', 'ccw.com.au', 'synthex.social', ...],
}

// After (if Next.js 16 warns)
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'localhost' },
    { protocol: 'https', hostname: 'ccw.com.au' },
    { protocol: 'https', hostname: 'synthex.social' },
    { protocol: 'https', hostname: 'unite-group.vercel.app' },
    { protocol: 'https', hostname: 'cdn.unite-group.vercel.app' },
    { protocol: 'https', hostname: 'unite-group-cdn.vercel.app' },
  ],
}
```

Only make this change if Next.js 16 emits a deprecation warning. If not, leave as-is to minimize risk.

**Step 4: Commit**

```bash
git add next.config.js
git commit -m "chore(next): Phase 2 — next.config.js compatibility for v16"
```

---

### Task 2.3: Fix App Router API changes

**Objective:** Handle any Next.js 16 App Router API changes.

**Files:**
- Potentially: `src/app/layout.tsx`, `src/app/**/page.tsx`, `src/app/**/layout.tsx`, `src/app/api/**/route.ts`

**Step 1: Build and capture errors**

Run: `npm run build 2>&1 | tee /tmp/build-next16.log`
Review for App Router specific errors.

**Step 2: Common Next.js 16 changes to check**

- **`headers()` / `cookies()`**: In Next.js 16, these may require `await` in Server Components. Check all usage:
  ```bash
  grep -r "headers()\|cookies()" src/app/ --include="*.tsx" --include="*.ts" -n
  ```
  If any are used synchronously, add `await`.

- **`params` in dynamic routes**: Next.js 16 makes `params` potentially Promise-based in some edge cases. Check dynamic routes:
  ```bash
  grep -r "{ params }" src/app/ --include="*.tsx" -n
  ```

- **`next/head` vs metadata API**: Already using App Router metadata API (good). No action.

**Step 3: Fix any issues found**

Apply minimal changes. Do not refactor architecture — only fix compiler/build errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(next): Phase 2 — App Router API compatibility for Next.js 16"
```

---

### Task 2.4: Phase 2 gate — build + type-check + test

**Objective:** Confirm Next.js 16 is stable.

**Step 1: Type check**

Run: `npm run type-check`
Expected: 0 errors

**Step 2: Build**

Run: `npm run build`
Expected: Success

**Step 3: Tests**

Run: `npm test`
Expected: All pass

**Step 4: Lint**

Run: `npm run lint`
Expected: Clean

**Step 5: Tag**

```bash
git tag -a phase2-next16 -m "Phase 2 complete: Next.js 16 stable"
```

---

## Phase 3: Peer Dependency Reconciliation

### Task 3.1: Update @radix-ui/react-slot for React 19

**Objective:** Ensure shadcn/ui slot primitive is on a React 19-compatible version.

**Files:**
- Modify: `package.json`, `package-lock.json`

**Step 1: Update**

```bash
npm install @radix-ui/react-slot@1.2.4
```

**Step 2: Verify no peer warnings**

Run: `npm ls @radix-ui/react-slot --depth=0`
Expected: No peer dependency warnings about React version.

---

### Task 3.2: Update react-hook-form + resolvers

**Objective:** Align form library with React 19.

**Files:**
- Modify: `package.json`, `package-lock.json`

**Step 1: Update**

```bash
npm install react-hook-form@7.76.1 @hookform/resolvers@5.4.0
```

**Step 2: Verify**

Run: `npm ls react-hook-form @hookform/resolvers --depth=0`

---

### Task 3.3: Update next-intl

**Objective:** Ensure i18n library is on latest React 19-compatible version.

**Files:**
- Modify: `package.json`, `package-lock.json`

**Step 1: Update**

```bash
npm install next-intl@4.13.0
```

---

### Task 3.4: Update lucide-react

**Objective:** Align icon library.

**Files:**
- Modify: `package.json`, `package-lock.json`

**Step 1: Update**

```bash
npm install lucide-react@1.17.0
```

---

### Task 3.5: Audit remaining peer dependency warnings

**Objective:** Clean up any lingering peer dependency mismatches.

**Step 1: Check for warnings**

Run: `npm ls 2>&1 | grep -i "peer\|warn" | head -30`

**Step 2: Address any React 18 peer requirements**

If a dependency still requires React 18 peer, check if a newer version exists:

```bash
npm view <package-name> peerDependencies
```

If no React 19-compatible version exists and the package works (e.g., @tsparticles/react v3), document it as a known issue and consider `--legacy-peer-deps` only as last resort.

**Step 3: Commit all reconciliation**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): Phase 3 — peer dependency reconciliation ( radix slot, rhf, next-intl, lucide )"
```

---

## Phase 4: Quality Assurance & Smoke Testing

### Task 4.1: Full build verification

**Objective:** Production build must succeed with no warnings.

**Step 1: Clean build**

```bash
rm -rf .next
npm run build
```

Expected: `Build completed successfully` with 0 errors.

**Step 2: Check for new console warnings**

Scan build output for:
- "Warning: ReactDOM.render is no longer supported"
- "Warning: forwardRef render functions do not support propTypes"
- Any new deprecation warnings from Next.js 16

---

### Task 4.2: Dev server smoke test

**Objective:** Verify the dev server starts and renders key pages.

**Step 1: Start dev server**

```bash
npm run dev &
DEV_PID=$!
sleep 10
```

**Step 2: Curl key pages**

```bash
curl -s http://localhost:3000/ | head -20
curl -s http://localhost:3000/command-center | head -20
curl -s http://localhost:3000/api/crm/daily-digest | head -5
```

Expected: All return HTTP 200 with HTML/JSON content.

**Step 3: Kill dev server**

```bash
kill $DEV_PID 2>/dev/null
```

---

### Task 4.3: Test suite verification

**Objective:** All tests must pass.

**Step 1: Run tests**

```bash
npm test
```

Expected: All pass.

**Step 2: Run full test suite**

```bash
npm run test:all
```

Expected: All pass.

---

### Task 4.4: Type-check with strict mode

**Objective:** Verify TypeScript still catches real errors.

**Step 1: Run type-check**

```bash
npm run type-check
```

Expected: 0 errors.

**Note:** `next.config.js` has `typescript.ignoreBuildErrors: true` which skips type errors during `next build`. For QA, we rely on `tsc --noEmit` (the `type-check` script) which still reports errors.

---

## Phase 5: Documentation & Handoff

### Task 5.1: Write migration completion report

**Objective:** Document what changed, what was verified, and any deferred work.

**Files:**
- Create: `docs/margot/react-19-next-16-migration-report.md`

Content template:
```markdown
# React 19 / Next.js 16 Migration Report

**Date:** YYYY-MM-DD
**Branch:** margot/react-19-next-16-migration
**Commit range:** <first>..<last>

## Changes Summary

| Package | From | To |
|---------|------|-----|
| react | 18.2.0 | 19.2.6 |
| react-dom | 18.2.0 | 19.2.6 |
| next | 15.5.18 | 16.2.6 |
| ... | ... | ... |

## Automated Changes
- Legacy codemod: 162 forwardRef → ref conversions

## Manual Changes
- React.FC removal: 9 files
- next.config.js: (list if changed)
- App Router API: (list if changed)

## Verification
- [ ] Build passes
- [ ] Type-check passes
- [ ] All tests pass
- [ ] Dev server renders key pages
- [ ] Lint clean

## Known Issues / Deferred
- TailwindCSS v4: deferred to separate migration
- @tsparticles/react v3: evaluate upgrade to v4
- Any peer warnings: (document)

## Rollback Procedure
```bash
git checkout phase0-pre-migration  # or restore package-lock.json.pre-migration.backup
npm ci
```
```

---

### Task 5.2: Update nexus-security-dr skill

**Objective:** Record the migration in the DR skill for future reference.

**Files:**
- Modify: `~/.hermes/skills/unite-group-nexus/nexus-security-dr/SKILL.md`

Add to the "Known Critical Issues / Recently Resolved" section:
```markdown
### Resolved: React 18 → 19 / Next.js 15 → 16 Migration (YYYY-MM-DD)
- Upgraded React core, Next.js framework, and aligned peer dependencies
- Applied legacy codemod for forwardRef→ref migration (162 instances)
- Removed React.FC usages (9 instances)
- Verified: build, type-check, tests, lint all pass
- Branch: `margot/react-19-next-16-migration`
```

---

### Task 5.3: Final commit and push

**Objective:** Push the completed migration branch.

```bash
git push -u origin margot/react-19-next-16-migration
git push origin phase1-react19 phase2-next16
```

---

## Rollback Plan

If any phase fails catastrophically:

1. **Phase 1 rollback:**
   ```bash
   git checkout package-lock.json.pre-migration.backup
   mv package-lock.json.pre-migration.backup package-lock.json
   npm install react@18.2.0 react-dom@18.2.0 @types/react@18.2.0 @types/react-dom@18.2.0
   git checkout src/  # restore pre-codemod source
   ```

2. **Phase 2 rollback:**
   ```bash
   npm install next@15.5.18 eslint-config-next@15.5.15
   git checkout next.config.js
   ```

3. **Nuclear rollback:**
   ```bash
   git checkout phase0-pre-migration
   npm ci
   ```

---

## Appendix: TailwindCSS v4 — Deferred Migration

TailwindCSS 4.3.0 is a **separate major migration** with breaking changes:
- No `tailwind.config.js` — configuration moves to CSS
- `@import "tailwindcss"` instead of directives
- Plugin API changes
- No `tailwindcss-animate` compatibility until updated

**Recommendation:** Complete and stabilize React 19 + Next.js 16 first. Schedule Tailwind v4 as a follow-up project with its own plan.

---

## Appendix: @tsparticles/react v3 → v4 Risk

@tsparticles/react v3.0.0 has a peer dependency on React 18. The latest v4.1.1 supports React 19.

**Options:**
1. Keep v3 for now if it works (test after React 19 install)
2. Upgrade to v4 if v3 fails at runtime
3. Remove tsparticles if not actively used (check bundle analysis)

Defer decision until Phase 4 smoke testing.
