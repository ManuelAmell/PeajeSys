import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-[48px] w-full rounded-[6px] border-2 bg-superficie px-3.5 py-2 text-[18px] font-medium text-texto placeholder:text-texto-2 focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-error' : 'border-borde-fuerte',
          className,
        )}
        ref={ref}
        aria-invalid={error || props['aria-invalid']}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
