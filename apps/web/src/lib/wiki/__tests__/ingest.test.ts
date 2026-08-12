import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  buildWikiPageUpsert,
  ingestWikiPages,
  pageIdFromRelative,
  resolveWikiIngestPath,
  tagsFromWikiLinks,
  titleFromMarkdown,
} from '../ingest'

describe('wiki ingest helpers', () => {
  const tempRoots: string[] = []
  afterAll(async () => {
    for (const dir of tempRoots) await rm(dir, { recursive: true, force: true })
  })

  it('resolves path from WIKI_PATH then BRAIN1_WIKI_DIR then home fallback', () => {
    expect(
      resolveWikiIngestPath({ WIKI_PATH: '/vault/Wiki' }, '/Users/phill'),
    ).toBe('/vault/Wiki')
    expect(
      resolveWikiIngestPath({ BRAIN1_WIKI_DIR: '/brain/Wiki' }, '/Users/phill'),
    ).toBe('/brain/Wiki')
    // The fallback is a real filesystem path, so its separator is the host's —
    // asserting a literal '/' would only ever hold off Windows.
    expect(resolveWikiIngestPath({}, '/Users/phill')).toBe(
      path.join('/Users/phill', '2nd Brain', 'Wiki'),
    )
    // No override and no resolvable home: unresolved, NOT a relative
    // '2nd Brain/Wiki' read from wherever the process happens to be running.
    expect(resolveWikiIngestPath({}, '')).toBe('')
  })

  it('builds stable page ids and titles', () => {
    expect(pageIdFromRelative('analyst/foo.md')).toBe('analyst/foo')
    expect(titleFromMarkdown('# Hello World\n\nbody', 'hello-world')).toBe(
      'Hello World',
    )
    expect(titleFromMarkdown('no heading', 'hello-world')).toBe('Hello World')
    expect(tagsFromWikiLinks('see [[Alpha]] and [[Beta]]')).toEqual([
      'Alpha',
      'Beta',
    ])
  })

  it('buildWikiPageUpsert clips content and counts words', () => {
    const row = buildWikiPageUpsert(
      'knowledge/note.md',
      '# Note\n\none two [[tag]]',
      new Date('2026-08-07T00:00:00.000Z'),
    )
    expect(row.id).toBe('knowledge/note')
    expect(row.title).toBe('Note')
    expect(row.tags).toEqual(['tag'])
    expect(row.word_count).toBeGreaterThan(0)
    expect(row.updated_at).toBe('2026-08-07T00:00:00.000Z')
  })

  // A root that cannot be read is NOT an empty vault. A non-empty but missing
  // WIKI_PATH (typo, absent default vault, permission failure) must reject, not
  // resolve to scanned: 0 / failed: 0 — which the route reports as ok: true.
  it('ingestWikiPages rejects when the vault root cannot be read', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })

    await expect(
      ingestWikiPages({
        wikiRoot: path.join(os.tmpdir(), 'unite-wiki-root-that-does-not-exist'),
        supabase: { from } as never,
        dryRun: true,
        limit: 5,
      }),
    ).rejects.toThrow(/ENOENT/)
    // Aborted before the scan: nothing was read, nothing was written.
    expect(from).not.toHaveBeenCalled()
  })

  // Negative control: a root that EXISTS and is genuinely empty must still
  // succeed, or the fix above would be indistinguishable from "fail on
  // everything" and would break a real, freshly-created vault.
  it('ingestWikiPages succeeds with zero pages for a real, empty vault root', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    const emptyRoot = await mkdtemp(path.join(os.tmpdir(), 'unite-wiki-empty-'))
    tempRoots.push(emptyRoot)

    const result = await ingestWikiPages({
      wikiRoot: emptyRoot,
      supabase: { from } as never,
      dryRun: true,
      limit: 5,
    })

    expect(result.upserted).toBe(0)
    expect(result.scanned).toBe(0)
    expect(result.failed).toBe(0)
    expect(from).not.toHaveBeenCalled()
  })
})
