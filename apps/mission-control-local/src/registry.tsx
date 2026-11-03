// The widget registry. To add a widget in a later phase (PRs and CI, Linear goals,
// command box, approvals): add its row to shared/widget-catalogue.ts and its
// component here. The Record type makes a missing entry a type-check failure.
import type { ComponentType } from 'react';
import type { WidgetId } from '../shared/widget-catalogue.ts';
import { ClockWidget } from './widgets/ClockWidget.tsx';
import { JobQueueWidget } from './widgets/JobQueueWidget.tsx';
import { MachineWidget } from './widgets/MachineWidget.tsx';

export const WIDGET_COMPONENTS: Record<WidgetId, ComponentType> = {
  'machine-mac-mini': () => <MachineWidget machineId="mac-mini" />,
  'machine-macbook-pro': () => <MachineWidget machineId="macbook-pro" />,
  'machine-windows-pc': () => <MachineWidget machineId="windows-pc" />,
  'job-queue': JobQueueWidget,
  clock: ClockWidget,
};
