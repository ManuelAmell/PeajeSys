import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SesionProvider, ManejadorSesionExpirada } from '@/lib/sesion';
import { TemaProvider, ModoTema } from '@/lib/tema';
import { Usuario } from '@/lib/roles';
import { crearQueryClient } from '@/app/clienteQuery';

export interface OpcionesRenderExtendido extends Omit<
  RenderOptions,
  'wrapper'
> {
  initialEntries?: string[];
  usuarioInicial?: Usuario | null;
  temaInicial?: ModoTema;
  queryClient?: QueryClient;
}

/**
 * Utilidad de renderizado para pruebas que envuelve el componente en:
 * - QueryClientProvider (con retry desactivado)
 * - TemaProvider
 * - SesionProvider (con usuario inicial opcional)
 * - MemoryRouter (con ruta inicial configurable)
 */
export function renderConProveedores(
  ui: ReactElement,
  opciones: OpcionesRenderExtendido = {},
) {
  const {
    initialEntries = ['/'],
    usuarioInicial = null,
    temaInicial = 'claro',
    queryClient = crearQueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
    ...opcionesRender
  } = opciones;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TemaProvider temaPorDefecto={temaInicial}>
          <SesionProvider usuarioInicial={usuarioInicial}>
            <MemoryRouter initialEntries={initialEntries}>
              <ManejadorSesionExpirada />
              {children}
            </MemoryRouter>
          </SesionProvider>
        </TemaProvider>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...opcionesRender }),
  };
}

export * from '@testing-library/react';
