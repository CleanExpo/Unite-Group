import { describe, it, expect } from 'vitest';
import { chunkCorpus } from './corpus';

describe('chunkCorpus', () => {
  it('returns nothing for empty input', () => {
    expect(chunkCorpus('')).toEqual([]);
    expect(chunkCorpus('   \n\n  ')).toEqual([]);
  });

  it('keeps short content as a single chunk', () => {
    const out = chunkCorpus('We are a plumber in Maui.\n\nOpen 24/7.');
    expect(out).toHaveLength(1);
    expect(out[0].index).toBe(0);
  });

  it('splits long content into multiple bounded chunks', () => {
    const para = 'x'.repeat(300);
    const text = Array.from({ length: 6 }, () => para).join('\n\n');
    const out = chunkCorpus(text, 800);
    expect(out.length).toBeGreaterThan(1);
    // indexes are sequential from 0
    out.forEach((c, i) => expect(c.index).toBe(i));
  });

  it('is deterministic', () => {
    const text = 'a\n\nb\n\nc'.repeat(50);
    expect(chunkCorpus(text)).toEqual(chunkCorpus(text));
  });
});
