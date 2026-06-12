import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CCW Client Portal',
  description: 'Carpet Cleaners Warehouse client portal — engagement deliverables, SLA, and AI agent activity.',
};

export default function CcwClientLayout({ children }: { children: React.ReactNode }) {
  return children;
}
