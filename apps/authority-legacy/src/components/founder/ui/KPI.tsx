import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Chip } from './Chip';

export interface KPIProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  delta?: number;
  trend?: 'up' | 'down';
}

export function KPI({ label, value, delta, trend, className, ...props }: KPIProps) {
  const showDelta = delta !== undefined;
  const isPositive = showDelta && delta >= 0;
  const formattedDelta = showDelta
    ? `${isPositive ? '+' : ''}${delta}%`
    : null;

  return (
    <Card className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="flex items-center justify-between">
        <span className="text-layered-text-muted text-sm font-medium">{label}</span>
        {showDelta && (
          <Chip variant={isPositive ? 'green' : 'red'}>{formattedDelta}</Chip>
        )}
      </div>
      <div className="text-layered-text-primary text-2xl font-bold tracking-tight">
        {value}
      </div>
    </Card>
  );
}
