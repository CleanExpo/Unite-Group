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

  it('allows CommandCenterShell to render the digest in the side rail from dailyDigestInitial', () => {
    const html = renderToStaticMarkup(
      <CommandCenterShell
        locale="en"
        dailyDigestInitial={{
          sourceLiveAt: '2026-05-26T08:35:00.000Z',
          summary: { leadCount: 7 },
          operatorPriorities: ['Follow up with Oceanic'],
        }}
      />,
    );

    expect(html).toContain('Daily CRM Digest');
    expect(html).toContain('Follow up with Oceanic');
    expect(html).toContain('7');
    expect(html).toContain('data-source-mode="live"');
  });
});
