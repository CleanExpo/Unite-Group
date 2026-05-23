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

  it('renders a live CRM payload without falling back to seed summary values', () => {
    const html = renderToStaticMarkup(
      <HermesControlPanel
        initialPayload={{
          source: 'crm:tasks',
          taskCount: 2,
          generatedAt: '2026-05-23T13:45:00.000Z',
          summary: {
            green: 1,
            yellow: 1,
            red: 0,
            approvalRequired: 3,
          },
          workstreams: [
            {
              id: 'ug-v0-02',
              label: 'Margot voice to CRM task',
              lane: 'crm write',
              owner: 'Phill approval',
              status: 'gated',
              ryg: 'red',
              dependency: 'Live CRM task payload',
              gate: 'Phill approval required',
              nextAction: 'Resolve approval',
            },
          ],
          addOns: [],
        }}
      />,
    );

    expect(html).toContain('CRM · 2 tasks');
    expect(html).toMatch(/APPROVAL REQUIRED<\/span><span[^>]*>3<\/span>/);
    expect(html).toContain('Margot voice to CRM task');
    expect(html).not.toContain('CRM · requesting');
  });
});
