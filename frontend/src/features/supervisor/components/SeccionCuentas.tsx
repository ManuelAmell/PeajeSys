import { useState, useMemo } from 'react';
import type { CuentaConDetalle } from '../tipos';

interface SeccionCuentasProps {
  cuentas: CuentaConDetalle[];
}

export function SeccionCuentas({ cuentas }: SeccionCuentasProps) {
  const [buscar, setBuscar] = useState('');

  const cuentasFiltradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return cuentas;

    return cuentas.filter(
      (c) =>
        c.placa_vehiculo.toLowerCase().includes(q) ||
        c.tag_rfid_serial.toLowerCase().includes(q),
    );
  }, [cuentas, buscar]);

  return (
    <section
      id="panel-cuentas"
      role="tabpanel"
      aria-labelledby="tab-cuentas"
      className="flex flex-col gap-5 outline-none"
    >
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="t-cuentas" className="text-[28px] md:text-[32px] font-bold text-texto m-0">
            Cuentas de telepeaje
          </h2>
          <p className="text-[16px] md:text-[17px] text-texto-2 m-0">
            Vista vw_estado_cuentas_telepeaje, de menor a mayor saldo.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[240px]">
          <label htmlFor="sp-buscar-tag" className="text-[14px] md:text-[15px] font-semibold text-texto">
            Buscar placa o TAG
          </label>
          <input
            id="sp-buscar-tag"
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por placa o TAG..."
            autoComplete="off"
            className="h-[44px] px-3 border-2 border-borde-fuerte rounded-[6px] bg-superficie text-[16px] text-texto focus-visible:outline-[3px] focus-visible:outline-texto"
          />
        </div>
      </div>

      <div className="bg-superficie border border-borde rounded-[10px] p-2 md:p-5 overflow-x-auto shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-[15px] md:text-[16px]">
          <thead>
            <tr className="text-left text-texto-2 text-[14px] md:text-[15px] border-b-2 border-texto">
              <th scope="col" className="p-2.5 font-semibold">Placa</th>
              <th scope="col" className="p-2.5 font-semibold">Categoría</th>
              <th scope="col" className="p-2.5 font-semibold">TAG</th>
              <th scope="col" className="p-2.5 font-semibold text-right">Saldo</th>
              <th scope="col" className="p-2.5 font-semibold">Cuenta</th>
              <th scope="col" className="p-2.5 font-semibold">Condición</th>
            </tr>
          </thead>
          <tbody>
            {cuentasFiltradas.map((c) => (
              <tr
                key={c.id_cuenta}
                data-testid={`fila-cuenta-${c.placa_vehiculo}`}
                className="border-b border-superficie-2 hover:bg-hover"
              >
                <td className="p-3 font-bold font-mono tracking-wide">{c.placa_vehiculo}</td>
                <td className="p-3">{c.categoriaCodigo}</td>
                <td className="p-3 text-texto-2 whitespace-nowrap">{c.tag_rfid_serial}</td>
                <td className="p-3 text-right whitespace-nowrap font-medium">{c.saldoTexto}</td>
                <td className="p-3 whitespace-nowrap">
                  <span
                    className={`font-semibold ${
                      c.estado_cuenta === 'ACTIVA'
                        ? 'text-[#145232] dark:text-[#8fddb0]'
                        : 'text-error font-bold'
                    }`}
                  >
                    {c.estado_cuenta}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span
                    style={{ background: c.condFondo, color: c.condColor }}
                    className="px-2 py-1 rounded-[4px] text-[13px] md:text-[14px] font-bold inline-block"
                  >
                    {c.condicion}
                  </span>
                </td>
              </tr>
            ))}
            {cuentasFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-texto-2">
                  No se encontraron cuentas de telepeaje con el criterio de búsqueda ingresado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
