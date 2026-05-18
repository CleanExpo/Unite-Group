/**
 * @jest-environment node
 *
 * Pins the data-room pip behaviour on GlobalStatusBar.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { GlobalStatusBar } from '../GlobalStatusBar';

describe('GlobalStatusBar — data-room pip', () => {
  it('does not render the pip when dataRoomHealth is undefined', () => {
    const html = renderToStaticMarkup(<GlobalStatusBar />);
    expect(html).not.toMatch(/Data room/);
  });

  it('renders the pip with state=ok when health is ok', () => {
    const html = renderToStaticMarkup(
      <GlobalStatusBar dataRoomHealth="ok" />,
    );
    expect(html).toMatch(/Data room/);
    expect(html).toMatch(/ok/);
  });

  it('renders signal state when data-room is stale', () => {
    const html = renderToStaticMarkup(
      <GlobalStatusBar dataRoomHealth="stale" />,
    );
    expect(html).toMatch(/Data room/);
    expect(html).toMatch(/stale/);
  });

  it('renders signal state when data-room is missing', () => {
    const html = renderToStaticMarkup(
      <GlobalStatusBar dataRoomHealth="missing" />,
    );
    expect(html).toMatch(/Data room/);
    expect(html).toMatch(/missing/);
  });
});
