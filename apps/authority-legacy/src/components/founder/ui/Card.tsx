import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'bg-layered-canvas rounded-layered-card shadow-layered-2',
  {
    variants: {
      variant: {
        padded: 'p-6',
        flush: 'p-0',
      },
    },
    defaultVariants: {
      variant: 'padded',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}
