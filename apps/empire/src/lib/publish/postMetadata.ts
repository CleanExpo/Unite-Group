/**
 * Deterministic post metadata / SEO layer (Synthex publishing engine — see
 * docs/specs/synthex-publishing-engine-spec.md, Phase 4).
 *
 * Why this exists: every published post must carry platform-correct captions +
 * hashtags, and every shared link must carry Open Graph + schema.org markup +
 * UTM attribution so the agency can attribute traffic and surfaces render rich
 * previews. This module is the DETERMINISTIC half of that requirement — pure
 * functions over plain inputs. There is no AI here: caption *generation* is a
 * separate, approval-gated concern and is intentionally out of scope. No IO, no
 * DB, no network, no secrets — tenancy-independent and never throws on bad
 * input (it returns a sane value instead).
 *
 * Per-platform caption-length and max-hashtag limits are reused from the
 * canonical spec table in `platformMediaSpecs` (`PLATFORM_MEDIA_SPECS`) so the
 * two surfaces never drift.
 */

import { PLATFORM_MEDIA_SPECS, type PlatformId } from './platformMediaSpecs';

// ---------------------------------------------------------------------------
// UTM attribution
// ---------------------------------------------------------------------------

/** The UTM parameters appended to a shared link. */
export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

/**
 * Append `utm_*` query params to a URL. Correctly handles a URL that already
 * has a query string or a fragment, URL-encodes values (via `URLSearchParams`),
 * and overrides — never duplicates — an existing `utm_*` param. Returns the
 * original string unchanged if the URL is invalid (never throws).
 *
 * Pure: no IO, no clock, no network.
 */
export function buildUtmUrl(url: string, params: UtmParams): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Invalid (e.g. relative or malformed) URL — return unchanged, don't throw.
    return url;
  }

  // Ordered so the resulting query string is deterministic.
  const utm: Array<[string, string | undefined]> = [
    ['utm_source', params.source],
    ['utm_medium', params.medium],
    ['utm_campaign', params.campaign],
    ['utm_content', params.content],
    ['utm_term', params.term],
  ];

  const search = parsed.searchParams;
  for (const [key, value] of utm) {
    if (value === undefined) continue;
    // `set` overrides any existing value for this key (no duplication) and
    // URL-encodes on serialisation.
    search.set(key, value);
  }

  // `parsed.search` reflects the mutated params; the fragment is preserved by
  // `URL` serialisation, so query-before-fragment ordering is correct.
  return parsed.toString();
}

// ---------------------------------------------------------------------------
// Open Graph + Twitter card tags
// ---------------------------------------------------------------------------

/** A single meta tag as a `property` / `content` pair. */
export interface MetaTag {
  property: string;
  content: string;
}

/** Input for {@link buildOpenGraphTags}. */
export interface OpenGraphInput {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  /** Open Graph object type; defaults to 'article'. */
  type?: string;
  siteName?: string;
}

/**
 * Build Open Graph + Twitter card meta tags in a deterministic order:
 * og:title, og:description, og:url, og:type, [og:image], [og:site_name],
 * twitter:card, twitter:title, twitter:description, [twitter:image].
 *
 * `og:image` / `twitter:image` are emitted only when an image is supplied, and
 * `twitter:card` is 'summary_large_image' when an image is present, else
 * 'summary'. Pure: no IO.
 */
export function buildOpenGraphTags(input: OpenGraphInput): MetaTag[] {
  const hasImage = typeof input.imageUrl === 'string' && input.imageUrl.length > 0;
  const tags: MetaTag[] = [
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:url', content: input.url },
    { property: 'og:type', content: input.type ?? 'article' },
  ];

  if (hasImage) {
    tags.push({ property: 'og:image', content: input.imageUrl as string });
  }
  if (typeof input.siteName === 'string' && input.siteName.length > 0) {
    tags.push({ property: 'og:site_name', content: input.siteName });
  }

  tags.push({
    property: 'twitter:card',
    content: hasImage ? 'summary_large_image' : 'summary',
  });
  tags.push({ property: 'twitter:title', content: input.title });
  tags.push({ property: 'twitter:description', content: input.description });
  if (hasImage) {
    tags.push({ property: 'twitter:image', content: input.imageUrl as string });
  }

  return tags;
}

// ---------------------------------------------------------------------------
// schema.org JSON-LD (SocialMediaPosting)
// ---------------------------------------------------------------------------

/** Input for {@link buildSocialPostingJsonLd}. */
export interface SocialPostingInput {
  headline: string;
  description: string;
  url: string;
  /** ISO 8601 date string. Passed IN — this function never reads the clock. */
  datePublished?: string;
  authorName?: string;
  imageUrl?: string;
}

/** A schema.org Person node. */
interface PersonNode {
  '@type': 'Person';
  name: string;
}

/** A schema.org SocialMediaPosting JSON-LD node. */
export interface SocialMediaPostingJsonLd {
  '@context': 'https://schema.org';
  '@type': 'SocialMediaPosting';
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  author?: PersonNode;
  image?: string;
}

/**
 * Build a valid schema.org `SocialMediaPosting` JSON-LD object. Optional fields
 * (datePublished / author / image) are included ONLY when provided. Pure: the
 * publish date is passed in, never read from the wall clock, so output is fully
 * deterministic for a given input.
 */
