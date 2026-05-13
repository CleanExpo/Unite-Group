import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Empire Command Center',
  description: 'Unite-Group Command Center — operational health, real-time business metrics, autonomous agent pipeline across the portfolio.',
};

export default function EmpireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
