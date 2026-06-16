import {
  computeClientReadinessSignals,
  type ClientReadinessRow,
} from '../client-onboarding-readiness';

const ROW: ClientReadinessRow = { slug: 'restore-co' };

describe('computeClientReadinessSignals (UNI-2148)', () => {
  it('reports env presence as booleans, never the value', () => {
    const signals = computeClientReadinessSignals(ROW, {
      TELEGRAM_BOT_TOKEN: 'super-secret-value',
      LINEAR_API_KEY: 'lin_xxx',
    });
    expect(signals.telegramBotTokenPresent).toBe(true);
    expect(signals.linearApiKeyPresent).toBe(true);
    // The returned object is booleans-only — no secret value leaks through.
    expect(JSON.stringify(signals)).not.toContain('super-secret-value');
    expect(JSON.stringify(signals)).not.toContain('lin_xxx');
  });

  it('treats empty-string and absent env vars as not present', () => {
    const signals = computeClientReadinessSignals(ROW, {
      TELEGRAM_BOT_TOKEN: '',
      // LINEAR_API_KEY absent
    });
    expect(signals.telegramBotTokenPresent).toBe(false);
    expect(signals.linearApiKeyPresent).toBe(false);
  });

  it('derives linearTeamLinked from the existing linear_project_id column', () => {
    expect(
      computeClientReadinessSignals(
        { slug: 'restore-co', linear_project_id: 'proj_123' },
        {},
      ).linearTeamLinked,
    ).toBe(true);
    expect(
      computeClientReadinessSignals(
        { slug: 'restore-co', linear_project_id: null },
        {},
      ).linearTeamLinked,
    ).toBe(false);
  });

  it('marks firstPlanDrafted true once brand_config or portal_content has content', () => {
    expect(
      computeClientReadinessSignals(
        { slug: 'restore-co', portal_content: { hero: 'x' } },
        {},
      ).firstPlanDrafted,
    ).toBe(true);
    expect(
      computeClientReadinessSignals(
        { slug: 'restore-co', brand_config: {}, portal_content: {} },
        {},
      ).firstPlanDrafted,
    ).toBe(false);
  });

  it('reports provider-link signals not present on nexus_clients as false (honest)', () => {
    const signals = computeClientReadinessSignals(ROW, {});
    expect(signals.repoLinked).toBe(false);
    expect(signals.vercelLinked).toBe(false);
    expect(signals.supabaseLinked).toBe(false);
    expect(signals.railwayLinked).toBe(false);
    expect(signals.hermesRouteConfigured).toBe(false);
    expect(signals.telegramDestinationLinked).toBe(false);
  });
});
