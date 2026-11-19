import { useTema } from '@/lib/tema';
import { cn } from '@/lib/utils';

export interface BotonTemaProps {
  className?: string;
  variante?: 'oscuro' | 'secundario';
}

/**
 * Botón para alternar entre modo claro y oscuro con el texto del diseño:
 * - «Usar modo oscuro» (cuando el tema actual es claro)
 * - «Usar modo claro» (cuando el tema actual es oscuro)
 */
export function BotonTema({ className, variante = 'oscuro' }: BotonTemaProps) {
  const { tema, alternarTema } = useTema();
  const esOscuro = tema === 'oscuro';
  const texto = esOscuro ? 'Usar modo claro' : 'Usar modo oscuro';

  return (
    <button
      type="button"
      onClick={alternarTema}
      className={cn(
        'inline-flex h-[44px] items-center gap-2 rounded-[6px] px-[14px] text-[16px] font-semibold transition-colors',
        variante === 'oscuro'
          ? 'ps-oscuro border-2 border-white bg-transparent text-white'
          : 'ps-secundario border-2 border-texto bg-superficie text-texto',
        className,
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <span>{texto}</span>
    </button>
  );
}
