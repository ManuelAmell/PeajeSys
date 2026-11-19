import { useState } from 'react';
import { LayoutApp } from '@/components/layout/LayoutApp';
import { SeccionCategorias } from './SeccionCategorias';
import { SeccionEstaciones } from './SeccionEstaciones';
import { SeccionPersonal } from './SeccionPersonal';
import { SeccionTarifas } from './SeccionTarifas';

type TabAdmin = 'tarifas' | 'personal' | 'estaciones' | 'categorias';

const PESTANAS: Array<{ id: TabAdmin; label: string }> = [
  { id: 'tarifas', label: 'Tarifas' },
  { id: 'personal', label: 'Personal' },
  { id: 'estaciones', label: 'Estaciones y casetas' },
  { id: 'categorias', label: 'Categorías' },
];

/**
 * Panel del administrador (Admin.dc.html): cuatro secciones bajo la navegación
 * del prototipo. Tarifas es la única sección con edición; Personal permite
 * activar o desactivar; Estaciones y Categorías son de solo lectura.
 */
export function AdminPage() {
  const [tab, setTab] = useState<TabAdmin>('tarifas');

  return (
    <LayoutApp titulo="Administración">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-3 pb-10 pt-6 md:px-8">
        <nav
          aria-label="Secciones de administración"
          className="flex flex-wrap gap-2"
        >
          {PESTANAS.map((pestana) => {
            const activa = tab === pestana.id;
            return (
              <button
                key={pestana.id}
                type="button"
                aria-pressed={activa}
                onClick={() => setTab(pestana.id)}
                className={
                  activa
                    ? 'h-[48px] cursor-pointer rounded-[6px] border-[3px] border-texto bg-marca-amarillo px-[18px] text-[17px] font-bold text-sobre-acento focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2'
                    : 'h-[48px] cursor-pointer rounded-[6px] border-2 border-borde bg-superficie px-[18px] text-[17px] font-semibold text-texto transition-colors hover:bg-hover focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2'
                }
              >
                {pestana.label}
              </button>
            );
          })}
        </nav>

        {tab === 'tarifas' && <SeccionTarifas />}
        {tab === 'personal' && <SeccionPersonal />}
        {tab === 'estaciones' && <SeccionEstaciones />}
        {tab === 'categorias' && <SeccionCategorias />}
      </div>
    </LayoutApp>
  );
}

export default AdminPage;
