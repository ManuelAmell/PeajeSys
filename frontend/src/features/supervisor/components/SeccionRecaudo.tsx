import { formatearMoneda } from '@/lib/formato';
import type { ResumenRecaudo } from '@/api/recursos/recaudo';
import type { DiaRecaudoGrafico } from '../tipos';

interface SeccionRecaudoProps {
  recaudo?: ResumenRecaudo;
  diasGrafico: DiaRecaudoGrafico[];
}

export function SeccionRecaudo({ recaudo, diasGrafico }: SeccionRecaudoProps) {
  const totalGeneral = recaudo?.total_general ?? 0;
  const totalEfectivo = recaudo?.total_efectivo ?? 0;
  const totalTelepeaje = recaudo?.total_telepeaje ?? 0;
  const carriles = recaudo?.carriles ?? [];

  return (
    <section
      id="panel-recaudo"
      role="tabpanel"
      aria-labelledby="tab-recaudo"
      className="flex flex-col gap-5 outline-none"
    >
      <div className="flex flex-col gap-1">
        <h1 id="t-recaudo" className="text-[28px] md:text-[32px] font-bold text-texto m-0">
          Recaudo diario
        </h1>
        <p className="text-[16px] md:text-[17px] text-texto-2 m-0">
          Vista vw_resumen_diario_estacion · Estación Gambote
        </p>
      </div>

      {/* Tarjetas de totales generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-superficie border border-borde rounded-[10px] p-4 md:p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-[14px] md:text-[15px] text-texto-2 font-medium">Recaudo total general</span>
          <strong className="text-[28px] md:text-[32px] font-bold text-texto">
            {formatearMoneda(totalGeneral)}
          </strong>
        </div>

        <div className="bg-superficie border border-borde rounded-[10px] p-4 md:p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-[14px] md:text-[15px] text-texto-2 font-medium">Total en efectivo</span>
          <strong className="text-[28px] md:text-[32px] font-bold text-texto">
            {formatearMoneda(totalEfectivo)}
          </strong>
        </div>

        <div className="bg-superficie border border-borde rounded-[10px] p-4 md:p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-[14px] md:text-[15px] text-texto-2 font-medium">Total en telepeaje</span>
          <strong className="text-[28px] md:text-[32px] font-bold text-[#a84f00] dark:text-[#ffb15c]">
            {formatearMoneda(totalTelepeaje)}
          </strong>
        </div>
      </div>

      {/* Contenedor principal de recaudo por días */}
      <div className="bg-superficie border border-borde rounded-[10px] p-5 md:p-6 flex flex-col gap-6 shadow-sm">
        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-5 text-[15px] md:text-[16px]">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-[18px] h-[18px] rounded-[3px] bg-texto border border-texto"
            />
            Efectivo
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-[18px] h-[18px] rounded-[3px] bg-[#FCBD17] border-2 border-texto box-border"
            />
            Telepeaje
          </span>
        </div>

        {/* Lista de días con gráfico de barras proporcionales */}
        <div className="flex flex-col gap-5">
          {diasGrafico.map((d) => (
            <div key={d.fecha} className="flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2 text-[16px] md:text-[17px]">
                <strong>{d.fecha}</strong>
                <span>
                  {d.veh} vehículos · total <strong>{d.totalTexto}</strong>
                </span>
              </div>

              {/* Barra accesible con role="img" */}
              <div
                role="img"
                aria-label={d.ariaLabel}
                style={{ width: d.anchoPorcentaje }}
                className="flex h-[36px] min-w-[120px] border-2 border-texto rounded-[4px] overflow-hidden"
              >
                <div
                  style={{ width: d.efPorcentaje, background: 'var(--texto)' }}
                  className="h-full transition-all"
                />
                <div className="flex-1 bg-[#FCBD17] h-full" />
              </div>

              <div className="flex flex-wrap gap-5 text-[14px] md:text-[15px] text-texto-2">
                <span>Efectivo {d.efTexto}</span>
                <span>Telepeaje {d.tagTexto}</span>
              </div>
            </div>
          ))}

          {diasGrafico.length === 0 && (
            <p className="text-texto-2 py-4 text-center">No hay registros de recaudo diario disponibles.</p>
          )}
        </div>

        {/* Desglose de recaudo por caseta / carril */}
        <div className="pt-4 border-t border-borde flex flex-col gap-3">
          <h2 className="text-[18px] md:text-[20px] font-bold text-texto m-0">
            Recaudo por carril y caseta
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-[15px]">
              <thead>
                <tr className="text-left text-texto-2 border-b-2 border-texto">
                  <th scope="col" className="p-2 font-semibold">Carril</th>
                  <th scope="col" className="p-2 font-semibold">Tipo</th>
                  <th scope="col" className="p-2 font-semibold text-right">Vehículos</th>
                  <th scope="col" className="p-2 font-semibold text-right">Efectivo</th>
                  <th scope="col" className="p-2 font-semibold text-right">Telepeaje</th>
                  <th scope="col" className="p-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {carriles.map((c) => (
                  <tr key={c.id_caseta} className="border-b border-superficie-2 hover:bg-hover">
                    <td className="p-2 font-bold">Carril {c.numero_carril}</td>
                    <td className="p-2">{c.tipo_carril}</td>
                    <td className="p-2 text-right">{c.veh}</td>
                    <td className="p-2 text-right font-medium">{formatearMoneda(c.ef)}</td>
                    <td className="p-2 text-right font-medium">{formatearMoneda(c.tag)}</td>
                    <td className="p-2 text-right font-bold">{formatearMoneda(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="m-0 text-[14px] md:text-[15px] text-texto-2">
          Se omite un paso con fecha 18/11/2026: el DML lo inserta con NOW() y queda fuera del periodo de prueba (anotado en pendientes).
        </p>
      </div>
    </section>
  );
}
