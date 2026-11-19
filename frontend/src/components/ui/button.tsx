import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[6px] transition-colors cursor-pointer select-none focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:border-dashed disabled:border-borde-fuerte disabled:bg-superficie-2 disabled:text-texto-2',
  {
    variants: {
      variant: {
        primario:
          'ps-primario border-2 border-texto bg-[#FCBD17] text-sobre-acento font-bold hover:bg-[#E5A800] active:bg-[#CC9600]',
        secundario:
          'ps-secundario border-2 border-texto bg-superficie text-texto font-semibold hover:bg-hover active:bg-[#E4E0D6]',
        peligro:
          'ps-peligro border-none bg-peligro text-white font-semibold hover:bg-[#8F1B12]',
        texto:
          'ps-texto border-none bg-transparent text-acento-texto font-semibold hover:bg-fondo hover:underline',
        oscuro:
          'ps-oscuro border-2 border-white bg-transparent text-white font-semibold hover:bg-white/15',
      },
      size: {
        default: 'h-[48px] px-[22px] text-[17px]',
        sm: 'h-[44px] px-[14px] text-[15px]',
        lg: 'h-[72px] px-[28px] text-[24px]',
        icon: 'h-[44px] w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'primario',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
