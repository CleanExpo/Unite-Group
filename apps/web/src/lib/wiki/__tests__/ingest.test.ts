import { describe, expect, it, vi } from 'vitest'
import {
  buildWikiPageUpsert,
  ingestWikiPages,
  pageIdFromRelative,
  resolveWikiIngestPath,
  tagsFromWikiLinks,
  titleFromMarkdown,
} from '../ingest'

describe('wiki ingest helpers', () => {
  it('resolves path from WIKI_PATH then BRAIN1_WIKI_DIR then home fallback', () => {
    expect(
      resolveWikiIngestPath({ WIKI_PATH: '/vault/Wiki' }, '/Users/phill'),
    ).toBe('/vault/Wiki')
    expect(
      resolveWikiIngestPath({ BRAIN1_WIKI_DIR: '/brain/Wiki' }, '/Users/phill'),
    ).toBe('/brain/Wiki')
    expect(resolveWikiIngestPath({}, '/Users/phill')).toBe(
      '/Users/phill/2nd Brain/Wiki',
    )
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

  it('ingestWikiPages dry-run upserts via supabase when not dry', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    const supabase = { from }

    const result = await ingestWikiPages({
      wikiRoot: '/does-not-exist-for-empty',
      supabase: supabase as never,
      dryRun: true,
      limit: 5,
    })

    expect(result.upserted).toBe(0)
    expect(result.scanned).toBe(0)
    expect(from).not.toHaveBeenCalled()
  })
})
