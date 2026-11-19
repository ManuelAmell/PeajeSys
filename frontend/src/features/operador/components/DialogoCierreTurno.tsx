import { useEffect, useRef } from 'react';
import { formatearMoneda } from '@/lib/formato';
import { calcularDiferenciaArqueo, diagnosticarArqueo } from '@/api/dominio/arqueo';

export interface DialogoCierreTurnoProps {
  abierto: boolean;
  idTurno: number;
  totalRecaudadoEfectivo: number;
  declaradoTexto: string;
  onCambiarDeclarado: (valor: string) => void;
  onConfirmarCierre: () => void;
  onCancelar: () => void;
  estaCerrando?: boolean;
  errorCierre?: string | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function DialogoCierreTurno({
  abierto,
  idTurno,
  totalRecaudadoEfectivo,
  declaradoTexto,
  onCambiarDeclarado,
  onConfirmarCierre,
  onCancelar,
  estaCerrando = false,
  errorCierre,
  triggerRef,
}: DialogoCierreTurnoProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Manejo de foco y eventos de teclado (Escape y Tab Trap)
  useEffect(() => {
    if (!abierto) {
      previousFocusRef.current?.focus();
      return;
    }

    previousFocusRef.current = triggerRef?.current ?? (document.activeElement as HTMLElement | null);
    inputRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelar();
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'input, button:not([disabled]), [tabindex="0"]',
        );
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];
        if (!firstEl || !lastEl) return;

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [abierto, onCancelar, triggerRef]);

  if (!abierto) return null;

  const declNumerico = parseInt(declaradoTexto.replace(/\D/g, ''), 10);
  const tieneDeclarado = declaradoTexto.trim().length > 0 && !isNaN(declNumerico);

  let diagTxt = 'Escribe el efectivo que entregas';
  let diagColorClase = 'text-texto-3';
  let diagFondoClase = 'bg-superficie-2';
  let difTxt = '';

  if (tieneDeclarado) {
    const dif = calcularDiferenciaArqueo(declNumerico, totalRecaudadoEfectivo);
    const diag = diagnosticarArqueo(declNumerico, totalRecaudadoEfectivo);

    if (diag.diagnostico === 'CUADRADO') {
      diagTxt = 'CUADRADO';
      diagColorClase = 'text-correcto-texto font-bold';
      diagFondoClase = 'bg-correcto-fondo border border-correcto';
      difTxt = '$ 0';
    } else if (diag.diagnostico === 'SOBRANTE') {
      diagTxt = 'SOBRANTE (+)';
      diagColorClase = 'text-aviso-texto font-bold';
      diagFondoClase = 'bg-aviso-fondo border border-[#FCBD17]';
      difTxt = `+ ${formatearMoneda(dif)}`;
    } else {
      diagTxt = 'FALTANTE (−)';
      diagColorClase = 'text-error font-bold';
      diagFondoClase = 'bg-error-fondo border border-error';
      difTxt = `− ${formatearMoneda(Math.abs(dif))}`;
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
    onCambiarDeclarado(raw);
  };

  const displayDeclarado =
    tieneDeclarado && declNumerico > 0
      ? formatearMoneda(declNumerico).replace('$ ', '')
      : declaradoTexto;

  return (
    <div
      role="presentation"
      className="fixed inset-0 bg-[#1f1d19]/60 z-50 flex items-start justify-center p-4 md:pt-24 box-border overflow-y-auto"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cierre"
        className="w-full max-w-[520px] bg-superficie rounded-[10px] border-[3px] border-texto p-6 md:p-7 flex flex-col gap-4.5 shadow-xl box-border"
      >
        <h2 id="titulo-cierre" className="m-0 text-[24px] md:text-[26px] font-bold text-texto">
          Cerrar turno {idTurno}
        </h2>

        <div className="flex justify-between items-center text-[16px] md:text-[17px]">
          <span className="text-texto-2">Recaudado en efectivo según el sistema</span>
          <strong className="text-[18px] text-texto">
            {formatearMoneda(totalRecaudadoEfectivo)}
          </strong>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="op-declarado"
            className="text-[16px] font-semibold text-texto leading-tight"
          >
            Efectivo recaudado que entregas (sin el fondo inicial)
          </label>
          <input
            ref={inputRef}
            id="op-declarado"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={displayDeclarado}
            onChange={handleChange}
            disabled={estaCerrando}
            className="h-[56px] px-4 border-2 border-texto rounded-[6px] bg-superficie text-texto font-bold text-[24px] md:text-[26px] box-border focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-50"
          />
        </div>

        <div
          aria-live="polite"
          className={`flex justify-between items-center gap-3 p-3.5 md:p-4 rounded-[8px] transition-colors ${diagFondoClase}`}
        >
          <span className={`text-[17px] ${diagColorClase}`}>{diagTxt}</span>
          <strong className={`text-[22px] md:text-[24px] ${diagColorClase}`}>
            {difTxt}
          </strong>
        </div>

        {errorCierre && (
          <p
            role="alert"
            className="m-0 p-3 rounded-[6px] bg-error-fondo text-error text-[15px] font-semibold border border-error/30"
          >
            {errorCierre}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={estaCerrando}
            className="h-[50px] px-5 border-2 border-texto rounded-[6px] bg-superficie text-texto text-[16px] md:text-[17px] font-semibold ps-secundario transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmarCierre}
            disabled={!tieneDeclarado || estaCerrando}
            className={`h-[50px] px-5 rounded-[6px] text-[16px] md:text-[17px] font-bold transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
              tieneDeclarado && !estaCerrando
                ? 'border-[3px] border-texto bg-[#FCBD17] text-sobre-acento cursor-pointer ps-primario'
                : 'border-[3px] border-borde-fuerte bg-superficie-2 text-texto-2 cursor-not-allowed opacity-60'
            }`}
          >
            {estaCerrando ? 'Cerrando…' : 'Confirmar cierre'}
          </button>
        </div>
      </div>
    </div>
  );
}
