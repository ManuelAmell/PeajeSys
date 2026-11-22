import { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTransaccionesTurno } from '@/api/recursos/turnos';
import { formatearMoneda } from '@/lib/formato';
import { NUMERO_A_ROMANO } from '@/features/operador/hooks/usePlacaYCategoria';
import { DialogoAnularTransaccion } from './DialogoAnularTransaccion';
import type { FilaTransaccion } from './tipos';

export interface PanelTransaccionesTurnoProps {
  idTurno: number;
  /** Solo turnos abiertos: en un turno cerrado no se muestra el botón Anular. */
  puedeAnular: boolean;
  /** Plegable y plegado al inicio (terminal del operador). */
  colapsable?: boolean;
  titulo?: string;
}

export function PanelTransaccionesTurno({
  idTurno,
  puedeAnular,
  colapsable = false,
  titulo = 'Transacciones del turno',
}: PanelTransaccionesTurnoProps) {
  const idBase = useId();
  const idCuerpo = `${idBase}-cuerpo`;
  const idTitulo = `${idBase}-titulo`;
  const [abierto, setAbierto] = useState(!colapsable);
  const [seleccion, setSeleccion] = useState<FilaTransaccion | null>(null);
  const origenRef = useRef<HTMLElement | null>(null);
  const seccionRef = useRef<HTMLElement>(null);
  const anuladaConExitoRef = useRef(false);

  const { data, isLoading, isError, refetch } = useTransaccionesTurno(idTurno);

  const filas: FilaTransaccion[] = useMemo(
    () =>
      [...(data ?? [])]
        .sort((a, b) => b.id_transaccion - a.id_transaccion)
        .map((t) => ({
          ...t,
          anulada: t.anulada === true,
          hora: t.fecha_hora
            ? new Date(t.fecha_hora).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
            : '00:00',
          categoriaRomano:
            NUMERO_A_ROMANO[t.id_categoria] ?? String(t.id_categoria),
          montoTexto: formatearMoneda(t.monto_tarifa),
        })),
    [data],
  );

  // Radix solo devuelve el foco al DialogTrigger; aquí el botón es de cada fila, así que se hace a mano.
  // Tras anular, el botón de origen desaparece: el foco pasa al panel.
  const restaurarFoco = () => {
    const origen = origenRef.current;
    if (!anuladaConExitoRef.current && origen?.isConnected) {
      origen.focus();
    } else {
      seccionRef.current?.focus();
    }
    anuladaConExitoRef.current = false;
    return true;
  };

  const encabezado = colapsable ? (
    <h2 id={idTitulo} className="m-0 text-[22px] font-bold text-texto">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idCuerpo}
        onClick={() => setAbierto((v) => !v)}
        className="w-full min-h-[44px] flex items-center justify-between gap-3 bg-transparent border-0 p-0 text-left text-[22px] font-bold text-texto cursor-pointer focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2"
      >
        <span>
          {titulo}
          {data ? (
            <span className="ml-2 text-[16px] font-medium text-texto-2">
              ({filas.length})
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-6 w-6 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
    </h2>
  ) : (
    <h2 id={idTitulo} className="m-0 text-[22px] font-bold text-texto">
      {titulo}
    </h2>
  );

  return (
    <section
      ref={seccionRef}
      tabIndex={-1}
      aria-labelledby={idTitulo}
      className="bg-superficie border border-borde rounded-[10px] p-4 sm:p-6 flex flex-col gap-3 shadow-sm outline-none"
    >
      {encabezado}

      {abierto && (
        <div id={idCuerpo} className="flex flex-col gap-3">
          {isLoading && (
            <p role="status" className="m-0 text-[16px] text-texto-2">
              Cargando las transacciones del turno…
            </p>
          )}

          {isError && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 text-[16px] text-error font-semibold"
            >
              <span>No se pudieron cargar las transacciones.</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="h-[44px] px-4 rounded-[6px] border-2 border-texto bg-superficie text-texto text-[15px] font-semibold ps-secundario"
              >
                Reintentar
              </button>
            </div>
          )}

          {!isLoading && !isError && filas.length === 0 && (
            <p className="m-0 text-[16px] text-texto-2">
              Aún no hay transacciones en este turno.
            </p>
          )}

          {filas.length > 0 && (
            <ol className="m-0 p-0 list-none flex flex-col divide-y divide-superficie-2 max-h-[420px] overflow-y-auto">
              {filas.map((f) => (
                <li
                  key={f.id_transaccion}
                  data-testid={`fila-transaccion-${f.id_transaccion}`}
                  className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
                >
                  <div
                    className={`flex flex-col gap-0.5 min-w-0 ${f.anulada ? 'opacity-70' : ''}`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <strong
                        className={`text-[19px] font-bold tracking-wide text-texto ${f.anulada ? 'line-through' : ''}`}
                      >
                        {f.placa_detectada || ''}
                      </strong>
                      <strong
                        className={`text-[19px] font-bold text-texto ${f.anulada ? 'line-through' : ''}`}
                      >
                        {f.montoTexto}
                      </strong>
                      {f.anulada && (
                        <span className="px-2 py-0.5 rounded-[4px] border-2 border-error bg-error-fondo text-error text-[13px] font-bold">
                          Anulada
                        </span>
                      )}
                    </div>
                    <span className="text-[14px] text-texto-2">
                      {f.hora} · Cat. {f.categoriaRomano} · {f.metodo_pago} ·{' '}
                      {f.numero_ticket}
                    </span>
                  </div>

                  {puedeAnular && !f.anulada && (
                    <button
                      type="button"
                      aria-label={`Anular transacción ${f.numero_ticket}`}
                      onClick={(e) => {
                        origenRef.current = e.currentTarget;
                        setSeleccion(f);
                      }}
                      className="h-[44px] px-4 rounded-[6px] border-2 border-texto bg-superficie text-texto text-[15px] font-semibold ps-secundario focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2"
                    >
                      Anular
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <DialogoAnularTransaccion
        transaccion={seleccion}
        onCerrar={() => setSeleccion(null)}
        onAnulada={() => {
          anuladaConExitoRef.current = true;
        }}
        onRestaurarFoco={restaurarFoco}
      />
    </section>
  );
}
