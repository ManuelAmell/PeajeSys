import { useState, useMemo } from 'react';
import type { MetricasArqueo, TurnoConDetalle } from '../tipos';

interface SeccionArqueoProps {
  turnos: TurnoConDetalle[];
  metricas: MetricasArqueo;
}

export function SeccionArqueo({ turnos, metricas }: SeccionArqueoProps) {
  const [fechaFiltro, setFechaFiltro] = useState<string>('todas');

  // Obtener fechas únicas disponibles
  const fechasDisponibles = useMemo(() => {
    const conjunto = new Set<string>();
    turnos.forEach((t) => {
      if (t.fecha) conjunto.add(t.fecha);
    });
    return Array.from(conjunto).sort();
  }, [turnos]);

  // Filtrado reactivo de turnos
  const turnosFiltrados = useMemo(() => {
    if (fechaFiltro === 'todas') return turnos;
    return turnos.filter((t) => t.fecha === fechaFiltro);
  }, [turnos, fechaFiltro]);

  return (
    <section
      id="panel-arqueo"
      role="tabpanel"
      aria-labelledby="tab-arqueo"
      className="flex flex-col gap-5 outline-none"
    >
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="t-arqueo" className="text-[28px] md:text-[32px] font-bold text-texto m-0">
            Arqueo y conciliación de turnos
          </h2>
          <p className="text-[16px] md:text-[17px] text-texto-2 m-0">
            Compara lo que dice cada turno con la suma de sus pasos en efectivo y con lo que entregó el recaudador.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <label htmlFor="sp-fecha" className="text-[14px] md:text-[15px] font-semibold text-texto">
            Fecha
          </label>
          <select
            id="sp-fecha"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="h-[44px] px-3 border-2 border-borde-fuerte rounded-[6px] bg-superficie text-[16px] text-texto cursor-pointer focus-visible:outline-[3px] focus-visible:outline-texto"
          >
            <option value="todas">Todas</option>
            {fechasDisponibles.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas resumen con métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-superficie border border-borde rounded-[10px] p-4 md:p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-[15px] md:text-[16px] text-texto-2 font-medium">Turnos abiertos</span>
          <strong data-testid="k-abiertos" className="text-[32px] md:text-[36px] font-bold text-texto">
            {metricas.abiertos}
          </strong>
        </div>

        <div className="bg-superficie border border-borde rounded-[10px] p-4 md:p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-[15px] md:text-[16px] text-texto-2 font-medium">Con faltante o sobrante</span>
          <strong data-testid="k-descuadre" className="text-[32px] md:text-[36px] font-bold text-texto">
            {metricas.descuadre}
          </strong>
        </div>

        <div className="bg-[#FCBD17] text-sobre-acento border-[3px] border-texto rounded-[10px] p-4 md:p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-[15px] md:text-[16px] font-bold">Sin conciliar con sus pasos</span>
          <strong data-testid="k-sin-conciliar" className="text-[32px] md:text-[36px] font-black">
            {metricas.sinConciliar}
          </strong>
        </div>
      </div>

      {/* Tabla con scroll horizontal propio */}
      <div className="bg-superficie border border-borde rounded-[10px] p-2 md:p-5 overflow-x-auto shadow-sm">
        <table className="w-full min-w-[1180px] border-collapse text-[15px] md:text-[16px]">
          <caption className="text-left py-2.5 text-[14px] md:text-[15px] text-texto-2">
            Datos del DML del Avance 2. "Pasos en efectivo" es la suma de TRANSACCION_PEAJE de cada turno.
          </caption>
          <thead>
            <tr className="text-left text-texto-2 text-[14px] md:text-[15px]">
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold w-[60px] min-w-[50px]">Turno</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold w-[110px] min-w-[105px]">Fecha</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold w-[110px] min-w-[105px]">Carril</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold w-[230px] min-w-[210px]">Recaudador</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold text-right w-[120px] min-w-[110px]">Según turno</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold text-right w-[140px] min-w-[130px]">Pasos en efectivo</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold text-right w-[120px] min-w-[110px]">Declarado</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold w-[180px] min-w-[170px]">Arqueo</th>
              <th scope="col" className="p-2.5 border-b-2 border-texto font-semibold min-w-[230px]">Conciliación</th>
            </tr>
          </thead>
          <tbody>
            {turnosFiltrados.map((t) => (
              <tr
                key={t.id_turno}
                data-testid={`fila-turno-${t.id_turno}`}
                className="hover:bg-hover transition-colors"
              >
                <td className="p-3 border-b border-superficie-2 font-bold">{t.id_turno}</td>
                <td className="p-3 border-b border-superficie-2 whitespace-nowrap">{t.fecha}</td>
                <td className="p-3 border-b border-superficie-2 whitespace-nowrap">{t.carrilTexto}</td>
                <td className="p-3 border-b border-superficie-2 font-medium leading-snug">{t.operadorNombre}</td>
                <td className="p-3 border-b border-superficie-2 text-right whitespace-nowrap font-medium">
                  {t.recaudadoTexto}
                </td>
                <td className="p-3 border-b border-superficie-2 text-right whitespace-nowrap font-medium">
                  {t.pasosTexto}
                </td>
                <td className="p-3 border-b border-superficie-2 text-right whitespace-nowrap font-medium">
                  {t.declaradoTexto}
                </td>
                <td className="p-3 border-b border-superficie-2 whitespace-nowrap">
                  <span
                    style={{ background: t.diagFondo, color: t.diagColor }}
                    className="px-2 py-1 rounded-[4px] text-[13px] md:text-[14px] font-bold inline-block"
                  >
                    {t.diagnosticoTexto}
                  </span>
                </td>
                <td className="p-3 border-b border-superficie-2 whitespace-nowrap">
                  <span
                    style={{ color: t.conciliaColor }}
                    className="text-[14px] md:text-[15px] font-bold inline-block"
                  >
                    {t.conciliacionTexto}
                  </span>
                </td>
              </tr>
            ))}
            {turnosFiltrados.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-texto-2">
                  No hay turnos registrados para la fecha seleccionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
