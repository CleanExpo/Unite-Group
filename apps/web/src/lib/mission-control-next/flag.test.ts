import { describe, it, expect } from 'vitest';
import { isMissionControlNextEnabled } from './flag';

describe('isMissionControlNextEnabled — ships dark', () => {
  it('is OFF by default (unset)', () => {
    expect(isMissionControlNextEnabled({})).toBe(false);
  });

  it('is ON only for the literal "true"', () => {
    expect(isMissionControlNextEnabled({ MISSION_CONTROL_VNEXT_PREVIEW: 'true' })).toBe(true);
  });

  it('is OFF for truthy-looking non-"true" values', () => {
    for (const v of ['1', 'TRUE', 'yes', 'on', '', 'false', ' true']) {
      expect(isMissionControlNextEnabled({ MISSION_CONTROL_VNEXT_PREVIEW: v })).toBe(false);
    }
  });
});
