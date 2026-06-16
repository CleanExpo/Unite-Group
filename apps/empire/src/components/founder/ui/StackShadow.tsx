import { cn } from '@/lib/utils';

export interface StackShadowProps {
  children: React.ReactNode;
  className?: string;
}

export function StackShadow({ children, className }: StackShadowProps) {
  return (
    <div className={cn('relative rounded-layered-card bg-layered-paper shadow-layered-2', className)}>
      {children}
    </div>
  );
}
