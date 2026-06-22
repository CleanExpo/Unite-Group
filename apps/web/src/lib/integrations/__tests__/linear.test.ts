import { beforeEach, describe, expect, it, vi } from 'vitest'

type GraphqlRequest = {
  query: string
  variables?: Record<string, unknown>
}

function response(data: unknown): Response {
  return {
    ok: true,
    json: async () => ({ data }),
  } as Response
}

async function loadLinear() {
  vi.resetModules()
  vi.stubEnv('LINEAR_API_KEY', 'linear_test_key')
  return import('@/lib/integrations/linear')
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Linear integration', () => {
  it('resolves requested label names to Linear label IDs', async () => {
    const requests: GraphqlRequest[] = []
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as GraphqlRequest
      requests.push(request)
      return response({
        issueLabels: {
          nodes: [
            { id: 'label-auto', name: 'pi-dev:autonomous' },
            { id: 'label-mesh', name: 'mesh:auto' },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { resolveLabelIds } = await loadLinear()
    await expect(resolveLabelIds([' pi-dev:autonomous ', 'mesh:auto', 'mesh:auto']))
      .resolves.toEqual(['label-auto', 'label-mesh'])

    expect(requests).toHaveLength(1)
    expect(requests[0].query).toContain('issueLabels')
  })

  it('resolves labels via a server-side name filter (no fetch-all 1000-label cap)', async () => {
    const requests: GraphqlRequest[] = []
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as GraphqlRequest
      requests.push(request)
      return response({ issueLabels: { nodes: [{ id: 'l-src', name: 'source:hermes-kanban' }] } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { resolveLabelIds } = await loadLinear()
    await expect(resolveLabelIds(['source:hermes-kanban'])).resolves.toEqual(['l-src'])

    // Must filter by name on the server (passes names as variables) rather than
    // paginating all labels — otherwise needed labels fall off the cap in the
    // shared mega-workspace and resolve as "not found".
    expect(requests[0].query).toContain('name: { in: $names }')
    expect(requests[0].variables).toEqual({ names: ['source:hermes-kanban'] })
  })

  it('fails loudly when a requested Linear label is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      issueLabels: {
        nodes: [{ id: 'label-auto', name: 'pi-dev:autonomous' }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })))

    const { resolveLabelIds } = await loadLinear()
    await expect(resolveLabelIds(['pi-dev:autonomous', 'mesh:auto']))
      .rejects.toThrow('Linear label not found: mesh:auto')
  })

  it('applies resolved label IDs when creating an issue', async () => {
    const requests: GraphqlRequest[] = []
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as GraphqlRequest
      requests.push(request)

      if (request.query.includes('teams')) {
        return response({
          teams: {
            nodes: [
              {
                id: 'team-uni',
                key: 'UNI',
                states: { nodes: [] },
              },
            ],
          },
        })
      }

      if (request.query.includes('issueLabels')) {
        return response({
          issueLabels: {
            nodes: [{ id: 'label-auto', name: 'pi-dev:autonomous' }],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        })
      }

      return response({
        issueCreate: {
          issue: {
            id: 'issue-id',
            identifier: 'UNI-9999',
            url: 'https://linear.app/unite-group/issue/UNI-9999/test',
          },
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { createIssue } = await loadLinear()
    await expect(createIssue({
      teamKey: 'UNI',
      title: 'Autonomous task',
      description: 'Ready for Pi-Dev',
      priority: 2,
      labelNames: ['pi-dev:autonomous'],
    })).resolves.toEqual({
      id: 'UNI-9999',
      url: 'https://linear.app/unite-group/issue/UNI-9999/test',
    })

    const createRequest = requests.find(request => request.query.includes('issueCreate'))
    expect(createRequest?.variables).toMatchObject({
      teamId: 'team-uni',
      title: 'Autonomous task',
      priority: 2,
      labelIds: ['label-auto'],
    })
  })
})

describe('issueToBusiness', () => {
  it('maps an issue to its business by Linear project (Dimitri-ITR → itr)', async () => {
    const { issueToBusiness } = await loadLinear()
    expect(issueToBusiness({ team: { key: 'UNI' }, project: { name: 'Dimitri-ITR' } })).toBe('itr')
  })

  it('distinguishes ATO from CCW within the shared UNI team via project', async () => {
    const { issueToBusiness } = await loadLinear()
    // Both ATO and ITR sit on the UNI team; only the project tells them apart.
    expect(issueToBusiness({ team: { key: 'UNI' }, project: { name: 'ATO-APP' } })).toBe('ato')
    expect(issueToBusiness({ team: { key: 'UNI' }, project: { name: 'CCW-CRM' } })).toBe('ccw')
  })

  it('falls back to team mapping when the issue has no project', async () => {
    const { issueToBusiness } = await loadLinear()
    expect(issueToBusiness({ team: { key: 'DR' }, project: null })).toBe('dr')
  })

  it('falls back to ccw for an unknown team and no project', async () => {
    const { issueToBusiness } = await loadLinear()
    expect(issueToBusiness({ team: { key: 'ZZZ' } })).toBe('ccw')
  })

  it('ignores an unrecognised project name and uses the team', async () => {
    const { issueToBusiness } = await loadLinear()
    expect(issueToBusiness({ team: { key: 'SYN' }, project: { name: 'Some Other Project' } })).toBe('synthex')
  })
})
