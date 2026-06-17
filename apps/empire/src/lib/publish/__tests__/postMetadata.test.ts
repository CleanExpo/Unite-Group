import {
  buildUtmUrl,
  buildOpenGraphTags,
  buildSocialPostingJsonLd,
  formatCaptionForPlatform,
  assertAltText,
} from '../postMetadata';
import { PLATFORM_MEDIA_SPECS } from '../platformMediaSpecs';

// ---------------------------------------------------------------------------
// buildUtmUrl
// ---------------------------------------------------------------------------

describe('buildUtmUrl', () => {
  const params = {
    source: 'newsletter',
    medium: 'email',
    campaign: 'spring_launch',
  };

  it('appends utm_* params to a clean url', () => {
    const out = buildUtmUrl('https://example.com/post', params);
    const u = new URL(out);
    expect(u.searchParams.get('utm_source')).toBe('newsletter');
    expect(u.searchParams.get('utm_medium')).toBe('email');
    expect(u.searchParams.get('utm_campaign')).toBe('spring_launch');
    expect(u.pathname).toBe('/post');
  });

  it('preserves an existing query string and adds utm params', () => {
    const out = buildUtmUrl('https://example.com/post?ref=abc&page=2', params);
    const u = new URL(out);
    expect(u.searchParams.get('ref')).toBe('abc');
    expect(u.searchParams.get('page')).toBe('2');
    expect(u.searchParams.get('utm_source')).toBe('newsletter');
  });

  it('preserves a fragment and keeps utm params before it', () => {
    const out = buildUtmUrl('https://example.com/post#section-3', params);
    expect(out).toContain('utm_source=newsletter');
    expect(out).toContain('#section-3');
    // Query must come before the fragment.
    expect(out.indexOf('utm_source')).toBeLessThan(out.indexOf('#section-3'));
    expect(new URL(out).hash).toBe('#section-3');
  });

  it('preserves a fragment alongside an existing query', () => {
    const out = buildUtmUrl('https://example.com/post?ref=abc#frag', params);
    const u = new URL(out);
    expect(u.searchParams.get('ref')).toBe('abc');
    expect(u.searchParams.get('utm_source')).toBe('newsletter');
    expect(u.hash).toBe('#frag');
  });

  it('url-encodes param values', () => {
    const out = buildUtmUrl('https://example.com/post', {
      source: 'a b&c',
      medium: 'paid/social',
      campaign: 'q1 launch',
      content: 'hero=1',
    });
    // Raw string must be percent-encoded, not contain raw spaces/ampersands.
    expect(out).not.toContain('a b&c');
    expect(out).toContain('utm_source=a+b%26c');
    // But decoding round-trips to the original values.
    const u = new URL(out);
    expect(u.searchParams.get('utm_source')).toBe('a b&c');
    expect(u.searchParams.get('utm_medium')).toBe('paid/social');
    expect(u.searchParams.get('utm_campaign')).toBe('q1 launch');
    expect(u.searchParams.get('utm_content')).toBe('hero=1');
  });

  it('overrides (does not duplicate) an existing utm param', () => {
    const out = buildUtmUrl('https://example.com/post?utm_source=old&keep=1', params);
    const u = new URL(out);
    // Exactly one utm_source, with the new value.
    expect(u.searchParams.getAll('utm_source')).toEqual(['newsletter']);
    expect(u.searchParams.get('keep')).toBe('1');
  });

  it('includes optional content/term only when provided', () => {
    const withOptional = buildUtmUrl('https://example.com/p', {
      ...params,
      content: 'cta-top',
      term: 'restoration',
    });
    const u = new URL(withOptional);
    expect(u.searchParams.get('utm_content')).toBe('cta-top');
    expect(u.searchParams.get('utm_term')).toBe('restoration');

    const without = buildUtmUrl('https://example.com/p', params);
    const u2 = new URL(without);
    expect(u2.searchParams.has('utm_content')).toBe(false);
    expect(u2.searchParams.has('utm_term')).toBe(false);
  });

  it('returns the original string unchanged for an invalid url (never throws)', () => {
    expect(buildUtmUrl('not a url', params)).toBe('not a url');
    expect(buildUtmUrl('', params)).toBe('');
    expect(buildUtmUrl('/relative/path', params)).toBe('/relative/path');
  });
});

// ---------------------------------------------------------------------------
// buildOpenGraphTags
// ---------------------------------------------------------------------------

