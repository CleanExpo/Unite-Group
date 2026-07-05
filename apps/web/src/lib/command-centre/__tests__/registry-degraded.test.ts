import { afterEach, describe, expect, it, vi } from 'vitest'

// Separate file from registry.test.ts because the fs mock is module-wide:
// here BOTH portfolio read paths (in-tree copy and repo-root fallback) fail,
// proving getProjects() degrades to an empty registry instead of throwing —
// a blank tile on the deck, not an error boundary across the whole page.
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })),
}))

import { getProjects } from '@/lib/command-centre/registry'

describe('getProjects — missing SSOT degrades gracefully', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns an empty registry and logs the error instead of throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getProjects()).resolves.toEqual([])

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('failed to load portfolio SSOT'),
      expect.any(Error),
    )
  })
})
