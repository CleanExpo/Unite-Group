/** @jest-environment node */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommandCenterShell } from '../CommandCenterShell';

describe('CommandCenterShell side rail structure', () => {
  it('renders the internal task rail header with date/time placeholder and task groups', () => {
    const html = renderToStaticMarkup(<CommandCenterShell locale="en" />);

    expect(html).toContain('Internal ops rail');
    expect(html).toMatch(/Today(?:'|&#x27;|&apos;)s task stack/);
    expect(html).toContain('Loading date');
    expect(html).toContain('AEST');
    expect(html).toContain('Voice command');
    expect(html).toContain('Portfolio pulse');
    expect(html).toContain('CRM digest');
    expect(html).toContain('Agent activity');
  });
});
