export type ProviderId = 'claude' | 'minimax' | 'gemini' | 'openai' | 'openrouter';

export type ProviderState = 'available' | 'watching' | 'near_limit' | 'blocked' | 'unknown';

export type ProviderUsageSource = 'env' | 'manual' | 'estimated' | 'unavailable';

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
