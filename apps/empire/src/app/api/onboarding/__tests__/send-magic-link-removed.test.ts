// UNI-3256: POST /api/onboarding/send-magic-link was anonymous, mailed any
// address it was given, and put an unsigned token in the link. The route was
// removed rather than repaired. This guard fails if it, or its rate-limit
// preset, comes back.
import fs from 'fs';
import path from 'path';
import { RATE_LIMITS } from '@/lib/ratelimit';

const routeDir = path.join(__dirname, '..', 'send-magic-link');

describe('UNI-3256: anonymous send-magic-link route stays removed', () => {
  it('has no route module under api/onboarding/send-magic-link', () => {
    // Any route.* file (ts, tsx, js, jsx, mjs, ...) would make Next.js serve it.
    const routeFiles = fs.existsSync(routeDir)
      ? fs.readdirSync(routeDir).filter((f) => /^route\./.test(f))
      : [];
    expect(routeFiles).toEqual([]);
  });

  it('has no onboardingMagicLink rate-limit preset left behind', () => {
    expect(Object.keys(RATE_LIMITS)).not.toContain('onboardingMagicLink');
  });
});
