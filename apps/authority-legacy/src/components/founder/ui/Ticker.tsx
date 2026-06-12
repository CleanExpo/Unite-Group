import { cn } from '@/lib/utils';

export interface TickerEvent {
  id: string;
  text: string;
  timestamp: string;
}

export interface TickerProps {
  events: TickerEvent[];
  className?: string;
}

export function Ticker({ events, className }: TickerProps) {
  if (events.length === 0) {
    return (
      <div className={cn('overflow-hidden whitespace-nowrap py-2 px-4 bg-layered-paper text-layered-text-muted text-sm', className)}>
        No events
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden whitespace-nowrap py-2 px-4 bg-layered-paper shadow-layered-1', className)}>
      <div className="inline-flex animate-marquee gap-8">
        {events.map((e) => (
          <span key={e.id} className="inline-flex items-center gap-2 text-sm text-layered-text-secondary">
            <span className="text-layered-teal font-mono text-xs">{e.timestamp}</span>
            <span>{e.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
