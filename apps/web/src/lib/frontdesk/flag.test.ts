import { describe, it, expect } from 'vitest';
import { isFrontDeskEnabled } from './flag';

describe('isFrontDeskEnabled — ships dark', () => {
  it('is OFF by default (unset)', () => {
    expect(isFrontDeskEnabled({})).toBe(false);
  });

  it('is ON only for the literal "true"', () => {
    expect(isFrontDeskEnabled({ UNITE_FRONT_DESK_ENABLED: 'true' })).toBe(true);
  });

  it('is OFF for truthy-looking non-"true" values', () => {
    for (const v of ['1', 'TRUE', 'yes', 'on', '', 'false']) {
      expect(isFrontDeskEnabled({ UNITE_FRONT_DESK_ENABLED: v })).toBe(false);
    }
  });
});
