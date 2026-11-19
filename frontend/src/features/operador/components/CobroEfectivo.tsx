import { RefObject } from 'react';
import { formatearMoneda } from '@/lib/formato';
import type { OpcionRapida } from '../types';

export interface CobroEfectivoProps {
  valorRecibidoTexto: string;
  onCambiarRecibido: (valor: string) => void;
  opcionesRapidas: OpcionRapida[];
  onSeleccionarRapida: (monto: number) => void;
  tarifaActual: number;
  inputRef?: RefObject<HTMLInputElement>;
  deshabilitado?: boolean;
}

export function CobroEfectivo({
  valorRecibidoTexto,
  onCambiarRecibido,
  opcionesRapidas,
  onSeleccionarRapida,
  tarifaActual,
  inputRef,
  deshabilitado = false,
}: CobroEfectivoProps) {
  const recNumerico = parseInt(valorRecibidoTexto.replace(/\D/g, ''), 10) || 0;

  let cambioTitulo = 'Cambio a entregar';
  let cambioTexto = '$ 0';
  let cambioFondoClase = 'bg-superficie-2 text-texto';

  if (!valorRecibidoTexto) {
    cambioTitulo = 'Cambio a entregar';
    cambioTexto = 'Pendiente';
    cambioFondoClase = 'bg-superficie-2 text-texto-2';
  } else if (recNumerico < tarifaActual) {
    cambioTitulo = 'Falta por cobrar';
    cambioTexto = formatearMoneda(tarifaActual - recNumerico);
    cambioFondoClase = 'bg-error-fondo text-error border-2 border-error';
  } else {
    cambioTitulo = 'Cambio a entregar';
    cambioTexto = formatearMoneda(recNumerico - tarifaActual);
    cambioFondoClase = 'bg-[#EC7502] text-white shadow-sm';
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
    onCambiarRecibido(raw);
  };

  // Formato visual para el input con separador de miles
  const displayValue = recNumerico > 0 ? formatearMoneda(recNumerico).replace('$ ', '') : valorRecibidoTexto;

  return (
    <div className="flex flex-wrap gap-4 items-stretch">
      <div className="flex-1 min-w-[240px] flex flex-col gap-2">
        <label htmlFor="op-recibido" className="text-[16px] font-semibold text-texto">
          Valor recibido
        </label>
        <input
          ref={inputRef}
          id="op-recibido"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={displayValue}
          onChange={handleChange}
          disabled={deshabilitado}
          className="h-[60px] w-full px-4 border-2 border-borde-fuerte rounded-[6px] bg-superficie text-texto font-bold text-[28px] md:text-[30px] box-border focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="flex flex-wrap gap-2 pt-1">
          {opcionesRapidas.map((r) => (
            <button
              key={r.etiqueta}
              type="button"
              disabled={deshabilitado}
              onClick={() => onSeleccionarRapida(r.valor)}
              className="h-[44px] px-3.5 border-2 border-texto rounded-[6px] bg-superficie text-texto text-[15px] md:text-[16px] font-semibold ps-secundario transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {r.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div
        aria-live="polite"
        className={`flex-1 min-w-[240px] min-h-[140px] rounded-[8px] p-5 flex flex-col justify-center gap-1 transition-colors ${cambioFondoClase}`}
      >
        <span className="text-[16px] font-semibold">{cambioTitulo}</span>
        <strong className="text-[38px] md:text-[44px] leading-tight tracking-tight">
          {cambioTexto}
        </strong>
      </div>
    </div>
  );
}
