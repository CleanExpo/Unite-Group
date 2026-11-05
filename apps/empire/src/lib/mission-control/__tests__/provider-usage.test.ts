import { execSync } from 'child_process';
import { buildProviderUsage, summarizeProviderUsage, buildPlanMetrics } from '../provider-usage';

// No test may run a real CLI: `claude <word>` opens a real Claude session.
jest.mock('child_process', () => ({ execSync: jest.fn() }));
const mockExecSync = execSync as unknown as jest.Mock;

function fakeCli(outputs: { claude?: string; codex?: string }) {
  mockExecSync.mockImplementation((cmd: string) => {
    if (cmd.startsWith('claude ')) {
      if (outputs.claude === undefined) throw new Error('claude: command not found');
      return outputs.claude;
    }
    if (cmd.startsWith('codex ')) {
      if (outputs.codex === undefined) throw new Error('codex: command not found');
      return outputs.codex;
    }
    throw new Error(`unexpected command in test: ${cmd}`);
  });
}

beforeEach(() => {
  mockExecSync.mockReset();
  fakeCli({});
});

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

describe('buildPlanMetrics', () => {
  it('returns a valid metrics shape without throwing', () => {
    const metrics = buildPlanMetrics();

    expect(metrics).toHaveProperty('total');
    expect(metrics).toHaveProperty('active');
    expect(metrics).toHaveProperty('providers');
    expect(Array.isArray(metrics.providers)).toBe(true);
    expect(metrics.providers.length).toBeGreaterThan(0);

    const claude = metrics.providers.find((p) => p.id === 'claude');
    expect(claude).toBeDefined();
    expect(claude!.accounts.length).toBe(3);
    expect(claude!.total).toBe(3);
  });

  it('returns zero active when no CLIs are installed', () => {
    const metrics = buildPlanMetrics();
    const claude = metrics.providers.find((p) => p.id === 'claude')!;

    expect(claude.active).toBe(0);
    expect(claude.accounts.every((a) => a.state === 'blocked')).toBe(true);
    expect(metrics.total).toBe(6);
  });

  it('detects Claude with `claude --version` and never runs `claude help`', () => {
    fakeCli({ claude: '2.1.318 (Claude Code)\n' });
    buildPlanMetrics();

    const claudeCalls = mockExecSync.mock.calls
      .map(([cmd]) => String(cmd))
      .filter((cmd) => cmd.startsWith('claude'));
    expect(claudeCalls).toHaveLength(1);
    expect(claudeCalls[0].startsWith('claude --version')).toBe(true);
    for (const [cmd] of mockExecSync.mock.calls) {
      expect(String(cmd)).not.toContain('help');
    }
  });

  it('marks all three Claude accounts available when the version output says Claude Code', () => {
    fakeCli({ claude: '2.1.318 (Claude Code)\n', codex: 'codex-cli 0.166.0\n' });
    const metrics = buildPlanMetrics();
    const claude = metrics.providers.find((p) => p.id === 'claude')!;

    expect(claude).toMatchObject({ active: 3, total: 3 });
    expect(claude.accounts.map((a) => a.state)).toEqual(['available', 'available', 'available']);
    expect(claude.accounts.map((a) => a.usagePct)).toEqual([100, 100, 100]);
  });

  it('keeps Claude blocked when the output is not from Claude Code', () => {
    fakeCli({ claude: 'Usage: claude [options]\nCommands:\n' });
    const claude = buildPlanMetrics().providers.find((p) => p.id === 'claude')!;

    expect(claude.active).toBe(0);
    expect(claude.accounts.every((a) => a.state === 'blocked')).toBe(true);
  });
});
