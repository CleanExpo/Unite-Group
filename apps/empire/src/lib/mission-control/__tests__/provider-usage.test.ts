import { buildProviderUsage, summarizeProviderUsage } from '../provider-usage';

describe('buildProviderUsage', () => {
  it('marks unconfigured providers as blocked without exposing secret values', () => {
    const providers = buildProviderUsage({}, new Date('2026-06-16T00:00:00.000Z'));
    const openai = providers.find((provider) => provider.id === 'openai');

    expect(openai).toMatchObject({
      id: 'openai',
      state: 'blocked',
      configured: false,
      usagePct: null,
      usageSource: 'unavailable',
      lastCheckedAt: '2026-06-16T00:00:00.000Z',
    });
    expect(JSON.stringify(providers)).not.toContain('sk-');
  });

  it('uses manual usage percentage to infer near-limit and available states', () => {
    const providers = buildProviderUsage(
      {
        MISSION_CONTROL_USAGE_OPENAI_PCT: '82',
        MISSION_CONTROL_USAGE_OPENROUTER_PCT: '40%',
      },
      new Date('2026-06-16T00:00:00.000Z'),
    );

    expect(providers.find((provider) => provider.id === 'openai')).toMatchObject({
      state: 'near_limit',
      usagePct: 82,
      usageSource: 'manual',
      configured: true,
    });
    expect(providers.find((provider) => provider.id === 'openrouter')).toMatchObject({
      state: 'available',
      usagePct: 40,
      usageSource: 'manual',
      configured: true,
    });
  });

  it('summarizes provider states for Mission Control', () => {
    const providers = buildProviderUsage(
      {
        OPENAI_API_KEY: 'redacted',
        MISSION_CONTROL_USAGE_OPENROUTER_PCT: '91',
      },
      new Date('2026-06-16T00:00:00.000Z'),
    );

    const summary = summarizeProviderUsage(providers);

    expect(summary.total).toBe(5);
    expect(summary.configured).toBe(2);
    expect(summary.watching).toBe(1);
    expect(summary.blocked).toBe(4);
  });
});
