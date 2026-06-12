import { cn } from '@/lib/utils';

export interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function FAB({ className, children, ...props }: FABProps) {
  return (
    <button
      className={cn(
        'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-layered-green-deep text-white shadow-layered-3 transition-transform hover:scale-105 active:scale-95',
        className
      )}
      aria-label={props['aria-label'] ?? 'Quick create'}
      {...props}
    >
      {children ?? <PlusIcon />}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
