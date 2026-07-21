import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const packageRoot = new URL('../', import.meta.url)

function read(path: string): string {
  return readFileSync(new URL(path, packageRoot), 'utf8')
}

type Surface = {
  config: string
  entrypoints: string[]
  sources: string[]
  outputDirectory: string
  emitted: string[]
}

type RuntimeManifest = {
  schema: string
  retiredPaths: string[]
  surfaces: {
    retirementContainer: Surface
  }
}

describe('reviewed production runtime surfaces', () => {
  const runtime = JSON.parse(read('runtime-surface.json')) as RuntimeManifest

  it('defines only the one-file container tombstone', () => {
    expect(runtime.schema).toBe('unite.autopilot.runtime-surface.v1')
    expect(Object.keys(runtime.surfaces)).toEqual(['retirementContainer'])
    expect(runtime.surfaces.retirementContainer).toMatchObject({
      entrypoints: ['src/index.ts'],
      sources: ['src/index.ts'],
      outputDirectory: 'dist/container',
      emitted: ['index.js'],
    })

    const allProductionSources = Object.values(runtime.surfaces).flatMap((surface) => surface.sources)
    expect(runtime.retiredPaths).toHaveLength(36)
    for (const retired of runtime.retiredPaths) {
      expect(allProductionSources, `${retired} must stay outside production`).not.toContain(retired)
      expect(existsSync(new URL(retired, packageRoot)), `${retired} must stay deleted`).toBe(false)
    }
  })

  it('uses TypeScript file allowlists that match the reviewed entrypoints', () => {
    for (const surface of Object.values(runtime.surfaces)) {
      const config = JSON.parse(read(surface.config)) as { files?: string[]; include?: string[] }
      expect(config.include).toEqual([])
      expect(config.files).toEqual(surface.entrypoints)
    }
  })

  it('cleans output and enforces exact compiler and emitted-file manifests', () => {
    const packageManifest = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      engines?: Record<string, string>
      scripts?: Record<string, string>
    }
    expect(packageManifest.scripts).toMatchObject({
      build: 'node scripts/build.mjs',
      'retirement-tombstone': 'node dist/container/index.js',
      'verify:container': 'bash scripts/verify-retirement-container.sh',
    })
    expect(packageManifest.scripts).not.toHaveProperty('operator-jobs')
    expect(packageManifest.scripts).not.toHaveProperty('heartbeat')
    expect(packageManifest.scripts).not.toHaveProperty('ownest')
    expect(packageManifest.dependencies).toBeUndefined()
    expect(packageManifest.devDependencies).not.toHaveProperty('@octokit/auth-app')
    expect(packageManifest.devDependencies).not.toHaveProperty('@octokit/rest')
    expect(packageManifest.engines).toEqual({ node: '>=24.14.1 <25' })

    const builder = read('scripts/build.mjs')
    expect(builder).toContain("runCompiler(['--listFilesOnly', '-p', surface.config])")
    expect(builder).toContain('rmSync(distRoot, { recursive: true, force: true })')
    expect(builder).toContain("assertExact(surfaceName, 'sources', listed, surface.sources)")
    expect(builder).toContain("assertExact(surfaceName, 'emitted', emitted, surface.emitted)")
    expect(builder).toContain('if (existsSync(join(packageRoot, retiredPath)))')
  })

  it('keeps type-checking non-emitting and enables output only in reviewed build configs', () => {
    const base = JSON.parse(read('tsconfig.json')) as { compilerOptions?: { noEmit?: boolean } }
    expect(base.compilerOptions?.noEmit).toBe(true)

    for (const surface of Object.values(runtime.surfaces)) {
      const config = JSON.parse(read(surface.config)) as { compilerOptions?: { noEmit?: boolean } }
      expect(config.compilerOptions?.noEmit).toBe(false)
    }
  })

  it('ships only the dependency-free retirement entrypoint in the runtime image', () => {
    const dockerfile = read('Dockerfile')
    expect(dockerfile).toMatch(/FROM node:24\.14\.1-slim@sha256:[a-f0-9]{64} AS build/)
    expect(dockerfile).toMatch(/FROM node:24\.14\.1-slim@sha256:[a-f0-9]{64} AS runtime/)
    expect(dockerfile).toContain('COPY src/index.ts ./src/index.ts')
    expect(dockerfile).toContain('COPY --from=build --chown=node:node /build/dist/container/index.js ./index.js')
    expect(dockerfile).toContain('ENTRYPOINT ["node", "/app/index.js"]')
    expect(dockerfile).not.toMatch(/COPY src \./)
    expect(dockerfile).not.toMatch(/dist\/host|ownest-tick|heartbeat\.js|operator-jobs|wiki-enhance/)
    expect(dockerfile).not.toMatch(/apt-get|\bgit\b|claude-code|npm install -g/i)
  })

  it('uses a Docker input allowlist instead of trying to enumerate secret patterns', () => {
    expect(read('.dockerignore').trim().split(/\r?\n/)).toEqual([
      '**',
      '!package.json',
      '!package-lock.json',
      '!tsconfig.json',
      '!tsconfig.container.json',
      '!src/',
      '!src/index.ts',
    ])
  })

  it('keeps every former user-level service wrapper inert before configuration', () => {
    const ownest = read('scripts/ownest-launchd.sh')
    expect(ownest).toMatch(/Security tombstone/)
    expect(ownest).toMatch(/exit 78/)
    expect(ownest).not.toMatch(/\.env|SUPABASE|\bnode\b|dist\/host/)
    const heartbeat = read('scripts/heartbeat-launchd.sh')
    expect(heartbeat).toMatch(/Security tombstone/)
    expect(heartbeat).toMatch(/exit 78/)
    expect(heartbeat).not.toMatch(/\.env|SUPABASE|\bnode\b|dist\/host/)
    const sanitizer = read('scripts/sanitize-ownest-profile-env.sh')
    expect(sanitizer).toMatch(/Security tombstone/)
    expect(sanitizer).toMatch(/exit 78/)
    expect(sanitizer).not.toMatch(/profile\.env|change-backups|OPENROUTER_API_KEY/)

    for (const path of ['scripts/operator-jobs-launchd.sh', 'scripts/install-operator-jobs-service.sh']) {
      const tombstone = read(path)
      expect(tombstone).toMatch(/permanently retired/)
      expect(tombstone).not.toMatch(/\.env|SUPABASE|\bnode\b|launchctl|npm run build/)
    }
  })

  it('smokes the container under a non-root, networkless, read-only sandbox', () => {
    const verifier = read('scripts/verify-retirement-container.sh')
    for (const boundary of [
      '--network none',
      '--read-only',
      '--cap-drop ALL',
      '--security-opt no-new-privileges:true',
      '--pids-limit 32',
      '--memory 128m',
      "test \"$contents\" = 'index.js'",
      'command -v "$executable"',
      'test "$status" -eq 2',
    ]) {
      expect(verifier).toContain(boundary)
    }
  })
})
