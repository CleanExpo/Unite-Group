// src/lib/command-centre/__tests__/wiki-graph.test.ts
// Unit tests for the wikilink → edge parser and graph builder (UNI-2304).
// Offline, pure — no Supabase, no network.
import { describe, it, expect } from 'vitest'
import { parseWikiLinks, buildWikiGraph, type WikiPageRow } from '../wiki-graph'

function page(id: string, content: string, extra: Partial<WikiPageRow> = {}): WikiPageRow {
  return { id, title: extra.title ?? id, tags: extra.tags ?? null, content, updated_at: extra.updated_at ?? null }
}

describe('parseWikiLinks', () => {
  it('extracts plain [[wikilink]] targets', () => {
    expect(parseWikiLinks('see [[alpha]] and [[beta]]')).toEqual(['alpha', 'beta'])
  })

  it('strips a |alias display label', () => {
    expect(parseWikiLinks('[[alpha|Alpha Page]]')).toEqual(['alpha'])
  })

  it('strips a #section / #^block anchor', () => {
    expect(parseWikiLinks('[[alpha#Overview]] [[beta#^ref]]')).toEqual(['alpha', 'beta'])
  })

  it('trims whitespace and skips empty targets', () => {
    expect(parseWikiLinks('[[  alpha  ]] [[]] [[|only-alias]]')).toEqual(['alpha'])
  })

  it('returns [] for empty or link-free content', () => {
    expect(parseWikiLinks('')).toEqual([])
    expect(parseWikiLinks('no links here')).toEqual([])
  })
})

describe('buildWikiGraph', () => {
  it('includes every page as a node (orphans included)', () => {
    const graph = buildWikiGraph([page('a', 'no links'), page('b', 'no links')])
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(graph.pageCount).toBe(2)
    expect(graph.edges).toEqual([])
    expect(graph.nodes.every((n) => n.degree === 0)).toBe(true)
  })

  it('resolves links case-insensitively by slug and by title', () => {
    const graph = buildWikiGraph([
      page('a', 'links to [[B]] and [[The Beta Page]]'),
      page('b', 'orphan-ish', { title: 'The Beta Page' }),
    ])
    // both [[B]] (slug case variance) and [[The Beta Page]] (title) resolve to b
    expect(graph.edges).toEqual([{ source: 'a', target: 'b' }])
  })

  it('drops unresolved links, never fabricates nodes', () => {
    const graph = buildWikiGraph([page('a', 'points at [[ghost]] which does not exist')])
    expect(graph.nodes).toHaveLength(1)
    expect(graph.edges).toEqual([])
  })

  it('drops self-links', () => {
    const graph = buildWikiGraph([page('a', 'I reference [[a]] and [[A]] myself')])
    expect(graph.edges).toEqual([])
    expect(graph.nodes[0].degree).toBe(0)
  })

  it('de-duplicates repeated directed links', () => {
    const graph = buildWikiGraph([page('a', '[[b]] [[b]] [[B]]'), page('b', '')])
    expect(graph.edges).toEqual([{ source: 'a', target: 'b' }])
  })

  it('computes undirected degree across both endpoints', () => {
    const graph = buildWikiGraph([
      page('a', '[[b]] [[c]]'),
      page('b', '[[c]]'),
      page('c', ''),
    ])
    const degree = Object.fromEntries(graph.nodes.map((n) => [n.id, n.degree]))
    expect(degree).toEqual({ a: 2, b: 2, c: 2 }) // a-b, a-c, b-c
    expect(graph.edges).toHaveLength(3)
  })

  it('resolves path-style links by basename', () => {
    const graph = buildWikiGraph([
      page('a', 'reads [[Sources/The Beta Page]]'),
      page('b', '', { title: 'The Beta Page' }),
    ])
    expect(graph.edges).toEqual([{ source: 'a', target: 'b' }])
  })

  it('reports the latest updated_at as lastSync', () => {
    const graph = buildWikiGraph([
      page('a', '', { updated_at: '2026-01-01T00:00:00.000Z' }),
      page('b', '', { updated_at: '2026-07-01T00:00:00.000Z' }),
      page('c', '', { updated_at: null }),
    ])
    expect(graph.lastSync).toBe('2026-07-01T00:00:00.000Z')
  })

  it('carries tags onto nodes and defaults null tags to []', () => {
    const graph = buildWikiGraph([page('a', '', { tags: ['x', 'y'] }), page('b', '')])
    expect(graph.nodes.find((n) => n.id === 'a')?.tags).toEqual(['x', 'y'])
    expect(graph.nodes.find((n) => n.id === 'b')?.tags).toEqual([])
  })
})
