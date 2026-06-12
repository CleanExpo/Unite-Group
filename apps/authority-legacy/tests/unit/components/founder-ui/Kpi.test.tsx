/**
 * KPI primitive tests — UNI-2060 Phase 2
 *
 * <KPI label value delta trend> — number tile with floating tag chip.
 */

import { renderToString } from 'react-dom/server';
import { KPI } from '@/components/founder/ui/KPI';

describe('KPI', () => {
  it('renders label and value', () => {
    const html = renderToString(<KPI label="Revenue" value="$12.4k" />);
    expect(html).toContain('Revenue');
    expect(html).toContain('$12.4k');
  });

  it('shows positive delta with green chip', () => {
    const html = renderToString(<KPI label="MRR" value="$8.2k" delta={12.5} trend="up" />);
    expect(html).toContain('+12.5%');
    expect(html).toContain('bg-layered-green-deep');
  });

  it('shows negative delta with red chip', () => {
    const html = renderToString(<KPI label="Churn" value="2.4%" delta={-3.2} trend="down" />);
    expect(html).toContain('-3.2%');
    expect(html).toContain('bg-layered-red-deep');
  });

  it('omits delta chip when delta is undefined', () => {
    const html = renderToString(<KPI label="Users" value="1,240" />);
    expect(html).not.toContain('bg-layered-green-deep');
    expect(html).not.toContain('bg-layered-red-deep');
  });

  it('uses Card as outer container', () => {
    const html = renderToString(<KPI label="Leads" value="42" />);
    expect(html).toContain('shadow-layered-2');
    expect(html).toContain('rounded-layered-card');
  });

  it('accepts extra className', () => {
    const html = renderToString(<KPI label="A" value="1" className="w-48" />);
    expect(html).toContain('w-48');
  });
});
