import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_ROUTE_SECURITY_ALLOWLIST, findUnprotectedMutatingRoutes } from '../route-security-check'

const tempRoots: string[] = []

function makeApiRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'route-security-check-'))
  tempRoots.push(root)
  const apiRoot = join(root, 'src', 'app', 'api')
  mkdirSync(apiRoot, { recursive: true })
  return apiRoot
}

function writeRoute(apiRoot: string, routePath: string, source: string): void {
  const dir = join(apiRoot, ...routePath.split('/').filter(Boolean))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'route.ts'), source)
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('findUnprotectedMutatingRoutes', () => {
  it('flags mutating API routes that have no detected auth, signature, or rate-limit guard', () => {
    const apiRoot = makeApiRoot()
    writeRoute(apiRoot, 'crm/leads', `
      export async function POST(request: Request) {
        return Response.json({ ok: true })
      }
    `)

    expect(findUnprotectedMutatingRoutes({ apiRoot })).toEqual([
      {
        path: '/api/crm/leads',
        file: join(apiRoot, 'crm', 'leads', 'route.ts'),
        methods: ['POST'],
      },
    ])
  })

  it('ignores GET-only routes and mutating routes with a recognised guard', () => {
    const apiRoot = makeApiRoot()
    writeRoute(apiRoot, 'founder/opportunities', `
      import { getUser } from '@/lib/supabase/server'
      export async function GET() {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })
        return Response.json({ ok: true })
      }
    `)
    writeRoute(apiRoot, 'crm/contacts', `
      import { requireAdmin } from '@/lib/auth/admin'
      export async function PATCH(request: Request) {
        await requireAdmin(request)
        return Response.json({ ok: true })
      }
    `)
    writeRoute(apiRoot, 'webhooks/heygen', `
      import { verifyHeyGenSignature } from '@/lib/webhooks/verify'
      export async function POST(request: Request) {
        const rawBody = await request.text()
        if (!verifyHeyGenSignature(rawBody, request.headers.get('x-heygen-signature'))) {
          return Response.json({ error: 'Invalid signature' }, { status: 401 })
        }
        return Response.json({ ok: true })
      }
    `)

    expect(findUnprotectedMutatingRoutes({ apiRoot })).toEqual([])
  })

  it('allows explicitly reviewed public mutating routes without hiding other violations', () => {
    const apiRoot = makeApiRoot()
    writeRoute(apiRoot, 'marketing/leads', `
      export async function POST() {
        return Response.json({ ok: true })
      }
    `)
    writeRoute(apiRoot, 'crm/opportunities', `
      export async function POST() {
        return Response.json({ ok: true })
      }
    `)

    expect(findUnprotectedMutatingRoutes({
      apiRoot,
      allowlist: ['/api/marketing/leads'],
    })).toEqual([
      {
        path: '/api/crm/opportunities',
        file: join(apiRoot, 'crm', 'opportunities', 'route.ts'),
        methods: ['POST'],
      },
    ])
  })

  it('wires the package security route check to the local route-security CLI', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
    expect(pkg.scripts['security:routes-check']).toBe('tsx scripts/check-route-security.ts')
  })

  it('keeps the inactive Telegram approval callback as the only default reviewed route exception', () => {
    expect(DEFAULT_ROUTE_SECURITY_ALLOWLIST).toEqual(['/api/telegram/approval-callback'])
  })
})
