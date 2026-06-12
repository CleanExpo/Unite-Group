import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Tier } from './Tier';
import { HealthBar } from './HealthBar';
import { Chip } from './Chip';

export interface OpportunityCardProps {
  title: string;
  client: string;
  phase: 'discovery' | 'scoping' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  tier: 'silver' | 'gold' | 'platinum';
  estimatedValue: number;
  winProbability: number;
  nextAction: string;
  daysStale?: number;
  className?: string;
}

const phaseColours: Record<string, string> = {
  discovery: 'green',
  scoping: 'sky',
  proposal: 'amber',
  negotiation: 'amber',
  'closed-won': 'green',
  'closed-lost': 'red',
};

export function OpportunityCard({
  title,
  client,
  phase,
  tier,
  estimatedValue,
  winProbability,
  nextAction,
  daysStale = 0,
  className,
}: OpportunityCardProps) {
  const colour = phaseColours[phase] || 'slate';
  const isStale = daysStale > 7;

  return (
    <Card variant="padded" className={cn('relative', isStale && 'border-l-4 border-l-red-500', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-layered-navy truncate">{title}</h3>
          <p className="text-sm text-layered-text-muted truncate">{client}</p>
        </div>
        <Tier level={tier} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip variant={colour as any}>{phase.replace('-', ' ')}</Chip>
        {isStale && <Chip variant="red">{daysStale}d stale</Chip>}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-layered-text-muted mb-1">
          <span>Win probability</span>
          <span>{winProbability}%</span>
        </div>
        <HealthBar value={winProbability} max={100} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-layered-text-muted">
          Est: <span className="font-mono font-medium text-layered-text-primary">${estimatedValue.toLocaleString()}</span>
        </span>
        <span className="text-layered-teal font-medium truncate max-w-[50%]">→ {nextAction}</span>
      </div>
    </Card>
  );
}
