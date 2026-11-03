import type { ChangePage } from './types'

// The seam between an approved change request and the owner's real website.
//
// Only the in-memory stub below exists in this PR. It never touches the network: no Vercel, no GitHub, no site repo.
// The real BRII publisher (static build.py site, Vercel project unite-group/brii-website) implements this same
// interface later, and its first production publish waits for Phill's approval. See the PR body.

export type PublishableRequest = { id: string; tenantSlug: string; page: ChangePage; requestText: string }

export interface SitePublisher {
  /** Build a preview of the change and return where the owner can look at it. Calling it again replaces the preview. */
  createPreview(request: PublishableRequest): Promise<{ previewUrl: string }>
  /** Put the previewed change live. Only valid after createPreview. Publishing twice is a no-op. */
  publish(requestId: string): Promise<{ publishedAt: string }>
  /** Undo a published change. Only valid after publish. Rolling back twice is a no-op. */
  rollback(requestId: string): Promise<{ rolledBackAt: string }>
}

export class PublisherError extends Error {
  constructor(public readonly code: 'unknown_request' | 'no_preview' | 'not_published' | 'rolled_back') {
    super(code)
    this.name = 'PublisherError'
  }
}

type Entry = { request: PublishableRequest; previewUrl: string; publishedAt: string | null; rolledBackAt: string | null }

/**
 * Stub publisher for tests and local screens. Preview links use the reserved ".invalid" top-level domain (RFC 2606),
 * so a stub link can never open a real site.
 */
export class InMemorySitePublisher implements SitePublisher {
  private readonly entries = new Map<string, Entry>()

  constructor(private readonly now: () => Date = () => new Date()) {}

  async createPreview(request: PublishableRequest): Promise<{ previewUrl: string }> {
    const existing = this.entries.get(request.id)
    if (existing?.rolledBackAt) throw new PublisherError('rolled_back')
    const previewUrl = `https://preview.invalid/${encodeURIComponent(request.tenantSlug)}/${encodeURIComponent(request.id)}`
    this.entries.set(request.id, { request, previewUrl, publishedAt: existing?.publishedAt ?? null, rolledBackAt: null })
    return { previewUrl }
  }

  async publish(requestId: string): Promise<{ publishedAt: string }> {
    const entry = this.entries.get(requestId)
    if (!entry) throw new PublisherError('no_preview')
    if (entry.rolledBackAt) throw new PublisherError('rolled_back')
    if (!entry.publishedAt) entry.publishedAt = this.now().toISOString()
    return { publishedAt: entry.publishedAt }
  }

  async rollback(requestId: string): Promise<{ rolledBackAt: string }> {
    const entry = this.entries.get(requestId)
    if (!entry) throw new PublisherError('unknown_request')
    if (!entry.publishedAt) throw new PublisherError('not_published')
    if (!entry.rolledBackAt) entry.rolledBackAt = this.now().toISOString()
    return { rolledBackAt: entry.rolledBackAt }
  }
}
