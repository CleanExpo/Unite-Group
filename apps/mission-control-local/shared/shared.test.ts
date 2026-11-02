import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAge } from './format.ts';
import { DEFAULT_LAYOUTS, GRID_COLS, parseLayoutItems } from './widget-catalogue.ts';

test('formatAge covers each unit and the missing value', () => {
  assert.equal(formatAge(null), 'never');
  assert.equal(formatAge(5_000), '5s ago');
  assert.equal(formatAge(120_000), '2m ago');
  assert.equal(formatAge(7_200_000), '2h ago');
  assert.equal(formatAge(172_800_000), '2d ago');
});

test('both default layouts pass the same validation as a saved layout', () => {
  for (const items of Object.values(DEFAULT_LAYOUTS)) {
    assert.deepEqual(parseLayoutItems(items), items);
  }
});

test('parseLayoutItems refuses bad layouts', () => {
  const box = { i: 'clock', x: 0, y: 0, w: 2, h: 2 };
  assert.equal(parseLayoutItems('nope'), null);
  assert.equal(parseLayoutItems([{ ...box, i: 'not-a-widget' }]), null);
  assert.equal(parseLayoutItems([box, box]), null);
  assert.equal(parseLayoutItems([{ ...box, x: -1 }]), null);
  assert.equal(parseLayoutItems([{ ...box, x: GRID_COLS }]), null);
  assert.equal(parseLayoutItems([{ ...box, w: 1.5 }]), null);
  assert.equal(parseLayoutItems([{ ...box, h: 0 }]), null);
});

test('parseLayoutItems drops extra fields', () => {
  const parsed = parseLayoutItems([{ i: 'clock', x: 0, y: 0, w: 2, h: 2, extra: 'x' }]);
  assert.deepEqual(parsed, [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }]);
});
