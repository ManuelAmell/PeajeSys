import { useState, useMemo } from 'react';
import type { EventoAuditoriaConDetalle } from '../tipos';

interface SeccionAuditoriaProps {
  auditorias: EventoAuditoriaConDetalle[];
}

export function SeccionAuditoria({ auditorias }: SeccionAuditoriaProps) {
  const [buscar, setBuscar] = useState('');
  const [tipo, setTipo] = useState('todas');

  const eventosFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();

    return auditorias
      .filter((e) => tipo === 'todas' || e.tipo_operacion === tipo)
      .filter(
        (e) =>
          !q ||
          e.ticketNumero.toLowerCase().includes(q) ||
          e.usuario_sistema.toLowerCase().includes(q) ||
          (e.motivo && e.motivo.toLowerCase().includes(q)),
      );
  }, [auditorias, buscar, tipo]);

  const sinEventos = eventosFiltrados.length === 0;

  return (
    <section
      id="panel-auditoria"
      role="tabpanel"
      aria-labelledby="tab-auditoria"
      className="flex flex-col gap-5 outline-none"
    >
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="t-auditoria" className="text-[28px] md:text-[32px] font-bold text-texto m-0">
            Auditoría de transacciones
          </h2>
          <p className="text-[16px] md:text-[17px] text-texto-2 m-0">
            Registro inmutable: el trigger trg_auditoria_inmutable impide editarlo o borrarlo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sp-buscar" className="text-[14px] md:text-[15px] font-semibold text-texto">
              Buscar ticket o usuario
            </label>
            <input
              id="sp-buscar"
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="TCK-... o usuario"
              autoComplete="off"
              className="h-[44px] w-[240px] px-3 border-2 border-borde-fuerte rounded-[6px] bg-superficie text-[16px] text-texto focus-visible:outline-[3px] focus-visible:outline-texto"
            />
          </div>

          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <label htmlFor="sp-tipo" className="text-[14px] md:text-[15px] font-semibold text-texto">
              Operación
            </label>
            <select
              id="sp-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-[44px] px-3 border-2 border-borde-fuerte rounded-[6px] bg-superficie text-[16px] text-texto cursor-pointer focus-visible:outline-[3px] focus-visible:outline-texto"
            >
              <option value="todas">Todas</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="VOID">VOID</option>
            </select>
            <button
              type="button"
              id="btn-filtro-void"
              onClick={() => setTipo('VOID')}
              aria-label="Filtro rápido VOID"
              style={{ opacity: 0, width: 1, height: 1, position: 'absolute' }}
            >
              VOID
            </button>
          </div>
        </div>
      </div>

      <div className="bg-superficie border border-borde rounded-[10px] p-2 md:p-5 overflow-x-auto shadow-sm">
        {sinEventos ? (
          <div role="status" className="p-8 flex flex-col gap-1.5">
            <strong className="text-[20px] font-bold text-texto">No hay eventos con ese filtro</strong>
            <span className="text-[16px] text-texto-2">Prueba con otra operación o borra la búsqueda.</span>
          </div>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-[15px] md:text-[16px]">
            <thead>
              <tr className="text-left text-texto-2 text-[14px] md:text-[15px] border-b-2 border-texto">
                <th scope="col" className="p-2.5 font-semibold">Evento</th>
                <th scope="col" className="p-2.5 font-semibold">Ticket</th>
                <th scope="col" className="p-2.5 font-semibold">Fecha del paso</th>
                <th scope="col" className="p-2.5 font-semibold">Operación</th>
                <th scope="col" className="p-2.5 font-semibold">Usuario</th>
                <th scope="col" className="p-2.5 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.map((e) => (
                <tr key={e.id_auditoria} className="border-b border-superficie-2 hover:bg-hover">
                  <td className="p-3 font-bold">{e.id_auditoria}</td>
                  <td className="p-3 whitespace-nowrap font-medium">{e.ticketNumero}</td>
                  <td className="p-3 whitespace-nowrap text-texto-2">{e.fechaTexto}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      style={{
                        borderColor: e.tipoBorde,
                        background: e.tipoFondo,
                      }}
                      className="px-2 py-0.5 border-2 rounded-[4px] text-[13px] md:text-[14px] font-bold inline-block"
                    >
                      {e.tipo_operacion}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{e.usuario_sistema}</td>
                  <td className="p-3 text-texto-2">{e.motivo || 'Registro del sistema'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
