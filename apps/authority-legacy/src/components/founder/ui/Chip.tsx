import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const chipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        green:  'bg-layered-green-deep text-white',
        coral:  'bg-layered-coral-deep text-white',
        plum:   'bg-layered-plum-deep text-white',
        sky:    'bg-[#38bdf8] text-white',
        amber:  'bg-layered-amber-deep text-white',
        red:    'bg-layered-red-deep text-white',
        dark:   'bg-[#1e293b] text-white',
        ghost:  'bg-transparent text-layered-text-secondary border border-layered-line',
        active: 'bg-layered-teal text-white ring-2 ring-layered-teal ring-offset-2',
      },
    },
    defaultVariants: {
      variant: 'green',
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

export function Chip({ className, variant, ...props }: ChipProps) {
  return <span className={cn(chipVariants({ variant }), className)} {...props} />;
}
