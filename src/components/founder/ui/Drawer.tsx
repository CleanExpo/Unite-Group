import { cn } from '@/lib/utils';

export interface DrawerProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ open, title, children, className }: DrawerProps) {
  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-layered-paper shadow-layered-3 transform transition-transform duration-300 ease-out flex flex-col',
        open ? 'translate-x-0' : 'translate-x-full',
        className,
      )}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-layered-border">
        <h2 className="text-lg font-semibold text-layered-navy">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