export function buildSocialPostingJsonLd(
  input: SocialPostingInput
): SocialMediaPostingJsonLd {
  const jsonLd: SocialMediaPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: input.headline,
    description: input.description,
    url: input.url,
  };

  if (typeof input.datePublished === 'string' && input.datePublished.length > 0) {
    jsonLd.datePublished = input.datePublished;
  }
  if (typeof input.authorName === 'string' && input.authorName.length > 0) {
    jsonLd.author = { '@type': 'Person', name: input.authorName };
  }
  if (typeof input.imageUrl === 'string' && input.imageUrl.length > 0) {
    jsonLd.image = input.imageUrl;
  }

  return jsonLd;
}

// ---------------------------------------------------------------------------
// Caption + hashtag formatting
// ---------------------------------------------------------------------------

/** The outcome of formatting a caption for a platform. */
export interface FormattedCaption {
  /** The final caption text (body + appended hashtags), guaranteed to fit. */
  caption: string;
  /** True if the body was truncated to fit the platform's caption limit. */
  truncated: boolean;
  /** Hashtags that made it into the final caption, normalised, in order. */
  includedHashtags: string[];
  /** Hashtags dropped (over the platform's max-hashtag cap), in order. */
  droppedHashtags: string[];
}

/** The single ellipsis character appended when a body is truncated. */
const ELLIPSIS = '…';

/**
 * Normalise a list of raw hashtag tokens:
 *  - trim whitespace and drop empties,
 *  - strip leading '#' chars then re-add exactly one,
 *  - dedupe case-insensitively, preserving first-seen order.
 */
function normaliseHashtags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of raw) {
    if (typeof token !== 'string') continue;
    const trimmed = token.trim();
    if (trimmed.length === 0) continue;
    // Strip any leading '#' (and surrounding whitespace) then re-add one.
    const bare = trimmed.replace(/^#+/, '').trim();
    if (bare.length === 0) continue;
    const tag = `#${bare}`;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/**
 * Build the final caption for a platform: normalise + cap hashtags at the
 * platform's max, append them after the body, and if the combined length
 * exceeds the platform's caption max, truncate the BODY (with a single ellipsis
 * char) so the whole thing fits — never silently exceeding the limit. Reports
 * whether truncation occurred and which hashtags were included vs dropped.
 *
 * Honest by construction: an unknown platform yields the caption + normalised
 * hashtags untouched (no fabricated limit), with nothing dropped or truncated.
 * Pure: no IO, never throws.
 */
export function formatCaptionForPlatform(
  platform: PlatformId,
  caption: string,
  hashtags?: string[]
): FormattedCaption {
  const body = typeof caption === 'string' ? caption : '';
  const normalised = normaliseHashtags(Array.isArray(hashtags) ? hashtags : []);

  const spec = PLATFORM_MEDIA_SPECS[platform];
  if (spec === undefined) {
    // Unknown platform: no fabricated limit. Return body + all hashtags as-is.
    const joined = normalised.length > 0 ? `${body}\n\n${normalised.join(' ')}` : body;
    return {
      caption: joined,
      truncated: false,
      includedHashtags: normalised,
      droppedHashtags: [],
    };
  }

  const maxCaption = spec.maxCaptionLength;
  const maxHashtags = spec.maxHashtags;

  const includedHashtags = normalised.slice(0, Math.max(0, maxHashtags));
  const droppedHashtags = normalised.slice(Math.max(0, maxHashtags));

  // The hashtag block (with its separator) is appended verbatim and must always
  // fit; only the body is truncated to make room.
  const tagBlock = includedHashtags.length > 0 ? includedHashtags.join(' ') : '';
  const separator = tagBlock.length > 0 ? '\n\n' : '';
  const suffix = `${separator}${tagBlock}`;

  const full = `${body}${suffix}`;
  if (full.length <= maxCaption) {
    return {
      caption: full,
      truncated: false,
      includedHashtags,
      droppedHashtags,
    };
  }

  // Over the limit — truncate the body so body + ellipsis + suffix == maxCaption.
  // Budget left for the body (and its ellipsis) after reserving the suffix.
  const budget = maxCaption - suffix.length;

  if (budget <= 0) {
    // Pathological: the suffix alone meets/exceeds the limit. Keep the suffix
    // trimmed to the limit and drop the body entirely — never exceed.
    return {
      caption: suffix.slice(0, maxCaption),
      truncated: true,
      includedHashtags,
      droppedHashtags,
    };
  }

  // Reserve one char for the ellipsis where there's room for it.
  const bodyBudget = budget > 0 ? budget - 1 : 0;
  const truncatedBody =
    bodyBudget > 0 ? `${body.slice(0, bodyBudget)}${ELLIPSIS}` : ELLIPSIS.slice(0, budget);

  return {
    caption: `${truncatedBody}${suffix}`,
    truncated: true,
    includedHashtags,
    droppedHashtags,
  };
}

// ---------------------------------------------------------------------------
// Alt-text accessibility gate
// ---------------------------------------------------------------------------

/** Result of an alt-text check: a discriminated union the caller can branch on. */
export type AltTextResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Assert that a media descriptor carries alt text. Alt text is REQUIRED for
 * accessibility, so a missing or blank value is not ok with a clear reason. The
 * CALLER decides whether to block or merely warn. Pure: never throws.
 */
export function assertAltText(media: { altText?: string }): AltTextResult {
  const alt = media?.altText;
  if (typeof alt !== 'string' || alt.trim().length === 0) {
    return {
      ok: false,
      reason: 'alt text is required for accessibility but is missing or blank',
    };
  }
  return { ok: true };
}
