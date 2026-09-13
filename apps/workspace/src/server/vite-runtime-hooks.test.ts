import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import * as url from 'node:url'
import assert from 'node:assert/strict'
import { test } from 'vitest'
import ts from 'typescript'

const source = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source.replaceAll('import.meta.url', JSON.stringify('file:///fixture/vite.config.ts')), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText

async function exercise(mode: string, command: string, vitest: string | undefined) {
  const calls = { middleware: 0, handlers: 0, spawn: 0, exec: 0, probe: 0, timers: 0, kill: 0 }
  const child = () => Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter(), kill: () => calls.kill++ })
  const modules: Record<string, unknown> = {
    'node:child_process': { spawn: () => { calls.spawn++; return child() }, execSync: () => { calls.exec++; return '' } },
    'node:fs': { existsSync: () => true, copyFileSync: () => {}, mkdirSync: () => {} },
    'node:os': { homedir: () => '/fixture/home' },
    'node:net': { createConnection: () => {
      calls.probe++
      const socket = Object.assign(new EventEmitter(), { destroy() {} })
      queueMicrotask(() => socket.emit('error', new Error('fixture closed port')))
      return socket
    } },
    vite: { defineConfig: (value: unknown) => value, loadEnv: () => ({}) },
    '@tanstack/react-start/plugin/vite': { tanstackStart: () => ({}) },
  }
  const context = {
    exports: {} as { default: (options: { mode: string; command: string }) => {
      plugins: Array<{ name?: string; configureServer: (server: unknown) => void }>
    } }, URL, Buffer, AbortSignal: { timeout: () => { calls.timers++; return undefined } },
    process: { env: vitest === undefined ? {} : { VITEST: vitest }, cwd: () => '/fixture', kill: () => calls.kill++ },
    console: { log() {}, warn() {}, error() {} },
    fetch: async () => { calls.probe++; return { ok: false } },
    setTimeout: () => { calls.timers++; return 1 }, clearTimeout() {},
    require: (name: string) => {
      if (name in modules) return modules[name]
      if (name === 'node:url') return url
      if (name === 'node:path') return path
      if (['@vitejs/plugin-react', '@tailwindcss/vite', 'vite-tsconfig-paths'].includes(name)) return () => ({})
      throw new Error('Unmocked import: ' + name)
    },
  }
  vm.runInNewContext(compiled, context, { timeout: 1000 })
  const config = context.exports.default({ mode, command })
  const plugin = config.plugins.find(value => value.name === 'workspace-daemon')
  assert.ok(plugin)
  plugin.configureServer({
    middlewares: { use: () => calls.middleware++ },
    httpServer: { on: () => calls.handlers++ },
  })
  for (let i = 0; i < 12; i++) await Promise.resolve()
  return calls
}

for (const [label, mode, command, indicator] of [
  ['test mode without Vitest environment', 'test', 'serve', undefined],
  ['Vitest default mode', 'test', 'serve', 'true'],
  ['Vitest custom mode', 'integration', 'serve', 'true'],
  ['production build', 'production', 'build', undefined],
] as const) test(label + ' has no runtime hooks or side effects', async () => {
  assert.deepEqual(await exercise(mode, command, indicator), {
    middleware: 0, handlers: 0, spawn: 0, exec: 0, probe: 0, timers: 0, kill: 0,
  })
})

test('normal development serve still registers hooks and reaches fake agent startup', async () => {
  const calls = await exercise('development', 'serve', undefined)
  assert.ok(calls.middleware > 0)
  assert.ok(calls.handlers > 0)
  assert.ok(calls.probe > 0)
  assert.ok(calls.spawn > 0)
})
