import { cn } from '@/lib/utils';

export interface HealthBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max: number;
  thresholds?: [number, number]; // [critical, warning] as percentages
}

export function HealthBar({ value, max, thresholds = [30, 70], className, ...props }: HealthBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const [critical, warning] = thresholds;

  let colour = 'bg-layered-green-deep';
  if (pct < critical) colour = 'bg-layered-red-deep';
  else if (pct < warning) colour = 'bg-layered-amber-deep';

  return (
    <div className={cn('health-bar h-1.5 w-full overflow-hidden rounded-full bg-layered-line', className)} {...props}>
      <div className={cn('h-full rounded-full transition-all duration-500', colour)} style={{ width: `${pct}%` }} />
    </div>
  );
}
