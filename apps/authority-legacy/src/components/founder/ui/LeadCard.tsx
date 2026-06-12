import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Tier } from './Tier';
import { HealthBar } from './HealthBar';
import { Chip } from './Chip';

export interface LeadCardProps {
  name: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed';
  tier: 'silver' | 'gold' | 'platinum';
  value: number;
  lastActivity: string;
  blocked?: boolean;
  className?: string;
}

const statusColours: Record<string, string> = {
  new: 'green',
  contacted: 'sky',
  qualified: 'teal',
  proposal: 'amber',
  negotiation: 'amber',
  closed: 'green',
};

export function LeadCard({ name, company, status, tier, value, lastActivity, blocked, className }: LeadCardProps) {
  const healthScore = status === 'closed' ? 100 : status === 'negotiation' ? 80 : status === 'proposal' ? 65 : status === 'qualified' ? 50 : status === 'contacted' ? 35 : 20;
  const colour = statusColours[status] || 'slate';

  return (
    <Card variant="padded" className={cn('relative', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-layered-navy truncate">{name}</h3>
          <p className="text-sm text-layered-text-muted truncate">{company}</p>
        </div>
        <Tier level={tier} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip variant={colour as any}>{status}</Chip>
        {blocked && <Chip variant="dark">BLOCKED</Chip>}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-layered-text-muted mb-1">
          <span>Pipeline health</span>
          <span>{healthScore}%</span>
        </div>
        <HealthBar value={healthScore} max={100} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-layered-text-muted">
        <span>Est. value: <span className="font-mono font-medium text-layered-text-primary">${value.toLocaleString()}</span></span>
        <span>Last: {lastActivity}</span>
      </div>
    </Card>
  );
}
