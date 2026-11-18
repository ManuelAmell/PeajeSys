import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[4px] px-2.5 py-1 text-[14px] font-bold transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-superficie-2 text-texto-3',
        correcto: 'bg-correcto-fondo text-correcto',
        aviso: 'bg-aviso-fondo text-aviso-texto',
        error: 'bg-error-fondo text-error',
        efectivo: 'border-2 border-texto text-texto bg-transparent',
        telepeaje: 'border-2 border-texto bg-[#FCBD17] text-sobre-acento',
        exento:
          'border-2 border-dashed border-texto-2 text-texto-3 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
