/**
 * Chip primitive tests — UNI-2060 Phase 2
 *
 * <Chip> is a pill with variants: green, coral, plum, sky, amber, red, dark, ghost, active.
 */

import { renderToString } from 'react-dom/server';
import { Chip } from '@/components/founder/ui/Chip';

describe('Chip', () => {
  it('renders label text', () => {
    const html = renderToString(<Chip>Active</Chip>);
    expect(html).toContain('Active');
  });

  const variantClassMap: Record<string, string> = {
    green: 'bg-layered-green-deep',
    coral: 'bg-layered-coral-deep',
    plum: 'bg-layered-plum-deep',
    sky: 'bg-[#38bdf8]',
    amber: 'bg-layered-amber-deep',
    red: 'bg-layered-red-deep',
    dark: 'bg-[#1e293b]',
    ghost: 'bg-transparent',
    active: 'ring-2',
  };

  Object.entries(variantClassMap).forEach(([variant, expectedClass]) => {
    it(`applies ${variant} variant class`, () => {
      const html = renderToString(<Chip variant={variant as any}>{variant}</Chip>);
      expect(html).toContain(expectedClass);
    });
  });

  it('has inline-flex layout', () => {
    const html = renderToString(<Chip>label</Chip>);
    expect(html).toContain('inline-flex');
  });

  it('has rounded-full shape (pill)', () => {
    const html = renderToString(<Chip>label</Chip>);
    expect(html).toContain('rounded-full');
  });

  it('accepts extra className', () => {
    const html = renderToString(<Chip className="extra">label</Chip>);
    expect(html).toContain('extra');
  });
});
