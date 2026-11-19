import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { esquemaAuditoriaTransaccion } from '@/types';
import type { AuditoriaTransaccion } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export interface FiltrosAuditoria {
  tipo?: string;
  q?: string;
}

export async function obtenerAuditoria(
  filtros?: FiltrosAuditoria,
): Promise<AuditoriaTransaccion[]> {
  return clienteHttp.get<AuditoriaTransaccion[]>('/auditoria', {
    params: filtros as Record<string, string | undefined>,
    schema: z.array(esquemaAuditoriaTransaccion),
  });
}

export function useAuditoria(filtros?: FiltrosAuditoria) {
  return useQuery({
    queryKey: clavesApi.auditoria.lista(filtros),
    queryFn: () => obtenerAuditoria(filtros),
  });
}
