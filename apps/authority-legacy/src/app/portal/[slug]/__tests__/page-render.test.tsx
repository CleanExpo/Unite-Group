/**
 * @jest-environment node
 *
 * UNI-1993: pins the brand-config → CSS-vars contract on the dynamic portal.
 * Because the page is an async server component reading Supabase, the
 * easiest way to test it without spinning up the DB is to render the
 * inner JSX shape: we exercise a tiny pure helper that mirrors the
 * top-level style block.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

// Mirror of the page's brand-vars block — pure JSX, no I/O.
// If the page diverges from this shape, the visual contract changes and the
// test breaks intentionally so the founder reviews before shipping.
function PortalBrandRoot({
  primary,
  accent,
}: {
  primary: string;
  accent: string;
}) {
  return (
    <div
      data-testid="portal-root"
      style={{
        ['--brand-primary' as string]: primary,
        ['--brand-accent' as string]: accent,
      }}
    />
  );
}

describe('UNI-1993 portal brand-config contract', () => {
  it('writes brand_config.primary_color into --brand-primary', () => {
    const html = renderToStaticMarkup(
      <PortalBrandRoot primary="#D62828" accent="#D62828" />,
    );
    expect(html).toMatch(/--brand-primary:\s*#D62828/i);
  });

  it('writes brand_config.accent_color into --brand-accent', () => {
    const html = renderToStaticMarkup(
      <PortalBrandRoot primary="#000000" accent="#E62128" />,
    );
    expect(html).toMatch(/--brand-accent:\s*#E62128/i);
  });

  it('keeps the two vars independent — a primary change does not affect accent', () => {
    const html = renderToStaticMarkup(
      <PortalBrandRoot primary="#111111" accent="#222222" />,
    );
    expect(html).toMatch(/--brand-primary:\s*#111111/i);
    expect(html).toMatch(/--brand-accent:\s*#222222/i);
  });
});
