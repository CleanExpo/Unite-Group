/**
 * Layered Design Token Tests — UNI-2059 Phase 1
 *
 * These tests verify that the `.theme-layered` CSS token block compiles
 * and that Tailwind utilities resolve correctly.
 *
 * Because globals.css is imported as an empty module in Jest
 * (see tests/__mocks__/style.js), we tokenise the raw CSS file on disk and
 * assert structural correctness.  The build-level verification is the
 * `tsc --noEmit` husky hook.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('.theme-layered token system', () => {
  const cssPath = resolve(__dirname, '../../../src/app/globals.css');
  let css: string;

  beforeAll(() => {
    css = readFileSync(cssPath, 'utf-8');
  });

  it('defines a .theme-layered scope block', () => {
    expect(css).toMatch(/\.theme-layered\s*\{/);
  });

  describe('surface stack', () => {
    it('has --layered-surface-canvas', () => {
      expect(css).toMatch(/--layered-surface-canvas\s*:\s*oklch\(/);
    });
    it('has --layered-surface-sidebar', () => {
      expect(css).toMatch(/--layered-surface-sidebar\s*:\s*oklch\(/);
    });
    it('has --layered-surface-card', () => {
      expect(css).toMatch(/--layered-surface-card\s*:\s*oklch\(/);
    });
    it('has --layered-surface-elevated', () => {
      expect(css).toMatch(/--layered-surface-elevated\s*:\s*oklch\(/);
    });
  });

  describe('text ink', () => {
    it('uses navy #162D5B for primary text', () => {
      expect(css).toMatch(/--layered-text-primary\s*:\s*#162D5B/);
    });
    it('has secondary, muted, faint variants', () => {
      expect(css).toMatch(/--layered-text-secondary/);
      expect(css).toMatch(/--layered-text-muted/);
      expect(css).toMatch(/--layered-text-faint/);
    });
  });

  describe('brand colours', () => {
    it('navy #162D5B', () => {
      expect(css).toMatch(/--layered-brand-navy\s*:\s*#162D5B/);
    });
    it('teal #2BA3B5', () => {
      expect(css).toMatch(/--layered-brand-teal\s*:\s*#2BA3B5/);
    });
    it('slate', () => {
      expect(css).toMatch(/--layered-brand-slate/);
    });
  });

  describe('status chips', () => {
    it('has green (deep + soft)', () => {
      expect(css).toMatch(/--layered-status-green-deep/);
      expect(css).toMatch(/--layered-status-green-soft/);
    });
    it('has coral (deep + soft)', () => {
      expect(css).toMatch(/--layered-status-coral-deep/);
      expect(css).toMatch(/--layered-status-coral-soft/);
    });
    it('has plum (deep + soft)', () => {
      expect(css).toMatch(/--layered-status-plum-deep/);
      expect(css).toMatch(/--layered-status-plum-soft/);
    });
    it('has amber (deep + soft)', () => {
      expect(css).toMatch(/--layered-status-amber-deep/);
      expect(css).toMatch(/--layered-status-amber-soft/);
    });
    it('has red (deep + soft)', () => {
      expect(css).toMatch(/--layered-status-red-deep/);
      expect(css).toMatch(/--layered-status-red-soft/);
    });
  });

  describe('radii', () => {
    it('has 10 / 16 / 22 / 28 px', () => {
      expect(css).toMatch(/--layered-radius-card\s*:\s*10px/);
      expect(css).toMatch(/--layered-radius-panel\s*:\s*16px/);
      expect(css).toMatch(/--layered-radius-tile\s*:\s*22px/);
      expect(css).toMatch(/--layered-radius-page\s*:\s*28px/);
    });
  });

  describe('shadows (3-layer OKLCH stacks)', () => {
    it('has shadow-1 (card)', () => {
      expect(css).toMatch(/--layered-shadow-1/);
    });
    it('has shadow-2 (panel)', () => {
      expect(css).toMatch(/--layered-shadow-2/);
    });
    it('has shadow-3 (elevated)', () => {
      expect(css).toMatch(/--layered-shadow-3/);
    });
    /* Shadows must use OKLCH — assert the string contains oklch() tokens  */
    it('shadows reference oklch', () => {
      const layeredBlock = extractBlock(css, '.theme-layered');
      const shadowKeys = ['--layered-shadow-1', '--layered-shadow-2', '--layered-shadow-3'];
      for (const key of shadowKeys) {
        const decl = findDeclaration(layeredBlock, key);
        expect(decl).toMatch(/oklch\(/);
      }
    });
  });

  describe('typography', () => {
    it('has --layered-font-primary', () => {
      expect(css).toMatch(/--layered-font-primary/);
    });
    it('has --layered-font-mono', () => {
      expect(css).toMatch(/--layered-font-mono/);
    });
  });

  describe('line tokens', () => {
    it('has --layered-line and --layered-line-strong', () => {
      expect(css).toMatch(/--layered-line/);
      expect(css).toMatch(/--layered-line-strong/);
    });
  });
});

/* tailwind.config.ts tests — verify utilities are registered  */
describe('tailwind.config.ts layered utilities', () => {
  let configSource: string;

  beforeAll(() => {
    const configPath = resolve(__dirname, '../../../tailwind.config.ts');
    configSource = readFileSync(configPath, 'utf-8');
  });

  it('exposes a layered color palette', () => {
    expect(configSource).toMatch(/layered-canvas/);
    expect(configSource).toMatch(/layered-sidebar/);
    expect(configSource).toMatch(/layered-card/);
    expect(configSource).toMatch(/layered-elevated/);
  });

  it('exposes layered text colours', () => {
    expect(configSource).toMatch(/layered-text-primary/);
    expect(configSource).toMatch(/layered-text-secondary/);
  });

  it('exposes layered brand colours', () => {
    expect(configSource).toMatch(/layered-navy/);
    expect(configSource).toMatch(/layered-teal/);
  });

  it('exposes layered status chip colours', () => {
    expect(configSource).toMatch(/layered-green-deep/);
    expect(configSource).toMatch(/layered-green-soft/);
    expect(configSource).toMatch(/layered-coral-deep/);
    expect(configSource).toMatch(/layered-red-deep/);
  });

  it('exposes layered radii', () => {
    expect(configSource).toMatch(/layered-card/);
    expect(configSource).toMatch(/layered-panel/);
    expect(configSource).toMatch(/layered-tile/);
    expect(configSource).toMatch(/layered-page/);
  });

  it('exposes layered shadows', () => {
    expect(configSource).toMatch(/layered-1/);
    expect(configSource).toMatch(/layered-2/);
    expect(configSource).toMatch(/layered-3/);
  });

  it('exposes layered font families', () => {
    expect(configSource).toMatch(/layered-display/);
    expect(configSource).toMatch(/layered-mono/);
  });
});

/* ── helpers ─────────────────────────────────────────────── */

function extractBlock(source: string, selector: string): string {
  const regex = new RegExp(selector.replace(/\./g, '\\.') + '\\s*\\{([^]*?)\\n\\}', 'm');
  const match = source.match(regex);
  return match ? match[1] : '';
}

function findDeclaration(block: string, prop: string): string {
  const regex = new RegExp(prop + '\\s*:\\s*([^;]+);');
  const match = block.match(regex);
  return match ? match[1] : '';
}
