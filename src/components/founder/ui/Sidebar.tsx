import { cn } from '@/lib/utils';

export interface SidebarItem {
  id: string;
  label: string;
  icon: string; // would be an icon component, e.g. from lucide-react
  href?: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  activeId: string;
  className?: string;
}

export function Sidebar({ items, activeId, className }: SidebarProps) {
  return (
    <nav className={cn('flex flex-col w-20 bg-layered-paper shadow-layered-1 py-4 gap-2', className)}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        const Wrapper = item.href ? 'a' : 'button';
        return (
          <Wrapper
            key={item.id}
            {...(item.href ? { href: item.href } : {})}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs font-medium transition-colors',
              isActive
                ? 'bg-layered-navy text-white rounded-lg mx-2'
                : 'text-layered-text-secondary hover:text-layered-text-primary hover:bg-layered-hover mx-2 rounded-lg',
            )}
          >
            <span className="w-6 h-6 rounded-full bg-current opacity-20" aria-hidden="true" />
            <span className="truncate max-w-full px-1">{item.label}</span>
          </Wrapper>
        );
      })}
    </nav>
  );
}
