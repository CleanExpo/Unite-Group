// src/lib/nexus/__tests__/branch-orchestrator.test.ts
// Unit coverage for the branch-creation orchestrator (UNI-2203).
// The GitHub API is fully mocked — no real branches are ever created.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createWorkBranch,
  repoForTicket,
  branchNameFor,
  isGitHubConfigured,
} from '../branch-orchestrator'

const originalToken = process.env.GITHUB_TOKEN

beforeEach(() => {
  process.env.GITHUB_TOKEN = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'
})

afterEach(() => {
  vi.restoreAllMocks()
  if (originalToken !== undefined) process.env.GITHUB_TOKEN = originalToken
  else delete process.env.GITHUB_TOKEN
})

/**
 * Stub global fetch for the 3-call happy path:
 *   1. GET  git/ref/heads/main   → base sha
 *   2. POST git/refs            → branch created
 *   3. GET  git/ref/heads/{new} → confirmation
 */
function mockHappyPath(sha = 'abc123') {
  const fetchMock = vi
    .fn()
    // 1. resolve main
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ object: { sha } }) })
    // 2. create ref
    .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) })
    // 3. confirm
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ object: { sha } }) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('repoForTicket', () => {
  it('maps RA → RestoreAssist', () => {
    expect(repoForTicket('RA-123')).toBe('RestoreAssist')
  })
  it('maps SYNTH → Synthex', () => {
    expect(repoForTicket('SYNTH-45')).toBe('Synthex')
  })
  it('maps UNI → Unite-Group (Nexus)', () => {
    expect(repoForTicket('UNI-2203')).toBe('Unite-Group')
  })
  it('is case-insensitive on the prefix', () => {
    expect(repoForTicket('ra-9')).toBe('RestoreAssist')
  })
  it('throws an actionable error on an unknown prefix', () => {
    expect(() => repoForTicket('XYZ-1')).toThrow(/Unknown ticket prefix "XYZ"/)
    expect(() => repoForTicket('XYZ-1')).toThrow(/RA, SYNTH, UNI/)
  })
})

describe('branchNameFor', () => {
  it('builds feature/{ticket-id}-{slug}', () => {
    expect(branchNameFor('UNI-2203', 'Branch creation orchestrator')).toBe(
      'feature/uni-2203-branch-creation-orchestrator',
    )
  })
  it('collapses punctuation and whitespace into single hyphens', () => {
    expect(branchNameFor('RA-7', '  Fix: backup  encryption!! ')).toBe(
      'feature/ra-7-fix-backup-encryption',
    )
  })
  it('falls back to the ticket slug when the title is empty', () => {
    expect(branchNameFor('SYNTH-1', '   ')).toBe('feature/synth-1')
  })
})

describe('isGitHubConfigured', () => {
  it('returns false when the token is absent', () => {
    delete process.env.GITHUB_TOKEN
    expect(isGitHubConfigured()).toBe(false)
  })
  it('returns true with a valid token', () => {
    expect(isGitHubConfigured()).toBe(true)
  })
})

describe('createWorkBranch — happy path per repo prefix', () => {
  it('creates an RA branch in CleanExpo/RestoreAssist', async () => {
    const fetchMock = mockHappyPath()
    const result = await createWorkBranch('RA-123', 'Fix backup encryption')
    expect(result).toEqual({
      branch: 'feature/ra-123-fix-backup-encryption',
      repo: 'CleanExpo/RestoreAssist',
      url: 'https://github.com/CleanExpo/RestoreAssist/tree/feature/ra-123-fix-backup-encryption',
    })
    // First call reads main of the correct repo.
    expect(fetchMock.mock.calls[0][0]).toContain('/repos/CleanExpo/RestoreAssist/git/ref/heads/main')
    // Second call POSTs the new ref from the base sha.
    const createBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(createBody).toEqual({ ref: 'refs/heads/feature/ra-123-fix-backup-encryption', sha: 'abc123' })
  })

  it('creates a SYNTH branch in CleanExpo/Synthex', async () => {
    mockHappyPath()
    const result = await createWorkBranch('SYNTH-45', 'Add TikTok publisher')
    expect(result.repo).toBe('CleanExpo/Synthex')
    expect(result.branch).toBe('feature/synth-45-add-tiktok-publisher')
  })

  it('creates a UNI branch in CleanExpo/Unite-Group (Nexus)', async () => {
    mockHappyPath()
    const result = await createWorkBranch('UNI-2203', 'Branch creation orchestrator')
    expect(result.repo).toBe('CleanExpo/Unite-Group')
    expect(result.url).toBe(
      'https://github.com/CleanExpo/Unite-Group/tree/feature/uni-2203-branch-creation-orchestrator',
    )
  })
})

describe('createWorkBranch — error handling', () => {
  it('rejects an unknown ticket prefix without calling GitHub', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(createWorkBranch('XYZ-1', 'whatever')).rejects.toThrow(/Unknown ticket prefix/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws an actionable message on a repo-access failure (404)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(createWorkBranch('RA-9', 'Some work')).rejects.toThrow(
      /Cannot access CleanExpo\/RestoreAssist \(HTTP 404\).*GITHUB_TOKEN has access/s,
    )
    // Never attempts to create a branch after an access failure.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws when GITHUB_TOKEN is not configured', async () => {
    delete process.env.GITHUB_TOKEN
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(createWorkBranch('UNI-1', 'x')).rejects.toThrow(/GitHub is not configured/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces a 422 (branch already exists) as an actionable message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ object: { sha: 's1' } }) })
      .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(createWorkBranch('UNI-1', 'dupe')).rejects.toThrow(/already exists/)
  })
})
