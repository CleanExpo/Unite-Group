/**
 * Additional layered primitives tests — UNI-2060 Phase 2
 * Tier, HealthBar, FAB, LiveIndicator
 */

import { renderToString } from 'react-dom/server';
import { Tier } from '@/components/founder/ui/Tier';
import { HealthBar } from '@/components/founder/ui/HealthBar';
import { FAB } from '@/components/founder/ui/FAB';
import { LiveIndicator } from '@/components/founder/ui/LiveIndicator';

describe('Tier', () => {
  it('renders gem emoji for platinum', () => {
    const html = renderToString(<Tier level="platinum" />);
    expect(html).toContain('💎');
  });

  it('renders label text', () => {
    const html = renderToString(<Tier level="gold" />);
    expect(html).toContain('Gold');
  });

  it('rotates the gem via transform', () => {
    const html = renderToString(<Tier level="silver" />);
    expect(html).toContain('rotate');
  });
});

describe('HealthBar', () => {
  it('renders bar container', () => {
    const html = renderToString(<HealthBar value={60} max={100} />);
    expect(html).toContain('health-bar');
  });

  it('renders fill width proportional to value/max', () => {
    const html = renderToString(<HealthBar value={50} max={100} />);
    expect(html).toContain('width:50%');
  });

  it('uses green when healthy', () => {
    const html = renderToString(<HealthBar value={80} max={100} thresholds={[30, 70]} />);
    expect(html).toContain('bg-layered-green-deep');
  });

  it('uses amber when warning', () => {
    const html = renderToString(<HealthBar value={50} max={100} thresholds={[30, 70]} />);
    expect(html).toContain('bg-layered-amber-deep');
  });

  it('uses red when critical', () => {
    const html = renderToString(<HealthBar value={15} max={100} thresholds={[30, 70]} />);
    expect(html).toContain('bg-layered-red-deep');
  });
});

describe('FAB', () => {
  it('renders a 56px circular button', () => {
    const html = renderToString(<FAB />);
    expect(html).toContain('w-14');
    expect(html).toContain('h-14');
    expect(html).toContain('rounded-full');
  });

  it('uses layered green background', () => {
    const html = renderToString(<FAB />);
    expect(html).toContain('bg-layered-green-deep');
  });

  it('has aria-label', () => {
    const html = renderToString(<FAB aria-label="Quick create" />);
    expect(html).toContain('aria-label="Quick create"');
  });
});

describe('LiveIndicator', () => {
  it('shows LIVE state with pulse', () => {
    const html = renderToString(<LiveIndicator state="live" />);
    expect(html).toContain('LIVE');
    expect(html).toContain('animate-pulse');
  });

  it('shows PAUSED state without pulse', () => {
    const html = renderToString(<LiveIndicator state="paused" />);
    expect(html).toContain('PAUSED');
    expect(html).not.toContain('animate-pulse');
  });

  it('uses candy red for live dot', () => {
    const html = renderToString(<LiveIndicator state="live" />);
    expect(html).toContain('bg-red-500');
  });
});
