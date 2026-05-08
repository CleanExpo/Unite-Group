'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap, LayoutDashboard, Building2, Users, FileText,
  ChevronRight, Activity, BarChart3,
} from 'lucide-react';

const AUTH_ROUTES = ['/login', '/register', '/reset-password', '/update-password'];

const NAV = [
  { href: '/ceo',               icon: Zap,             label: 'Command Center' },
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/clients/ccw',       icon: Building2,       label: 'CCW Portal'     },
  { href: '/dashboard/board',   icon: Activity,        label: 'Board Room'     },
  { href: '/dashboard/content', icon: FileText,        label: 'Content'        },
  { href: '/dashboard/brief',   icon: BarChart3,       label: '6-Pager'        },
];

const BUSINESSES = [
  { label: 'RestoreAssist', color: '#0E7C7B', status: 'building'    },
  { label: 'Synthex',       color: '#6366F1', status: 'operational' },
  { label: 'CCW-CRM',       color: '#DC2626', status: 'operational' },
  { label: 'DR Platform',   color: '#2563EB', status: 'operational' },
  { label: 'NRPG',          color: '#16A34A', status: 'building'    },
  { label: 'CARSI',         color: '#D97706', status: 'operational' },
];

const STATUS_COLOR: Record<string, string> = {
  operational: '#16A34A',
  building:    '#2563EB',
  degraded:    '#D97706',
  down:        '#DC2626',
};

export function EmpireSidebar() {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.endsWith(r));
  if (isAuthRoute) return null;

  return (
    <aside style={{ width: 240, minHeight: '100vh', background: '#0d1424', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

      {/* Wordmark */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>Unite Group</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', boxShadow: '0 0 6px #fbbf24' }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fbbf24', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Empire</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, textDecoration: 'none',
                background: active ? 'rgba(29,78,216,0.15)' : 'transparent',
                border: active ? '1px solid rgba(29,78,216,0.3)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              <Icon size={15} color={active ? '#60a5fa' : '#64748b'} strokeWidth={2} />
              <span style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#f1f5f9' : '#94a3b8', flex: 1 }}>{label}</span>
              {active && <ChevronRight size={12} color="#3b82f6" />}
            </Link>
          );
        })}

        {/* Portfolio section */}
        <div style={{ marginTop: 16, marginBottom: 6, padding: '0 10px' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#334155', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Portfolio</span>
        </div>
        {BUSINESSES.map(biz => (
          <div key={biz.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[biz.status], display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>{biz.label}</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: biz.color, display: 'inline-block', opacity: 0.7 }} />
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none' }}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
        >
          <Users size={14} color="#475569" />
          <span style={{ fontSize: 12, color: '#475569' }}>Client View</span>
        </Link>
      </div>
    </aside>
  );
}
