import { describe, it, expect } from 'vitest';
import { retrieveContext } from './retrieve';
import type { CorpusChunk } from '../aiw/corpus';

const chunks: CorpusChunk[] = [
  { index: 0, text: 'We provide water damage restoration and flood cleanup services.' },
  { index: 1, text: 'Our opening hours are 9am to 5pm, Monday to Friday.' },
  { index: 2, text: 'We also handle mould remediation after water damage.' },
];

describe('retrieveContext', () => {
  it('returns the most relevant chunks for a query', () => {
    const out = retrieveContext('water damage help', chunks, 2);
    expect(out.map((c) => c.index)).toEqual([0, 2]); // both mention water/damage; 0 scores higher
  });

  it('returns nothing when no terms overlap', () => {
    expect(retrieveContext('pricing invoice', chunks)).toEqual([]);
  });

  it('returns nothing for empty query or empty corpus', () => {
    expect(retrieveContext('', chunks)).toEqual([]);
    expect(retrieveContext('water', [])).toEqual([]);
  });

  it('is deterministic', () => {
    expect(retrieveContext('water damage', chunks)).toEqual(retrieveContext('water damage', chunks));
  });
});
