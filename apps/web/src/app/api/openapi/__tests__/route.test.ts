// src/app/api/openapi/__tests__/route.test.ts
// Regression coverage for GET /api/openapi — the public OpenAPI 3.1 spec.
// Captures the served contract: valid spec envelope, the documented /work
// operation, response/error schemas, and the cache header.
import { describe, it, expect } from 'vitest'
import { GET } from '../route'

describe('GET /api/openapi', () => {
  it('returns 200 with a cacheable JSON content type', async () => {
    const res = GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toContain('max-age=3600')
  })

  it('serves a valid OpenAPI 3.1 envelope for the Nexus API', async () => {
    const spec = (await GET().json()) as {
      openapi: string
      info: { title: string; version: string }
      servers: { url: string }[]
    }
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info.title).toBe('Nexus API')
    expect(spec.info.version).toBe('1.0.0')
    expect(spec.servers[0].url).toBe('/api')
  })

  it('documents the /work ingestion operation with its outcomes', async () => {
    const spec = (await GET().json()) as {
      paths: Record<string, { post: { operationId: string; responses: Record<string, unknown>; security: unknown[] } }>
    }
    const work = spec.paths['/work']?.post
    expect(work?.operationId).toBe('ingestWork')
    // Documents the full outcome set, including the auth gate.
    expect(Object.keys(work.responses).sort()).toEqual(['200', '400', '401', '500'])
    expect(work.security).toEqual([{ cookieAuth: [] }])
  })

  it('defines the request/response/error schemas it references', async () => {
    const spec = (await GET().json()) as {
      components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> }
    }
    const schemas = spec.components.schemas
    for (const name of ['WorkIngestionRequest', 'WorkIntent', 'WorkIngestionResponse', 'ErrorResponse']) {
      expect(schemas).toHaveProperty(name)
    }
    expect(spec.components.securitySchemes).toHaveProperty('cookieAuth')
  })
})
