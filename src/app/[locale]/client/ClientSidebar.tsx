'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/en/client',           icon: '⬡' },
  { label: 'SEO Rankings', href: '/en/client/rankings',  icon: '↑' },
  { label: 'Content',      href: '/en/client/content',   icon: '✦' },
  { label: 'Reports',      href: '/en/client/reports',   icon: '◫' },
  { label: 'Billing',      href: '/en/client/billing',   icon: '◈' },
];

export default function ClientSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 'var(--client-sidebar-width)',
        height: '100vh',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-hairline)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
    >
      {/* Company logo block */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* CCW Logo */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-client-md)',
              background: 'var(--surface-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <img
              src="/logos/ccw.png"
              alt="CCW"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.style.display = 'none';
                const parent = t.parentElement;
                if (parent) {
                  parent.style.background = '#D62828';
                  parent.innerHTML = '<span style="font-size:14px;font-weight:700;color:#fff">CCW</span>';
                }
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-primary)',
                letterSpacing: '-0.2px',
                lineHeight: 1.2,
              }}
            >
              CCW
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--ink-tertiary)',
                marginTop: 1,
              }}
            >
              Carpet Cleaners Warehouse
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/en/client'
              ? pathname === '/en/client' || pathname === '/en/client/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius-client-md)',
                marginBottom: 2,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                background: isActive ? 'var(--red-a08)' : 'transparent',
                borderLeft: isActive
                  ? '2px solid var(--red-500)'
                  : '2px solid transparent',
                textDecoration: 'none',
                transition:
                  'background var(--duration-base), color var(--duration-base)',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  width: 16,
                  textAlign: 'center',
                  flexShrink: 0,
                  color: isActive ? 'var(--red-400)' : 'var(--ink-tertiary)',
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Powered by footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-hairline)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: 'var(--ink-disabled)',
            letterSpacing: '0.03em',
          }}
        >
          Powered by{' '}
          <span style={{ color: 'var(--ink-tertiary)', fontWeight: 500 }}>
            Unite Group
          </span>
        </div>
      </div>
    </aside>
  );
}
