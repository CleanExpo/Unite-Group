/**
 * @jest-environment node
 *
 * Daily CRM Digest read-surface contract tests.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DailyCrmDigestPanel } from '../DailyCrmDigestPanel';
import { CommandCenterShell } from '../../CommandCenterShell';

describe('DailyCrmDigestPanel', () => {
  it('renders a populated live digest with safe text-only list content', () => {
    const html = renderToStaticMarkup(
      <DailyCrmDigestPanel
        generatedAt="2026-05-26T08:30:00.000Z"
        sourceLiveAt="2026-05-26T08:35:00.000Z"
        summary={{
          leadCount: 12,
          opportunityCount: 4,
          approvalRequiredCount: 3,
          blockedTaskCount: 2,
          blockerCount: 1,
        }}
        operatorPriorities={[
          '**Call Ada** about onboarding',
          'Move Acme opportunity to proposal',
        ]}
        approvals={['Approve discount request for Globex']}
        blockers={['Missing security questionnaire from Initech']}
      />,
    );

    expect(html).toContain('Daily CRM Digest');
    expect(html).toContain('12');
    expect(html).toContain('Leads');
    expect(html).toContain('4');
    expect(html).toContain('Opportunities');
    expect(html).toContain('3');
    expect(html).toContain('Approvals');
    expect(html).toContain('2');
    expect(html).toContain('Blocked tasks');
    expect(html).toContain('1');
    expect(html).toContain('Blockers');
    expect(html).toContain('Generated');
    expect(html).toContain('2026-05-26T08:30:00.000Z');
    expect(html).toContain('data-source-mode="live"');
    expect(html).toContain('Operator priorities');
    expect(html).toContain('Board decisions');
    expect(html).toContain('Blockers');
    expect(html).toContain('**Call Ada** about onboarding');
    expect(html).not.toContain('<strong>Call Ada</strong>');
    expect(html).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders zero counts and explicit fallback copy when digest lists are empty', () => {
    const html = renderToStaticMarkup(<DailyCrmDigestPanel />);

    expect(html).toContain('Daily CRM Digest');
    expect(html).toContain('0');
    expect(html).toContain('No CRM priorities supplied for this digest window.');
    expect(html).toContain('No approval-required items supplied for this digest window.');
    expect(html).toContain('No blockers supplied for this digest window.');
    expect(html).toContain('data-source-mode="seed"');
  });

  // CommandCenterShell loads this panel with next/dynamic and ssr: false, so a server
  // render shows only its loading skeleton. This test was written against a server
  // render and had never run in CI (no apps/empire job until 05/11/2026). The two tests
  // below keep its purpose: the shell passes dailyDigestInitial to the panel.
  const digestInitial = {
    sourceLiveAt: '2026-05-26T08:35:00.000Z',
    summary: { leadCount: 7 },
    operatorPriorities: ['Follow up with Oceanic'],
  };

  it('CommandCenterShell server render shows the digest loading skeleton, not the client-only panel', () => {
    const html = renderToStaticMarkup(
      <CommandCenterShell locale="en" dailyDigestInitial={digestInitial} />,
    );

    expect(html).toContain('command-center-side-rail');
    expect(html).not.toContain('Daily CRM Digest');
  });

  it('CommandCenterShell passes dailyDigestInitial to the digest panel in the side rail', () => {
    let html = '';
    jest.isolateModules(() => {
      // Replace the lazy loader with the real panel, for this test only. The shell has
      // exactly one dynamic() call, the digest panel.
      jest.doMock('next/dynamic', () => ({
        __esModule: true,
        default: () => jest.requireActual('../DailyCrmDigestPanel').DailyCrmDigestPanel,
      }));
      // Renderer from the same isolated module set, so it shares one React with the shell.
      const { renderToStaticMarkup: render } = require('react-dom/server');
      const { CommandCenterShell: EagerShell } = require('../../CommandCenterShell');
      html = render(<EagerShell locale="en" dailyDigestInitial={digestInitial} />);
    });

    const rail = html.slice(html.indexOf('command-center-side-rail'));
    expect(rail).toContain('Daily CRM Digest');
    expect(rail).toContain('Follow up with Oceanic');
    expect(rail).toContain('7');
    expect(rail).toContain('data-source-mode="live"');
  });
});
