// src/lib/nexus/__tests__/github-prs.test.ts

import { isNexusGitHubConfigured, getNexusRepos, NEXUS_LABEL } from '../github-prs'

const originalToken = process.env.GITHUB_TOKEN
const originalNexusRepos = process.env.NEXUS_REPOS
const originalGithubOwner = process.env.GITHUB_OWNER

beforeEach(() => {
  delete process.env.GITHUB_TOKEN
  delete process.env.NEXUS_REPOS
  delete process.env.GITHUB_OWNER
})

afterAll(() => {
  if (originalToken !== undefined) process.env.GITHUB_TOKEN = originalToken
  else delete process.env.GITHUB_TOKEN
  if (originalNexusRepos !== undefined) process.env.NEXUS_REPOS = originalNexusRepos
  else delete process.env.NEXUS_REPOS
  if (originalGithubOwner !== undefined) process.env.GITHUB_OWNER = originalGithubOwner
  else delete process.env.GITHUB_OWNER
})

describe('isNexusGitHubConfigured', () => {
  it('returns false when GITHUB_TOKEN is not set', () => {
    expect(isNexusGitHubConfigured()).toBe(false)
  })

  it('returns false when GITHUB_TOKEN is empty', () => {
    process.env.GITHUB_TOKEN = ''
    expect(isNexusGitHubConfigured()).toBe(false)
  })

  it('returns false when GITHUB_TOKEN is too short', () => {
    process.env.GITHUB_TOKEN = 'short'
    expect(isNexusGitHubConfigured()).toBe(false)
  })

  it('returns true when GITHUB_TOKEN is a valid length', () => {
    process.env.GITHUB_TOKEN = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    expect(isNexusGitHubConfigured()).toBe(true)
  })
})

describe('getNexusRepos', () => {
  it('returns empty array when no env vars set', () => {
    expect(getNexusRepos()).toEqual([])
  })

  it('parses NEXUS_REPOS with a single repo', () => {
    process.env.NEXUS_REPOS = 'acme/my-repo'
    expect(getNexusRepos()).toEqual([{ owner: 'acme', repo: 'my-repo' }])
  })

  it('parses NEXUS_REPOS with multiple repos', () => {
    process.env.NEXUS_REPOS = 'acme/repo-a,acme/repo-b, acme/repo-c '
    expect(getNexusRepos()).toEqual([
      { owner: 'acme', repo: 'repo-a' },
      { owner: 'acme', repo: 'repo-b' },
      { owner: 'acme', repo: 'repo-c' },
    ])
  })

  it('skips malformed entries in NEXUS_REPOS', () => {
    process.env.NEXUS_REPOS = 'acme/repo-a,not-a-repo,acme/repo-b'
    expect(getNexusRepos()).toEqual([
      { owner: 'acme', repo: 'repo-a' },
      { owner: 'acme', repo: 'repo-b' },
    ])
  })

  it('falls back to GITHUB_OWNER/Unite-Group when NEXUS_REPOS not set', () => {
    process.env.GITHUB_OWNER = 'CleanExpo'
    expect(getNexusRepos()).toEqual([{ owner: 'CleanExpo', repo: 'Unite-Group' }])
  })

  it('NEXUS_REPOS takes priority over GITHUB_OWNER', () => {
    process.env.NEXUS_REPOS = 'acme/repo-a'
    process.env.GITHUB_OWNER = 'CleanExpo'
    expect(getNexusRepos()).toEqual([{ owner: 'acme', repo: 'repo-a' }])
  })
})

describe('NEXUS_LABEL', () => {
  it('equals nexus-pending-approval', () => {
    expect(NEXUS_LABEL).toBe('nexus-pending-approval')
  })
})
