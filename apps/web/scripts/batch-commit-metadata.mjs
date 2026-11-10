#!/usr/bin/env node
/**
 * Creates exactly 70 commits from unstaged changes:
 * 42×(2 files) + 28×(1 file) = 112 files (includes this script when first run adds it).
 * Run from repo root: node apps/web/scripts/batch-commit-metadata.mjs
 */
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

function sh(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT })
}

function basename(p) {
  return p.split('/').pop() ?? p
}

function short(p) {
  return p.replace(/^apps\/web\//, '')
}

function msgForPath(p) {
  if (p.includes('/(auth)/')) return `chore(web): harden auth route metadata — ${short(p)}`
  if (p.includes('/(portal)/')) return `chore(web): noindex metadata for portal — ${short(p)}`
  if (p.includes('/(founder)/founder/campaigns/') && p.endsWith('layout.tsx'))
    return `chore(web): client campaign routes get layout metadata — ${short(p)}`
  if (p.includes('/(founder)/founder-metadata')) return 'chore(web): shared founder area metadata module'
  if (p.includes('/(founder)/layout.tsx')) return 'chore(web): founder layout exports CRM noindex defaults'
  if (p.includes('/(founder)/founder/')) return `chore(web): founder page noindex — ${short(p)}`
  if (p.includes('/components/public/home/')) return `chore(web): public home — ${short(p)}`
  if (p.includes('/components/public/pillar/')) return `chore(web): pillar page — ${short(p)}`
  if (p.includes('/app/cards/')) return `chore(web): living cards surface — ${short(p)}`
  if (p.includes('/app/c/')) return `chore(web): owner card publish — ${short(p)}`
  if (p.includes('/__tests__/')) return `test(web): expectations — ${short(p)}`
  if (p.includes('sitemap.ts')) return 'chore(web): refresh sitemap lastModified stamps'
  if (p.endsWith('apps/web/src/app/layout.tsx')) return 'chore(web): root layout drops title template suffix'
  if (p.endsWith('apps/web/src/app/page.tsx')) return 'chore(web): home index metadata via helper'
  if (p.includes('/solutions/')) return `chore(web): solutions pillar — ${short(p)}`
  if (p.includes('/docs/')) return 'chore(web): /docs viewer metadata'
  return `chore(web): ${short(p)}`
}

function changedPaths() {
  /** Paths with changes (staged, unstaged, or untracked). Avoids parsing `git status --short` lines — `slice(3)` breaks when status is two letters glued to the path (e.g. `MM` + `apps/...` → `MMapps/...`). */
  const z = { encoding: 'utf8', cwd: ROOT }
  const split0 = (s) => s.split('\0').filter(Boolean)
  const staged = split0(execSync('git diff --cached --name-only -z', z))
  const unstaged = split0(execSync('git diff --name-only -z', z))
  const untracked = split0(execSync('git ls-files -o --exclude-standard -z', z))
  return [...new Set([...staged, ...unstaged, ...untracked])]
}

const files = changedPaths().sort()

if (files.length !== 112) {
  console.error(`Expected 112 changed files, got ${files.length}. Abort.`)
  process.exit(1)
}

const pairCount = 42
const singleCount = 28
if (pairCount * 2 + singleCount !== files.length || pairCount + singleCount !== 70) {
  console.error('Pair/single math does not match file count')
  process.exit(1)
}

let i = 0
for (let c = 0; c < pairCount; c++) {
  const a = files[i++]
  const b = files[i++]
  const title = `chore(web): batch ${c + 1}/${pairCount} — ${basename(a)} + ${basename(b)}`
  const body = `${title}\n\n- ${short(a)}\n- ${short(b)}`
  sh(`git add "${a}" "${b}"`)
  sh(`git commit -m ${JSON.stringify(body)}`)
}

for (let c = 0; c < singleCount; c++) {
  const p = files[i++]
  sh(`git add "${p}"`)
  sh(`git commit -m ${JSON.stringify(msgForPath(p))}`)
}

console.log('Done. Commits:', pairCount + singleCount)
sh('git log -70 --oneline')
