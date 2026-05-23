import { renderToStaticMarkup } from 'react-dom/server';
import { HermesControlPanel } from '../../../../src/components/command-center/control-panel/HermesControlPanel';

describe('HermesControlPanel', () => {
  it('renders the approval-required summary cell in the seed control panel', () => {
    const html = renderToStaticMarkup(<HermesControlPanel />);

    expect(html).toContain('aria-label="Portfolio RYG and approval summary"');
    expect(html).toContain('APPROVAL REQUIRED');
    expect(html).toMatch(/APPROVAL REQUIRED<\/span><span[^>]*>0<\/span>/);
    expect(html).toContain('CRM · requesting');
  });
});
