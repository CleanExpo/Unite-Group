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

  it('marks injected non-CRM payloads as degraded instead of presenting them as live CRM truth', () => {
    const html = renderToStaticMarkup(
      <HermesControlPanel
        initialPayload={{
          source: 'seed:static-plan',
          taskCount: 0,
          generatedAt: '2026-05-23T13:45:00.000Z',
          summary: {
            green: 4,
            yellow: 2,
            red: 1,
            approvalRequired: 0,
          },
          workstreams: [],
          addOns: [],
        }}
      />,
    );

    expect(html).toContain('CRM unreachable · seed plan');
    expect(html).toContain('Degraded data · Unite CRM');
    expect(html).toContain('server returned source=seed:static-plan');
    expect(html).not.toContain('CRM · 0 tasks');
  });

  it('renders live CRM add-on task hydration without offering a duplicate approval request', () => {
    const html = renderToStaticMarkup(
      <HermesControlPanel
        initialPayload={{
          source: 'crm:tasks',
          taskCount: 1,
          generatedAt: '2026-05-24T02:45:00.000Z',
          summary: {
            green: 0,
            yellow: 0,
            red: 1,
            approvalRequired: 1,
          },
          workstreams: [],
          addOns: [
            {
              id: 'computer-use',
              label: 'Computer-use operator',
              category: 'desktop',
              state: 'gated',
              approval: 'Human approval for external writes',
              crmTaskId: 'task-addon-001',
              crmTaskStatus: 'blocked',
            },
            {
              id: 'crm-kanban-sync',
              label: 'CRM to Kanban sync',
              category: 'execution',
              state: 'gated',
              approval: 'CRM task must exist first',
              crmTaskId: 'task-addon-no-status',
            },
          ],
        }}
      />,
    );

    expect(html).toContain('CRM · 1 tasks');
    expect(html).toContain('Computer-use operator');
    expect(html).toContain('CRM task task-addon-001 · blocked');
    expect(html).toContain('CRM task task-addon-no-status');
    expect(html).not.toContain('CRM task task-addon-no-status ·');
    expect(html).toContain('desktop / gated');
    expect(html).not.toContain('Request approval task in Unite CRM');
    expect(html).not.toContain('CRM unreachable · seed plan');
  });

  it('renders live CRM workstream task evidence surfaced by the control-panel API', () => {
    const html = renderToStaticMarkup(
      <HermesControlPanel
        initialPayload={{
          source: 'crm:tasks',
          taskCount: 1,
          generatedAt: '2026-05-24T04:15:00.000Z',
          summary: {
            green: 0,
            yellow: 0,
            red: 1,
            approvalRequired: 1,
          },
          workstreams: [
            {
              id: 'ug-v0-02',
              label: 'Margot brief to Unite CRM task',
              lane: 'crm write',
              owner: 'Phill approval',
              status: 'gated',
              ryg: 'red',
              dependency: 'Live CRM task payload',
              gate: 'Phill approval required',
              nextAction: 'Resolve approval',
              crmTaskId: 'task-workstream-001',
              crmTaskStatus: 'blocked',
              crmTaskTitle: 'RAW CRM TASK TITLE SHOULD NOT RENDER',
              crmTaskBody: 'RAW CRM TASK BODY SHOULD NOT RENDER',
            } as any,
            {
              id: 'ug-v0-03',
              label: 'CRM task without status evidence',
              lane: 'crm review',
              owner: 'Margot',
              status: 'live',
              ryg: 'yellow',
              dependency: 'Live CRM task payload',
              gate: 'Monitor next action',
              nextAction: 'Review task evidence',
              crmTaskId: 'task-workstream-no-status',
            },
          ],
          addOns: [],
        }}
      />,
    );

    expect(html).toContain('CRM task task-workstream-001 · blocked');
    expect(html).toContain('CRM task task-workstream-no-status');
    expect(html).not.toContain('CRM task task-workstream-no-status ·');
    expect(html).not.toContain('RAW CRM TASK TITLE SHOULD NOT RENDER');
    expect(html).not.toContain('RAW CRM TASK BODY SHOULD NOT RENDER');
    expect(html).not.toContain('CRM unreachable · seed plan');
  });
});
