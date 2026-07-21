#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(packageRoot, 'src')
const distRoot = join(packageRoot, 'dist')
const compiler = join(packageRoot, 'node_modules', 'typescript', 'bin', 'tsc')
const manifestPath = join(packageRoot, 'runtime-surface.json')

function fail(message) {
  console.error(`[runtime-surface] ${message}`)
  process.exit(1)
}

function runCompiler(args) {
  const result = spawnSync(process.execPath, [compiler, ...args], {
    cwd: packageRoot,
    env: process.env,
    encoding: 'utf8',
  })
  if (result.error) fail(result.error instanceof Error ? result.error.message : String(result.error))
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    fail(`TypeScript exited ${result.status ?? 'without a status'} for ${args.join(' ')}`)
  }
  return result.stdout
}

function assertSafeSortedList(surfaceName, field, values) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    fail(`${surfaceName}.${field} must be an array of strings`)
  }
  const sorted = [...values].sort()
  if (new Set(values).size !== values.length || values.some((value, index) => value !== sorted[index])) {
    fail(`${surfaceName}.${field} must be unique and sorted`)
  }
  for (const value of values) {
    if (!value || isAbsolute(value) || value.includes('\\') || value.split('/').includes('..')) {
      fail(`${surfaceName}.${field} contains an unsafe path: ${value}`)
    }
  }
}

function assertExact(surfaceName, field, actual, expected) {
  if (actual.length === expected.length && actual.every((value, index) => value === expected[index])) return
  const missing = expected.filter((value) => !actual.includes(value))
  const unexpected = actual.filter((value) => !expected.includes(value))
  fail(`${surfaceName}.${field} drifted (missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'})`)
}

function listFiles(directory, prefix = '') {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...listFiles(join(directory, entry.name), path))
    else if (entry.isFile()) files.push(path)
    else fail(`unexpected non-file output: ${path}`)
  }
  return files.sort()
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (manifest?.schema !== 'unite.autopilot.runtime-surface.v1') fail('unsupported or missing manifest schema')
if (!manifest.surfaces || typeof manifest.surfaces !== 'object') fail('manifest surfaces are missing')
assertSafeSortedList('manifest', 'retiredPaths', manifest.retiredPaths)
for (const retiredPath of manifest.retiredPaths) {
  if (existsSync(join(packageRoot, retiredPath))) fail(`retired path was restored: ${retiredPath}`)
}

const surfaces = Object.entries(manifest.surfaces)
if (surfaces.length !== 1 || !manifest.surfaces.retirementContainer) {
  fail('manifest must define only the one-file retirementContainer surface')
}

for (const [surfaceName, surface] of surfaces) {
  for (const field of ['entrypoints', 'sources', 'emitted']) {
    assertSafeSortedList(surfaceName, field, surface[field])
  }
  for (const field of ['config', 'outputDirectory']) {
    if (typeof surface[field] !== 'string') fail(`${surfaceName}.${field} must be a string`)
    assertSafeSortedList(surfaceName, field, [surface[field]])
  }

  const config = JSON.parse(readFileSync(join(packageRoot, surface.config), 'utf8'))
  assertExact(surfaceName, 'entrypoints', config.files ?? [], surface.entrypoints)
  if (!Array.isArray(config.include)) fail(`${surfaceName}.include must be an explicit empty array`)
  assertExact(surfaceName, 'include', config.include, [])

  const listed = runCompiler(['--listFilesOnly', '-p', surface.config])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((path) => resolve(path))
    .filter((path) => path === sourceRoot || path.startsWith(`${sourceRoot}${sep}`))
    .map((path) => relative(packageRoot, path).split(sep).join('/'))
    .sort()
  assertExact(surfaceName, 'sources', listed, surface.sources)
}

// Clean once before either compile so a retired artifact from an older build
// can never survive into a host checkout or container context.
rmSync(distRoot, { recursive: true, force: true })

for (const [surfaceName, surface] of surfaces) {
  runCompiler(['-p', surface.config])
  const emitted = listFiles(join(packageRoot, surface.outputDirectory))
  assertExact(surfaceName, 'emitted', emitted, surface.emitted)
}

console.log('[runtime-surface] one-file retirement surface matches the reviewed manifest')
