import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { manejarSesionExpirada } from '@/lib/sesion';

/**
 * Función fábrica para crear instancias de QueryClient con manejador global
 * de sesión caducada ante error 401 en queries y mutations.
 */
export function crearQueryClient(
  opcionesConfig?: ConstructorParameters<typeof QueryClient>[0],
): QueryClient {
  return new QueryClient({
    ...opcionesConfig,
    queryCache:
      opcionesConfig?.queryCache ??
      new QueryCache({
        onError: (error) => {
          manejarSesionExpirada(error);
        },
      }),
    mutationCache:
      opcionesConfig?.mutationCache ??
      new MutationCache({
        onError: (error) => {
          manejarSesionExpirada(error);
        },
      }),
  });
}
