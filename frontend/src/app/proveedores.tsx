import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { TemaProvider } from '@/lib/tema';
import { SesionProvider, ManejadorSesionExpirada } from '@/lib/sesion';
import { Toaster } from '@/components/ui/sonner';
import { crearQueryClient } from './clienteQuery';

/**
 * Cliente de TanStack Query configurado con valores sensatos:
 * - staleTime: 60 segundos
 * - retry: 1 intento en fallas (sin reintentos infinitos)
 * - refetchOnWindowFocus: desactivado para evitar peticiones inesperadas durante el arqueo
 */
const queryClient = crearQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export interface ProveedoresAppProps {
  children: ReactNode;
}

/**
 * Proveedor raíz que envuelve la aplicación en:
 * 1. QueryClientProvider (TanStack Query)
 * 2. TemaProvider (claro/oscuro con persistencia)
 * 3. SesionProvider (gestión de sesión y roles en sessionStorage)
 * 4. BrowserRouter (enrutador de React Router)
 * 5. Toaster (notificaciones sonner adaptadas al tema)
 */
export function ProveedoresApp({ children }: ProveedoresAppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TemaProvider>
        <SesionProvider>
          <BrowserRouter>
            <ManejadorSesionExpirada />
            {children}
            <Toaster position="top-right" />
          </BrowserRouter>
        </SesionProvider>
      </TemaProvider>
    </QueryClientProvider>
  );
}
