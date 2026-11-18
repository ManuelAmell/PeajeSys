import { LayoutApp } from '@/components/layout/LayoutApp';
import { Franja } from '@/components/layout/Franja';

export default function AdminPage() {
  return (
    <LayoutApp titulo="Administración">
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
        <div className="rounded-[8px] border-2 border-borde bg-superficie p-6 md:p-8 flex flex-col gap-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] md:text-[32px] font-bold text-texto m-0">
              Administración
            </h1>
            <p className="text-[16px] md:text-[17px] text-texto-2 m-0">
              En construcción · El bloque B5 implementará la administración de peajes, casetas y esquemas tarifarios.
            </p>
          </div>
          <Franja className="rounded-[4px] my-2" />
          <div className="p-4 rounded-[6px] bg-superficie-2 border border-borde text-[14px] text-texto-2 leading-relaxed">
            Módulo reservado para el rol ADMIN. La gestión de estaciones, configuración de casetas y mantenimiento de tarifas se integrarán en esta vista.
          </div>
        </div>
      </div>
    </LayoutApp>
  );
}
