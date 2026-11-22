import { formatearMoneda } from '@/lib/formato';
import type { PasoRegistrado } from '../types';

export interface ResumenCajaProps {
  fondoInicial: number;
  totalRecaudadoEfectivo: number;
  pasos: PasoRegistrado[];
}

export function ResumenCaja({
  fondoInicial,
  totalRecaudadoEfectivo,
  pasos,
}: ResumenCajaProps) {
  const esperadoEnCaja = fondoInicial + totalRecaudadoEfectivo;
  // Las anuladas se listan marcadas, pero no cuentan como pasos del turno.
  const pasosVigentes = pasos.filter((p) => !p.anulada).length;

  return (
    <aside
      aria-labelledby="titulo-turno"
      className="flex-1 min-w-[300px] lg:max-w-[360px] flex flex-col gap-6"
    >
      <section className="bg-superficie border border-borde rounded-[10px] p-6 flex flex-col gap-3.5 shadow-sm">
        <h2 id="titulo-turno" className="m-0 text-[22px] font-bold text-texto">
          Caja del turno
        </h2>

        <div className="flex justify-between text-[17px]">
          <span className="text-texto-2">Fondo inicial</span>
          <span className="font-medium text-texto">
            {formatearMoneda(fondoInicial)}
          </span>
        </div>

        <div className="flex justify-between text-[17px]">
          <span className="text-texto-2">Recaudado en efectivo</span>
          <span className="font-medium text-texto">
            {formatearMoneda(totalRecaudadoEfectivo)}
          </span>
        </div>

        <div className="flex justify-between items-baseline pt-3 border-t-2 border-texto">
          <span className="text-[17px] font-semibold text-texto">
            Efectivo esperado en caja
          </span>
          <strong className="text-[26px] md:text-[28px] font-bold text-texto whitespace-nowrap">
            {formatearMoneda(esperadoEnCaja)}
          </strong>
        </div>

        <div className="flex justify-between text-[17px]">
          <span className="text-texto-2">Pasos registrados</span>
          <span className="font-semibold text-texto">{pasosVigentes}</span>
        </div>
      </section>

      <section className="bg-superficie border border-borde rounded-[10px] p-6 flex flex-col gap-3 shadow-sm">
        <h2 className="m-0 text-[22px] font-bold text-texto">Últimos pasos</h2>

        {pasos.length === 0 ? (
          <p className="m-0 text-[16px] text-texto-2 leading-relaxed">
            Aún no hay pasos en este turno. Cuando registres el primer vehículo aparecerá aquí con su ticket.
          </p>
        ) : (
          <ol className="m-0 p-0 list-none flex flex-col max-h-[380px] overflow-y-auto divide-y divide-superficie-2">
            {pasos.map((p, idx) => (
              <li
                key={p.ticket || idx}
                className="py-3 first:pt-0 last:pb-0 flex flex-col gap-0.5"
              >
                <div
                  className={`flex justify-between items-center gap-3 ${p.anulada ? 'opacity-70' : ''}`}
                >
                  <strong
                    className={`text-[19px] md:text-[20px] font-bold tracking-wide text-texto ${p.anulada ? 'line-through' : ''}`}
                  >
                    {p.placa}
                  </strong>
                  <strong
                    className={`text-[19px] md:text-[20px] font-bold text-texto ${p.anulada ? 'line-through' : ''}`}
                  >
                    {p.montoTexto}
                  </strong>
                </div>
                <span className="text-[14px] text-texto-2 flex flex-wrap items-center gap-x-2">
                  {p.anulada && (
                    <span className="px-2 py-0.5 rounded-[4px] border-2 border-error bg-error-fondo text-error text-[13px] font-bold">
                      Anulada
                    </span>
                  )}
                  <span>
                    {p.hora} · Cat. {p.categoriaRomano} · {p.metodoPago} · {p.ticket}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