describe('buildOpenGraphTags', () => {
  const base = {
    title: 'My Post',
    description: 'A description',
    url: 'https://example.com/post',
  };

  function byProp(tags: { property: string; content: string }[], prop: string) {
    return tags.find((t) => t.property === prop)?.content;
  }

  it('emits core og tags with defaults and no image', () => {
    const tags = buildOpenGraphTags(base);
    expect(byProp(tags, 'og:title')).toBe('My Post');
    expect(byProp(tags, 'og:description')).toBe('A description');
    expect(byProp(tags, 'og:url')).toBe('https://example.com/post');
    expect(byProp(tags, 'og:type')).toBe('article');
    // No image-dependent tags.
    expect(tags.some((t) => t.property === 'og:image')).toBe(false);
    expect(tags.some((t) => t.property === 'twitter:image')).toBe(false);
    // No site_name when not supplied.
    expect(tags.some((t) => t.property === 'og:site_name')).toBe(false);
  });

  it('twitter:card is summary when there is no image', () => {
    const tags = buildOpenGraphTags(base);
    expect(byProp(tags, 'twitter:card')).toBe('summary');
  });

  it('twitter:card flips to summary_large_image when an image is present', () => {
    const tags = buildOpenGraphTags({
      ...base,
      imageUrl: 'https://cdn.example.com/img.jpg',
    });
    expect(byProp(tags, 'twitter:card')).toBe('summary_large_image');
    expect(byProp(tags, 'og:image')).toBe('https://cdn.example.com/img.jpg');
    expect(byProp(tags, 'twitter:image')).toBe('https://cdn.example.com/img.jpg');
  });

  it('emits og:site_name and a custom type when supplied', () => {
    const tags = buildOpenGraphTags({
      ...base,
      type: 'website',
      siteName: 'Unite Group',
    });
    expect(byProp(tags, 'og:type')).toBe('website');
    expect(byProp(tags, 'og:site_name')).toBe('Unite Group');
  });

  it('includes the expected twitter card tags', () => {
    const tags = buildOpenGraphTags(base);
    expect(byProp(tags, 'twitter:title')).toBe('My Post');
    expect(byProp(tags, 'twitter:description')).toBe('A description');
  });

  it('produces a deterministic tag order', () => {
    const a = buildOpenGraphTags({
      ...base,
      imageUrl: 'https://cdn.example.com/img.jpg',
      siteName: 'Unite Group',
    });
    const b = buildOpenGraphTags({
      ...base,
      imageUrl: 'https://cdn.example.com/img.jpg',
      siteName: 'Unite Group',
    });
    expect(a.map((t) => t.property)).toEqual(b.map((t) => t.property));
    expect(a.map((t) => t.property)).toEqual([
      'og:title',
      'og:description',
      'og:url',
      'og:type',
      'og:image',
      'og:site_name',
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildSocialPostingJsonLd
// ---------------------------------------------------------------------------

describe('buildSocialPostingJsonLd', () => {
  const base = {
    headline: 'Headline',
    description: 'Body',
    url: 'https://example.com/post',
  };

  it('emits a valid @context/@type and the required fields', () => {
    const jsonLd = buildSocialPostingJsonLd(base) as Record<string, unknown>;
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('SocialMediaPosting');
    expect(jsonLd.headline).toBe('Headline');
    expect(jsonLd.description).toBe('Body');
    expect(jsonLd.url).toBe('https://example.com/post');
  });

  it('omits optional fields when not provided', () => {
    const jsonLd = buildSocialPostingJsonLd(base) as Record<string, unknown>;
    expect('datePublished' in jsonLd).toBe(false);
    expect('author' in jsonLd).toBe(false);
    expect('image' in jsonLd).toBe(false);
  });

  it('includes optional fields only when provided', () => {
    const jsonLd = buildSocialPostingJsonLd({
      ...base,
      datePublished: '2026-06-17T03:00:00.000Z',
      authorName: 'Phill McGurk',
      imageUrl: 'https://cdn.example.com/img.jpg',
    }) as Record<string, unknown>;
    expect(jsonLd.datePublished).toBe('2026-06-17T03:00:00.000Z');
    expect(jsonLd.author).toEqual({ '@type': 'Person', name: 'Phill McGurk' });
    expect(jsonLd.image).toBe('https://cdn.example.com/img.jpg');
  });

  it('is deterministic and never reads the wall clock', () => {
    // No datePublished in → no datePublished out, regardless of "now".
    const realNow = Date.now;
    const realDate = global.Date;
    try {
      // Make any wall-clock read explode; the function must not touch it.
      const Boom = function () {
        throw new Error('wall clock must not be read');
      } as unknown as DateConstructor;
      Boom.now = () => {
        throw new Error('Date.now must not be read');
      };
      global.Date = Boom;

      const jsonLd = buildSocialPostingJsonLd(base) as Record<string, unknown>;
      expect('datePublished' in jsonLd).toBe(false);
    } finally {
      global.Date = realDate;
      global.Date.now = realNow;
    }
  });
});

// ---------------------------------------------------------------------------
// formatCaptionForPlatform
// ---------------------------------------------------------------------------

describe('formatCaptionForPlatform', () => {
  it('passes an under-limit caption through unchanged', () => {
    const result = formatCaptionForPlatform('instagram', 'Short and sweet', [
      'restoration',
      'cleanup',
    ]);
    expect(result.truncated).toBe(false);
    expect(result.caption).toBe('Short and sweet\n\n#restoration #cleanup');
    expect(result.includedHashtags).toEqual(['#restoration', '#cleanup']);
    expect(result.droppedHashtags).toEqual([]);
  });

  it('truncates an over-limit body so the whole caption fits a tight platform', () => {
    // Instagram caption cap is 2200 chars (a real, tight limit).
    const max = PLATFORM_MEDIA_SPECS.instagram.maxCaptionLength;
    const longBody = 'x'.repeat(max + 500);
    const result = formatCaptionForPlatform('instagram', longBody, ['tag']);
    expect(result.truncated).toBe(true);
    // The whole thing must fit — never silently exceed.
    expect(result.caption.length).toBeLessThanOrEqual(max);
    // A single ellipsis joins the truncated body to the hashtag block.
    expect((result.caption.match(/…/g) ?? []).length).toBe(1);
    expect(result.caption.endsWith('#tag')).toBe(true);
  });

  it('enforces the platform hashtag cap and reports dropped tags', () => {
    // YouTube has a real max of 15 hashtags.
    const cap = PLATFORM_MEDIA_SPECS.youtube.maxHashtags;
    expect(cap).toBe(15);
    const tags = Array.from({ length: cap + 5 }, (_, i) => `tag${i}`);
    const result = formatCaptionForPlatform('youtube', 'Body', tags);
    expect(result.includedHashtags).toHaveLength(cap);
    expect(result.droppedHashtags).toHaveLength(5);
    expect(result.includedHashtags[0]).toBe('#tag0');
    expect(result.droppedHashtags[0]).toBe(`#tag${cap}`);
  });

  it('normalises hashtags: leading #, dedupe (case-insensitive), drop empties', () => {
    const result = formatCaptionForPlatform('instagram', 'Body', [
      'restoration',
      '#restoration', // dup of above after normalisation
      '#Restoration', // case-insensitive dup
      '  spaced  ',
      '', // empty → dropped
      '###hashes', // collapse leading hashes to one
      '#', // bare hash → nothing left, dropped
    ]);
    expect(result.includedHashtags).toEqual([
      '#restoration',
      '#spaced',
      '#hashes',
    ]);
    expect(result.droppedHashtags).toEqual([]);
  });

  it('reports truncated=false and empty dropped when everything fits', () => {
    const result = formatCaptionForPlatform('linkedin', 'A post body', ['a', 'b']);
    expect(result.truncated).toBe(false);
    expect(result.droppedHashtags).toEqual([]);
    expect(result.includedHashtags).toEqual(['#a', '#b']);
  });

  it('handles a platform with a zero-hashtag cap (reddit) by dropping all tags', () => {
    expect(PLATFORM_MEDIA_SPECS.reddit.maxHashtags).toBe(0);
    const result = formatCaptionForPlatform('reddit', 'Body', ['one', 'two']);
    expect(result.includedHashtags).toEqual([]);
    expect(result.droppedHashtags).toEqual(['#one', '#two']);
    expect(result.caption).toBe('Body');
  });

  it('works with no hashtags supplied', () => {
    const result = formatCaptionForPlatform('instagram', 'Just a body');
    expect(result.caption).toBe('Just a body');
    expect(result.includedHashtags).toEqual([]);
    expect(result.droppedHashtags).toEqual([]);
    expect(result.truncated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assertAltText
// ---------------------------------------------------------------------------

describe('assertAltText', () => {
  it('is ok when alt text is present', () => {
    expect(assertAltText({ altText: 'A burst pipe under a sink' })).toEqual({
      ok: true,
    });
  });

  it('is not ok when alt text is missing', () => {
    const result = assertAltText({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/alt text/i);
    }
  });

  it('is not ok when alt text is blank or whitespace-only', () => {
    expect(assertAltText({ altText: '' }).ok).toBe(false);
    expect(assertAltText({ altText: '   ' }).ok).toBe(false);
  });
});
