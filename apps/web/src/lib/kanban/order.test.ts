import { describe, it, expect } from 'vitest';

import {
  positionForIndex,
  needsRebalance,
  rebalance,
  adjacentStatus,
} from './order';

describe('kanban fractional ordering', () => {
  it('first card in an empty column gets a base position', () => {
    expect(positionForIndex([], 0)).toBe(1000);
  });

  it('inserting at the top goes before the first card', () => {
    expect(positionForIndex([1000, 2000], 0)).toBeLessThan(1000);
  });

  it('inserting at the end goes after the last card', () => {
    expect(positionForIndex([1000, 2000], 2)).toBeGreaterThan(2000);
  });

  it('inserting in the middle takes the midpoint (no reindexing)', () => {
    expect(positionForIndex([1000, 2000], 1)).toBe(1500);
  });

  it('clamps an out-of-range index', () => {
    expect(positionForIndex([1000], 99)).toBeGreaterThan(1000);
    expect(positionForIndex([1000], -5)).toBeLessThan(1000);
  });

  it('a repeatedly-split column preserves order and eventually flags rebalance', () => {
    let positions = [1000, 2000];
    for (let i = 0; i < 40; i++) {
      const mid = positionForIndex(positions, 1);
      positions = [positions[0], mid, positions[1]].sort((a, b) => a - b);
    }
    // order preserved (strictly ascending)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
    expect(needsRebalance(positions)).toBe(true);
  });

  it('adjacentStatus steps across the columns and stops at the ends', () => {
    expect(adjacentStatus('todo', 'next')).toBe('in-progress');
    expect(adjacentStatus('in-progress', 'prev')).toBe('todo');
    expect(adjacentStatus('done', 'next')).toBeNull();
    expect(adjacentStatus('todo', 'prev')).toBeNull();
  });

  it('rebalance re-spaces evenly while preserving order', () => {
    const cards = [
      { id: 'c', position: 1500.0001 },
      { id: 'a', position: 1000 },
      { id: 'b', position: 1500 },
    ];
    const out = rebalance(cards);
    expect(out).toEqual({ a: 1000, b: 2000, c: 3000 });
  });
});
