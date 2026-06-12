import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pi-CEO Health History',
  description: 'Pi-CEO health snapshots — per-brand security, deployment, and dependency intelligence across the portfolio.',
};

export default function PiCeoHealthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
