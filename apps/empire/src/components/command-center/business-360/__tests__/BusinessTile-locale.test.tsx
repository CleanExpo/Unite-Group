/**
 * @jest-environment node
 *
 * Pins the locale-aware href on BusinessTile (UNI-2025 follow-up).
 *
 * PR #146 threaded `locale` from CommandCenterShell → Business360Grid → tile
 * so a /fr/ founder clicking a tile lands on /fr/empire/businesses/...
 * instead of getting dropped to /en/. SourceMatrixGrid got its own test in
 * #146; this is the matching pin for BusinessTile.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { BusinessTile } from '../BusinessTile';
import type { Business360Datum } from '../business-360-data';

const datum: Business360Datum = {
  id: 'ccw-crm',
  name: 'CCW',
  slug: 'ccw-crm',
  logoSrc: null,
  kpiLabel: 'Open tickets',
  kpiValue: 14,
  series: [9, 10, 11, 12, 13, 14],
  state: 'running',
  stateLabel: 'Test fixture',
};

describe('BusinessTile — locale-aware href', () => {
  it('defaults to /en/ when locale prop is omitted (isolated unit-test path)', () => {
    const html = renderToStaticMarkup(<BusinessTile data={datum} />);
    expect(html).toMatch(/href="\/en\/empire\/businesses\/ccw-crm"/);
  });

  it('honours the locale prop on the tile href', () => {
    // Without locale threading, a /fr/ founder clicking a tile got dropped
    // to /en/. PR #146 closed this; this test pins it against regression.
    const html = renderToStaticMarkup(
      <BusinessTile data={datum} locale="fr" />,
    );
    expect(html).toMatch(/href="\/fr\/empire\/businesses\/ccw-crm"/);
    expect(html).not.toMatch(/href="\/en\/empire\/businesses\/ccw-crm"/);
  });
});
