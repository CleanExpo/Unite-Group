import { cn } from '@/lib/utils';

export interface LiveIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: 'live' | 'paused';
}

export function LiveIndicator({ state, className, ...props }: LiveIndicatorProps) {
  const isLive = state === 'live';
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide', className)} {...props}>
      <span className={cn('h-2 w-2 rounded-full', isLive ? 'bg-red-500 animate-pulse' : 'bg-layered-text-muted')} />
      {isLive ? 'LIVE' : 'PAUSED'}
    </span>
  );
}
