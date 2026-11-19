import { formatearMoneda } from '@/lib/formato';

export interface CobroTelepeajeProps {
  tagSerial: string;
  saldoActual: number | null;
  saldoPosterior: number | null;
  esValidoParaDebitar: boolean;
  mensajeError?: string | null;
}

export function CobroTelepeaje({
  tagSerial,
  saldoActual,
  saldoPosterior,
  esValidoParaDebitar,
  mensajeError,
}: CobroTelepeajeProps) {
  const bordeClase = esValidoParaDebitar
    ? 'border-2 border-correcto'
    : 'border-2 border-error';

  return (
    <div className="flex flex-col gap-2.5">
      <div
        aria-live="polite"
        className={`flex flex-wrap gap-x-8 gap-y-3 p-5 rounded-[8px] bg-superficie ${bordeClase}`}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] text-texto-2">TAG</span>
          <strong className="text-[20px] font-bold text-texto">
            {tagSerial || 'Sin cuenta registrada'}
          </strong>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] text-texto-2">Saldo actual</span>
          <strong className="text-[20px] font-bold text-texto">
            {saldoActual !== null ? formatearMoneda(saldoActual) : 'No aplica'}
          </strong>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] text-texto-2">Saldo después del cobro</span>
          <strong className="text-[20px] font-bold text-texto">
            {esValidoParaDebitar && saldoPosterior !== null
              ? formatearMoneda(saldoPosterior)
              : 'No aplica'}
          </strong>
        </div>
      </div>

      {mensajeError && (
        <p
          role="alert"
          className="m-0 p-3 rounded-[6px] bg-error-fondo text-error text-[15px] font-semibold border border-error/30"
        >
          {mensajeError}
        </p>
      )}
    </div>
  );
}
