import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const root = path.dirname(fileURLToPath(import.meta.url))
const runFile = promisify(execFile)
const coverage = 'Repositories readable by the locally authenticated GitHub CLI connection, including private, archived and organisation repositories. This local preview connection may differ from deployed Mission Control.'

function localRepositoryCatalog() {
  return {
    name: 'local-read-only-repository-catalog',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1:4178')
        if (url.pathname !== '/api/command-centre/missions/repositories') {
          if (!url.pathname.startsWith('/api/')) return next()
          response.statusCode = 503
          response.setHeader('Content-Type', 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({ error: 'This authenticated service is unavailable in the local preview. No live data or actions are connected here.', source: 'not_connected', status: 'unavailable' }))
          return
        }
        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        const reply = (body, statusCode = 200) => {
          response.statusCode = statusCode
          response.end(JSON.stringify({ repositories: [], nextCursor: null, incomplete: true, observedAt: new Date().toISOString(), coverage, ...body }))
        }
        if (request.method !== 'GET') return reply({ status: 'unavailable', message: 'Repository discovery is read-only.' }, 405)
        const cursor = url.searchParams.get('cursor') ?? '1'
        if (!/^[1-9]\d{0,5}$/.test(cursor)) return reply({ status: 'unavailable', message: 'Invalid repository page.' }, 400)
        try {
          // Invoke the existing CLI authentication server-side. Never expose credentials or raw provider output to the browser.
          const { stdout } = await runFile('gh', ['api', '--include', '--method', 'GET', `user/repos?per_page=100&visibility=all&sort=full_name&direction=asc&affiliation=owner,collaborator,organization_member&page=${cursor}`], { timeout: 20000, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
          const boundary = stdout.search(/\r?\n\r?\n/)
          if (boundary < 0) throw new Error('Invalid catalogue response')
          const headers = stdout.slice(0, boundary)
          const data = JSON.parse(stdout.slice(boundary).trim())
          if (!Array.isArray(data) || data.some(repo => typeof repo.full_name !== 'string' || typeof repo.private !== 'boolean' || typeof repo.archived !== 'boolean')) throw new Error('Invalid catalogue response')
          const more = /^link:.*rel="next"/im.test(headers)
          reply({ repositories: data.map(repo => ({ fullName: repo.full_name, private: repo.private, archived: repo.archived })), status: more ? 'partial' : 'complete', nextCursor: more ? String(Number(cursor) + 1) : null, incomplete: false, message: more ? 'More repositories are available from your local GitHub connection.' : 'Repository list loaded from your local GitHub connection. Missions remain sample-only.' })
        } catch (error) {
          const failure = String(error?.stderr ?? '')
          const status = /HTTP 401|authentication|gh auth login/i.test(failure) ? 'auth_error' : /rate limit|HTTP 429/i.test(failure) ? 'rate_limited' : error?.code === 'ENOENT' ? 'not_connected' : 'unavailable'
          reply({ status, message: status === 'auth_error' ? 'The local GitHub CLI connection needs authentication.' : status === 'rate_limited' ? 'GitHub has temporarily limited repository requests. Try again later.' : 'The local GitHub repository list could not be loaded. Try again.' })
        }
      })
    },
  }
}

// No environment credentials or execution flags are available to preview browser components.
export default defineConfig({ root, define: { 'process.env': '{}' }, plugins: [react(), localRepositoryCatalog()], resolve: { alias: { '@': path.resolve(root, '../src'), 'next/link': path.join(root, 'link.tsx'), 'next/navigation': path.join(root, 'navigation.tsx'), 'next/image': path.join(root, 'image.tsx'), 'next/dynamic': path.join(root, 'dynamic.tsx') } }, server: { host: '127.0.0.1', port: 4178, strictPort: true, fs: { allow: [path.resolve(root, '..')] } } })
