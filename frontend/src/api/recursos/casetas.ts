import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { esquemaCaseta } from '@/types';
import type { Caseta } from '@/types';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';

export async function obtenerCasetas(idEstacion?: number): Promise<Caseta[]> {
  return clienteHttp.get<Caseta[]>('/casetas', {
    params: idEstacion ? { id_estacion: idEstacion } : undefined,
    schema: z.array(esquemaCaseta),
  });
}

export function useCasetas(idEstacion?: number) {
  return useQuery({
    queryKey: clavesApi.estaciones.casetas(idEstacion),
    queryFn: () => obtenerCasetas(idEstacion),
  });
}
