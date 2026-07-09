/**
 * Button Component - Phase 2 UI Library
 * Production-ready button with variants, sizes, and accessibility
 */

'use client';
import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-sm font-medium focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-(--color-accent-10) border border-(--color-accent-border) text-accent hover:bg-(--color-accent-20)',
        secondary: 'bg-white/4 border border-white/10 text-[#3f3f46] hover:bg-black/5 hover:text-[#0A0A0A]',
        danger: 'bg-(--color-danger-dim) border border-danger/40 text-danger hover:bg-danger/20',
        success: 'bg-(--color-success-dim) border border-success/40 text-success hover:bg-success/20',
        outline: 'bg-transparent border border-white/10 text-[#3f3f46] hover:border-white/20 hover:text-[#0A0A0A]',
        ghost: 'bg-transparent text-[#52525b] hover:bg-black/5 hover:text-[#3f3f46]',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
        xl: 'px-8 py-4 text-xl',
        icon: 'h-9 w-9 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

export default function Button({
  children,
  variant,
  size,
  fullWidth,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={buttonVariants({ variant, size, fullWidth, className })}
      disabled={!asChild ? (disabled || loading) : undefined}
      aria-busy={!asChild ? loading : undefined}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </Comp>
  );
}

// Named export for compatibility
export { Button };
