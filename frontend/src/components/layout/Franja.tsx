import { cn } from '@/lib/utils';

export interface FranjaProps {
  className?: string;
  altura?: 'sm' | 'md';
}

/**
 * Franja vial diagonal amarilla (#FCBD17) y negra (#1f1d19) de señalización de peaje.
 */
export function Franja({ className, altura = 'md' }: FranjaProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        altura === 'sm' ? 'ps-franja-diagonal-sm' : 'ps-franja-diagonal',
        'w-full shrink-0',
        className,
      )}
    />
  );
}
