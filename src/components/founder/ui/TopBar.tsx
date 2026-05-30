import { cn } from '@/lib/utils';

export interface TopBarProps {
  title: string;
  breadcrumb?: string[];
  className?: string;
}

export function TopBar({ title, breadcrumb, className }: TopBarProps) {
  return (
    <div className={cn('flex flex-col gap-1 px-6 py-4 bg-layered-paper shadow-layered-1', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-layered-text-muted">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-layered-slate">/</span>}
              <span>{crumb}</span>
            </span>
          ))}
        </nav>
      )}
      <h1 className="text-xl font-bold text-layered-navy tracking-tight">{title}</h1>
    </div>
  );
}
