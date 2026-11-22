import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const CLASE_BASE =
  'h-[48px] w-full rounded-[6px] border-2 bg-superficie px-[14px] text-[18px] font-medium text-texto focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2';

export interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiqueta: string;
  error?: string;
}

/** Campo con label asociado y mensaje de error con role="alert". */
export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(
  function CampoTexto({ id, etiqueta, error, className, ...resto }, ref) {
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-[16px] font-semibold">
          {etiqueta}
        </label>
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${CLASE_BASE} ${error ? 'border-error' : 'border-borde-fuerte'} ${className ?? ''}`}
          {...resto}
        />
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="m-0 text-[15px] font-semibold text-error"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

export interface CampoSelectProps {
  id: string;
  etiqueta: string;
  error?: string;
  children: ReactNode;
}

export const CampoSelect = forwardRef<
  HTMLSelectElement,
  CampoSelectProps & React.SelectHTMLAttributes<HTMLSelectElement>
>(function CampoSelect({ id, etiqueta, error, children, ...resto }, ref) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[16px] font-semibold">
        {etiqueta}
      </label>
      <select
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CLASE_BASE} ${error ? 'border-error' : 'border-borde-fuerte'}`}
        {...resto}
      >
        {children}
      </select>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="m-0 text-[15px] font-semibold text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export interface BotonMostrarClaveProps {
  visible: boolean;
  onAlternar: () => void;
}

/** Botón que muestra u oculta las contraseñas del diálogo. */
export function BotonMostrarClave({
  visible,
  onAlternar,
}: BotonMostrarClaveProps) {
  const Icono = visible ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-pressed={visible}
      onClick={onAlternar}
      className="flex h-[44px] w-fit cursor-pointer items-center gap-2 rounded-[6px] border-2 border-borde-fuerte bg-superficie px-[12px] text-[16px] font-semibold text-texto hover:bg-hover focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2"
    >
      <Icono className="h-5 w-5" aria-hidden="true" />
      {visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    </button>
  );
}
