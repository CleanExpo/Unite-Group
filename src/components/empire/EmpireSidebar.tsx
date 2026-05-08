'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/en/ceo', label: 'Command Center', icon: '⚡' },
  { href: '/en/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/en/clients/ccw', label: 'CCW Portal', icon: '🏢' },
  { href: '/en/dashboard/board', label: 'Board Room', icon: '🎯' },
  { href: '/en/dashboard/content', label: 'Content', icon: '📦' },
  { href: '/en/dashboard/brief', label: '6-Pager Brief', icon: '📋' },
];

const businessItems = [
  { href: '#', label: 'RestoreAssist', color: '#0E7C7B' },
  { href: '#', label: 'Synthex', color: '#6366F1' },
  { href: '#', label: 'CCW-CRM', color: '#D62828' },
  { href: '#', label: 'DR Platform', color: '#1D4ED8' },
  { href: '#', label: 'NRPG', color: '#16A34A' },
  { href: '#', label: 'CARSI', color: '#D97706' },
];

export function EmpireSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-[#1E293B] border-r border-[#334155] flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#334155]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#1D4ED8] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">U</span>
          </div>
          <div>
            <div className="text-sm font-bold text-[#F8FAFC] leading-tight">Unite Group</div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse inline-block" />
              <span className="text-[10px] text-[#FBBF24] font-medium">Empire</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#1D4ED8]/20 text-[#F8FAFC] font-medium'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Businesses */}
        <div className="pt-4 pb-1">
          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest px-3 mb-2">
            Businesses
          </p>
          {businessItems.map(biz => (
            <Link
              key={biz.label}
              href={biz.href}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: biz.color }}
              />
              {biz.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-[#334155]">
        <Link
          href="/en/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50 transition-colors"
        >
          <span>📱</span>
          Client Dashboard
        </Link>
      </div>
    </aside>
  );
}
