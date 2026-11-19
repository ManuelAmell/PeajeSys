import type { MetodoPagoConfig, MetodoPagoOperador } from '../types';

export interface SelectorMetodoPagoProps {
  metodos: MetodoPagoConfig[];
  metodoSeleccionado: MetodoPagoOperador;
  onSeleccionarMetodo: (metodo: MetodoPagoOperador) => void;
  avisoCarril?: string | null;
  deshabilitado?: boolean;
}

export function SelectorMetodoPago({
  metodos,
  metodoSeleccionado,
  onSeleccionarMetodo,
  avisoCarril,
  deshabilitado = false,
}: SelectorMetodoPagoProps) {
  return (
    <fieldset className="m-0 p-0 border-none flex flex-col gap-2.5">
      <legend className="p-0 mb-2.5 text-[16px] font-semibold text-texto">
        Método de pago
      </legend>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metodos.map((m) => {
          const seleccionada = m.id === metodoSeleccionado;
          const estaDeshabilitado = deshabilitado || m.deshabilitado;

          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={seleccionada}
              disabled={estaDeshabilitado}
              onClick={() => onSeleccionarMetodo(m.id)}
              className={`h-[60px] px-4 rounded-[6px] text-[18px] md:text-[19px] flex items-center justify-between gap-2 transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
                seleccionada
                  ? 'border-[3px] border-texto bg-[#FCBD17] text-sobre-acento font-bold shadow-sm'
                  : 'border-2 border-borde-fuerte bg-superficie text-texto font-semibold ps-opcion hover:border-texto'
              } ${estaDeshabilitado ? 'opacity-40 cursor-not-allowed hover:border-borde' : 'cursor-pointer'}`}
            >
              <span>{m.etiqueta}</span>
              <kbd
                className={`font-semibold text-[14px] rounded-[4px] px-2 py-0.5 ${
                  seleccionada
                    ? 'bg-[#1f1d19] text-[#FCBD17]'
                    : 'bg-superficie-2 text-texto'
                }`}
              >
                {m.tecla}
              </kbd>
            </button>
          );
        })}
      </div>

      {avisoCarril && (
        <p className="m-0 text-[15px] text-texto-2">
          {avisoCarril}
        </p>
      )}
    </fieldset>
  );
}
