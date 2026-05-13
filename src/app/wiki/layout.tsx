import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wiki',
  description: 'Unite-Group knowledge base and operational wiki.',
};

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
