/**
 * @jest-environment node
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ClientOnboardingChecklist } from '../ClientOnboardingChecklist';
import { buildClientLaunchPacket } from '@/lib/empire/client-launch-packet';

// All-false signals → telegram + linear blocked.
const PACKET = buildClientLaunchPacket(
  { id: 'c1', slug: 'restore-co', company_name: 'Restore Co', status: 'onboarding' },
  {
    telegramBotTokenPresent: false,
    telegramDestinationLinked: false,
    linearApiKeyPresent: false,
    linearTeamLinked: false,
    repoLinked: false,
    vercelLinked: false,
    supabaseLinked: false,
    railwayLinked: false,
    hermesRouteConfigured: false,
    firstPlanDrafted: false,
  },
);

describe('ClientOnboardingChecklist', () => {
  it('renders a blocked task with its exact next action', () => {
    const html = renderToStaticMarkup(<ClientOnboardingChecklist packet={PACKET} />);
    expect(html).toContain('data-status="blocked"');
    expect(html).toContain('data-task-id="telegram-destination"');
    expect(html).toContain(
      'Set TELEGRAM_BOT_TOKEN and link a chat destination for restore-co.',
    );
    // The next-action paragraph only renders for blocked tasks.
    expect(html).toContain('data-next-action');
  });

  it('embeds a SourceBadge', () => {
    const html = renderToStaticMarkup(<ClientOnboardingChecklist packet={PACKET} />);
    expect(html).toContain('data-source-mode="seed"');
  });

  it('flags approval-required tasks', () => {
    const html = renderToStaticMarkup(<ClientOnboardingChecklist packet={PACKET} />);
    expect(html).toContain('approval required');
  });

  it('renders an honest empty state when no packet is supplied', () => {
    const html = renderToStaticMarkup(<ClientOnboardingChecklist />);
    expect(html).toContain('No onboarding packet yet');
    expect(html).not.toContain('data-status=');
  });
});
