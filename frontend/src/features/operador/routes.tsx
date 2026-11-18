import { LayoutApp } from '@/components/layout/LayoutApp';
import { Badge } from '@/components/ui/badge';

export default function OperadorPage() {
  return (
    <LayoutApp
      titulo="Terminal de cobro"
      subtitulo="Estación Gambote · Carril 1"
    >
      <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-6">
        <div className="rounded-[10px] border border-borde bg-superficie p-6 md:p-8 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-[28px] md:text-[32px] font-bold text-texto m-0">
              Terminal de cobro
            </h1>
            <Badge variant="correcto">ABIERTO</Badge>
          </div>
          <p className="text-[17px] text-texto-2 m-0">
            En construcción · El bloque B3 implementará el registro de pasos vehiculares,
            cobro en efectivo y telepeaje, y emisión de tickets.
          </p>
          <div
            aria-hidden="true"
            className="ps-franja-loading h-[10px] rounded-[2px]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-4 rounded-[6px] bg-superficie-2 border border-borde text-[15px]">
            <div>
              <span className="text-texto-2">Estación asignada:</span>{' '}
              <strong className="text-texto block">Gambote</strong>
            </div>
            <div>
              <span className="text-texto-2">Carril de atención:</span>{' '}
              <strong className="text-texto block">Carril 1</strong>
            </div>
            <div>
              <span className="text-texto-2">Turno activo:</span>{' '}
              <strong className="text-texto block">Turno 9 · Diurno</strong>
            </div>
            <div>
              <span className="text-texto-2">Tarifa I (Automóviles):</span>{' '}
              <strong className="text-texto block">$ 10.500</strong>
            </div>
          </div>
        </div>
      </div>
    </LayoutApp>
  );
}
