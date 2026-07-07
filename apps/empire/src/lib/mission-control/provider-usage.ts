export type ProviderId = 'claude' | 'minimax' | 'gemini' | 'openai' | 'openrouter';

export type ProviderState = 'available' | 'watching' | 'near_limit' | 'blocked' | 'unknown';

export type ProviderUsageSource = 'env' | 'manual' | 'estimated' | 'unavailable';

export interface PlanAccount {
  id: string;
  label: string;
  state: ProviderState;
  usagePct: number | null;
  color: string;
}

export interface ProviderUsage {
  id: ProviderId;
  label: string;
  plan: string;
  state: ProviderState;
  usageSource: ProviderUsageSource;
  usagePct: number | null;
  resetCadence: string;
  bestUse: string;
  fallback: ProviderId | null;
  configured: boolean;
  lastCheckedAt: string;
  missingRequirement: string | null;
  plans?: PlanAccount[];
}

type ProviderConfig = {
  id: ProviderId;
  label: string;
  defaultPlan: string;
  envKeys: string[];
  usageEnv: string;
  planEnv: string;
  resetEnv: string;
  sourceEnv: string;
  stateEnv: string;
  bestUse: string;
  fallback: ProviderId | null;
  missingRequirement: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'claude',
    label: 'Claude',
    defaultPlan: 'Claude Max',
    envKeys: ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'],
    usageEnv: 'MISSION_CONTROL_USAGE_CLAUDE_PCT',
    planEnv: 'MISSION_CONTROL_PROVIDER_CLAUDE_PLAN',
    resetEnv: 'MISSION_CONTROL_PROVIDER_CLAUDE_RESET',
    sourceEnv: 'MISSION_CONTROL_PROVIDER_CLAUDE_SOURCE',
    stateEnv: 'MISSION_CONTROL_PROVIDER_CLAUDE_STATE',
    bestUse: 'deep reasoning, repo implementation, review loops',
    fallback: 'openrouter',
    missingRequirement: 'Connect Claude Code or add manual Claude Max meter state',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    defaultPlan: 'MiniMax Max',
    envKeys: ['MINIMAX_API_KEY'],
    usageEnv: 'MISSION_CONTROL_USAGE_MINIMAX_PCT',
    planEnv: 'MISSION_CONTROL_PROVIDER_MINIMAX_PLAN',
    resetEnv: 'MISSION_CONTROL_PROVIDER_MINIMAX_RESET',
    sourceEnv: 'MISSION_CONTROL_PROVIDER_MINIMAX_SOURCE',
    stateEnv: 'MISSION_CONTROL_PROVIDER_MINIMAX_STATE',
    bestUse: 'video, avatar, multimodal media production',
    fallback: 'openai',
    missingRequirement: 'Add MiniMax credential or manual MiniMax usage meter',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    defaultPlan: 'Google Gemini',
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
    usageEnv: 'MISSION_CONTROL_USAGE_GEMINI_PCT',
    planEnv: 'MISSION_CONTROL_PROVIDER_GEMINI_PLAN',
    resetEnv: 'MISSION_CONTROL_PROVIDER_GEMINI_RESET',
    sourceEnv: 'MISSION_CONTROL_PROVIDER_GEMINI_SOURCE',
    stateEnv: 'MISSION_CONTROL_PROVIDER_GEMINI_STATE',
    bestUse: 'long-context research, document comparison, Google workspace context',
    fallback: 'openrouter',
    missingRequirement: 'Add Gemini credential or manual Gemini usage meter',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    defaultPlan: 'OpenAI Max',
    envKeys: ['OPENAI_API_KEY'],
    usageEnv: 'MISSION_CONTROL_USAGE_OPENAI_PCT',
    planEnv: 'MISSION_CONTROL_PROVIDER_OPENAI_PLAN',
    resetEnv: 'MISSION_CONTROL_PROVIDER_OPENAI_RESET',
    sourceEnv: 'MISSION_CONTROL_PROVIDER_OPENAI_SOURCE',
    stateEnv: 'MISSION_CONTROL_PROVIDER_OPENAI_STATE',
    bestUse: 'structured agents, product reasoning, coding support',
    fallback: 'openrouter',
    missingRequirement: 'Add OpenAI credential or manual OpenAI usage meter',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultPlan: 'OpenRouter',
    envKeys: ['OPENROUTER_API_KEY'],
    usageEnv: 'MISSION_CONTROL_USAGE_OPENROUTER_PCT',
    planEnv: 'MISSION_CONTROL_PROVIDER_OPENROUTER_PLAN',
    resetEnv: 'MISSION_CONTROL_PROVIDER_OPENROUTER_RESET',
    sourceEnv: 'MISSION_CONTROL_PROVIDER_OPENROUTER_SOURCE',
    stateEnv: 'MISSION_CONTROL_PROVIDER_OPENROUTER_STATE',
    bestUse: 'fallback routing, model comparison, overflow capacity',
    fallback: null,
    missingRequirement: 'Add OpenRouter credential or manual OpenRouter usage meter',
  },
];

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseUsagePct(value: string | undefined): number | null {
  const raw = clean(value);
  if (!raw) return null;
  const parsed = Number(raw.replace('%', ''));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function parseState(value: string | undefined): ProviderState | null {
  const raw = clean(value)?.toLowerCase();
  if (
    raw === 'available' ||
    raw === 'watching' ||
    raw === 'near_limit' ||
    raw === 'blocked' ||
    raw === 'unknown'
  ) {
    return raw;
  }
  return null;
}

function parseSource(value: string | undefined, configured: boolean, usagePct: number | null): ProviderUsageSource {
  const raw = clean(value)?.toLowerCase();
  if (raw === 'env' || raw === 'manual' || raw === 'estimated' || raw === 'unavailable') return raw;
  if (usagePct !== null) return 'manual';
  if (configured) return 'env';
  return 'unavailable';
}

function inferState(args: {
  configured: boolean;
  explicitState: ProviderState | null;
  usagePct: number | null;
}): ProviderState {
  if (args.explicitState) return args.explicitState;
  if (!args.configured && args.usagePct === null) return 'blocked';
  if (args.usagePct === null) return args.configured ? 'watching' : 'unknown';
  if (args.usagePct >= 90) return 'blocked';
  if (args.usagePct >= 75) return 'near_limit';
  return 'available';
}

export function buildProviderUsage(
  sourceEnv: NodeJS.ProcessEnv = process.env,
  now = new Date(),
): ProviderUsage[] {
  const lastCheckedAt = now.toISOString();

  return PROVIDERS.map((provider) => {
    const usagePct = parseUsagePct(sourceEnv[provider.usageEnv]);
    const configured = provider.envKeys.some((key) => Boolean(clean(sourceEnv[key])));
    const state = inferState({
      configured,
      explicitState: parseState(sourceEnv[provider.stateEnv]),
      usagePct,
    });
    const usageSource = parseSource(sourceEnv[provider.sourceEnv], configured, usagePct);
    const hasMeter = configured || usagePct !== null || usageSource !== 'unavailable';

    return {
      id: provider.id,
      label: provider.label,
      plan: clean(sourceEnv[provider.planEnv]) ?? provider.defaultPlan,
      state,
      usageSource,
      usagePct,
      resetCadence: clean(sourceEnv[provider.resetEnv]) ?? 'not connected',
      bestUse: provider.bestUse,
      fallback: provider.fallback,
      configured: hasMeter,
      lastCheckedAt,
      missingRequirement: hasMeter ? null : provider.missingRequirement,
    };
  });
}

function runHelp(cmd: string): string {
  try {
    const { execSync } = require('child_process');
    return execSync(cmd + ' 2>&1', { encoding: 'utf-8', timeout: 5000 });
  } catch {
    return '';
  }
}

function checkClaudeAuth(): { active: number; total: number; plans: PlanAccount[] } {
  const accounts: PlanAccount[] = [
    { id: 'claude-1', label: 'Claude Max #1', state: 'blocked', usagePct: 0, color: '#cc785c' },
    { id: 'claude-2', label: 'Claude Max #2', state: 'blocked', usagePct: 0, color: '#c49a6c' },
    { id: 'claude-3', label: 'Claude Max #3', state: 'blocked', usagePct: 0, color: '#a8c66c' },
  ];
  const out = runHelp('claude help 2>&1 || echo CLAUDE_NA');
  const active = out.includes('Usage:') || out.includes('Commands');
  if (active) {
    accounts.forEach((p, i) => {
      p.state = 'available';
      p.usagePct = 100;
    });
    return { active: 3, total: 3, plans: accounts };
  }
  return { active: 0, total: 3, plans: accounts };
}

function checkCodexAuth(): { active: number; total: number; plans: PlanAccount[] } {
  const out = runHelp('codex --version 2>&1 || echo CODEX_NA');
  const active = out.includes('codex-cli');
  const plans: PlanAccount[] = [
    { id: 'codex-1', label: 'OpenAI Codex Max', state: active ? 'available' : 'blocked', usagePct: active ? 100 : 25, color: '#10a37f' },
  ];
  return { active: active ? 1 : 0, total: 1, plans };
}

function checkOpenRouter(): { active: number; total: number; plans: PlanAccount[] } {
  const key = Boolean(process.env.OPENROUTER_API_KEY);
  const plans: PlanAccount[] = [
    { id: 'or-1', label: 'OpenRouter', state: key ? 'watching' : 'blocked', usagePct: key ? null : 0, color: '#7c5cff' },
  ];
  return { active: key ? 1 : 0, total: 1, plans };
}

function checkMiniMax(): { active: number; total: number; plans: PlanAccount[] } {
  const key = Boolean(process.env.MINIMAX_API_KEY);
  const plans: PlanAccount[] = [
    { id: 'mm-1', label: 'MiniMax', state: key ? 'watching' : 'blocked', usagePct: key ? null : 0, color: '#ff6b6b' },
  ];
  return { active: key ? 1 : 0, total: 1, plans };
}

export function buildPlanMetrics() {
  const claude = checkClaudeAuth();
  const codex = checkCodexAuth();
  const openrouter = checkOpenRouter();
  const minimax = checkMiniMax();

  return {
    total: claude.total + codex.total + openrouter.total + minimax.total,
    active: claude.active + codex.active + openrouter.active + minimax.active,
    providers: [
      { id: 'claude', accounts: claude.plans, active: claude.active, total: claude.total },
      { id: 'codex', accounts: codex.plans, active: codex.active, total: codex.total },
      { id: 'openrouter', accounts: openrouter.plans, active: openrouter.active, total: openrouter.total },
      { id: 'minimax', accounts: minimax.plans, active: minimax.active, total: minimax.total },
    ],
  };
}

export function summarizeProviderUsage(providers: ProviderUsage[]) {
  return providers.reduce(
    (summary, provider) => {
      summary.total += 1;
      summary[provider.state] += 1;
      if (provider.configured) summary.configured += 1;
      return summary;
    },
    {
      total: 0,
      configured: 0,
      available: 0,
      watching: 0,
      near_limit: 0,
      blocked: 0,
      unknown: 0,
    },
  );
}
