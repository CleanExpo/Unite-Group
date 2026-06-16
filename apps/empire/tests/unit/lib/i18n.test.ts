// Unit tests for the i18n helpers (UNI-1998 test #5).
//
// Covers the pure-logic surface of `@/i18n` (src/i18n/index.ts):
//   - locales constant + defaultLocale
//   - getBrowserLocale fallback paths
//   - getMessages fallback on bad locale
//
// The `getMessages` function uses dynamic `import('../../public/locales/...')`
// — we exercise the success path against the real public/locales/en/common.json
// (committed in repo) and the fallback path with a non-existent locale.

import {
  locales,
  defaultLocale,
  getBrowserLocale,
  getMessages,
  localeDisplayNames,
  type Locale,
} from '@/i18n';

describe('i18n constants', () => {
  test('locales is a non-empty list', () => {
    expect(Array.isArray(locales)).toBe(true);
    expect(locales.length).toBeGreaterThan(0);
  });

  test('defaultLocale is contained in locales', () => {
    expect((locales as readonly string[]).includes(defaultLocale)).toBe(true);
  });

  test('localeDisplayNames covers every locale', () => {
    for (const l of locales) {
      expect(localeDisplayNames[l]).toBeTruthy();
      expect(typeof localeDisplayNames[l]).toBe('string');
    }
  });
});

describe('getBrowserLocale', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  afterEach(() => {
    if (originalWindow === undefined) {
      // @ts-expect-error — restore SSR shape
      delete global.window;
    } else {
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  test('returns defaultLocale when window is undefined (SSR)', () => {
    // @ts-expect-error — simulate Node/SSR
    delete global.window;
    expect(getBrowserLocale()).toBe(defaultLocale);
  });

  test('returns the matching locale when navigator.language is supported', () => {
    Object.defineProperty(global, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: { language: 'es-MX' },
      configurable: true,
      writable: true,
    });
    expect(getBrowserLocale()).toBe('es' as Locale);
  });

  test('returns matching locale on bare two-letter language code', () => {
    Object.defineProperty(global, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: { language: 'fr' },
      configurable: true,
      writable: true,
    });
    expect(getBrowserLocale()).toBe('fr' as Locale);
  });

  test('falls back to defaultLocale when navigator.language is unsupported', () => {
    Object.defineProperty(global, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: { language: 'ja-JP' },
      configurable: true,
      writable: true,
    });
    expect(getBrowserLocale()).toBe(defaultLocale);
  });

  test('falls back to defaultLocale on empty language string', () => {
    Object.defineProperty(global, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: { language: '' },
      configurable: true,
      writable: true,
    });
    expect(getBrowserLocale()).toBe(defaultLocale);
  });
});

describe('getMessages', () => {
  test('loads messages for the default locale successfully', async () => {
    const messages = await getMessages(defaultLocale);
    expect(messages).toBeDefined();
    expect(typeof messages).toBe('object');
  });

  test('falls back to default locale on missing/bad locale', async () => {
    // Cast through unknown to bypass the Locale union — simulating a stale call site
    const messages = await getMessages('zh' as unknown as Locale);
    expect(messages).toBeDefined();
    // Fallback returns the defaultLocale's messages — same shape as the
    // successful default-locale load above
    const def = await getMessages(defaultLocale);
    expect(messages).toEqual(def);
  });
});
