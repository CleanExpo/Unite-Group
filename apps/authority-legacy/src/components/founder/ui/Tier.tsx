import { cn } from '@/lib/utils';

const levelConfig: Record<string, { emoji: string; label: string; colour: string }> = {
  platinum: { emoji: '💎', label: 'Platinum', colour: 'text-slate-300' },
  gold:     { emoji: '🏆', label: 'Gold',     colour: 'text-amber-400' },
  silver:   { emoji: '🥈', label: 'Silver',   colour: 'text-slate-400' },
};

export interface TierProps extends React.HTMLAttributes<HTMLSpanElement> {
  level: 'platinum' | 'gold' | 'silver';
}

export function Tier({ level, className, ...props }: TierProps) {
  const cfg = levelConfig[level] ?? levelConfig.silver;
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', cfg.colour, className)} {...props}>
      <span className="inline-block transform rotate-12">{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}
