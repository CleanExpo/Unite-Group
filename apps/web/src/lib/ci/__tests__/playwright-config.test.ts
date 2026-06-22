import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCi = process.env.CI;

afterEach(() => {
  if (originalCi === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = originalCi;
  }
  vi.resetModules();
});

describe('Playwright CI browser configuration', () => {
  it('uses the hosted Chrome channel in CI so GitHub Actions does not download a managed browser', async () => {
    process.env.CI = 'true';
    vi.resetModules();

    const config = (await import('../../../../playwright.config')).default as {
      projects?: Array<{ name?: string; use?: { channel?: string } }>;
    };

    const chromiumProject = config.projects?.find((project) => project.name === 'chromium');

    expect(chromiumProject?.use?.channel).toBe('chrome');
  });
});
