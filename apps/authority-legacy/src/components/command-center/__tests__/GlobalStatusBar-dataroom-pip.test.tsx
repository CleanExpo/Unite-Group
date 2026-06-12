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

  it('wraps the pip in a next/link to /en/empire/data-room by default', () => {
    const html = renderToStaticMarkup(
      <GlobalStatusBar dataRoomHealth="stale" />,
    );
    expect(html).toMatch(/href="\/en\/empire\/data-room"/);
    expect(html).toMatch(/data-data-room-pip-link/);
  });

  it('honours the active locale on the DataRoom pip href (UNI-2025)', () => {
    // Without this, a /fr/ founder clicking the pip lands on /en/.
    const html = renderToStaticMarkup(
      <GlobalStatusBar locale="fr" dataRoomHealth="ok" />,
    );
    expect(html).toMatch(/href="\/fr\/empire\/data-room"/);
    expect(html).not.toMatch(/href="\/en\/empire\/data-room"/);
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
